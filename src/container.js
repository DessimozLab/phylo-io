import Viewer from './viewer.js'
import Model from './model.js'
import Interface from "./interface";
import * as bootstrap from "bootstrap";
import * as d3 from "d3";
const { build_table, save_file_as } = require('./utils.js')
var parser = require("biojs-io-newick");


var uid_container = 0 // unique id generator is bound to a single Container()

// Object that bind a div with a d3 Viewer() and one or multiple Model()
export default class Container {
    get uid() {
        return this._uid;
    }

    constructor(container_id, api) {

        this._uid = uid_container++; // unique container id
        this.div_id = container_id; // related div id
        this.models = []; // list of Model()
        this.settings = {}; // per container settings
        this.current_model = 0; // current model index
        this.viewer = new Viewer(this); // attach Viewer()
        this.history_actions = [] //  for Undo feature
        this.api = api
        this.message_loader = null

    }

    replace_model(old_model,new_model){
        var index = this.models.indexOf(old_model);

        if (~index) {
            this.models[index] = new_model;
        }

    }

    add_action(name, fn_object, counter_fn, argu, refresh_interface){

        var refresh_interface = (typeof refresh_interface !== 'undefined') ? refresh_interface : false;

        if (!this.api.undoing){
            this.history_actions.push({'name': name, 'fonct':counter_fn, 'fonction_obj':fn_object, 'argu': argu, 'refresh_interface' : refresh_interface})
        }

    }

    get_last_action(){
        return this.history_actions[this.history_actions.length-1]
    }

    pop_last_action(){
        return this.history_actions.pop()
    }

    // create and add Model() configure with params
    add_tree(data, settings, from_raw_data=true){
        this.models.push(new Model(data, settings, from_raw_data))
    }

    remove_all_trees(){
        this.models = []
    }

    remove_current_tree(apply_change_UI){

        var apply_change_UI = (typeof apply_change_UI !== 'undefined') ? apply_change_UI : false;

        var current_model = this.models[this.current_model]

        const index = this.models.indexOf(current_model);
        if (index > -1) {
            this.models.splice(index, 1);

            if (this.current_model > this.models.length -1){
                console.log('out of index - recalibrating');
                this.current_model -= 1

            }

            if (apply_change_UI){
                if (this.models.length == 0){

                    this.current_model = 0

                    this.viewer.remove_data()
                    this.interface = new Interface(this.viewer, this, true)
                }
                else{
                    this.shift_model(0, false)
                }
            }

        }




    }

    // update the data viewer and render it
    start(rendering){


        if (this.models.length <= 0){
            this.interface = new Interface(this.viewer, this, true)
            return
        }

        var rendering = (typeof rendering !== 'undefined') ? rendering : false; // todo inverted ??

        this.viewer.set_data(this.models[this.current_model]);

        if (rendering){

            var z = this.models[this.current_model].zoom


            if (z) {
                this.viewer.set_zoom(z.k, z.x, z.y)
            }

            this.viewer.render(this.viewer.hierarchy);
            //this.viewer.update_collapse_level(this.models[this.current_model].settings.collapse_level)



        }

        //this.viewer.zoom_by(0.4) #STACK
        //this.viewer.render(this.viewer.hierarchy); #STACK

    }

    // shift the pointer (if possible) in the model list and update viewer model
    shift_model(offset, store_old) {


        var store_old = (typeof store_old !== 'undefined') ? store_old : true;


        if (this.current_model + offset >= 0 && this.current_model + offset <= this.models.length -1 ) {

            this.add_action('Change tree',  this, this.shift_model, [-offset, store_old] )

            if (store_old){
                // store the current zoom information
                var old_m = this.models[this.current_model]
                old_m.store_zoomTransform(this.viewer.d3.zoomTransform(this.viewer.svg.node()))
            }

            // update new model data to viewer
            this.current_model += offset;
            var m = this.models[this.current_model]



            this.viewer.set_data(m)


            this.api.stop_all_workers()
            this.compute_topology_and_render_bounded_viewer(false)

            // apply if any stored zoom information
            var z = m.zoom
            if (z) {
                this.viewer.set_zoom(z.k, z.x, z.y)

            }

            this.viewer.render(this.viewer.hierarchy)

            if (this.api.settings.compute_distance && this.api.bound_container.includes(this)){
                this.api.send_worker_distance()
            }




        }

    }

