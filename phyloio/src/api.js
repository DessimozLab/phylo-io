import Container from './container.js'
import keyboardManager from './keyboardManager.js'

// class to handle user interaction to init and set up phyloIO instance
export default class API {

    constructor() {
        this.containers = {}; // {container id -> Container() }
        this.settings = {
            "compareMode" : false, // compare for each pair of tree topological similarity
        };


    }

    // create adn return a new container and add it the dict using its div id
    create_container(container_id){ // container_id -> str
        let c = new Container(container_id);
        this.containers[container_id] = c;
        return c;
    }

    // start the app by computing required information and starting each container
    start(){

        for (const [uid, container] of Object.entries(this.containers)) {
            container.start()
        }

        new keyboardManager(this);
    }

}
