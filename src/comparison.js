
import {MinHash, MinHashLSHForest}  from 'minhashjs'

function compute_visible_topology_similarity(api, recompute=true){

    // If no container selected for comparison, takes first two
    if (api.bound_container.length < 2){

        let cs = Object.values(api.containers)

        api.bound_container = []
        api.bound_container.push(cs[0])
        api.bound_container.push(cs[1])
    }

    var con1 = api.bound_container[0]
    var con2 =  api.bound_container[1]

    // check if already computed
    var todo1 = !(con2.viewer.model.similarity.includes(con1.viewer.model.uid))
    var todo2 = !(con1.viewer.model.similarity.includes(con2.viewer.model.uid))

    if (recompute || todo1 || todo2  ){
           compute_similarity_container_pair(con1, con2)
       }


}

function compute_similarity_container_pair(co1,co2){


    console.time("similarity");
    let t1 = co1.viewer.model
    let t2 = co2.viewer.model

    // X = Intersection of T1 & T2 leaves.
    if (t1.leaves.length <= 0){
        t1.leaves = t1.get_leaves(t1.data)
    }
    if (t2.leaves.length <= 0){
        t2.leaves = t2.get_leaves(t2.data)
    }
    var common_leaves = t1.leaves.map(leaf => leaf.name).filter(value => t2.leaves.map(leaf => leaf.name).includes(value));
    console.log("Intersection");
    console.timeLog("similarity");

    // DeepLeaf with filter(X = True)
    t1.createDeepLeafList(common_leaves)
    t2.createDeepLeafList(common_leaves)
    console.log("DeepLeaf");
    console.timeLog("similarity");

    // MinHash
    t1.createMinHash()
    t2.createMinHash()
    console.log("MinHash");
    console.timeLog("similarity");

    // For all T1 & T2 Nodes compute the BCN with MinHash
    var nodes_t1 = []
    var nodes_t2 = []

    var forest1 = new MinHashLSHForest.MinHashLSHForest()
    var forest2 = new MinHashLSHForest.MinHashLSHForest()

    var cpt =0
    t1.traverse(t1.data, function(h,children){nodes_t1.push(h);forest1.add(h, h.min_hash);cpt++}, null)
    t2.traverse(t2.data, function(z,children){nodes_t2.push(z);forest2.add(z, z.min_hash);cpt++}, null)

    forest1.index()
    forest2.index()

    find_BCN(nodes_t1, forest2)
    find_BCN(nodes_t2, forest1)

    console.log("BCN");

    console.timeLog("similarity");

    // Clean non essential datume

    console.timeEnd("similarity");

    // Register processed pair
    t1.similarity.push(t2.uid)
    t2.similarity.push(t1.uid)

}

function find_BCN(nodes_list, target_forest){
    nodes_list.forEach((node) => {

        function is_leaf(str) {
            return !str.includes("||");
        }

        var matches = target_forest.query(node.min_hash,10)

        var l = new Set(node.deepLeafList.filter(is_leaf))

        var max_jacc = 0
        var BCN = null

        matches.forEach(e => {
            var r =   new Set(e.deepLeafList.filter(is_leaf))

            var inter = Array.from(r).filter(x => l.has(x)).length
            var union = [...new Set([...l, ...r])].length;


            var jj = inter/union


            if (jj > max_jacc){
                max_jacc = jj
                BCN = e
            }


        })

        if (max_jacc > 0) {
            node.elementS = max_jacc
            node.elementBCN = BCN
        }



    })
}

function assign_correspondingLeaf(t1,t2){
    for (var i = 0; i < t1.leaves.length; i++) {
        for (var j = 0; j < t2.leaves.length; j++) {
            if (t1.leaves[i].name === t2.leaves[j].name) {
                t1.leaves[i].correspondingLeaf[t2.uid] = t2.leaves[j];
                t2.leaves[j].correspondingLeaf[t1.uid] = t1.leaves[i];
            }
        }
    }
    }

/**
 Calculate the Best Corresponding Node (BCN) for all visible nodes (not collapsed) in the tree
 if recalculate==false, doesn't calculate for a node if it already has a value
 Algorithm adapted from: TreeJuxtaposer: Scalable Tree Comparison Using Focus+Context with Guaranteed Visibility, Munzner et al. 2003
 */
