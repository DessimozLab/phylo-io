
var uid_model = 0
import * as parser from 'biojs-io-newick';

export default class Container {

    constructor(data, params) {

        var params = params || {'data_type': 'newick', "use_branch_lenght": true, 'stack': false}; // todo if only one param is set should work;
        this.uid = uid_model++;
        this.data_type = params.data_type;
        this.input_data = data;
        this.data = this.factory(this.parse());
        this.data.root = true;

    }

    traverse(o,func_pre, func_post) {

        if (func_pre){
            func_pre.apply(this,[o,o["children"]])
        }

        if(o["children"]){

            for (var c in o["children"] ) {

                var child = o["children"][c]

                child= this.traverse(child, func_pre, func_post)

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

    factory(json){
        return this.traverse(json, null , this.set_parent);
    }

    parse(){

        if (this.data_type == "newick") {
            return parser.parse_newick(this.input_data);
        }


    }

    collapse(data){
        data.collapse ? data.collapse = false : data.collapse = true;
    }

    reroot(data){

        // extract meta data (zoom)
        var meta = this.data.zoom;

        // create new root r
        var root = {"children": [], "name": "", "branch_length": 0, "new": true}

        var parent = data.data.parent
        var child = data.data

        root.children.push(child)
        parent.children.push(root)

        this.set_parent(child, root )
        this.set_parent(root, parent )

        // remove current node from parent children
        const index = parent.children.indexOf(child);
        if (index > -1) {
            parent.children.splice(index, 1);
        }

        var parent = parent
        var child = root

        var stack = []

        while (parent.root != true) {

            stack.push([parent,child])

            child = parent
            parent = parent.parent

        }

        stack.push([parent,child])

        var f = function(p,c){

            c.children.push(p)
            p.parent =c



            const b = p.children.indexOf(c);
            if (b > -1) {
                p.children.splice(b, 1);
            }

        }

        for (var e in stack){
            var p = stack[e][0]
            var c = stack[e][1]

            f(p,c)

        }

        // Remove root

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



};