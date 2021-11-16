import Container from './container.js'
const { compute_visible_topology_similarity } = require('./comparison.js')
const { build_table, reroot_hierarchy } = require('./utils.js')
import keyboardManager from './keyboardManager.js'

// class to handle user interaction to init and set up phyloIO instance
export default class API { // todo ultime ! phylo is used ase reference from .html not goood

    constructor() {
        this.containers = {}; // {container id -> Container() }
        this.bound_container = []
        this.settings = {
            "compareMode" : false, // compare for each pair of tree topological similarity
        };


    }

    reset(){
        this.containers = {}; // {container id -> Container() }
        this.bound_container = []
        this.settings = {
            "compareMode" : false, // compare for each pair of tree topological similarity
        };
    }



    // create adn return a new container and add it the dict using its div id
    create_container(container_id){ // container_id -> str
        let c = new Container(container_id);
        this.containers[container_id] = c;

        if (this.bound_container.lenght < 2) {this.bound_container.push(c)}
        return c;
    }

    // start the app by computing required information and starting each container
    start(){


        var cs = Object.entries(this.containers)

        for (const [uid, container] of cs) {
            container.start(true)
        }

        var con1 = this.bound_container[0]
        var con2 =  this.bound_container[1]

        if (this.settings.compareMode && con1.models.length > 0 && con2.models.length > 0 ){

            compute_visible_topology_similarity()

            for (const [uid, container] of cs) {
                container.viewer.render(container.viewer.hierarchy);
                container.viewer.update_collapse_level(container.models[container.current_model].settings.collapse_level)
            }

        }

        new keyboardManager(this);
    }

    screenshot(){

    }

    save_session(){ // TODO not working since collapse or other info are store in circular data

        var pickle = {
            "containers" : [],
            'settings' : this.settings
        }

        let cs = Object.values(this.containers)

        for (var i = 0; i < cs.length; i++) {

            let ms = cs[i].models

            let minput = []

            for (var j = 0; j < ms.length; j++) {


                minput.push({'settings':ms[j].settings, 'data':ms[j].remove_circularity()})
            }

            pickle.containers.push({
                'models' : minput,
                'settings'  : cs[i].settings
            })
        }

        function download(content, fileName, contentType) {
            var a = document.createElement("a");
            var file = new Blob([content], {type: contentType});
            a.href = URL.createObjectURL(file);
            a.download = fileName;
            a.click();
        }

        let myString = JSON.stringify(pickle)

        download(myString, 'session.phyloio', 'text/plain');


    }

    compute_distance(){

        var mod1 = this.bound_container[0].models[this.bound_container[0].current_model]
        var mod2 = this.bound_container[1].models[this.bound_container[1].current_model]

        // HIERARCHY & TABLES

        if (!mod1.rooted || !mod2.rooted ) {


            var leaves1 = mod1.hierarchy_mockup.leaves().map(x => x.data.name);
            var leaves2 = mod2.hierarchy_mockup.leaves().map(x => x.data.name);


            var intersection = leaves1.filter(value => leaves2.includes(value));

            if (intersection.length > 0){



                // reroot both of them
                var hierarchy_mockup_rerooted1 = reroot_hierarchy(mod1.hierarchy_mockup, intersection[0])
                var hierarchy_mockup_rerooted2 = reroot_hierarchy(mod2.hierarchy_mockup, intersection[0])

                console.log(hierarchy_mockup_rerooted1)


                // build tables
                var X1 = build_table(hierarchy_mockup_rerooted1)
                var X2 = build_table(hierarchy_mockup_rerooted2)


            }
            else{
                console.log("No leaves in common, impossible to compute phylogenetic distance")
                return
            }


        }
        else{
            var X1 = mod1.table
            var X2 = mod2.table
        }

        var n_good  = 0

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

                var s2 = Math.min.apply(null,index)
                var e2 = Math.max.apply(null,index)
                var w2 = Math.abs(e2-s2)

                if (w1 == w2) {

                    if ( (X2.table[e2][0] == s2 && X2.table[e2][1] == e2) || (X2.table[s2][0] == s2 && X2.table[s2][1] == e2)) {
                        n_good += 1
                    }
                    else{
                        console.log('not good:', X2.table[e2][0], X2.table[e2][1], s2 ,e2 )

                    }

                }




            }

        }

        console.log(X1,X2)
        console.log((X1.n_edges + X2.n_edges -2*n_good), X1.n_edges, X2.n_edges , n_good)





    }




}
