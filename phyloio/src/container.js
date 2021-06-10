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
        this.viewer.update_collapse_level(this.models[this.current_model].settings.tree.collapse_level)
        this.viewer.zoom_by(0.05)
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
    trigger_(action, data, node){




        if (action === 'collapse') {
            this.models[this.current_model].collapse(data)
            this.viewer.apply_collapse_from_data_to_d3(data, node)

        }

        else if (action === 'reroot'){
            this.models[this.current_model].reroot(data)
        }

        //this.viewer.container_d3.append('div').attr('class', 'overlaid').text('Loading')
        //this.viewer.set_data(this.models[this.current_model])
        //this.viewer.render(this.viewer.hierarchy)

        this.viewer.build_d3_data()
        this.viewer.render(this.viewer.hierarchy)
        //this.viewer.d3.select('.overlaid').remove()



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
                if (n.depth >= depth  ){n.collapse = true}
                else{n.collapse = false}
            })

        this.models[this.current_model].traverse(tree, f )



    }

    zoom_to_node(name){

        function searchTree(obj,search,path){
            if(obj.data.name === search){ //if search is found return, add the object to the path and return it

                path.push(obj);
                return path;
            }
            else if(obj.children || obj._children){ //if children are collapsed d3 object will have them instantiated as _children
                var children = (obj.children) ? obj.children : obj._children;
                for(var i=0;i<children.length;i++){
                    path.push(obj);// we assume this path is the right one
                    var found = searchTree(children[i],search,path);
                    if(found){// we were right, this should return the bubbled-up path from the first if statement
                        return found;
                    }
                    else{//we were wrong, remove this parent from the path and continue iterating
                        path.pop();
                    }
                }
            }
            else{//not the right object, return false so it will continue to iterate in the loop
                return false;
            }
        }


        var p = searchTree(this.viewer.hierarchy, name, [])

        console.log(p)

        for(var i=1;i<p.length;i++){ // 1 is for skipping the root

            this.models[this.current_model].collapse(p[i].data, false)
            this.viewer.apply_collapse_from_data_to_d3(p[i].data, p[i])


        }

        this.viewer.set_data(this.models[this.current_model])
        this.viewer.render(this.viewer.hierarchy)
        var n= []
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


