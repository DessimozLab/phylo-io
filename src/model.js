import * as d3 from "d3";
import {MinHash, MinHashLSHForest}  from 'minhashjs'


var uid_model = 0
var uid_untitle_counter = 0
import * as parser from 'biojs-io-newick';
const { build_table, parse_nhx } = require('./utils.js')

export default class Model {

    constructor(data, settings, from_raw_data = true) {

        this.zoom;
        this.settings = {
            'uid': null,
            'domain_extended_data' : {},
            'extended_data_type' : {'Topology': 'num'},
            'labels' : {'leaf' : new Set(), 'node':new Set()},
            'colorlabels' :{'leaf' : new Set(), 'node':new Set(["Topology"])},
            'display_leaves' : true,
            'mirror': false,
            'name': null,
            'first_time_render': true,
            'data_type' : 'newick',
            'use_branch_lenght' : true,
            'show_tooltips' : false,
            'subsample_label' : true,
            'display_internal_label' : false,
            'display_internal_label_left_top' : false,
            'display_internal_label_left_bottom' : false,
            'display_duplication' : false,
            'has_branch_lenght' : true,
            'has_duplications' : false,
            'dessimode': false,
            'multiple_search':false,
            'show_histogram' : false,
            'align_tip' : false,
            'use_meta_for_leaf' : true,
            'use_meta_for_node' : false,
            'has_histogram_data' : false,
            'similarity': [],
            'style': {
                'font_size_internal' : 14,
                'color_accessor' : {'leaf' : null, 'node': "Topology"},
                'color_extent_min': {'leaf' : {}, 'node': {"Topology":0}},
                'color_extent_max':{'leaf' : {}, 'node': {"Topology":1}},
                'number_domain':{'leaf' : '3', 'node': '5'},
                'color_domain':{'leaf' : ['#253494', '#2C7FB8', '#41B6C4', '#C7E9B4', '#FFFFCC'], 'node': ['#253494', '#2C7FB8', '#41B6C4', '#C7E9B4', '#FFFFCC']},
                'color_domain_default':{'leaf' : ['#253494', '#2C7FB8', '#41B6C4', '#C7E9B4', '#FFFFCC'], 'node': ['#253494', '#2C7FB8', '#41B6C4', '#C7E9B4', '#FFFFCC']},
        },
            'tree': {
                'node_vertical_size' : 30,
                'node_horizontal_size' : 40,
                'node_radius' : 6, // move to style
                'line_width' : 3,// move to style
                'font_size':14, // move to style
                'max_depth' : 0,
            },
            'collapse_level': 0,
            'stack' : {
                'type': 'genes',//'events',
                'showHistogramValues' : false,
                'showHistogramSummaryValue' : true,
                'legendTxtSize' : 12,
                'margin' : 8,
                'xInitialRightMargin' : 45,
                'stackHeight' : 120,
                'stackWidth' : 30,
                'maxStackHeight': 'max', // ratio -> stack height fixed | max -> largest data = stack height

            },
        }

        if (settings) {

            for(var key in settings) {

                if (key == 'labels_array_leaf'){
                    var value = settings[key];
                    this.settings['labels']['leaf'] = new Set(value);
                }
                if (key == 'labels_array_node'){
                    var value = settings[key];
                    this.settings['labels']['node'] = new Set(value);
                }
                if (key == 'colorlabels_array_leaf'){
                    var value = settings[key];
                    this.settings['colorlabels']['leaf'] = new Set(value);
                }

                if (key == 'colorlabels_array_node'){
                    var value = settings[key];
                    this.settings['colorlabels']['node'] = new Set(value);
                }

                else{
                    var value = settings[key];
                    this.settings[key] = value;
                }


            }

        }

        this.settings.name = this.settings.name ? this.settings.name : "Untitled " + uid_untitle_counter++

        this.uid = null
        this.input_data = data;
        this.leaves = []



        if (from_raw_data){
            this.uid = uid_model++;
            this.settings.uid = this.uid;
            this.data = this.factory(this.parse());
        }
        else{
            this.uid = settings.uid;
            this.settings.uid = this.uid;
            this.data = data
            data.leaves = this.get_leaves(data)
            this.traverse(data, function(n,c){
                n.leaves = this.get_leaves(n)
            })
        }

        this.data.root = true;
        this.data.elementS = {}
        this.data.elementBCN = {}
        this.rooted = this.data.children.length !== 3
        this.big_tree = (this.leaves.length > 500)

        this.hierarchy_mockup = this.build_hierarchy_mockup()
        this.table = build_table(this.hierarchy_mockup)

        // check that histogram data is present and compute
        if(this.settings.show_histogram && this.data.evolutionaryEvents) {
            this.settings.has_histogram_data  = true;
            this.largestGenome =  0;
            this.largestEvents = 0; // todo

            this.traverse(this.data , function(n,c){
                let g = n.nr_hogs ? n.nr_hogs : n.nr_proteins
                if (g > this.largestGenome ) {this.largestGenome = g;}

                if (n.evolutionaryEvents){

                    let e = n.evolutionaryEvents.gained + n.evolutionaryEvents.lost + n.evolutionaryEvents.duplications
                    if (e > this.largestEvents ) {this.largestEvents = e;}

                }



            })


        }

    }

