/**
 * @jest-environment jsdom
 */


var data = require('./ut_LRF.json');

const PhyloIO = require("./dist-jest/phylo.js").PhyloIO;
const utils = require('./src/utils.js')


var only_family =  -1

var reference = data[0]

for (const family in data) {

    if (only_family != -1 && only_family!= family ){
        continue
    }

    test('test #' + family, () => {

        const phylo = PhyloIO.init();

        var m1 = phylo._create_model(reference.tree, {'data_type' : 'nhx'})
        var m2 = phylo._create_model(data[family].tree, {'data_type' : 'nhx'})

        var d = utils.prepare_and_run_distance(m1,m2)

        expect(d.LRF).toBe(data[family].LRF);


    })





}