    // send action trigger to model, update the data/build d3 data & render the viewer
    trigger_(action, data, node){

        var m = this.models[this.current_model];

        if (action === 'collapse') {
            this.add_action('Collapse this node',  this, this.trigger_, [action, data, node] )
            m.collapse(data)
            this.viewer.apply_collapse_from_data_to_d3(data, node)
            this.viewer.build_d3_cluster()
            this.viewer.render(node)

        }
        else if (action === 'collapseAll') {
            this.add_action('Collapse All',  this, this.trigger_, ['expandAll', data, node] )
            m.collapseAll(data, true)
            this.viewer.apply_collapseAll_from_data_to_d3(data, node)
            this.viewer.build_d3_cluster()
            this.viewer.render(node)

        }
        else if (action === 'expandAll') {
            this.add_action('Expand All',  this, this.trigger_, ['collapseAll', data, node] )
            m.collapseAll(data, false)
            this.viewer.apply_expandAll_from_data_to_d3(data, node)
            this.viewer.build_d3_cluster()
            this.viewer.render(node)

        }
        else if (action === 'swap') {
            this.add_action('Swap',  this, this.trigger_, ['unswap', data, node] )
            m.swap_subtrees(data)
            this.viewer.apply_swap_from_data_to_d3(data, node)
            this.viewer.build_d3_cluster()
            this.viewer.render(node)


        }
        else if (action === 'unswap') {
            m.unswap_subtrees(data)
            this.viewer.apply_unswap_from_data_to_d3(data, node)
            this.viewer.build_d3_cluster()
            this.viewer.render(node)


        }
        else if (action === 'reroot'){

            this.add_action('Reroot',  this, this.trigger_, ['reroot', this.viewer.hierarchy.children[0].data, null] )
            m.reroot(data)
            m.rooted = true
            this.viewer.set_data(m)
            m.hierarchy_mockup = m.build_hierarchy_mockup()
            m.table = build_table(m.hierarchy_mockup)

            this.api.stop_all_workers()
            this.compute_topology_and_render_bounded_viewer(true)
            if (this.api.settings.compute_distance && this.api.bound_container.includes(this)){
                this.api.delete_modele_distance(m)
                this.api.send_worker_distance()
            }
            this.viewer.render(this.viewer.hierarchy)

        }
        else if (action === 'trim'){
            var untrim_data = m.trim(data.data)
            this.add_action('Trim',  this, this.trigger_, ['untrim', untrim_data, null] )
            this.viewer.set_data(m)
            m.hierarchy_mockup = m.build_hierarchy_mockup()
            m.table = build_table(m.hierarchy_mockup)
            this.api.stop_all_workers()
            this.compute_topology_and_render_bounded_viewer(true)
            if (this.api.settings.compute_distance && this.api.bound_container.includes(this)){
                this.api.delete_modele_distance(m)
                this.api.send_worker_distance()
            }
            this.viewer.render(this.viewer.hierarchy)
        }
        else if (action === 'untrim'){
            m.untrim(data.parent, data.floating, data.child, data.index, data.root_mode)
            this.viewer.set_data(m)
            m.hierarchy_mockup = m.build_hierarchy_mockup()
            m.table = build_table(m.hierarchy_mockup)
            this.api.stop_all_workers()
            this.compute_topology_and_render_bounded_viewer(true)
            if (this.api.settings.compute_distance && this.api.bound_container.includes(this)){
                this.api.delete_modele_distance(m)
                this.api.send_worker_distance()
            }
            this.viewer.render(this.viewer.hierarchy)
        }

    }

    // collapse all node from depth todo create collapse/colllapse all function
    collapse_depth(depth, tree){

        var f

        var model =  this.models[this.current_model];
        var viewer = this.viewer;


        if (depth == 0 ){

            f = function(n,c) {
                model.collapse(n.data, false)
                viewer.apply_collapse_from_data_to_d3(n.data, n)
            }
        }
        else {
            f = function(n,c){

                if (n.depth >= depth  ){

                    model.collapse(n.data, true)

                }
                else{
                    model.collapse(n.data, false)
                }

                viewer.apply_collapse_from_data_to_d3(n.data, n)
            }
        }

        this.models[this.current_model].traverse_hierarchy(this.viewer.hierarchy,  f )



    }