    get_name(){
        return this.settings.name
    }

    set_name(name){
        this.settings.name = name
    }

    traverse(o,func_pre, func_post) {

        if (func_pre){
            func_pre.apply(this,[o,o["children"]])
        }

        if(o["children"]){

            for (var c in o["children"] ) {

                var child = o["children"][c]

                child = this.traverse(child, func_pre, func_post)

                if (func_post) {
                    func_post.apply(this,[child,o])
                }


            }


        }

        return o

    }

    traverse_hierarchy(o,func_pre, func_post) {

        var children = o["children"] ? o["children"] : o["_children"]

        if (func_pre){
            func_pre.apply(this,[o,children])
        }

        if(children ){

            for (var c in children) {

                var child = children[c]

                child = this.traverse_hierarchy(child, func_pre, func_post)

                if (func_post) {
                    func_post.apply(this,[child,o])
                }


            }


        }

        return o

    }

    set_parent(node,parent){
        node.parent = parent
    }

    set_cumulated_length(node, children){
        if (node.parent) {
            node.depth = node.parent.depth + 1
            node.distance_to_root = node.parent.distance_to_root + node.branch_length
        }
        else{
            node.distance_to_root = 0
        node.depth = 0}

    }

    factory(json){ // todo do one traversal with all in one function

        var p;

        //has_branch_lenght
        if (typeof json.children[0].branch_length === 'undefined') {this.settings.has_branch_lenght = false}
        else {
            this.settings.labels['node'].add('Length')
            this.settings.colorlabels['node'].add('Length')
            this.settings.extended_data_type['Length'] = 'num'

            this.settings.style.color_extent_max['node']['Length'] = 0;
            this.settings.style.color_extent_min['node']['Length'] = 1000000000;
        }


        // if branch size is not used put 1
        if (!this.settings.has_branch_lenght) {
            p = this.traverse(json, function(n,c){n.branch_length=1})
            p.branch_length = 0 // root
        }

        // set parent attribute
        p = this.traverse(json, null , this.set_parent)

        // compute cumulated  lenght
        p = this.traverse(p, this.set_cumulated_length , null)

        this.traverse(p, function(n,c){

            n.extended_informations = {}
            n.elementS = {}
            n.elementBCN = {}


            if(n.branch_length){
                n.extended_informations['Length'] = n.branch_length;
                if (this.settings.style.color_extent_max['node']['Length'] < n.branch_length){
                    this.settings.style.color_extent_max['node']['Length'] = n.branch_length
                }

                if (this.settings.style.color_extent_min['node']['Length'] > n.branch_length){
                    this.settings.style.color_extent_min['node']['Length'] = n.branch_length
                }
            }

            if (typeof c !== 'undefined' && typeof n.name !== 'undefined' && n.name !== "" ) {
                n.extended_informations['Data'] = n.name;
                this.settings.labels['node'].add('Data')
                this.settings.extended_data_type['Data'] = 'num'

                if (!isNaN(n.name)){

                    if (!this.settings.colorlabels['node'].has('Data')){
                        this.settings.colorlabels['node'].add('Data');
                        this.settings.style.color_extent_max['node']['Data'] = 0;
                        this.settings.style.color_extent_min['node']['Data'] = 1000000000;
                    }

                    if (this.settings.style.color_extent_max['node']['Data'] <n.name){
                        this.settings.style.color_extent_max['node']['Data'] = n.name
                    }

                    if (this.settings.style.color_extent_min['node']['Data'] > n.name){
                        this.settings.style.color_extent_min['node']['Data'] = n.name
                    }

                }

                else {this.settings.extended_data_type['Data'] = 'cat'}
            }

            if(n.data_nhx && Object.keys(n.data_nhx).length > 0){

                Object.entries(n.data_nhx).forEach(([key, value]) => {

                    this.settings.labels['node'].add(key)

                    switch(key){
                        case 'Ev':
                            if (value == 'duplication') {
                                n.duplication = true
                                this.settings.has_duplications = true;
                            }
                            n.extended_informations.events = value
                            n.extended_informations[key] = value
                            this.settings.extended_data_type['Ev'] = 'cat'
                            break;

                        case 'D':
                            if (value == 'Y') {
                                n.duplication = true
                                this.settings.has_duplications = true;

                            }
                            else if (value == 'N'){
                                n.duplication = false
                                this.settings.has_duplications = true;
                            }
                            n.extended_informations.events = value
                            n.extended_informations[key] = value
                            this.settings.extended_data_type['D'] = 'cat'
                            break;
                        default:
                            n.extended_informations[key] = value
                            this.settings.extended_data_type[key] = 'cat'
                            break;
                    }
                });


            }


            if (n.depth > this.settings.tree.max_depth){
                this.settings.tree.max_depth = n.depth
            }
            if (!(n.hasOwnProperty('children'))){
                this.leaves.push(n)
                n.correspondingLeaf = {}

            }

            n.leaves = this.get_leaves(n)

        })

        this.suggestions = [] // autocomplete name
        this.traverse(json, function(n,c){
            if (n.name !== ''){this.suggestions.push(n.name)}}) //todo add id also and ncBI and more + check empty cfucntion
        return p
    }

