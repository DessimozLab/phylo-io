import Container from './container.js'
const { compute_visible_topology_similarity } = require('./comparison.js')
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

        //new keyboardManager(this);
    }

}