    zoom_to_node(name){

        if (name === ''){return}


        if(this.viewer.model.settings.multiple_search != true) {

            this.viewer.hierarchy.each(function (d) {
                d.data.search_path = false;
                d.data.search_node = false;
            })
        }


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



       for(var i=1;i<p.length;i++){ // 1 is for skipping the root

           this.models[this.current_model].collapse(p[i].data, false)
           this.viewer.apply_collapse_from_data_to_d3(p[i].data, p[i])
           p[i].data.search_path = true;


       }

       p[p.length-1].data.search_node = true;

       this.viewer.set_data(this.models[this.current_model])
       this.viewer.render(this.viewer.hierarchy)
       var n= []
       this.viewer.hierarchy.each(function(d) { if (d.data.name === name){n.push(d)}})

        this.viewer.centerNode(n[0])


    }

    toggle_rooting(){
        this.models[this.current_model].rooted = !this.models[this.current_model].rooted
        this.interface = new Interface(this.viewer, this)
        this.viewer.render(this.viewer.hierarchy)

        if (this.api.settings.compute_distance && this.api.bound_container.includes(this)){
            this.api.delete_modele_distance(m)
            this.api.send_worker_distance()
        }

    }

    toggle_stack(){

        var ms = this.models[this.current_model].settings

        if (ms.has_histogram_data){

            ms.show_histogram = !ms.show_histogram;
            this.viewer.set_data(this.models[this.current_model])
            this.viewer.render(this.viewer.hierarchy)

        }



    }

    // INTERFACE CONTROL

    modify_node_size_percent(percent, axis ){

        var model = this.models[this.current_model]

        if (axis === 'vertical') {
            model.settings.tree.node_vertical_size = model.settings.tree.node_vertical_size * (1 + percent)
        }
        else if (axis === 'horizontal') {
            model.settings.tree.node_horizontal_size = model.settings.tree.node_horizontal_size * (1 + percent)
        }

        this.viewer.d3_cluster.nodeSize([ model.settings.tree.node_vertical_size,model.settings.tree.node_horizontal_size])
        this.viewer.build_d3_cluster()
        this.viewer.render(this.viewer.hierarchy)

        if (this.viewer.interface && model.settings.use_branch_lenght) {
            var k = this.viewer.d3.zoomTransform(d3.select("#master_g" + this.viewer.uid).node()).k
            this.viewer.interface.update_scale_value(k);
        }

    }

    modify_node_size(axis, variation){

        var model = this.models[this.current_model]
        var viewer = this.viewer

        if (axis === 'vertical') {
            if ((model.settings.tree.node_vertical_size + variation) <= 0){return}
            model.settings.tree.node_vertical_size += variation
        }
        else if (axis === 'horizontal') {
            if ((model.settings.tree.node_horizontal_size + variation) <= 0){return}
            model.settings.tree.node_horizontal_size += variation
        }

        viewer.d3_cluster.nodeSize([ model.settings.tree.node_vertical_size,model.settings.tree.node_horizontal_size])
        viewer.build_d3_cluster()
        viewer.render(viewer.hierarchy)


        if (viewer.interface && model.settings.use_branch_lenght) {
            var k = viewer.d3.zoomTransform(d3.select("#master_g" + viewer.uid).node()).k
            viewer.interface.update_scale_value(k);
        }

    }

    update_node_radius_percent(percent){

        var model = this.models[this.current_model]
        var viewer = this.viewer

        model.settings.tree.node_radius =  model.settings.tree.node_radius * (1 + percent)
        viewer.render(viewer.hierarchy)
    }

    update_line_width_percent(percent){
        var model = this.models[this.current_model]
        var viewer = this.viewer

        model.settings.tree.line_width = model.settings.tree.line_width * (1 + percent)
        viewer.render(viewer.hierarchy)
    }

    update_font_size(val){
        this.viewer.model.settings.tree.font_size = val
        this.viewer.render(this.viewer.hierarchy)
    }

    update_font_size_node(val){
        this.viewer.model.settings.style.font_size_internal = val
        this.viewer.render(this.viewer.hierarchy)
    }