    build_hierarchy_mockup(){
        return d3.hierarchy(this.data, d => d.children );
    }

    parse(){

        if (this.settings.data_type === "newick") {
            return parser.parse_newick(this.input_data);
        }

        else if (this.settings.data_type === "nhx") {
            return parse_nhx(this.input_data);
        }

        else if (this.settings.data_type === "json") {
            return this.input_data
        }




    }

    collapse(data, action){
        if (!data.children){return}
        if (action) {data.collapse = true}
        else if (action == false){data.collapse = false}
        else{data.collapse ? data.collapse = false : data.collapse = true;}

    }

    collapseAll(data, action){
        if (action) {
            this.traverse(data, (n,c) => {
                this.collapse(n, true)
                //n.collapse = true
            } , null)}
        else if (action == false){
            this.traverse(data, (n,c) => {
                this.collapse(n, false)
                //n.collapse = false
            } , null)}


    }

    get_all_collapse(data){

        var collapsed = []

        this.traverse(data, (n,c) => {if (n.collapse){
                collapsed.push(n)
            }}, null)

        return collapsed

    }

    apply_collapse_to_list(collapsed){
        this.traverse(this.data, (n,c) => {
            if (collapsed.includes(n)){
                this.collapse(n, true)
            }
            else{
                this.collapse(n, false)
            }
        } , null)
    }

    swap_subtrees(data){
         var e = data.children.pop()
        data.children.unshift(e)
        data.leaves = this.get_leaves(data)
    }

    unswap_subtrees(data){
        var e = data.children.shift()
        data.children.push(e)
        data.leaves = this.get_leaves(data)

    }

