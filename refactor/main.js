


function PhyloIO() {

    this.compareMode = false;
    this.trees = {}


    this.addTree = function(container_id, data, params){

        var params = params || undefined;

        var tree = new PhyloTree();
        this.trees[tree.uid] = tree

        tree.render(container_id, data, params)


    }

    this.start = function(){

        console.log(this.trees)

    }


    return this;
}