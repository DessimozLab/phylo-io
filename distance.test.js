/**
 * @jest-environment jsdom
 */


var data = require('./distance_testing.json');
const d3 = require("d3");
const PhyloIO = require("./dist-jest/phylo.js").PhyloIO;
const utils = require('./src/utils.js')


/*
DAY TABLE: Leaf name duplication (empty string count too)
 */

var only_family = false

for (const family in data) {

    if (only_family && only_family!= family ){
        continue
    }

    test('check for leaves intersection #' + family, () => {

        const  phylo = PhyloIO.init()

        // CREATE MODEL & HIERARCHY
        var m1 = phylo._create_model(data[family].L)
        var m2 = phylo._create_model(data[family].R)
        var h1 = d3.hierarchy(m1.data, d => d.children );
        var h2 = d3.hierarchy(m2.data, d => d.children );

        var m1_F = phylo._create_model(data[family].L_filter)
        var m2_F = phylo._create_model(data[family].R_filter)
        var h1_f = d3.hierarchy(m1_F.data, d => d.children );
        var h2_f = d3.hierarchy(m2_F.data, d => d.children );

        // CHECK INTERSECTING LEAVES
        var intersection = utils.get_intersection_leaves(h1,h2)

        // FILTER TREE TO KEEP ONLY INTERSECTING LEAVES
        var h1_cleaned = utils.filter_leaves_hierarchy(h1, intersection )
        var h2_cleaned = utils.filter_leaves_hierarchy(h2, intersection )

        expect(h1_cleaned).not.toBeFalsy();
        expect(h2_cleaned).not.toBeFalsy();

        h1_cleaned.eachAfter(d => {
            if (d.children && d.leaves().length === 0){
                expect(true).toBeTruthy();
            }
        })

        h2_cleaned.eachAfter(d => {
            if (d.children && d.leaves().length === 0){
                expect(true).toBeTruthy();
            }
        })


        // UGLY DEEPLEAF
        dl1 = []
        h1_cleaned.eachAfter(d => {
            let dli = d.leaves().map(x => x.data.name).sort()
            dl1.push(dli.join(' | '))
        })

        dl1_f = []
        h1_f.eachAfter(d => {
            let dli = d.leaves().map(x => x.data.name).sort().join(' | ')
            dl1_f.push(dli)
        })

        for (const dl in dl1) {
            expect(dl1_f.includes(dl1[dl])).toEqual(true)
        }

        for (const dl in dl1_f) {
            expect(dl1.includes(dl1_f[dl])).toEqual(true)
        }

        expect(h1_cleaned.leaves().map(x => x.data.name).sort()).toEqual(h1_f.leaves().map(x => x.data.name).sort());
        expect(h2_cleaned.leaves().map(x => x.data.name).sort()).toEqual(h2_f.leaves().map(x => x.data.name).sort());

    })

    test('Filtering for Family # ' + family, () => {

       const  phylo = PhyloIO.init()

       var m1 = phylo._create_model(data[family].L)
       var m2 = phylo._create_model(data[family].R)

       var h1_raw = d3.hierarchy(m1.data, d => d.children );
       var h2_raw = d3.hierarchy(m2.data, d => d.children );

       var h1 = utils.remove_duplicated_and_unnamed_leaves_hierarchy(h1_raw)
       var h2 = utils.remove_duplicated_and_unnamed_leaves_hierarchy(h2_raw)

       var intersection = utils.get_intersection_leaves(h1,h2)
       var hLclean = utils.filter_leaves_hierarchy(h1, intersection )
       var hRclean = utils.filter_leaves_hierarchy(h2, intersection )

       var mLF = phylo._create_model(data[family].R_filter)
       var hLFclean = d3.hierarchy(mLF.data, d => d.children );

       var mRF = phylo._create_model(data[family].R_filter)
       var hRFclean = d3.hierarchy(mRF.data, d => d.children );


       // CHECK NO PARENT WITH NO CHILDREN
       hLclean.eachAfter(d => {
           if (d.children && d.leaves().length === 0){
               expect(true).toBeTruthy();
           }
       })
       hRclean.eachAfter(d => {
           if (d.children && d.leaves().length === 0){
               expect(true).toBeTruthy();
           }
       })
       hLFclean.eachAfter(d => {
           if (d.children && d.leaves().length === 0){
               expect(true).toBeTruthy();
           }
       })
       hRFclean.eachAfter(d => {
           if (d.children && d.leaves().length === 0){
               expect(true).toBeTruthy();
           }
       })


       // UGLY DEEPLEAF
       dlR = []
       hRclean.eachAfter(d => {
           let dli = d.leaves().map(x => x.data.name).sort()
           dl1.push(dli.join(' | '))
       })
       dlRF = []
       hRFclean.eachAfter(d => {
           let dli = d.leaves().map(x => x.data.name).sort().join(' | ')
           dl1_f.push(dli)
       })
       dlL = []
       hLclean.eachAfter(d => {
           let dli = d.leaves().map(x => x.data.name).sort().join(' | ')
           dl1_f.push(dli)
       })
       dlLF = []
       hLFclean.eachAfter(d => {
           let dli = d.leaves().map(x => x.data.name).sort().join(' | ')
           dl1_f.push(dli)
       })

       for (const dl in dlR) {
           expect(dlRF.includes(dlR[dl])).toEqual(true)
       }

       for (const dl in dlL) {
           expect(dlLF.includes(dlL[dl])).toEqual(true)
       }

       expect(hRclean.leaves().map(x => x.data.name).sort()).toEqual(hRFclean.leaves().map(x => x.data.name).sort());
       expect(hLclean.leaves().map(x => x.data.name).sort()).toEqual(hLFclean.leaves().map(x => x.data.name).sort());

    });

    test('check Day Table for Family #' + family, () => {

       const  phylo = PhyloIO.init()

       var m1 = phylo._create_model(data[family].L_filter)
       var h1_raw = d3.hierarchy(m1.data, d => d.children );

       var h1 = utils.remove_duplicated_and_unnamed_leaves_hierarchy(h1_raw)

       var t = utils.build_table(h1)

       var ln = h1.leaves().map(x => x.data.name)

       // CHECK ALL LEAF ARE IN I2S
       for (const i in ln) {
           expect(t.I2S.includes(ln[i])).toEqual(true)
       }

       // CHECK ALL S2I VALIDITY
       for (const i in ln) {
           expect(parseInt(t.S2I[ln[i]])).toEqual(parseInt(i))
       }




    })

    test('check Clade only (use filtered tree) for Family #' + family, () => {

       const  phylo = PhyloIO.init()

       var m1 = phylo._create_model(data[family].L_filter)
       var m2 = phylo._create_model(data[family].R_filter)

       var d = utils.prepare_and_run_distance(m1,m2)

       expect(d.clade).toBe(data[family].root_clade);

    });

    test('check RF only (use filtered tree) for Family #' + family, () => {

       const  phylo = PhyloIO.init()

       var m1 = phylo._create_model(data[family].L_filter)
       var m2 = phylo._create_model(data[family].R_filter)

       var d = utils.prepare_and_run_distance(m1,m2)

       expect(d.RF).toBe(data[family].root_URF);

    });

    test('check Clade for Family #' + family, () => {

      const  phylo = PhyloIO.init()

      var m1 = phylo._create_model(data[family].L)
      var m2 = phylo._create_model(data[family].R)

      var d = utils.prepare_and_run_distance(m1,m2)

      expect(d.clade).toBe(data[family].root_clade);

  });

    test('check RF for Family #' + family, () => {

        const  phylo = PhyloIO.init()

        var m1 = phylo._create_model(data[family].L)
        var m2 = phylo._create_model(data[family].R)

        var d = utils.prepare_and_run_distance(m1,m2)

        expect(d.RF).toBe(data[family].root_URF);

    });



}






