import * as d3 from "d3";
import {MinHash}  from 'minhashjs'


var uid_model = 0
var uid_untitle_counter = 0
import * as parser from 'biojs-io-newick';
const { parse_nhx } = require('./utils.js');
const { phyloXml } = require('./phyloxml.js');

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
            'display_nodes_labels' : true,
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
            'display_leaf_label' : false,
            'display_leaf_label_left_top' : false,
            'display_leaf_label_left_bottom' : false,
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
                'number_domain':{ 'Topology': 5, 'Length': 5},
                'color_domain':{'Topology' : ['#253494', '#2C7FB8', '#41B6C4', '#C7E9B4', '#FFFFCC'], 'Length': ['#253494', '#2C7FB8', '#41B6C4', '#C7E9B4', '#FFFFCC']},
                'color_domain_default': ['#253494', '#2C7FB8', '#41B6C4', '#C7E9B4', '#FFFFCC'],
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
                'has_support' : false,
                'only_support' : false,

            },
            'sync_coloring': false,
            'selected_triangle_coloring': 'None',
            'colorScale': {'leaf' : null, 'node':null},
            'intercolor': {'leaf' : null, 'node': null}
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
            this.set_color_scale('node');
            this.set_color_scale('leaf');
        }

        this.data.root = true;
        this.data.elementS = {}
        this.data.elementBCN = {}
        this.rooted = this.data.children.length !== 3
        this.big_tree = (this.leaves.length > 500)

        // check that histogram data is present and compute
        if(this.settings.show_histogram && this.data.evolutionaryEvents) {
            this.settings.has_histogram_data  = true;
            this.largestGenome =  0;
            this.largestEvents = 0; // todo

            this.traverse(this.data , function(n,c){

                let g = n.nr_hogs ? n.nr_hogs : n.nr_proteins
                if (g > this.largestGenome ) {this.largestGenome = g;}

                if (n.evolutionaryEvents){

                    var ga = n.evolutionaryEvents.gained ? n.evolutionaryEvents.gained : 0
                    var l = n.evolutionaryEvents.lost ? n.evolutionaryEvents.lost : 0
                    var d = n.evolutionaryEvents.duplications ? n.evolutionaryEvents.duplications : 0

                    let e = ga + l + d


                    if (e > this.largestEvents ) {this.largestEvents = e;}

                }

                if (this.settings.stack.has_support){

                    let g_support = n.nr_hogs_support ? n.nr_hogs_support : n.nr_proteins_support
                    if (g_support > this.largestGenome_support ) {this.largestGenome_support = g_support;}

                    if (n.evolutionaryEvents_support){


                        var ga_support = n.evolutionaryEvents_support.gained ? n.evolutionaryEvents_support.gained : 0
                        var l_support = n.evolutionaryEvents_support.lost ? n.evolutionaryEvents_support.lost : 0
                        var d_support = n.evolutionaryEvents_support.duplications ? n.evolutionaryEvents_support.duplications : 0

                        let e_support = ga_support + l_support + d_support

                        if (e_support > this.largestEvents_support ) {this.largestEvents_support = e_support;}

                    }
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

    set_color_scale(type){

        var type = (typeof type !== 'undefined') ? type : 'node';


        var colorScaleDomain = false;
        var colorScaleRange;
        var number;


        if (typeof this != "undefined" && this) {


            // If categorical do special
            var acc = this.settings.style.color_accessor[type]
            var type_acc = this.settings.extended_data_type[acc]


            if (acc === null){
                this.settings.colorScale[type] = null
                return
            }


            if (type_acc == 'cat'){

                this.settings.colorScale[type] = this.container_object.api.get_color_scale(acc)



                //var dom = this.settings.domain_extended_data[acc]
                //this.settings.colorScale[type] = d3.scaleOrdinal().domain(dom).range(d3.schemePaired);
                return
            }

            else if (type_acc == 'color'){

                this.settings.colorScale[type] = null
                return
            }



            number = this.settings.style.number_domain[acc]


            if (this.settings.style.color_accessor[type] != null && this.settings.style.color_accessor[type] != 'Topology' ) {

                var ms = this.settings.style;

                var ca = ms.color_accessor[type];

                if (ms.color_extent_max[type][ca] == ms.color_extent_min[type][ca]){
                    this.settings.intercolor[type] = d3.interpolate( ms.color_extent_max[type][ca], ms.color_extent_max[type][ca]-1)
                }else{
                    this.settings.intercolor[type] = d3.interpolate( ms.color_extent_max[type][ca], ms.color_extent_min[type][ca])
                }


                colorScaleRange = this.settings.style.color_domain[acc];

            }

            else {
                this.settings.intercolor[type] = d3.interpolate(1,0)
                colorScaleRange = this.settings.style.color_domain[acc];
            }



        }
        else {

            number = 5;
            colorScaleRange = ['#253494', '#2C7FB8', '#41B6C4', '#C7E9B4', '#FFFFCC']
            this.settings.intercolor[type] = d3.interpolate(1, 0);
        }


        switch (number) {
            case 2:
                colorScaleDomain = [this.settings.intercolor[type](0),this.settings.intercolor[type](1)]
                break;
            case 3:
                colorScaleDomain = [this.settings.intercolor[type](0),this.settings.intercolor[type](0.5) , this.settings.intercolor[type](1)]
                break;
            case 4:
                colorScaleDomain = [this.settings.intercolor[type](0),this.settings.intercolor[type](0.33),this.settings.intercolor[type](0.66) , this.settings.intercolor[type](1)]
                break;
            case 5:
                colorScaleDomain = [this.settings.intercolor[type](0),this.settings.intercolor[type](0.25) ,this.settings.intercolor[type](0.5) ,this.settings.intercolor[type](0.75) , this.settings.intercolor[type](1)]

        }


        this.settings.colorScale[type] = d3.scaleLinear()
            .domain(colorScaleDomain)
            .range(colorScaleRange);



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
        this.settings.has_branch_lenght = false;

        json.children.forEach((child) => {
            if (typeof child.branch_length != 'undefined') { this.settings.has_branch_lenght = true; }
        })

        if (this.settings.has_branch_lenght) {
            this.settings.labels['node'].add('Length')
            this.settings.labels['leaf'].add('Length')
            this.settings.colorlabels['node'].add('Length')
            this.settings.colorlabels['leaf'].add('Length')
            this.settings.extended_data_type['Length'] = 'num'

            this.settings.style.color_extent_max['node']['Length'] = 0;
            this.settings.style.color_extent_min['node']['Length'] = 1000000000;

            this.settings.style.color_extent_max['leaf']['Length'] = 0;
            this.settings.style.color_extent_min['leaf']['Length'] = 1000000000;
        }


        // if branch size is not used put 1
        if (!this.settings.has_branch_lenght) {
            p = this.traverse(json, function(n,c){n.branch_length=1})
            p.branch_length = 0 // root
        }
        else{ // sanity check
            p = this.traverse(json, function(n,c){if (typeof n.branch_length == 'undefined') {n.branch_length=1} })
            if (typeof p.branch_length == 'undefined') {p.branch_length=1}
        }

        // set parent attribute
        p = this.traverse(json, null , this.set_parent)

        // compute cumulated  lenght
        p = this.traverse(p, this.set_cumulated_length , null)

        this.traverse(p, function(n,c){

            n.extended_informations = {}
            n.elementS = {}
            n.elementBCN = {}
            n.force_label_show = null;

            if(n.branch_length){
                n.extended_informations['Length'] = n.branch_length;
                if (this.settings.style.color_extent_max['node']['Length'] < n.branch_length){
                    this.settings.style.color_extent_max['node']['Length'] = n.branch_length
                    this.settings.style.color_extent_max['leaf']['Length'] = n.branch_length
                }

                if (this.settings.style.color_extent_min['node']['Length'] > n.branch_length){
                    this.settings.style.color_extent_min['node']['Length'] = n.branch_length
                    this.settings.style.color_extent_min['leaf']['Length'] = n.branch_length
                }
            }

            if (typeof c !== 'undefined' && typeof n.name !== 'undefined' && n.name !== "" ) {
                n.extended_informations['Data'] = n.name;
                this.settings.labels['node'].add('Data')
                this.settings.labels['leaf'].add('Data')
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
                    this.settings.labels['leaf'].add(key)

                    this.settings.colorlabels['node'].add(key)
                    this.settings.colorlabels['leaf'].add(key)


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
                        case 'DD':
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
            // phyloxml specific attributes
            for (let attr of ["taxonomies", "sequences"]) {
                if (n.hasOwnProperty(attr)) {
                    Object.entries(n[attr][0]).forEach(([key, value]) => {
                        n.extended_informations[attr + "_" + key] = value;
                        this.settings.extended_data_type[attr + "_" + key] = "cat";
                    });
                    if (n.name === undefined || n.name === "") {
                        if (attr === "taxonomies" && n.taxonomies[0].hasOwnProperty("scientific_name")) {
                            n.name = n.taxonomies[0].scientific_name;
                        } else if (attr === "sequences" && n.sequence.hasOwnProperty("name")) {
                            n.name = n.sequences[0].name;
                        }
                    }
                }
            }
            if (n.hasOwnProperty("date")){
                n.extended_informations['date'] = n.date;
                this.settings.extended_data_type['date'] = "cat";
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

        // check the type of all extended data
        this.traverse(p, function(n,c){

            for (var key in n.extended_informations){
                if (n.extended_informations.hasOwnProperty(key)) {

                    if (this.settings.extended_data_type[key] === 'num'){
                        continue
                    }

                    if (!isNaN(n.extended_informations[key])){
                        this.settings.extended_data_type[key] = 'num'
                    }

                }
            }

        })


        this.settings.colorlabels['node'].forEach( (value) => {
            if (this.settings.extended_data_type[value] === 'num' ) {
                this.settings.style.color_extent_max['node'][value] = 0
                this.settings.style.color_extent_min['node'][value] = 1000000000
            }
        });

        this.settings.colorlabels['leaf'].forEach( (value) => {
            if (this.settings.extended_data_type[value] === 'num' ) {
                this.settings.style.color_extent_max['leaf'][value] = 0
                this.settings.style.color_extent_min['leaf'][value] = 1000000000
            }
        });


        this.traverse(p, function(n,c) {
            for (var key in n.extended_informations) {

                if (n.extended_informations.hasOwnProperty(key)) {



                    if (this.settings.extended_data_type[key] === 'num') {

                        // check if min and max are set for node and leaf

                        var val = n.extended_informations[key].toString().indexOf('.') != -1 ? parseFloat(n.extended_informations[key]) : parseInt(n.extended_informations[key])

                        if (this.settings.style.color_extent_max['node'][key] < val) {
                            this.settings.style.color_extent_max['node'][key] = val

                        }

                        if (this.settings.style.color_extent_min['node'][key] > val) {
                            this.settings.style.color_extent_min['node'][key] = val
                        }

                        if (this.settings.style.color_extent_max['leaf'][key] < val) {
                            this.settings.style.color_extent_max['leaf'][key] = val
                        }

                        if (this.settings.style.color_extent_min['leaf'][key] > val) {
                            this.settings.style.color_extent_min['leaf'][key] = val
                        }

                    }

                }
            }

        })



        this.settings.suggestions = [] // autocomplete name
        this.traverse(json, function(n,c){

            if (n.name !== ''){this.settings.suggestions.push(n.name)}}) //todo add id also and ncBI and more + check empty cfucntion

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
        else if (this.settings.data_type === "phyloxml") {
            let phylogenies = phyloXml.parse(this.input_data);
            if (phylogenies === undefined || phylogenies.length === 0){
                console.error("No phylogenies found");
                return {};
            } else if (phylogenies.length > 1) {
                console.log("dataset contains more than one phylogenies: "+phylogenies.length + " Will only use the first one");
            }
            return phylogenies[0].children[0];  // return toplevel clade which is returned as children[0].
        }
    }

    collapse(data, action){
        if (!data.children){return}
        if (action) {data.collapse = true}
        else if (action == false){data.collapse = false}
        else{data.collapse ? data.collapse = false : data.collapse = true;}

    }

    toggle_show_label(data){
        data.force_label_show ||  data.force_label_show == null ? data.force_label_show = false : data.force_label_show = true;
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

        child.branch_length = old_distance/2
        child.extended_informations['Length'] = old_distance/2

        parent.branch_length_before_reverse = parent.branch_length
        parent.branch_length = old_distance /2
        parent.extended_informations['Length'] = old_distance/2



        // While we are at the old root reverse child/parent order
        var parent = parent
        var child = root
        var stack = []

        while (parent.root != true) {

            stack.push([parent,child])

            child = parent
            parent = parent.parent


            parent.branch_length_before_reverse = parent.branch_length
            if (child.branch_length_before_reverse){
                parent.branch_length = child.branch_length_before_reverse
                parent.extended_informations['Length'] = child.branch_length_before_reverse
            }
            else{
                parent.branch_length = child.branch_length
                parent.extended_informations['Length'] = child.branch_length
            }


        }
        stack.push([parent,child])
        for (var e in stack){
            var p = stack[e][0]
            var c = stack[e][1]

            this.reverse_order(p,c)

        }

        // Remove old root

        var old_root = parent
        var leading_branch = parent.parent



        if (old_root.children.length == 1){

            const ce = leading_branch.children.indexOf(old_root);
            if (ce > -1) {
                leading_branch.children.splice(ce, 1);
            }

            var i = 0,len = old_root.children.length;
            while (i < len) {
                let c = old_root.children[i]
                c.parent = leading_branch
                leading_branch.children.push(c)
                i++
            }

            old_root = null



        }

        // For multifurcation we need to keep the root
        else {
            old_root.root = false
            old_root.branch_length = leading_branch.branch_length
            parent.extended_informations['Length'] = leading_branch.branch_length
        }


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
            return !str.includes("|__|");
        }

         var build_deepLeafList = function(child, node){

             if ( child.hasOwnProperty('children') ){
                 var dp = child.deepLeafList.filter(is_leaf).sort()
                 if (!dp.every((e) => e === '')){
                     child.deepLeafList.push(dp.join('|__|'));
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

    add_meta_leaves(meta, headers, api, reference){

        // headers: column_name -> type

        Object.keys(headers).forEach(item => {
            if (item != reference || item != 'Length' ) {

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
                    if (item[0] != reference){

                        d.extended_informations[item[0]]= item[1]

                        if (this.settings.extended_data_type[item[0]] == 'num' && !isNaN(item[1])) {

                            item[1] = item[1].toString().indexOf('.') != -1 ? parseFloat(item[1]) : parseInt(item[1])

                            if (this.settings.style.color_extent_max['leaf'][item[0]] < item[1]) {
                                this.settings.style.color_extent_max['leaf'][item[0]] = item[1]
                            }

                            if (this.settings.style.color_extent_min['leaf'][item[0]] > item[1]) {
                                this.settings.style.color_extent_min['leaf'][item[0]] = item[1]
                            }

                        }

                        if (this.settings.extended_data_type[item[0]] == 'cat'){

                            var cs = api.get_color_scale(item[0])
                            cs.add_value_to_map(item[1])

                            this.settings.domain_extended_data[item[0]].push(item[1])
                        }

                    }

                })

            }

        })


        Object.keys(headers).forEach(item => {
            if (item != reference || item != 'Length' ) {


                if (headers[item] == 'cat'){
                    api.get_color_scale(item).update()

                }
            }

        })



    }

    add_meta_nodes(meta, headers, api, reference){


        Object.keys(headers).forEach(item => {
            if (item != reference|| item != 'Length' ) {
                this.settings.extended_data_type[item] = headers[item]
                this.settings.domain_extended_data[item] = []
                this.settings.labels['node'].add(item)
                this.settings.colorlabels['node'].add(item)

                if (headers[item] == 'num'){
                    this.settings.style.color_extent_max['node'][item] = 0
                    this.settings.style.color_extent_min['node'][item] = 100000
                }
            }

        })

        this.traverse(this.data, function(n,c){


            if (n.extended_informations['Data'] in meta){

                Object.entries(meta[n.extended_informations['Data']]).forEach(item => {
                    if (item[0] != reference){
                        n.extended_informations[item[0]]= item[1]

                        if (this.settings.extended_data_type[item[0]] == 'cat'){

                            var cs = api.get_color_scale(item[0])
                            cs.add_value_to_map(item[1])

                        }

                        else if (this.settings.extended_data_type[item[0]] == 'num' && !isNaN(item[1]) ) {

                            item[1] = item[1].toString().indexOf('.') != -1 ? parseFloat(item[1]) : parseInt(item[1])

                            if (this.settings.style.color_extent_max['node'][item[0]] < item[1]) {
                                this.settings.style.color_extent_max['node'][item[0]] = item[1]
                            }

                            if (this.settings.style.color_extent_min['node'][item[0]] > item[1]) {
                                this.settings.style.color_extent_min['node'][item[0]] = item[1]
                            }

                        }
                    }
                })

            }
        })

        Object.keys(headers).forEach(item => {

            if (item != reference || item != 'Length' ) {


                if (headers[item] == 'cat'){
                    api.get_color_scale(item).update()

                }
            }

        })
    }

    get_node_by_leafset(lset){

        function setsAreEqual(a, b) {
            if (a.size !== b.size) {
                return false;
            }

            return Array.from(a).every(element => {
                return b.has(element);
            });
        }

        lset = new Set(lset.map(leaf => leaf.toString()))

        var target = false


        var check = function(node,children){

            var nl = new Set(node.leaves.map(leaf => leaf.name.replaceAll("'", '').toString()))

            if ( setsAreEqual(nl,lset)){
                target = node
            }

        }

        this.traverse(this.data, check, null)

        return target
    }

};