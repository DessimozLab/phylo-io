import Container from './container.js'
import Color_mapper from './color_mapper'
const {  screen_shot } = require('./utils.js')
import keyboardManager from './keyboardManager.js'
import FileSaver from 'file-saver' ;
import Model from "./model";

// Main class of phylo.io
export default class API {

    constructor() {

        this.settings = {
            'phylostratigraphy' : false,
            'share_phylo': ' https://beta.phylo.io/viewer/',
            'share_post': ' https://beta.phylo.io/sharing/create/',
            'share_get': ' https://beta.phylo.io/sharing/load/?session=',
            'sync_zoom': false,
            'syncing_zoom': false,
            'callback_ancestral_genome_redirection' : function(taxid){console.log(taxid)},
            'callback_stack_redirection' : function(taxid, parent_taxid){console.log(taxid, parent_taxid)},
        };

        this.set_default_parameters() // Settings that can be reset later on (e.g. switch single to compare mode)

    }

    // HELP

    add_help_modal(container_id){


        var mod_html = `
         <div class="modal" id="modal_help" tabindex="-1" style="z-index: 2147483647 !important;">
        <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Phylo.io help center</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    Help section is under construction
                </div>
                <div class="modal-footer">
                    <button type="button"  class="btn btn-primary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>`

        document.getElementById(container_id).insertAdjacentHTML('afterend',mod_html)

    }

    set_default_parameters(){
        this.workers = {}
        this.distance_computed= {}
        this.containers = {}; // {container id -> Container() }
        this.bound_container = [] // pair of container used for distance computation
        this.session_token = null // unique session token for cloud saving
        this.session_url = null // url for cloud saving
        this.session_answer = null; // data from reply when generating session
        this.phylo_embedded = false // phylo.io website mode
        this.distance = {
            'RF' : false,
            "Euc": false,
            "clade": false,
            "RF_good" : false,
            "RF_left" : false,
            "RF_right" : false,
            "Cl_good" : false,
            "Cl_left" : false,
            "Cl_right" : false,
        } //

        let default_settings = {
            'no_distance_message': true,
            'compute_distance': false,
            "compareMode" : false, // compare for each pair of tree topological similarity
        };
        this.settings = {...this.settings, ...default_settings};
        this.undoing = false // specify is we are undoing an action to prevent infinite looping

        this.color_scales = {}
    }

    get_color_scale(name) {
        if (name in this.color_scales) {
            return this.color_scales[name]
        } else {
            this.color_scales[name] = new Color_mapper()
            return this.color_scales[name]
        }
    }

    set_color_scales(color_scales){


        for (const [key, value] of Object.entries(color_scales)) {

            var newcs = this.get_color_scale(key)
            newcs.cpt = value.cpt
            newcs.scale = value.scale
            newcs.domain_mapping = value.domain_mapping
            newcs.update()

            this.color_scales[key] =  newcs
        }

    }

    // create and return a new container and add it the dict using its div id
    create_container(container_id){ // container_id -> str
        let c = new Container(container_id, this);
        this.containers[container_id] = c;

        if (this.bound_container.length < 2) {this.bound_container.push(c)}

        if (Object.keys(this.containers).length == 1){
            this.add_help_modal(container_id);
        }

        return c;
    }

    // for unit testing only
    _create_model(data, settings, from_raw_data=true){
        return new Model(data, settings, from_raw_data)
    }

    // start the app by computing required information and starting each container
    start(recompute=false){


        var cs = Object.entries(this.containers)

        for (const [uid, container] of cs) {
            container.start(true)
        }

        var con1 = this.bound_container[0]
        var con2 =  this.bound_container[1]

        if (this.settings.compareMode && con1.models.length > 0 && con2.models.length > 0 ){

            this.stop_worker('topology')
            this.compute_visible_topology_similarity(recompute)

            for (const [uid, container] of cs) {
                container.viewer.render(container.viewer.hierarchy);
                //container.viewer.update_collapse_level(container.models[container.current_model].settings.collapse_level, false)
            }

            if (this.settings.compute_distance){
                this.send_worker_distance()
            }

        }

        new keyboardManager(this);
    }

