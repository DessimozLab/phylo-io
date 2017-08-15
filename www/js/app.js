// For any third party dependencies, like jQuery, place them in the lib folder.

// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
    baseUrl: 'js/lib',
    paths: {
        app: '../app',
        jquery: 'jquery-2.1.4.min',
        underscore: 'underscore.min',
        bootstrap: 'bootstrap.min',
        canvasToBlob: 'canvas-toBlob',
        circularJson: 'circular-json',
        d3: 'd3.min',
        FileSaver: 'FileSaver.min',
        newick: 'newick',
        spin: 'spin.min',
        munkres: 'munkres',
        treecompare: 'treecompare',
        fontawesome: '//use.fontawesome.com/28dcb2432d',
        bigInteger: '//peterolson.github.com/BigInteger.js/BigInteger.min'
    },
    shim: {
        "bootstrap": {
            deps: ["jquery"]
        },
        "treecompare": {
            deps: ["jquery", "d3", "FileSaver", "bigInteger", "munkres"]
        },
        "bigInteger": {
            deps: ["underscore", "jquery"]
        },
        "munkres": {
            deps: ["underscore", "jquery"]
        }
    }

});

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['app/main']);