    update_font_size_leaf_percent(val){
        this.viewer.model.settings.tree.font_size = this.viewer.model.settings.tree.font_size  * (1 + val)
        this.viewer.render(this.viewer.hierarchy)
    }

    update_font_size_node_percent(val){
        this.viewer.model.settings.style.font_size_internal = this.viewer.model.settings.style.font_size_internal * (1 + val)
        this.viewer.render(this.viewer.hierarchy)
    }

    //

    compute_topology_and_render_bounded_viewer(recompute=true){ // change to als eby default and deal with elementS -> one vlue instead of model uid to val

        // if bound container and compare mode activate, we need to update it too
        if (this.api.settings.compareMode && this.api.bound_container.includes(this)){



            var con1 = this.api.bound_container[0]
            var con2 =  this.api.bound_container[1]



            if ( con1.models.length > 0 && con2.models.length > 0){
                this.api.compute_visible_topology_similarity( recompute)


            var ccc = (con1 == this) ? con2 : con1
            ccc.viewer.render(ccc.viewer.hierarchy)

            }
        }
    }

    reroot_to_compared_tree(){


        var con1 = this.api.bound_container[0]
        var con2 =  this.api.bound_container[1]

        if (con1 && con2){

            if ( con1.models.length > 0 && con2.models.length > 0){
                var ccc = (con1 == this) ? con2 : con1
                var model = ccc.viewer.model

                var bcnode = model.data.children[0].elementBCN[this.viewer.model.uid]
                if(bcnode && bcnode.parent){
                    this.trigger_("reroot", bcnode)
                }
            }
        }
    }

    reorder_to_compared_tree(){

        var con1 = this.api.bound_container[0]
        var con2 =  this.api.bound_container[1]

        if (con1 && con2){

            if ( con1.models.length > 0 && con2.models.length > 0){
                var ccc = (con1 == this) ? con2 : con1
                var model_reference = ccc.viewer.model


                this.viewer.model.traverse(this.viewer.model.data, null,  (child,d) => {



                    if (child.children || child._children) {
                        var leaves =   Array.from(child.leaves, (_, k) => _.name);
                        var fixedLeaves = this.getCorrespondingNode(leaves, model_reference.data);

                        if (leaves[0] !== fixedLeaves[0] && leaves[leaves.length - 1] !== fixedLeaves[fixedLeaves.length - 1]) {
                            this.reorder_leaves(child);
                        }
                    }
                })

                this.viewer.set_data(this.viewer.model)
                this.viewer.render(this.viewer.hierarchy)

            }
        }

    }

    getCorrespondingNode(treeLeaves, ifixedTree) {

        var bestCorrespondingFixTreeLeaves = [];
        var bestCount = 0;

        this.viewer.model.traverse(ifixedTree, null,  (child,d) => {


            if (child.children || child._children) {
                var fixedTreeLeaves = Array.from(child.leaves, (_, k) => _.name);
                var count = 0;
                for (var i = 0; i < fixedTreeLeaves.length; i++) {
                    if (treeLeaves.indexOf(fixedTreeLeaves[i]) !== -1) {
                        count += 1;
                    }
                }

                if (count > bestCount) {
                    bestCorrespondingFixTreeLeaves = fixedTreeLeaves;
                    bestCount = count;
                }

            }

        })

        return bestCorrespondingFixTreeLeaves;
    }

    reorder_leaves(d){

        var bocal;

        if (d.children) {bocal = d.children }
        else if (d._children) {bocal = d._children }
        else {return}

        var e = bocal.pop()
        bocal.unshift(e)
        d.leaves = this.viewer.model.get_leaves(d)


    }

    create_model_from_hierarchy_node(node){

        var data = Object.assign({}, node.data);

        this.viewer.model.traverse(data, function(n,c){
            n.parent=null;
            n.leaves=null;
            n.correspondingLeaf = {}
            n.elementBCN = null})


        var data = JSON.parse(JSON.stringify(data))

        var model = this.viewer.model;
        this.add_tree(data, model.settings, false)

        this.models[this.models.length-1].add_circularity_back()

        this.viewer.model.add_circularity_back()

        this.interface = new Interface(this.viewer, this)



    }

    export_as_newick(){
        var nwk = parser.parse_json(this.viewer.model.remove_circularity())

        save_file_as(this.viewer.model.settings.name  + ".nwk", nwk)


    }

};


