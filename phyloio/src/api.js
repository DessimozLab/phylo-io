import Container from './container.js'
const { compute_visible_topology_similarity } = require('./comparison.js')
const { build_table, reroot_hierarchy, screen_shot } = require('./utils.js')
import keyboardManager from './keyboardManager.js'

// class to handle user interaction to init and set up phyloIO instance
export default class API { // todo ultime ! phylo is used ase reference from .html not goood

    constructor() {
        this.containers = {}; // {container id -> Container() }
        this.bound_container = []
        this.session_token = null
        this.session_url = null
        this.phylo_embedded = false
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
        }
        this.settings = {
            'share_phylo': 'https://zoo.vital-it.ch/viewer/',
            'share_post': 'https://zoo.vital-it.ch/sharing/create/',
            'share_get': 'https://zoo.vital-it.ch/sharing/load/?session=',
            'no_distance_message': true,
            'compute_distance': false,
            "compareMode" : false, // compare for each pair of tree topological similarity
        };
        this.undoing = false


    }

    reset(){ // !!!! KEEP ATTR UPDATED BETWEEN init and reset TODO AUTO THAT

        //remove tooltips
        for (const [uid, container] of Object.entries(this.containers)) {
            if (container.interface && container.interface.tooltip_add_tree){
                container.interface.tooltip_add_tree.tip.remove()
            }
        }

        this.containers = {}; // {container id -> Container() }
        this.bound_container = []
        this.session_token = null
        this.session_url = null
        this.phylo_embedded = false
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
        }
        this.settings = {
            'share_phylo': 'https://zoo.vital-it.ch/viewer/',
            'share_post': 'https://zoo.vital-it.ch/sharing/create/',
            'share_get': 'https://zoo.vital-it.ch/sharing/load/?session=',
            'no_distance_message': true,
            'compute_distance': false,
            "compareMode" : false, // compare for each pair of tree topological similarity
        };
        this.undoing = false


    }

    // create and return a new container and add it the dict using its div id
    create_container(container_id){ // container_id -> str
        let c = new Container(container_id);
        this.containers[container_id] = c;

        if (this.bound_container.length < 2) {this.bound_container.push(c)}
        return c;
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

            compute_visible_topology_similarity(recompute)

            for (const [uid, container] of cs) {
                container.viewer.render(container.viewer.hierarchy);
                container.viewer.update_collapse_level(container.models[container.current_model].settings.collapse_level)
            }

            if (this.settings.compute_distance){
                this.compute_distance()
            }

        }

        new keyboardManager(this);
    }

    get_json_pickle(){

        var pickle = {
            "containers" : [],
            'settings' : this.settings
        }

        let cs = Object.values(this.containers)

        for (var i = 0; i < cs.length; i++) {

            let ms = cs[i].models

            let minput = []

            for (var j = 0; j < ms.length; j++) {

                var s = ms[j].settings
                s.labels_array = [...s.labels];
                s.colorlabels_array = [...s.colorlabels];
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

        function download(content, fileName, contentType) {
            var a = document.createElement("a");
            var file = new Blob([content], {type: contentType});
            a.href = URL.createObjectURL(file);
            a.download = fileName;
            a.click();
        }

        var myString = this.get_json_pickle()

        download(myString, 'session.phyloio', 'text/plain');

    }

    compute_distance(){

        if (!this.settings.compareMode){
            return
        }

        this.distance.clade = false
        this.distance.Cl_good = false
        this.distance.Cl_left = false
        this.distance.Cl_right = false
        this.distance.RF = false
        this.distance.RF_good = false
        this.distance.RF_left = false
        this.distance.RF_right = false
        this.distance.Euc = false

        if (this.bound_container[0].models.length == 0 || this.bound_container[1].length == 0) {
            return
        }

        var mod1 = this.bound_container[0].models[this.bound_container[0].current_model]
        var mod2 = this.bound_container[1].models[this.bound_container[1].current_model]

        // Sanity check common leaves set --> warning message

        var leaves1 = mod1.hierarchy_mockup.leaves().map(x => x.data.name);
        var leaves2 = mod2.hierarchy_mockup.leaves().map(x => x.data.name);
        var intersection = leaves1.filter(value => leaves2.includes(value));

        if (intersection.length == 0){
            this.settings.no_distance_message = "No leaves in common."
            this.distance.Euc = false
            this.distance.RF = false
            this.distance.clade = false

            if (this.phylo_embedded){
                this.display_distance_window()
            }

            return
        }




        // COMPUTE CLADE DISTANCE ON ACTUAL TOPOLOGY
        var r =  compute_RF_Euc(mod1.table,mod2.table)
        this.settings.no_distance_message = true
        this.distance.clade = r.RF
        this.distance.Cl_good = r.good
        this.distance.Cl_left = r.L
        this.distance.Cl_right = r.R


        // COMPUTE RF ON UNROOTED TREE


        // reroot both of them
        var hierarchy_mockup_rerooted1 = reroot_hierarchy(mod1.build_hierarchy_mockup(), intersection[0])
        var hierarchy_mockup_rerooted2 = reroot_hierarchy(mod2.build_hierarchy_mockup(), intersection[0])


        // build tables
        var X1 = build_table(hierarchy_mockup_rerooted1)
        var X2 = build_table(hierarchy_mockup_rerooted2)
        var r2 =  compute_RF_Euc(X1,X2)



        this.settings.no_distance_message = true

        this.distance.RF = r2.RF
        this.distance.RF_good = r2.good
        this.distance.RF_left = r2.L
        this.distance.RF_right = r2.R
        this.distance.Euc = r2.E


        if (this.phylo_embedded){
            this.display_distance_window()
        }




        function compute_RF_Euc(X1,X2){

            var n_good  = 0
            var euclidian = 0

            for (var i = 0; i < X1.table.length; i++) {
                var s1 = X1.table[i][0]
                var e1 = X1.table[i][1]
                var w1 = Math.abs(e1-s1)

                if (w1 > 0){

                    var species =  X1.I2S.slice(s1,e1+1)
                    var index = []

                    for (const [name, idx] of Object.entries(X2.S2I)) {
                        if (species.includes(name)) {index.push(idx)}
                    }

                    if (index.length <= 0) {
                        continue
                    }

                    var s2 = Math.min.apply(null,index)
                    var e2 = Math.max.apply(null,index)
                    var w2 = Math.abs(e2-s2)

                    if (w1 == w2) {

                        if (X2.table[e2][0] == s2 && X2.table[e2][1] == e2) {
                            n_good += 1
                            euclidian += Math.abs(parseFloat(X1.table[i][2]) - parseFloat(X2.table[e2][2]) )
                        }
                        else if (X2.table[s2][0] == s2 && X2.table[s2][1] == e2){

                            n_good += 1
                            euclidian += Math.abs(parseFloat(X1.table[i][2]) - parseFloat(X2.table[s2][2]) )

                        }
                        else{
                            euclidian += parseFloat(X1.table[i][2])
                            euclidian += parseFloat(X2.table[e2][2])

                        }

                    }

                    else{
                        euclidian += parseFloat(X1.table[i][2])
                        euclidian += parseFloat(X2.table[e2][2])
                    }




                }

            }

            return {
                'E':euclidian.toFixed(2),
                'RF': (X1.n_edges + X2.n_edges -2*n_good),
                'good':n_good,
                'L':X1.n_edges,
                'R':X2.n_edges,

            }
        }




    }

    screen_shot(params){screen_shot(params)}

    generate_share_link(){

        var that = this
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {

            if (this.readyState != 4) return;

            if (this.status == 201) {
                var data = JSON.parse(this.responseText);

                if (data.result = 'OK'){
                    that.session_token = data.session
                    that.session_url = that.settings.share_phylo + '?session=' + that.session_token
                }
            }
        };

        xhr.open("POST", this.settings.share_post, false);

        xhr.setRequestHeader('Content-Type', 'application/json');

        var j = this.get_json_pickle()

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

        var bool_distance_computed = (this.distance.RF !== false || this.distance.Euc !== false  || this.distance.clade !== false || this.settings.no_distance_message !== true   )
        document.getElementById("distance_window").style.display  = (this.settings.compareMode && bool_distance_computed ) ?  'block': 'none';

        var divdiv = document.getElementById("mydivbody");

        divdiv.innerHTML = "<ol class=\"list-group \">\n"


        if (this.distance.RF !== false) {

            divdiv.innerHTML += "<li class=\"list-group-item d-flex justify-content-between align-items-start\">\n" +
                "    <div class=\"ms-2 me-auto\">\n" +
                "      <div class=\"fw-bold\" style=\"text-align:left;\">Robinson-Foulds</div>\n" +
                "      <small>Left tree: {}/{} ({}%)\n <br>".format(this.distance.RF_good, this.distance.RF_left, Math.round(this.distance.RF_good /this.distance.RF_left*100) ) +
                "      Right tree: {}/{} ({}%)\n".format(this.distance.RF_good, this.distance.RF_right, Math.round(this.distance.RF_good /this.distance.RF_right*100) ) +
                "    </small> </div>\n" +
                "    <span class=\"badge bg-primary rounded-pill\">{}</span>\n".format(this.distance.RF) +
                "  </li>"
        }



        if (this.distance.clade !== false) {


            divdiv.innerHTML += "<li class=\"list-group-item d-flex justify-content-between align-items-start\">\n" +
                "    <div class=\"ms-2 me-auto\">\n" +
                "      <div class=\"fw-bold\" style=\"text-align:left;\">Clade</div>\n" +
                "      <small>Left tree: {}/{} ({}%)\n <br>".format(this.distance.Cl_good, this.distance.Cl_left, Math.round(this.distance.Cl_good /this.distance.Cl_left*100) ) +
                "      Right tree: {}/{} ({}%)\n".format(this.distance.Cl_good, this.distance.Cl_right, Math.round(this.distance.Cl_good/this.distance.Cl_right*100) ) +
                "    </small> </div>\n" +
                "    <span class=\"badge bg-primary rounded-pill\">{}</span>\n".format(this.distance.clade) +
                "  </li>"


        }

        if (this.distance.Euc !== false) {

            divdiv.innerHTML += "<li class=\"list-group-item d-flex justify-content-between align-items-start\">\n" +
                "    <div class=\"ms-2 me-auto\">\n" +
                "      <div class=\"fw-bold\" style=\"text-align:left;\">Euclidian</div> </div>\n" +
                "    <span class=\"badge bg-primary rounded-pill\">{}</span>\n".format(this.distance.Euc) +
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