    reroot(data){

        // extract meta data (zoom)
        var meta = this.zoom;

        // create new root r

        var root = {"children": [], "name": "", "branch_length": 0, "extended_informations": {}}

        for (var key in data.extended_informations) {
            if (data.extended_informations.hasOwnProperty(key)) {
                root.extended_informations[key] =  null
            }
        }

        // source and target node of the clicked edges
        var parent = data.parent
        var child = data

        // insert new root node between target and source and connect
        root.children.push(child)
        parent.children.push(root)
        this.set_parent(child, root )
        this.set_parent(root, parent )
        const index = parent.children.indexOf(child);
        if (index > -1) {
            parent.children.splice(index, 1);
        }

        // ajust distance now that distance target/source is splitted in two
        var old_distance = child.branch_length
        parent.branch_length = old_distance/2
        child.branch_length = old_distance /2

        // While we are at the old root reverse child/parent order
        var parent = parent
        var child = root
        var stack = []
        while (parent.root != true) {

            stack.push([parent,child])

            child = parent
            parent = parent.parent

        }
        stack.push([parent,child])
        for (var e in stack){
            var p = stack[e][0]
            var c = stack[e][1]

            this.reverse_order(p,c)

        }

        // Remove old root
        var r = parent
        var p = parent.parent
        const ce = parent.parent.children.indexOf(r);
        if (ce > -1) {
            parent.parent.children.splice(ce, 1);
        }


        var i = 0,len = parent.children.length;
        while (i < len) {
            let c = parent.children[i]
            c.parent = p
            p.children.push(c)
            i++
        }



        r = null


        // configure new root
        root.zoom = meta
        this.data = root;
        this.data.root = true;

        root.leaves = this.get_leaves(root)


        this.traverse(root, function(n,c){
            n.leaves = this.get_leaves(n)
        })



    }

    trim(branch){

        // source and target node of the clicked edges
        var parent = branch.parent
        var child = branch

        var untrim_data = {
            "parent" : null,
            "floating" : null,
            "untrim_data" : null,
            "index": null,
            "root_mode": false,
        }


        if (parent.children.length > 2) {
            untrim_data.index = this.detach_child(parent,child)

            untrim_data.parent = parent;
            untrim_data.floating = false;
            untrim_data.child =  child;

            return untrim_data;
        }

        else{

            if (typeof parent.parent == 'undefined'){ // parent is root
                untrim_data.root_mode = true;

                var sibling = parent.children[0] == child ? parent.children[1] : parent.children[0]
                untrim_data.index = this.detach_child(parent, sibling)

                this.data = sibling;

                untrim_data.parent = null;
                untrim_data.floating = parent;
                untrim_data.child =  sibling;

                return untrim_data;

            }

            else{

                this.detach_child(parent.parent, parent)
                var sibling = parent.children[0] == child ? parent.children[1] : parent.children[0]
                untrim_data.index = this.detach_child(parent, sibling)
                this.attach_child(parent.parent, sibling)

                untrim_data.parent = parent.parent;
                untrim_data.floating = parent;
                untrim_data.child =  sibling;

                return untrim_data;

            }


        }

    }

    untrim(parent, floating, child, index, root_mode){

        if (floating != false){
            if (root_mode){
                this.data = floating
                this.attach_child(floating,child, index)

            }else{
                this.detach_child(parent,child)
                this.attach_child(parent,floating)
                this.attach_child(floating,child, index)
            }

        }
        else {
            this.attach_child(parent,child, index)
        }
    }

    detach_child(parent, child){
        var index = parent.children.indexOf(child);
        if (index > -1) {
            parent.children.splice(index, 1);
        }
        return index
    }

    attach_child(parent,child_to_adopt, index){

        if (typeof index !== 'undefined') {
            parent.children.splice( index, 0, child_to_adopt );
            child_to_adopt.parent = parent;

        } else {
            parent.children.push(child_to_adopt);
            child_to_adopt.parent = parent;
        }


    }

    interleave_node(parent, to_insert,child){
        this.detach_child(parent, child)
        this.attach_child(parent,to_insert)
        this.attach_child(to_insert, child)
    }

    store_zoomTransform(zoom){

        this.zoom = {
            "k":zoom.k,
            "x":zoom.x,
            "y":zoom.y,
        };
    }

    /**
     Description:
     Creates list of leaves of each node in subtree rooted at v

     Note:
     Difference between deep leaf list and leaves in:
     (A:0.1,B:0.2,(C:0.3,D:0.4):0.5);
     - Root has leaves: A, B, C and D (terminal leaves)
     - Root has deep leaves: A, B, C, D and CD (terminal leaves + intermediate leaves)
     */
    createDeepLeafList(filter) {

        function is_leaf(str) {
            return !str.includes("||");
        }

         var build_deepLeafList = function(child, node){

             if ( child.hasOwnProperty('children') ){
                 var dp = child.deepLeafList.filter(is_leaf).sort()
                 if (!dp.every((e) => e === '')){
                     child.deepLeafList.push(dp.join('||'));
                 }

             }

             node.deepLeafList = node.deepLeafList.concat(child.deepLeafList)
        }

        var build_deepLeafLeaves = function(node,children){

             if (!(node.hasOwnProperty('children') )){

                 if (typeof filter != 'undefined') {
                     if (filter.includes(node.name)){
                         node.deepLeafList = [node.name]
                     }
                     else{
                         node.deepLeafList = []
                     }

                 }
                 else{
                     node.deepLeafList = [node.name]
                 }

             }
             else {
                 node.deepLeafList = []
             }


        }

        this.traverse(this.data, build_deepLeafLeaves, build_deepLeafList)

    }

