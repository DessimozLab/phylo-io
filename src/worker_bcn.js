import {MinHashLSHForest} from "minhashjs";
import Model from "./model";


self.onmessage = (event) => {

    var containers = event.data;

    var processed_tree = compute_similarity_container_pair(containers.tree1,containers.tree2)

    postMessage(processed_tree);

    self.close();
};



function compute_similarity_container_pair(t1,t2){

    var t1 = new Model(t1.data, t1.settings, false)
    var t2 = new Model(t2.data, t2.settings, false)


    console.time("similarity");

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

    find_BCN(nodes_t1, forest2, t2.uid)
    find_BCN(nodes_t2, forest1, t1.uid)

    console.log("BCN done");

    console.timeLog("similarity");

    // Clean non essential datume
    t1.removeMinHash()
    t2.removeMinHash()

    console.timeEnd("similarity");

    t1.settings.similarity.push(t2.uid)
    t2.settings.similarity.push(t1.uid)

    t1.data = t1.remove_circularity_only_parent_and_leaves()
    t2.data = t2.remove_circularity_only_parent_and_leaves()

    t1.remove_all_color_scale()
    t2.remove_all_color_scale()

    return [t1,t2]

}

function find_BCN(nodes_list, target_forest, target_uid){
    nodes_list.forEach((node) => {

        function is_leaf(str) {
            return !str.includes("|__|");
        }

        var matches = target_forest.query(node.min_hash,10)

        var l = new Set(node.deepLeafList.filter(is_leaf))
        if (l.size > 0){

            var max_jacc = 0
            var BCN = null

            matches.forEach(e => {
                var r =   new Set(e.deepLeafList.filter(is_leaf))

                if (r.size > 0){


                    var inter = Array.from(r).filter(x => l.has(x)).length
                    var union = [...new Set([...l, ...r])].length;

                    var jj = inter/union



                    if (jj > max_jacc){
                        max_jacc = jj
                        BCN = e
                    }

                }





            })

            if (max_jacc > 0) {
                node.elementS[target_uid] = max_jacc
                if (!node.elementBCN){
                    node.elementBCN = {}
                }
                node.elementBCN[target_uid] = BCN
            }


        }




    })
}