    compute_visible_topology_similarity(recompute=true){

        // If no container selected for comparison, takes first two
        if (this.bound_container.length < 2){

            let cs = Object.values(this.containers)

            this.bound_container = []
            this.bound_container.push(cs[0])
            this.bound_container.push(cs[1])
        }

        var con1 = this.bound_container[0]
        var con2 =  this.bound_container[1]

        // check if already computed
        var todo1 = !(con2.viewer.model.settings.similarity.includes(con1.viewer.model.uid))
        var todo2 = !(con1.viewer.model.settings.similarity.includes(con2.viewer.model.uid))


        if (recompute || todo1 || todo2  ){

            var worker_comp = new Worker(new URL("./worker_bcn.js", import.meta.url));


            worker_comp.onmessage = function(e) {

                var new_model1 = new Model(e.data[0].data, e.data[0].settings, false)
                new_model1.add_circularity_back()
                con1.replace_model(con1.viewer.model,new_model1)
                con1.viewer.model = new_model1

                con1.viewer.set_data(con1.viewer.model)
                con1.viewer.render(con1.viewer.hierarchy);


                var new_model2 = new Model(e.data[1].data, e.data[1].settings, false)
                new_model2.add_circularity_back()
                con2.replace_model(con2.viewer.model,new_model2)
                con2.viewer.model = new_model2
                con2.viewer.set_data(con2.viewer.model)
                con2.viewer.render(con2.viewer.hierarchy);


                con1.message_loader = null
                con1.viewer.interface.update_loader_message()

                con2.message_loader = null
                con2.viewer.interface.update_loader_message()

                con1.viewer.model.set_all_color_scale();
                con2.viewer.model.set_all_color_scale();

            }

            var datum = {'tree1':con1.viewer.model, 'tree2':con2.viewer.model}

            this.set_worker('topology',worker_comp)

            var time = parseInt((con1.viewer.model.leaves.length*2 + con2.viewer.model.leaves.length*2) / (40000/150))

            var msg =  `Computing similarity... (~  ${time} seconds)`

            con1.message_loader = msg
            con1.viewer.interface.update_loader_message()

            con2.message_loader = msg
            con2.viewer.interface.update_loader_message()

            datum.tree1.remove_all_color_scale()
            datum.tree2.remove_all_color_scale()

            worker_comp.postMessage(datum);
        }


    }

    set_distance(m1,m2, distance){

        var tuple_key = [m1.uid, m2.uid].sort().join('---')

        this.distance_computed[tuple_key] = distance
    }

    get_distance(m1,m2){

        var tuple_key = [m1.uid, m2.uid].sort().join('---')


        return this.distance_computed[tuple_key]

    }

    delete_modele_distance(m){


        for (var key in this.distance_computed) {
            if (this.distance_computed.hasOwnProperty(key)) {

                var kd = key.split('---')

                if (kd[0] == m.uid || kd[kd.length -1] == m.uid){
                    this.distance_computed[key] = undefined
                }


            }
        }



    }

    set_worker(key, worker){
        this.workers[key] = worker
    }

    stop_worker(key){
        try {
            for (const [uid, container] of this.containers) {
                container.message_loader = null
            }
            this.workers[key].terminate();
        } catch (error) {
        }


    }

    stop_all_workers(){
        for (const [key, worker] of Object.entries(this.workers)) {
            worker.terminate();
        }
    }

    get_json_pickle(){

        var pickle = {
            "containers" : [],
            'settings' : this.settings,
            'color_scales': this.color_scales
        }

        let cs = Object.values(this.containers)

        for (var i = 0; i < cs.length; i++) {

            let ms = cs[i].models

            let minput = []

            for (var j = 0; j < ms.length; j++) {

                var s = ms[j].settings

                s.labels_array_leaf= [...s.labels['leaf']];
                s.labels_array_node = [...s.labels['node']];

                s.colorlabels_array_leaf = [...s.colorlabels['leaf']];
                s.colorlabels_array_node = [...s.colorlabels['node']];

                minput.push({'settings':s, 'data':ms[j].remove_circularity(), 'zoom': ms[j].zoom })


            }

            pickle.containers.push({
                'models' : minput,
                'settings'  : cs[i].settings,
                'current_model': cs[i].current_model
            })

        }

        var string_pickle = JSON.stringify(pickle);

        for (var i = 0; i < cs.length; i++) {

            let ms = cs[i].models

            for (var j = 0; j < ms.length; j++) {

                ms[j].add_circularity_back()


            }

        }

        return string_pickle

    }

    save_session(){ // TODO not working since collapse or other info are store in circular data

        var blob = new Blob([this.get_json_pickle()], {type: "text/plain;charset=utf-8"});
        FileSaver.saveAs(blob, "Session.phyloio");

    }

    send_worker_distance(){

        if (!this.settings.compareMode){
            return
        }

        var mod1 = this.bound_container[0].models[this.bound_container[0].current_model]
        var mod2 = this.bound_container[1].models[this.bound_container[1].current_model]

        var distance = this.get_distance(mod1,mod2)


        if (typeof distance !== 'undefined') {

            this.distance = distance
            this.settings.no_distance_message = distance.no_distance_message

            if (this.phylo_embedded){
                this.display_distance_window()
            }

            return

        }

        var worker_distance = new Worker(new URL("./worker_distance.js", import.meta.url));

        worker_distance.onmessage = (e) => {

            mod2.set_all_color_scale();
            mod1.set_all_color_scale();


            this.set_distance(mod1,mod2,e.data)

            this.distance = e.data

            this.settings.no_distance_message = e.data.no_distance_message

            if (this.phylo_embedded){
                this.display_distance_window()
            }
        }

        this.set_worker('distance',worker_distance)

        var datum ={'mod1':mod1, 'mod2':mod2}

        datum.mod1.remove_all_color_scale()
        datum.mod2.remove_all_color_scale()


        worker_distance.postMessage(datum);

    }