    createMinHash(){

        var assign_hash = function(node,children){

            node.min_hash = new MinHash.MinHash()
            node.deepLeafList.map(function(w) { node.min_hash.update(w) });
        }

        this.traverse(this.data, assign_hash, null)
    }

    removeMinHash(){

        var remove_hash = function(node,children){

            node.min_hash = null
        }

        this.traverse(this.data, remove_hash, null)

    }

    reverse_order(parent,child) {

        child.children.push(parent)
        parent.parent =child

        const b = parent.children.indexOf(child);
        if (b > -1) {
            parent.children.splice(b, 1);
        }

    }

    get_leaves(node){


        var l = []

        this.traverse(node, function(n,c){
            if (!(n.hasOwnProperty('children'))){
                l.push(n)
            }


    })
        return l
    }

    remove_circularity(){ // safe my model
        var data = Object.assign({}, this.data);

        this.traverse(data, function(n,c){
            n.parent=null;
            n.leaves=null;
            n.correspondingLeaf = {}
            n.elementBCN = null})

        return data
    }

    remove_circularity_only_parent_and_leaves(){ // safe my model
        var data = Object.assign({}, this.data);

        this.traverse(data, function(n,c){
            n.parent=null;
            n.leaves=null;
        })

        return data
    }


    add_circularity_back(){

        this.data.leaves = this.get_leaves(this.data)

        this.traverse(this.data, function(n,c){n.leaves = this.get_leaves(n)}, this.set_parent)


    }

    add_meta_leaves(meta, headers){

        // headers: column_name -> type

        Object.keys(headers).forEach(item => {
            if (item != 'id' || item != 'Length' ) {
                this.settings.extended_data_type[item] = headers[item]
                this.settings.domain_extended_data[item] = []
                this.settings.labels['leaf'].add(item)
                this.settings.colorlabels['leaf'].add(item)

                if (headers[item] == 'num'){
                    this.settings.style.color_extent_max['leaf'][item] = 0
                    this.settings.style.color_extent_min['leaf'][item] = 100000
                }
            }

        })

            this.get_leaves(this.data).forEach(d => {
            if (d.name in meta){

                Object.entries(meta[d.name]).forEach(item => {
                    if (item[0] != 'id'){

                        d.extended_informations[item[0]]= item[1]

                        if (this.settings.extended_data_type[item[0]] == 'num') {

                            if (this.settings.style.color_extent_max['leaf'][item[0]] < item[1]) {
                                this.settings.style.color_extent_max['leaf'][item[0]] = item[1]
                            }

                            if (this.settings.style.color_extent_min['leaf'][item[0]] > item[1]) {
                                this.settings.style.color_extent_min['leaf'][item[0]] = item[1]
                            }

                        }

                        if (this.settings.extended_data_type[item[0]] == 'cat'){
                            this.settings.domain_extended_data[item[0]].push(item[1])
                        }

                    }

                })

            }

        })



    }

    add_meta_nodes(meta, headers){


        Object.keys(headers).forEach(item => {
            if (item != 'id' || item != 'Length' ) {
                this.settings.extended_data_type[item] = headers[item]
                this.settings.domain_extended_data[item] = []
                this.settings.labels['node'].add(item)
                this.settings.colorlabels['node'].add(item)

                if (headers[item] == 'num'){
                    this.settings.style.color_extent_max['node'][item] = 0
                    this.settings.style.color_extent_min['nodes'][item] = 100000
                }
            }

        })


        this.traverse(this.data, function(n,c){

            if (n.extended_informations['Data'] in meta){

                Object.entries(meta[n.extended_informations['Data']]).forEach(item => {
                    if (item[0] != 'id'){
                        n.extended_informations[item[0]]= item[1]
                    }
                })

            }
        })
    }

};