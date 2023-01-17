/**
 * @jest-environment jsdom
 */


var data = require('./distance_testing.json');
const d3 = require("d3");
const PhyloIO = require("./dist-jest/phylo.js").PhyloIO;
const utils = require('./src/utils.js')


var only_family = -1

for (const family in data) {

    if (only_family != -1 && only_family!= family ){
        continue
    }

    test('check for leaves intersection #' + family, () => {

        const  phylo = PhyloIO.init()

        // CREATE MODEL & HIERARCHY
        var m1 = phylo._create_model(data[family].L)
        var m2 = phylo._create_model(data[family].R)
        var h1_raw = d3.hierarchy(m1.data, d => d.children );
        var h2_raw = d3.hierarchy(m2.data, d => d.children );

        var m1_F = phylo._create_model(data[family].L_filter)
        var m2_F = phylo._create_model(data[family].R_filter)
        var h1_f = d3.hierarchy(m1_F.data, d => d.children );
        var h2_f = d3.hierarchy(m2_F.data, d => d.children );

        var h1 = utils.remove_duplicated_and_unnamed_leaves_hierarchy(h1_raw)
        var h2 = utils.remove_duplicated_and_unnamed_leaves_hierarchy(h2_raw)

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


        // CHECK ALL TABLE NO NULL
        for (let i = 1; i < ln.length; i++) {

            var tt = t.table[i]

            for (const i in tt) {
                expect(tt[i]).not.toBeNull()
            }

        }


    })

    // CLADE
    test('check Clade only (use filtered tree) for Family #' + family, () => {

       const  phylo = PhyloIO.init()

       var m1 = phylo._create_model(data[family].L_filter)
       var m2 = phylo._create_model(data[family].R_filter)

       var d = utils.prepare_and_run_distance(m1,m2)

       expect(d.clade).toBe(data[family].root_clade);

    });

    test('check Clade for Family #' + family, () => {

           const  phylo = PhyloIO.init()

           var m1 = phylo._create_model(data[family].L)
           var m2 = phylo._create_model(data[family].R)

           var d = utils.prepare_and_run_distance(m1,m2)

           expect(d.clade).toBe(data[family].root_clade);

       });

    // RF
    test('check RF only (use filtered tree) for Family #' + family, () => {

              const  phylo = PhyloIO.init()

              var m1 = phylo._create_model(data[family].L_filter)
              var m2 = phylo._create_model(data[family].R_filter)

              var d = utils.prepare_and_run_distance(m1,m2)

              expect(d.RF).toBe(data[family].root_URF);

           });

    test('check RF for Family #' + family, () => {

              const  phylo = PhyloIO.init()

              var m1 = phylo._create_model(data[family].L)
              var m2 = phylo._create_model(data[family].R)

              var d = utils.prepare_and_run_distance(m1,m2)

              expect(d.RF).toBe(data[family].root_URF);

          });

    test('check consistency RF after few re-rooting for Family #' + family, () =>{


        function apply_generation(data, gen, ml, mr){

            if (data['F' +gen.toString() +'L_mutation']){
                var l = ml.get_node_by_leafset(data['F' +gen.toString() +'L_mutation'])
                if (l){
                    ml.reroot(l)
                }
            }

            if (data['F' +gen.toString() +'R_mutation']){
                var l = mr.get_node_by_leafset(data['F' +gen.toString() +'R_mutation'])
                if (l){
                    mr.reroot(l)
                }
            }
        }

        const  phylo = PhyloIO.init()

        var mL = phylo._create_model(data[family].L_filter)
        var mR = phylo._create_model(data[family].R_filter)

        var d = utils.prepare_and_run_distance(mL,mR)

        expect(d.RF).toBe(data[family].root_URF);
        expect(d.clade).toBe(data[family].root_clade);


        for (let gen = 1; gen < 4; gen++) {

            apply_generation(data[family], gen, mL, mR)
            var d2 = utils.prepare_and_run_distance(mL,mR)
            expect(d2.RF).toBe(data[family]['F' + gen.toString()+ '_URF']);
            expect(d.RF).toBe(d2.RF);
            d = d2

        }

    })

    // EUC
    test('check Euc only (use filtered tree) for Family #' + family, () => {

        const  phylo = PhyloIO.init()

        var m1 = phylo._create_model(data[family].L_filter)
        var m2 = phylo._create_model(data[family].R_filter)

        var d = utils.prepare_and_run_distance(m1,m2)

        var exp_Euc = parseFloat(data[family].root_WRF_rooted).toFixed(2)

        expect(parseFloat(parseFloat(d.Euc).toFixed(2))).toBeCloseTo(parseFloat(exp_Euc),1);

    });



    /*



        /*


      test('check Clade after few re-rooting for Family #' + family, () =>{


          function apply_generation(data, gen, ml, mr){

              if (data['F' +gen.toString() +'L_mutation']){
                  var l = ml.get_node_by_leafset(data['F' +gen.toString() +'L_mutation'])
                  if (l){
                      ml.reroot(l)
                  }
              }

              if (data['F' +gen.toString() +'R_mutation']){
                  var l = mr.get_node_by_leafset(data['F' +gen.toString() +'R_mutation'])
                  if (l){
                      mr.reroot(l)
                  }
              }
          }

          const  phylo = PhyloIO.init()

          var mL = phylo._create_model(data[family].L_filter)
          var mR = phylo._create_model(data[family].R_filter)

          var d = utils.prepare_and_run_distance(mL,mR)

          expect(d.clade).toBe(data[family].root_clade);


          for (let gen = 1; gen < 4; gen++) {

              apply_generation(data[family], gen, mL, mR)
              var d2 = utils.prepare_and_run_distance(mL,mR)
              expect(d2.clade).toBe(data[family]['F' + gen.toString()+ '_clade']);


          }

      })

      test('check Euc only (use filtered tree) for Family #' + family, () => {

          const  phylo = PhyloIO.init()

          var m1 = phylo._create_model(data[family].L_filter)
          var m2 = phylo._create_model(data[family].R_filter)

          var d = utils.prepare_and_run_distance(m1,m2)

          expect(d.Euc).toBe(data[family].root_WRF);

      });

      test('check Euc for Family #' + family, () => {

          const  phylo = PhyloIO.init()

          var m1 = phylo._create_model(data[family].L)
          var m2 = phylo._create_model(data[family].R)

          var d = utils.prepare_and_run_distance(m1,m2)

          expect(d.Euc).toBe(data[family].root_WRF);

      });

       */


}