function getVisibleBCNs(tree1, tree2, recalculate) {

    function getAllBCNs(d, t) {

        var children =  getChildren(d);
        if (children.length > 0) {
            for (var a = 0; a < children.length; a++) {
                getAllBCNs(children[a], t);
            }
            if (recalculate || !d.elementBCN) {
                BCN(d, t);
            }
            return;
        } else {
            if (recalculate || !d.elementBCN) {
                BCN(d, t);
            }
            return;
        }
    }

    if (recalculate === undefined) {
        recalculate = true;
    }

    getAllBCNs(tree1.data, tree2);
    getAllBCNs(tree2.data, tree1);
}

/**
 * Description:
 *  Get the best corresponding node in opposite tree for node v
 *  First gets the list of leaves of node v
 *  Then finds the list of spanning trees (see definition above)
 *  For each spanning tree, evaluates the similarity with node v
 *  and assigns the best scoring node to node v as well as a
 *  similarity score
 *
 * Arguments: v is a node
 *            tree is a tree
 */
function BCN(v, tree) {

    var elementBCNNode = null;
    var maxElementS = 0;
    var spanningTree = getSpanningTree(tree, v);

    for (var i = 0; i < spanningTree.length; i++) {
        //get elementBCN for node v
        var x = getElementS(v, spanningTree[i]);
        if (x > maxElementS) {
            maxElementS = x;
            elementBCNNode = spanningTree[i];
        }
    }

    v.elementBCN = elementBCNNode;
    v.elementS = maxElementS;


    //console.log(maxElementS)


}

/**
 Spanning tree: if a node in the opposite tree is common with a given leaf (same name),
 then all the nodes are associated to the leaf.

 Example:
 (A:0.1,B:0.2,(C:0.3,D:0.4):0.5);
 vs
 (A:0.1,B:0.2,(C:0.3,D:0.4):0.5);
 In tree 1, node C,D (0.5) is associated with opposite spanning tree:
 - Root (length: 0.1 and depth: 0)
 - C,D  (length: 0.5 and depth: 1)
 - C    (length: 0.3 and depth: 2)
 - D    (length: 0.4 and depth: 2)

 Description:
 Get a spanning tree associated to leaves

 Arguments:
 - node is set to opposite tree
 - leaves are searched in opposite tree in order to find the spanning tree
 */
function getSpanningTree(tree, node) {
    var nodes = [];


    if (tree.hasOwnProperty('uid')){
        tree = tree.data
    }



    for (var i = 0; i < tree.leaves.length; i++) {
        var test = node.deepLeafList.includes(tree.leaves[i].name);
        if (test){
            nodes.push(tree);
            var children = getChildren(tree);

            for (var j = 0; j < children.length; j++) {
                nodes = nodes.concat(getSpanningTree(children[j], node));
            }
            return nodes;
        }
    }
    return nodes;
}

/**
 Description:
 Get the comparison score between two nodes
 First gets all the leaves from the 2 nodes/trees
 Then get the number of common elements in both lists
 Computes a score (the higher, the better the comparision)

 Note:
 Difference between deep leaf list and leaves in:
 (A:0.1,B:0.2,(C:0.3,D:0.4):0.5);
 - Root has leaves: A, B, C and D (terminal leaves)
 - Root has deep leaves: A, B, C, D and CD (terminal leaves + intermediate leaves)

 Arguments:
 v is a node
 n is a tree or a sub-tree

 Returns
 the similarity score
 */
function getElementS(v, n) {
    var lv = v.deepLeafList;
    var ln = n.deepLeafList;


    var lvlen = lv ? lv.length : 0;
    var lnlen = ln ? ln.length : 0;


    let intersect = lv.filter(value => ln.includes(value)).length;

    return intersect / (lvlen + lnlen - intersect);
}

/*
    Function that returns unvisible children or visible children if one or the other are given as input
     */
function getChildren(d) {
    return d._children ? d._children : (d.children ? d.children : []);
}


export { compute_visible_topology_similarity, compute_similarity_container_pair, BCN  };
