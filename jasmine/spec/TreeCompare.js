/**
 * Created by sduvaud on 20/12/16.
 */

describe("TreeCompare", function() {

    //This will be called before running each spec
    beforeEach(function () {
        TreeCompare().init({
            scaleColor: "white"
        });
    });

    describe("testing basic functionality in the TreeCompare module", function(){
        it("addTree should return the right tree from input data", function() {

            var newick = '(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);';

            var myTree = TreeCompare().addTree(newick, 'Tree_0');
            expect(myTree.name).toEqual('Tree_0');

            var root = myTree.root;
            expect(root.ID).toContain('node_');
            expect(root.clickedParentHighlight).toBeFalsy();
            expect(root.mouseoverHighlight).toBeFalsy();
            expect(root.mouseoverLinkHighlight).toBeFalsy();
            expect(root.correspondingHighlight).toBeFalsy();
            expect(root.collapsed).toBeFalsy();

            var first = root.children[0];
            expect(root.children.length).toEqual(3);
            expect(first.name).toEqual('A');
            expect(first.length).toEqual(0.1);
        });
    });
});