import Viewer from './viewer.js'
import Model from './model.js'

var uid_container = 0 // unique id generator is bound to a single Container()

// Object that bind a div with a d3 Viewer() and one or multiple Model()
export default class Container {

    constructor(container_id) {

        this.uid = uid_container++; // unique container id
        this.div_id = container_id; // related div id
        this.models = []; // list of Model()
        this.settings = {}; // per container settings
        this.current_model = 0; // current model index
        this.viewer = new Viewer(this); // attach Viewer()

    }

    // create and add Model() configure with params
    add_tree(data, settings){
        this.models.push(new Model(data, settings))
    }

    // update the data viewer and render it
    start(){
        this.viewer.set_data(this.models[this.current_model]);
        this.viewer.render(this.viewer.hierarchy);
    }

    // shift the pointer (if possible) in the model list and update viewer model
    shift_model(offset) {

        if (this.current_model + offset >= 0 && this.current_model + offset <= this.models.length -1 ) {

            // store the current zoom information
            var old_m = this.models[this.current_model]
            old_m.store_zoomTransform(this.viewer.d3.zoomTransform(this.viewer.svg.node()))

            // update new model data to viewer
            this.current_model += offset;
            var m = this.models[this.current_model]

            this.viewer.set_data(m)
            this.viewer.render(this.viewer.hierarchy)

            // apply if any stored zoom information
            var z = m.data.zoom
            if (z) {
                this.viewer.set_zoom(z.k, z.x, z.y)
            }
        }

    }

    // send action trigger to model, update the data/build d3 data & render the viewer
    trigger_(action, data){

        if (action === 'collapse') {
            this.models[this.current_model].collapse(data)
        }

        else if (action === 'reroot'){
            this.models[this.current_model].reroot(data)
        }
        this.viewer.set_data(this.models[this.current_model])
        this.viewer.render(this.viewer.hierarchy)


    }

    // collapse all node from depth todo create collapse/colllapse all function
    collapse_depth(depth, tree){


        var f


        if (depth == 0 ){


            f = function(n,c) {
                n.collapse = false
            }
        }
        else(
            f = function(n,c){
            if (n.depth >= depth ){n.collapse = true}
            else{n.collapse = false}
        })

        this.models[this.current_model].traverse(tree, f )

        this.viewer.set_data(this.models[this.current_model], false)
        this.viewer.render(this.viewer.hierarchy)
    }

    zoom_to_node(name){
        var n = []

        this.viewer.hierarchy.each(function(d) { if (d.data.name === name){n.push(d)}})

        this.viewer.centerNode(n[0])
    }

    toggle_stack(){

        var ms = this.models[this.current_model].settings

        if (ms.has_histogram_data){

            ms.show_histogram = !ms.show_histogram;
            this.viewer.set_data(this.models[this.current_model])
            this.viewer.render(this.viewer.hierarchy)

        }



    }

};


