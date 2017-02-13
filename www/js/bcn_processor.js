/**
 * Created by sduvaud on 20/12/16.
 */
/**
 * Created by sduvaud on 14/12/16.
 */
importScripts('underscore.min.js');

/*
 Calculate the Best Corresponding Node (BCN) for all visible nodes (not collapsed) in the tree
 if recalculate==false, doesn't calculate for a node if it aleady has a value
 Algorithm adapted from: TreeJuxtaposer: Scalable Tree Comparison Using Focus+Context with Guaranteed Visibility, Munzner et al. 2003
 */
function wrapGetAllBCNs(tree1, tree2, recalculate) {

    function getAllBCNs(d, t) {

        //var children = d.children ? d.children : [];
        var children = getChildren(d);
        if (children.length > 0) {
            for (var a = 0; a < children.length; a++) {
                getAllBCNs(children[a], t);
            }
            if (recalculate || !d.elementBCN) {
                BCN(d, t);
                // once all the leaves have been compared to the other tree, the node is also compared.
                // Seems rather redundant, but if we comment this out, the tree has no coloring...
            }
            return;
        } else {
            if (recalculate || !d.elementBCN) {
                BCN(d, t);
            }
            return;
        }
    }
    getAllBCNs(tree1, tree2);
    postMessage(tree1);
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
        x = getElementS(v, spanningTree[i]);
        if (x > maxElementS) {
            maxElementS = x;
            elementBCNNode = spanningTree[i];
        }
    }
    v.elementBCN = elementBCNNode;
    v.elementS = maxElementS;
}

/*
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
    //var bcns = [];
    for (var i = 0; i < tree.leaves.length; i++) {
        var test = _.indexOf(node.deepLeafList, tree.leaves[i].name);
        if (test > -1){
            nodes.push(tree);
            //bcns.push(getElementS(tree, node));
            var children = getChildren(tree);
            for (var j = 0; j < children.length; j++) {
                nodes = nodes.concat(getSpanningTree(children[j], node));
            }
            return nodes;
        }
    }
    return nodes;
}

/*
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
    var lvlen = lv.length;
    var lnlen = ln.length;

    var intersect = _.intersection(lv, ln).length;
    return intersect / (lvlen + lnlen - intersect);

}

/*
 Function that returns invisible children or visible children if one or the other are given as input
 */
function getChildren(d) {
    return d._children ? d._children : (d.children ? d.children : []);
}

onmessage = function(event) {
    var tree1 = event.data.tree1;
    var tree2 = event.data.tree2;
    var recalculate = event.data.recalculate;

    // Instead of 2 calls to the same function, we should use web workers!
    // BUT:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=31666
    wrapGetAllBCNs(tree1, tree2, recalculate);
};