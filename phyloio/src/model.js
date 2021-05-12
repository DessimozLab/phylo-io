
var uid_model = 0
import * as parser from 'biojs-io-newick';

export default class Model {

    constructor(data, settings) {

        this.settings = {
            'data_type' : 'newick',
            'use_branch_lenght' : true,
            'show_histogram' : false,
            'has_histogram_data' : false,
            'style': {},
            'stack' : {
                'type': 'genes',
                'showHistogramValues' : true,
                'showHistogramSummaryValue' : true,
                'legendTxtSize' : 12,
                'margin' : 8,
                'xInitialRightMargin' : 35,
                'stackHeight' : 100,
                'stackWidth' : 20,

            },
        }

        if (settings) {

            for(var key in settings) {
                var value = settings[key];
                this.settings[key] = value;
            }

        }

        this.uid = uid_model++;
        this.input_data = data;
        this.data = this.factory(this.parse());
        this.data.root = true;

        // check that histogram data is present
        if(this.settings.show_histogram && this.data.evolutionaryEvents) {
            this.settings.has_histogram_data  = true;
        }


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

    set_parent(node,parent){
        node.parent = parent
    }

    set_cumulated_length(node, children){
        if (node.parent) {
            node.distance_to_root = node.parent.distance_to_root + node.branch_length
        }
        else{node.distance_to_root = 0}

    }

    factory(json){

        var p;

        // if branch size is not used put 1
        if (!this.settings.use_branch_lenght) {
            p = this.traverse(json, function(n,c){n.branch_length=1})
            p.branch_length = 0 // root
        }

        // set parent attribute
        p = this.traverse(json, null , this.set_parent)

        // compute cumulated  lenght
        p = this.traverse(p, this.set_cumulated_length , null)

        return p
    }

    parse(){

        if (this.settings.data_type === "newick") {
            return parser.parse_newick(this.input_data);
        }

        else if (this.settings.data_type === "json") {
            return this.input_data
        }




    }

    collapse(data){
        data.collapse ? data.collapse = false : data.collapse = true;
    }

    reroot(data){

        // extract meta data (zoom)
        var meta = this.data.zoom;

        // create new root r
        var root = {"children": [], "name": "", "branch_length": 0}

        // source and target node of the clicked edges
        var parent = data.data.parent
        var child = data.data

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
        var c = parent.children[0]
        var r = parent
        var p = parent.parent
        const ce = parent.parent.children.indexOf(r);
        if (ce > -1) {
            parent.parent.children.splice(ce, 1);
        }
        c.parent = p
        p.children.push(c)
        r = null

        // configure new root
        root.zoom = meta
        this.data = root;
        this.data.root = true;

    }

    store_zoomTransform(zoom){

        this.data.zoom = {
            "k":zoom.k,
            "x":zoom.x,
            "y":zoom.y,
        };
    }

    reverse_order(parent,child) {

        child.children.push(parent)
        parent.parent =child

        const b = parent.children.indexOf(child);
        if (b > -1) {
            parent.children.splice(b, 1);
        }



    }

};