function traverse(o,func_pre, func_post) {

    if (func_pre){
        func_pre.apply(this,[o,o["children"]])
    }

    if(o["children"]){

        for (var c in o["children"] ) {

            var child = o["children"][c]

            child = traverse(child, func_pre, func_post)

            if (func_post) {
                func_post.apply(this,[child,o])
            }


        }


    }

    return o

}

function build_table(hierarchy){ // build table for RF

    traverse(hierarchy, function(node,children){
        delete node.left_
        delete node.right_
        delete node.weight_
    }, null)

    var n = hierarchy.leaves().length
    var X = Array.from(new Array(n), _ => Array(3).fill(0));
    var S2I = {} //Array(n).fill(0)
    var I2S = Array(n).fill(0)
    var n_edges = 0

    var nz = []
    traverse(hierarchy, null, function(node,children){nz.push(node)})
    nz = nz.entries()

    var n1 = nz.next()
    var n2 = nz.next()
    var i = 0

    while (true) {
        var node = n1.value[1]
        var node2 = n2.value[1]
        var p = node.parent
        var ii;

        // Do work
        if (!(node.hasOwnProperty('children'))) {
            I2S[i] = node.data.name
            S2I[I2S[i]] = i
            node.weight_ = 0
            node.left_ = i
            node.right_ = i
            i += 1
        }

        // propagate up
        if (typeof p != "undefined"){
            p.left_ = p.hasOwnProperty('left_') ? Math.min(p.left_, node.left_) : node.left_
            p.right_ = p.hasOwnProperty('right_') ? Math.max(p.right_, node.right_) : node.right_
            if (p.hasOwnProperty('weight_')){ p.weight_ = p.weight_ + node.weight_ + 1} else {p.weight_ = node.weight_  +=1}
        }

        if (node.hasOwnProperty('children')) {

            if( node2.hasOwnProperty('weight_') && node2.weight_ > 0 ){ii = node.left_} else { ii = node.right_}

            X[ii][0] = node.left_
            X[ii][1] = node.right_
            if (node.data.hasOwnProperty('branch_length')){
                X[ii][2] = node.data.branch_length
            }
            else {
                X[ii][2] = 1
            }


            n_edges += 1

        }

        n1 = n2
        n2 = nz.next()

        if (n2.done){
            // process seed node, w=0
            ii = node.right_
            X[ii][0] = node.left_
            X[ii][1] = node.right_
            X[ii][2] = node.data.branch_length
            n_edges += 1
            break
        }






    }

    return {'table': X, 'n_edges': n_edges, 'I2S': I2S, 'S2I': S2I}


}

function reverse_order(child,parent){

    child.children.push(parent)
    parent.parent =child

    const b = parent.children.indexOf(child);
    if (b > -1) {
        parent.children.splice(b, 1);
    }
}

function reroot_hierarchy(hierarchy, leaf_name){

    let leaf = hierarchy.leaves().find(element => element.data.name == leaf_name );

    //  INVERT PATH TO ROOT
    var ancestors  = leaf.ancestors()
    leaf.children = []
    leaf.root = true

    var index
    for (index = 0; index < ancestors.length; index++) {

        let child = (index === 0) ? leaf : ancestors[index-1]
        let parent = ancestors[index]

        reverse_order(child,parent)
    }

    //DESTROY ROOT
    var old_root_children = ancestors[ancestors.length-1].children

    var c = ancestors[ancestors.length-2].children.indexOf(ancestors[ancestors.length-1]);
    if (c > -1) {
        ancestors[ancestors.length-2].children.splice(c, 1);
    }

    for (var j = 0; j < old_root_children.length; j++) {

        let parent = old_root_children[j]
        let child = ancestors[ancestors.length-2]

        child.children.push(parent)
        parent.parent =child
    }


    return leaf
}

export {build_table, reroot_hierarchy};
