
function PhyloIO() {

    const that = this;

    this.compareMode = false;
    this.trees = []



    this.addTree = function(container_id, data, params){

        var params = params || undefined;

        var tree = new PhyloTree();
        this.trees.push({'id' : tree.uid, 'tree': tree})

        tree.render(container_id, data, params)


    }

    this.start = function(){


        //add required parameters to each node
        this.trees[0].tree._postorderTraverse(this.trees[0].tree.root, function(d) {
            d._leaves = that.trees[0].tree._getChildLeaves(d);
        })

        this.trees[1].tree._postorderTraverse(this.trees[1].tree.root, function(d) {
            d._leaves = that.trees[1].tree._getChildLeaves(d);
        })

        if (this.compareMode){

            this.compare(this.trees[0].tree, this.trees[1].tree)

            this.trees.forEach(element => element.tree.update(element.tree.root));

        }



    }

    this.compare =  function(t1, t2){

        var tree1 = t1.root;
        var tree2 = t2.root;

        for (var i = 0; i < tree1._leaves.length; i++) {
            for (var j = 0; j < tree2._leaves.length; j++) {

                if (tree1._leaves[i].data.name === tree2._leaves[j].data.name) {
                    tree1._leaves[i].correspondingLeaf = tree2._leaves[j];
                    tree2._leaves[j].correspondingLeaf = tree1._leaves[i];

                }
            }
        }

        t1._createDeepLeafList(tree1);
        t2._createDeepLeafList(tree2);


        this.getVisibleBCNs(tree1,tree2);


    }

    /**
     Calculate the Best Corresponding Node (BCN) for all visible nodes (not collapsed) in the tree
     if recalculate==false, doesn't calculate for a node if it already has a value
     Algorithm adapted from: TreeJuxtaposer: Scalable Tree Comparison Using Focus+Context with Guaranteed Visibility, Munzner et al. 2003
     */
    this.getVisibleBCNs = function(tree1, tree2, recalculate) {

        if (recalculate === undefined) {
            recalculate = true;
        }

        function getAllBCNs(d, t) {
            var children = that._getChildren(d);
            if (children.length > 0) {
                for (var a = 0; a < children.length; a++) {
                    getAllBCNs(children[a], t);
                }
                if (recalculate || !d.elementBCN) {
                    that._BCN(d, t);
                }
                return;
            } else {
                if (recalculate || !d.elementBCN) {
                    that._BCN(d, t);
                }
                return;
            }
        }

        getAllBCNs(tree1, tree2);
        getAllBCNs(tree2, tree1);
    }

    /*
Function that returns unvisible children or visible children if one or the other are given as input
 */
    this._getChildren = function(d) {
        return d._children ? d._children : (d.children ? d.children : []);
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
    this._getSpanningTree = function(tree, node) {

        var nodes = [tree._leaves];


        for (var i = 0; i < tree._leaves.length; i++) {



            var test = $.inArray(tree._leaves[i].data.name, node.deepLeafList);


            if (test > -1){
                nodes.push(tree);
                var children = this._getChildren(tree);
                for (var j = 0; j < children.length; j++) {
                    nodes = nodes.concat(this._getSpanningTree(children[j], node));
                }
                return nodes;
            }
        }
        return nodes;
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
    this._BCN = function(v, tree) {

        var elementBCNNode = null;
        var maxElementS = 0;
        var spanningTree = this._getSpanningTree(tree, v);


        for (var i = 0; i < spanningTree.length; i++) {


            //get elementBCN for node v
            var x = this._getElementS(v, spanningTree[i]);
            if (x > maxElementS) {
                maxElementS = x;
                elementBCNNode = spanningTree[i];
            }
        }
        v.elementBCN = elementBCNNode;
        v.elementS = maxElementS;


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
    this._getElementS = function(v, n) {


        var lv = v.deepLeafList;
        var ln = n.deepLeafList;


        var lvlen = lv ? lv.length : 0;
        var lnlen = ln ? ln.length : 0;




        var intersect = _.intersection(lv, ln).length;

        return intersect / (lvlen + lnlen - intersect);
    }




    return this;
}