    screen_shot(params){screen_shot(params)}

    generate_share_link(callback){

        var that = this
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {

            if (this.readyState != 4) return;

            else if (this.status == 201) {
                let data = JSON.parse(this.responseText);
                that.session_answer = data;
                if (data.result === 'OK'){
                    that.token = data.session;
                    that.session_url = that.settings.share_phylo + '?session=' + data.session;
                }
            }

            else if (this.status == 413) {
                let data = JSON.parse(this.responseText);
                that.session_url = 'ERROR_SIZE';
                that.session_answer = data;
            }

            else if (this.status == 400) {
                let data = JSON.parse(this.responseText) | {result: "Error", message: "The server does not accept this session data"};
                that.session_answer = data
                that.session_url = ""
            }
            else {
                that.session_answer = {result: "Error", message: "The server is currently not available."}
                that.session_url = ""
            }
            callback(that)
        };

        xhr.open("POST", this.settings.share_post, false);

        xhr.setRequestHeader('Content-Type', 'application/json');

        var j = this.get_json_pickle()

        if (encodeURI(JSON.stringify(j)).split(/%..|./).length - 1 > 500000000){
            that.session_token = 'ERROR_SIZE';
            return;
        }

        xhr.send(j);

}

    get_share_data(session_token, callback=null){


        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                var j = xhr.responseText;
                callback.apply(this,[j])
            }
        }

        xhr.open('GET', this.settings.share_get + session_token, false);
        xhr.send(null);



    }

    display_distance_window(){


        function create_html_distance(title, d1, d2, d3, d4, d5, d6, d7){

            return `<li class="list-group-item d-flex justify-content-between align-items-start">
                        <div class="ms-2 me-auto">
                        <div class="fw-bold" style="text-align:left;">${title}</div>
                        
                        <span style="display: flex"><small>Left tree: ${d1}/${d2} (${d3}%) </small> </span>
                        <span style="display: flex"><small>Right tree: ${d4}/${d5} (${d6}%) </small> </span>
                        
                       
                        </div>
                         <span class="badge bg-primary rounded-pill">${d7}</span>  
                        </li>`
        }



        var bool_distance_computed = (this.distance.RF !== false || this.distance.Euc !== false  || this.distance.clade !== false || this.settings.no_distance_message !== true   )
        document.getElementById("distance_window").style.display  = (this.settings.compareMode && bool_distance_computed ) ?  'block': 'none';

        var divdiv = document.getElementById("mydivbody");

        divdiv.innerHTML = "<ol class=\"list-group \">\n"




        if (this.distance.RF !== false) {

            divdiv.innerHTML += create_html_distance('Robinson-Foulds',
                this.distance.RF_good, this.distance.RF_left,
                Math.round(this.distance.RF_good /this.distance.RF_left*100),this.distance.RF_good, this.distance.RF_right,
                Math.round(this.distance.RF_good /this.distance.RF_right*100),this.distance.RF
            )




        }

        if (this.distance.clade !== false) {

            divdiv.innerHTML += create_html_distance('Clade',this.distance.Cl_good, this.distance.Cl_left, Math.round(this.distance.Cl_good /this.distance.Cl_left*100),
                this.distance.Cl_good, this.distance.Cl_right, Math.round(this.distance.Cl_good/this.distance.Cl_right*100), this.distance.clade
            )

        }


        if (this.distance.Euc !== false) {

            divdiv.innerHTML += "<li class=\"list-group-item d-flex justify-content-between align-items-start\">\n" +
                "    <div class=\"ms-2 me-auto\">\n" +
                "      <div class=\"fw-bold\" style=\"text-align:left;\">Euclidian</div> </div>\n" +
                "    <span class=\"badge bg-primary rounded-pill\">{}</span>\n".format(this.distance.Euc) +
                "  </li>"
        }


        if (this.distance.LRF !== false) {

            divdiv.innerHTML += "<li class=\"list-group-item d-flex justify-content-between align-items-start\">\n" +
                "    <div class=\"ms-2 me-auto\">\n" +
                "      <div class=\"fw-bold\" style=\"text-align:left;\">Labeled RF</div> </div>\n" +
                "    <span class=\"badge bg-primary rounded-pill\">{}</span>\n".format(this.distance.LRF) +
                "  </li>"
        }



        if (this.settings.no_distance_message != true) {
            divdiv.innerHTML += "<li class=\"list-group-item d-flex justify-content-between align-items-start\">\n" +
                "    <div class=\"ms-2 me-auto\">\n" +
                "      <div class=\"fw-bold\" style=\"text-align:left;\"><strong>Warning:</strong> {}</div> </div>\n".format(this.settings.no_distance_message)
                "  </li>"
        }

        divdiv.innerHTML +=   "</ol>"


    }

}
