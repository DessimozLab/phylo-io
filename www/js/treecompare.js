var TreeCompare = function() {

    var trees = [];
    var longestNode = {};
    var maxBranchLength = 0;
    var longestBranch = {};

    var backupRoot = [];
    var renderedTrees = [];
    var gistID = "";

    //global variable set if manual reroot used!!!
    var manualReroot = false;
    var scaleLineWidth = 0;
    var scaleLinePadding = 10;
    var compareMode = false;

    // global variables for undo functionality
    var undoIndex = 0;
    var undoTreeDataIndex = [];
    var undoActionFunc = [];
    var undoActionData = [];
    var undoFullTreeData = [];

    /**
     * possible values to decide stack normalization
     * ratio: stackheight value is used to calculate ratio to fit stack into stackheight
     * max: maximum amount of genomes is used as stackheight normalizer
     * number: numeric value for the normalizer
     *
    */

    var maxStackHeight = "ratio";
    //var maxStackHeight = "max";
    var largestGenome = 0;
    var largestEvents = 0;

    // initial stack histogram dimensions
    var stackHeight = 100;
    var stackWidth = 20;

    // histogram zoom extents
    var stackMinWidth = 10;
    var stackMaxWidth = 150;
    var stackMinHeight = 30;
    var stackMaxHeight = 250;
    var stackStep = 10;
    var hasHistogramData = false;
    var showHistogramLegend = true;

    var maxTreeHeight = 500;
    var maxTreeWidth = 1500;
    var minTreeHeight = 20;
    var minTreeWidth = 200;


    var initTreeHeight = null;
    var initTreeWidth = null;

    // values genes or events
    var infoStack = 'genes';

    var labels = ["Retained", "Duplicated", "Gained", "Lost", "Duplication"]
    var colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#ff7f0e"];

    var color = {};

    for(var i = 0; i < colors.length; i++){
        color[labels[i]] = colors[i];
    }


    var colorScaleRange = ['rgb(37,52,148)', 'rgb(44,127,184)', 'rgb(65,182,196)', 'rgb(127,205,187)', 'rgb(199,233,180)', 'rgb(255,255,204)'];
    var colorScaleRangeRest = ['rgb(179,0,0)', 'rgb(227,74,51)', 'rgb(252,141,89)', 'rgb(253,187,132)', 'rgb(253,212,158)', 'rgb(254,240,217)'];

    var colorScaleDomain = [1, 0.8, 0.6, 0.4, 0.2, 0];
    var padding = 20;
    var paddingVertical = 0;
    var paddingHorizontal = 50;
    var triangleHeightDivisor = 4;
    var currentS = "elementS";
    var currentBCN = "elementBCN";
    var highlightedNodes = [];
    var maxHighlightedNodes = 20;

    var settings = {
        gistSaveServerURL: "http://phylo.io/server/gist.php",
        useLengths: true,
        alignTipLables: false,
        selectMultipleSearch: false,
        fontSize: 14,
        lineThickness: 3,
        nodeSize: 4,
        treeWidth: 500,
        treeHeight: 15,
        moveOnClick: true,
        enableZoomSliders: true,
        enableStackZoomSliders: true,
        scaleMin: 0.05,
        scaleMax: 15,
        scaleColor: "black",
        loadingCallback: function () {
        },
        loadedCallback: function () {
        },
        internalLabels: "none", //none, name, length, similarity
        enableDownloadButtons: true,
        enableCloudShare: true,
        enableLadderizeTreeButton: true,
        enableOppositeTreeActions: true,
        enableFisheyeZoom: false,
        enableScale: true,
        zoomMode: "traditional", //semantic, traditional
        fitTree: "scale", //none, scale
        enableSizeControls: true,
        enableSearch: true,
        autoCollapse: null,
        showHistogramSummaryValue: true,
        showHistogramValues: true
    };



    //Add a work helper function to the jQuery object
    $.work = function (args) {
        var def = $.Deferred(function (dfd) {
            var worker;
            if (window.Worker) {
                //Construct the Web Worker
                worker = new Worker(args.file);
                worker.onmessage = function (event) {
                    //If the Worker reports success, resolve the Deferred
                    dfd.resolve(event.data);
                };
                worker.onerror = function (event) {
                    //If the Worker reports an error, reject the Deferred
                    dfd.reject(event);
                };
                worker.postMessage(args.args); //Start the worker with supplied args
            } else {
                //Need to do something when the browser doesn't have Web Workers
            }
        });

        //Return the promise object (an "immutable" Deferred object for consumers to use)
        return def.promise();
    };

    /*
     called externally to get the TreeCompare object
     */
    function init(settingsIn) {
        var mySettings = settingsIn ? settingsIn : {};
        changeTreeSettings(mySettings);
        return this;
    }

    /*
     called on window resize to ensure the svg canvas fits the parent container
     */
    function resize() {
        for (var i = 0; i < renderedTrees.length; i++) {
            var data = renderedTrees[i].data;
            $("#" + data.canvasId + " > svg").width($("#" + data.canvasId).width());
            $("#" + data.canvasId + " > svg").height($("#" + data.canvasId).height());
        }

    }

    window.onresize = resize;

    /*
     create ID with random number generator
     */
    function makeId(prefix) {
        prefix || (prefix = '');
        var output = prefix + idCounter;
        idCounter++;
        return output;
    }

    function getSetting(currentSetting, lastSetting) {
        if (currentSetting !== undefined) {
            return currentSetting;
        } else {
            return lastSetting;
        }
    }

    /*
     external function for changing settings in order to display features on tree canvas
     */
    function changeCanvasSettings(settingsIn) {
        settings.enableZoomSliders = getSetting(settingsIn.enableZoomSliders,settings.enableZoomSliders);
        settings.enableStackZoomSliders = getSetting(settingsIn.enableStackZoomSliders,settings.enableStackZoomSliders);
        settings.enableDownloadButtons = getSetting(settingsIn.enableDownloadButtons,settings.enableDownloadButtons);
        settings.enableCloudShare = getSetting(settingsIn.enableCloudShare,settings.enableCloudShare);
        settings.enableLadderizeTreeButton = getSetting(settingsIn.enableLadderizeTreeButton,settings.enableLadderizeTreeButton);
        settings.enableFixedButtons = getSetting(settingsIn.enableFixedButtons,settings.enableFixedButtons);
        settings.enableSizeControls = getSetting(settingsIn.enableSizeControls,settings.enableSizeControls);
        settings.enableSearch = getSetting(settingsIn.enableSearch,settings.enableSearch);
        settings.autoCollapse = getSetting(settingsIn.autoCollapse,settings.autoCollapse);
        settings.enableScale = getSetting(settingsIn.enableScale,settings.enableScale);
    }

    /*
     external function for changing settings, any rendered trees are updated
     */
    function changeTreeSettings(settingsIn) {
        settings.useLengths = getSetting(settingsIn.useLengths, settings.useLengths);
        settings.alignTipLabels = getSetting(settingsIn.alignTipLabels, settings.alignTipLabels);
        settings.mirrorRightTree = getSetting(settingsIn.mirrorRightTree, settings.mirrorRightTree);
        settings.selectMultipleSearch = getSetting(settingsIn.selectMultipleSearch, settings.selectMultipleSearch);
        settings.fontSize = getSetting(settingsIn.fontSize, settings.fontSize);
        settings.lineThickness = getSetting(settingsIn.lineThickness, settings.lineThickness);
        settings.nodeSize = getSetting(settingsIn.nodeSize, settings.nodeSize);
        settings.treeWidth = getSetting(settingsIn.treeWidth, settings.treeWidth);
        settings.treeHeight = getSetting(settingsIn.treeHeight, settings.treeHeight);
        settings.moveOnClick = getSetting(settingsIn.moveOnClick, settings.moveOnClick);
        settings.scaleMin = getSetting(settingsIn.scaleMin, settings.scaleMin);
        settings.scaleMax = getSetting(settingsIn.scaleMax, settings.scaleMax);
        settings.scaleColor = getSetting(settingsIn.scaleColor, settings.scaleColor);
        settings.loadingCallback = getSetting(settingsIn.loadingCallback, settings.loadingCallback);
        settings.loadedCallback = getSetting(settingsIn.loadedCallback, settings.loadedCallback);
        settings.internalLabels = getSetting(settingsIn.internalLabels, settings.internalLabels);
        settings.zoomMode = getSetting(settingsIn.zoomMode, settings.zoomMode);
        settings.fitTree = getSetting(settingsIn.fitTree, settings.fitTree);
        settings.gistSaveServerURL = getSetting(settingsIn.gistSaveServerURL, settings.gistSaveServerURL);
        settings.showHistogramSummaryValue = getSetting(settingsIn.showHistogramSummaryValue, settings.showHistogramSummaryValue);
        settings.showHistogramValues = getSetting(settingsIn.showHistogramValues, settings.showHistogramValues);

        var i;
        if (!(settingsIn.treeWidth === undefined)) {
            for (i = 0; i < trees.length; i++) {
                jQuery.extend(trees[i].data, {
                    treeWidth: settingsIn.treeWidth
                });
            }
        }
        if (!(settingsIn.treeHeight === undefined)) {
            for (i = 0; i < trees.length; i++) {
                jQuery.extend(trees[i].data, {
                    treeHeight: settingsIn.treeHeight
                });
            }
        }


        updateAllRenderedTrees();
    }


    /*
     function to update currently rendered trees when settings are changed
     */
    function updateAllRenderedTrees() {
        for (var i = 0; i < renderedTrees.length; i++) {
            update(renderedTrees[i].data.root, renderedTrees[i].data);
        }
    }

    function getLabelsFromProperties(json, hasChildren) {
        var output = "";
        if (json.clickedHighlight && hasChildren) {
            output += "@@clickedHighlight"
        }
        if (json.bcnhighlight && hasChildren) {
            output += "@@bcnhighlight";
        }
        if (json.collapsed && hasChildren) {
            output += "@@collapsed";
        }
        if (json.clickedParentHighlight) {
            output += "@@clickedParentHighlight";
        }
        if (json.correspondingHighlight) {
            output += "@@correspondingHighlight";
        }
        return output;
    }

    /*
    parse json when shared tree is loaded, ensures that adjusted visualization parameters are preserved
     */
    function jsonToNwk(json, addLabels) {
        //TODO: here add searchHighlihgt and make sure that branchlengths are preserved
        function nested(nest) {
            var subtree = "";

            if (nest.hasOwnProperty('children')) {
                var children = [];
                nest.children.forEach(function (child) {
                    var subsubtree = nested(child);
                    children.push(subsubtree);
                });
                var substring = children.join();
                if (nest.hasOwnProperty('name')) {
                    subtree = "(" + substring + ")" + nest.name;
                    if (addLabels) {
                        subtree += getLabelsFromProperties(nest, true);
                    }
                }
                if (nest.hasOwnProperty('length')) {
                    subtree = subtree + ":" + nest.length;
                }
            } else {
                var leaf = "";
                if (nest.hasOwnProperty('name')) {
                    leaf = nest.name;
                    if (addLabels) {
                        leaf += getLabelsFromProperties(nest, false);
                    }
                }
                if (nest.hasOwnProperty('length')) {
                    leaf = leaf + ":" + nest.length;
                }
                subtree = subtree + leaf;
            }
            return subtree;
        }

        return nested(json) + ";";
    }

    /*
     This function checks the consistency of the input string for the tree
     */
    function checkTreeInput(s) {
        var tokens = s.split(/\s*(;|\(|\[|\]|\)|,|:)\s*/);
        var outError = "";

        function returnNumElementInArray(inArray, element) {
            var numOfTrue = 0;
            for (var i = 0; i < inArray.length; i++) {
                if (inArray[i] === element)
                    numOfTrue++;
            }
            return numOfTrue;
        }

        if (returnNumElementInArray(tokens, "(") > returnNumElementInArray(tokens, ")")) {
            outError = "TooLittle)";
        } else if (returnNumElementInArray(tokens, "(") < returnNumElementInArray(tokens, ")")) {
            outError = "TooLittle(";
        } else if (tokens.indexOf(":") === -1 || tokens.indexOf("(") === -1 || tokens.indexOf(")") === -1 || isNaN(tokens[tokens.indexOf(":") + 1])) {
            outError = "NotNwk"
        }

        return outError;
    }

    /*
     JSON to Newick converter, just copied code from:
     https://github.com/daviddao/biojs-io-newick/blob/master/src/newick.js
     ==> Should we include the whole library, instead?
     */
    function tree2Newick(tree) {
        function nested(nest) {
            var subtree = "";

            if (nest.hasOwnProperty('children') && nest.children !== null) {
                var children = [];
                nest.children.forEach(function (child) {
                    var subsubtree = nested(child);
                    children.push(subsubtree);
                });
                var substring = children.join();
                if (nest.hasOwnProperty('name')) {
                    subtree = "(" + substring + ")" + nest.name;
                }
                if (nest.hasOwnProperty('length')) { // Does length mean branch length?
                    subtree = subtree + ":" + nest.length;
                }
            }
            else if(nest.hasOwnProperty('_children') && nest._children !== null){
                var _children = [];
                nest._children.forEach(function(child){
                    var subsubtree = nested(child);
                    _children.push(subsubtree);
                });
                var substring = _children.join();
                if(nest.hasOwnProperty('name')){
                    subtree = "("+substring+")" + nest.name;
                }
                if(nest.hasOwnProperty('length')){ // Does length mean branch length?
                    subtree = subtree + ":"+nest.length;
                }
            }
            else{
                var leaf = "";
                if (nest.hasOwnProperty('name')) {
                    leaf = nest.name;
                }
                if (nest.hasOwnProperty('length')) {
                    leaf = leaf + ":" + nest.length;
                }
                subtree = subtree + leaf;
            }
            return subtree;
        }

        return nested(tree) + ";";
    }

    function getIdxToken(tokenArray, queryToken) {
        var posTokens = [];
        for (var i = 0; i < tokenArray.length; i++) {
            if (tokenArray[i] === queryToken) {
                posTokens.push(i)
            }
        }
        return posTokens;
    }

    /*
     Newick to JSON converter, just copied code from newick.js
     ==> Should we include the whole library, instead?
     */
    function convertTree(s) { //s is newick file format
        var ancestors = [];
        var tree = {};
        var settingsLbls = [];

        s = s.replace(/(\r\n|\n|\r)/gm, ""); // remove all new line characters

        var tokens = s.split(/\s*(;|\(|\[|\]|\)|,|:)\s*/); //already splits the NHX format as well

        var nhx_tags = [':B', ':S', ':D', ':T', ':E', ':O', ':SO', ':L', ':Sw', ':CO', ':C'];

        // the following part keeps the NHX datastructure
        var square_bracket_start = getIdxToken(tokens, "[");
        var square_bracket_end = getIdxToken(tokens, "]");
        var new_tokens = [];
        var j = 0;
        var i;
        for (i = 0; i < tokens.length; i++) {
            if (tokens[i] === "[") {
                var dist_square_bracket = square_bracket_end[j] - square_bracket_start[j];
                new_tokens.push(tokens[i]);
                new_tokens.push(tokens.slice(i + 1, i + dist_square_bracket).join(""));
                new_tokens.push(tokens[i + dist_square_bracket]);
                i = i + dist_square_bracket;
                j = j + 1;
            } else {
                new_tokens.push(tokens[i]);
            }
        }

        try { //catch error when newick is not in place
            if (tokens === "") {
                throw "empty";
            }// calls convert function from above
        } catch (err) {
            throw "NoTree";
        }

        try {
            if (checkTreeInput(s) === "TooLittle)") {
                throw "empty";
            } // TODO:change this to &&NHX and not []
        } catch (err) {
            throw "TooLittle)"
        }

        function is_nhx_tag_found(nhx_tags, tag_to_check) {
            // prepend with : to differentiate :S=, :Sw= and :SO=
            return jQuery.inArray(":" + tag_to_check, nhx_tags);
        }


        for (i = 0; i < new_tokens.length; i++) {
            var token = new_tokens[i];
            var x;
            var subtree;
            switch (token) {
                case '(': // new children
                    subtree = {};
                    tree.children = [subtree];
                    ancestors.push(tree);
                    tree = subtree;
                    break;
                case ',': // another branch
                    subtree = {};
                    ancestors[ancestors.length - 1].children.push(subtree);
                    tree = subtree;
                    break;
                case '['://input NHX format
                    x = new_tokens[i + 1];
                    if (x.indexOf("&&NHX") !== -1) { //if NHX format

                        var nhx_tokens = x.split(/:/);
                        // TODO, how to differentiate SO and O for example
                        jQuery.each(nhx_tokens, function (i, nhx_token) {

                            var token = nhx_token.split("=");
                            var tmp_idx = is_nhx_tag_found(nhx_tags, token[0])
                            if (tmp_idx !== -1) {
                                var nhxtag = nhx_tags[tmp_idx];
                                var nhxtag_value = token[1];
                                switch (nhxtag) {

                                    case ':B':
                                        settingsLbls.push('name');
                                        tree.branchSupport = nhxtag_value;
                                        break;

                                    case ':S':
                                        settingsLbls.push('species');
                                        tree.species = nhxtag_value;
                                        break;

                                    case ':D':
                                        settingsLbls.push('duplication');
                                        tree.duplication = nhxtag_value;
                                        break;

                                    case ':L':
                                        settingsLbls.push('likelihood');
                                        tree.likelihood = nhxtag_value;
                                        break;

                                    case ':E':
                                        settingsLbls.push('ECNumber');
                                        tree.ECNumber = nhxtag_value;
                                        break;

                                    case ':T':
                                        settingsLbls.push('taxanomyID');
                                        tree.taxanomyID = nhxtag_value;
                                        break;

                                    case ':O':
                                        settingsLbls.push('orthologous');
                                        tree.orthologous = nhxtag_value;
                                        break;

                                    case ':SO':
                                        settingsLbls.push('superorthologous');
                                        tree.superorthologous = nhxtag_value;
                                        break;

                                    case ':Sw':
                                        settingsLbls.push('subtree');
                                        tree.subtree = nhxtag_value;
                                        break;

                                    case ':Co':
                                        settingsLbls.push('collapseThis');
                                        tree.collapseThis = nhxtag_value;
                                        break;
                                    case ':C':
                                        settingsLbls.push('color');
                                        tree.specifiedBranchColor = nhxtag_value;
                                        break;
                                    default:
                                        break;
                                }
                            }
                        });
                    } else {
                        if (!(x === ";" || x === "")) {
                            settingsLbls.push('name');
                            tree.branchSupport = x;
                        }
                    }
                    break;
                case ']':
                case ':': // optional length next
                    break;
                case ')': // optional
                    tree = ancestors.pop();
                    x = new_tokens[i + 1];
                    if (!(x === ";" || x === "")) {
                        settingsLbls.push('name');
                        tree.branchSupport = x;
                    }
                    break;
                default:
                    x = new_tokens[i - 1];
                    if (x === ')' || x === '(' || x === ',') {
                        var tree_meta = token.split("@@"); // separation of metadata for export
                        tree.name = tree_meta[0];
                        tree.length = 0.1; // this is used in the case the tree does not have any branch values
                        tree.collapsed = false;
                        if (tree_meta.indexOf("collapsed") !== -1) {
                            tree.collapsed = true;
                        }
                        if (tree_meta.indexOf("clickedParentHighlight") !== -1) {
                            tree.clickedParentHighlight = true;
                        }
                        if (tree_meta.indexOf("correspondingHighlight") !== -1) {
                            tree.correspondingHighlight = true;
                        }
                        if (tree_meta.indexOf("bcnhighlight") !== -1) {
                            tree.bcnhighlight = true;
                        }
                        if (tree_meta.indexOf("clickedHighlight") !== -1) {
                            tree.clickedHighlight = true;
                        }

                    } else if (x === ':') {
                        tree.length = parseFloat(token);
                    }
            }
        }
        // update settings radiobuttons
        updateSettingsLabels(settingsLbls);

        return tree;
    }

    function updateSettingsLabels(settingsLbls) {

        // update settings radiobuttons
        updateSettingsLabels(settingsLbls);

        return tree;
    }

    function updateSettingsLabels(settingsLbls) {

        // update settings radiobuttons
        // TODO, hide not used radios, what do we show always?
        if (settingsLbls && settingsLbls.length > 0) {

            settingsLbls = settingsLbls.filter(
                function (a) {
                    if (!this[a]) {
                        this[a] = 1;
                        return a;
                    }
                }, {}
            );

            jQuery.each(settingsLbls, function (i, stglbl) {
                $('[name=internalLabels][value=' + stglbl + ']').show().next().show();
            });

        } else {
            /* hide optional radio buttons */
            $('[name=internalLabels] .opt').hide();
        }
    }

    /*
     Called externally and allows to drag and drop text files for tree input
     */
    function inputTreeFile(newickIn) {
        /*
         /
         /    Enable drag and drop
         /
         */
        var MAX_BYTES = 102400; // 100 KB

        function dragEnter(event) {
            event.stopPropagation();
            event.preventDefault();
        }

        function dragExit(event) {
            event.stopPropagation();
            event.preventDefault();
        }

        function dragOver(event) {
            event.stopPropagation();
            event.preventDefault();
        }

        function drop(event) {
            event.stopPropagation();
            event.preventDefault();
            $("#renderErrorMessage").empty();

            var data = event.dataTransfer;
            var file = data.files;

            var accept = {
                text: ["txt", "nh", "nhx", "nwk", "tre", "tree"]
            };

            var file_name_tokens = file[0].name.split(".");
            var file_name_ending = file_name_tokens[file_name_tokens.length - 1];

            if (accept.text.indexOf(file_name_ending) > -1) {
                var reader;
                reader = new FileReader();
                reader.onload = function (event) {
                    if (!(checkTreeInput(event.target.result) === "NotNwk")) {
                        $("#" + newickIn).val(event.target.result);
                        $("#renderErrorMessage").empty();
                    } else {
                        $("#renderErrorMessage").empty();
                        $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">This is not a tree file!</div>')).hide().slideDown(300);
                        $("#" + newickIn).attr("placeholder", "Paste your tree or drag and drop your tree file here").val("");
                    }

                };
                reader.onloadend = onFileLoaded;
                reader.readAsText(file[0]);
                if (file[0].name === "") {
                    $("#" + newickIn + "Label").attr("placeholder", "Untitled").val("");
                }
                else {
                    $("#" + newickIn + "Label").val(file[0].name);
                }
            } else {
                $("#renderErrorMessage").empty();
                $("#" + newickIn + "Label").text("No file");
                $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">Only the following file endings are accepted: txt, nh, nhx, nwk, tre, tree</div>')).hide().slideDown(300);
                $("#" + newickIn + "Label").attr("placeholder", "Untitled").val("");
                $("#" + newickIn).attr("placeholder", "Paste your tree or drag and drop your tree file here").val("");
            }
            // object for allowed media types
        }

        function onFileLoaded(event) {
            event.currentTarget.result.substr(0, MAX_BYTES);
        }

        var dropArea = $("#" + newickIn).get(0);

        dropArea.addEventListener("dragenter", dragEnter, false);
        dropArea.addEventListener("dragexit", dragExit, false);
        dropArea.addEventListener("dragover", dragOver, false);
        dropArea.addEventListener("drop", drop, false);

        /*
         /
         /    Enable file input using button
         /
         */
        var newickInButton = document.getElementById(newickIn + "Button");
        var control = document.getElementById(newickIn + "File");
        newickInButton.addEventListener('click', function (event) {
            event.preventDefault();
            control.click();
        }, false);


        control.addEventListener("change", function (event) {

            // When the control has changed, there are new files
            var file = control.files;

            var accept = {
                text: ["txt", "nh", "nhx", "nwk", "tre", "tree"]
            };

            var file_name_tokens = file[0].name.split(".");
            var file_name_ending = file_name_tokens[file_name_tokens.length - 1];

            if (accept.text.indexOf(file_name_ending) > -1) {
                var reader = new FileReader();
                reader.onload = function (event) {
                    if (!(checkTreeInput(event.target.result) === "NotNwk")) {
                        $("#" + newickIn).val(event.target.result);
                        $("#renderErrorMessage").empty();
                    } else {
                        $("#renderErrorMessage").empty();
                        $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">This is not a tree file!</div>')).hide().slideDown(300);
                        $("#" + newickIn + "Label").attr("placeholder", "Untitled").val("");
                        $("#" + newickIn).attr("placeholder", "Paste your tree or drag and drop your tree file here").val("");
                    }

                };
                reader.onloadend = onFileLoaded;
                reader.readAsText(file[0]);
                if (file[0].name === "") {
                    $("#" + newickIn + "Label").attr("placeholder", "Untitled").val("");
                }
                else {
                    $("#" + newickIn + "Label").val(file[0].name);
                }

            } else {
                $("#renderErrorMessage").empty();
                $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">Only the following file endings are accepted: txt, nh, nhx, nwk, tre, tree</div>')).hide().slideDown(300);
                $("#" + newickIn + "Label").attr("placeholder", "Untitled").val("");
                $("#" + newickIn).attr("placeholder", "Paste your tree or drag and drop your tree file here").val("");
            }


        }, false);

    }

    function resetTreeVisStatus(treeCollection) {
        if (treeCollection.length > 0) {
            for (var i = 0; i < treeCollection.length; i++) {
                treeCollection[i].display = false;
            }
        }
    }


    // function that returns length of triangle at each node important to calculate how to fix position into all visible space
    function getCollapsedTriangleLength(node) {
        var total = getTotalLength(node);
        var avg = total / node.leaves.length;
        return avg;
    }

    /**
     *
     * check if string is jsonstring
     *
     * @param str
     * @returns {boolean}
     * @constructor
     */
    function IsJsonString(str) {

        try {
            var o = JSON.parse(str);

            // Handle non-exception-throwing cases:
            // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
            // but... JSON.parse(null) returns null, and typeof null === "object",
            // so we must check for that, too. Thankfully, null is falsey, so this suffices:
            if (o && typeof o === "object") {
                return o;
            }
        }
        catch (e) { }

        return false;
    };

    /*
     Called externally to convert a tree and add to internal tree structure
     */
    function addTree(newick, myName, mode) {

        // when adding new tree the default is not to have evolotionary events
        hasHistogramData = false;

        var num = trees.length;
        var idCounter = 0;

        var tmpNewicks;
        var newicks = [];
        var noJsonConversion = false;
        var tree = IsJsonString(newick);
        // if the string is already json, don't convert it
        // json can have only one tree, at least for now
        if(tree == false){

            // this is important to allow trees to be separated by ";", or "\n" and also to have black lines
            if (newick.indexOf(";") !== -1) {
                tmpNewicks = newick.replace(/(^[ \t]*\n)/gm, "").replace(/(\r\n|\n|\r)/gm, "").split(";");
                if (tmpNewicks.length > 1) {
                    newicks = tmpNewicks.slice(0, -1);
                }
            } else {
                tmpNewicks = newick.replace(/(^[ \t]*\n)/gm, "").replace(/(\r\n|\n|\r)/gm, ";").split(";");
                if (tmpNewicks.length > 1) {
                    newicks = tmpNewicks.slice(0, -1);
                }
            }

        } else {
            newicks[0] = tree;
        }

        // reset settings radiobuttons
        updateSettingsLabels();

        resetTreeVisStatus(trees);
        // the following is important to allow the support to load multiple trees at once
        // multiple trees from the text field will be loaded into a tree array that will be given to the main tree object

        for (var i = 0; i < newicks.length; i++) {
            var count = (num + i);
            var name = "Tree_" + count;

            if(!tree){
                tree = convertTree(newicks[i]);
            }



            var leaves = getChildLeaves(tree).sort();
            for (var j = 0; j < leaves.length; j++) {
                leaves[j].ID = Math.pow(2, j);
                //console.log(leaves[j].ID);
            }

            //add required parameters to each node
            postorderTraverse(tree, function(d) {
                d.keep = true;
                d.ID = name+"_node_"+idCounter;
                d.leaves = getChildLeaves(d);
                d.clickedParentHighlight = false;
                d.mouseoverHighlight = false; //when mouse is over node
                d.mouseoverLinkHighlight = false; //when mouse is over branch between two nodes
                d.correspondingHighlight = false;
                d.collapsed = false; //variable to obtain the node/nodes where collapsing starts
                if(!d.length){ d.length = 0.1; }

                if(d.numberGenes > largestGenome) {
                    largestGenome = d.numberGenes;
                }

                if(d.numberEvents > largestEvents) {
                    largestEvents = d.numberEvents;
                }

                idCounter++;
            });

            var fullTree = {
                root: tree,
                name: name,
                mode: mode,
                display: true,
                part: i, // index part of the collection of trees
                last: (num + newicks.length - 1), // index of last tree
                data: {}
            };

            if (newicks.length > 1) {
                fullTree.multiple = true;
                fullTree.total = newicks.length;
            } else {
                fullTree.total = 1;
            }
            fullTree.data.autoCollapseDepth = getRecommendedAutoCollapse(tree);

            trees.push(fullTree);
        }
        return trees[(trees.length - newicks.length)];
    }

    /*
    depending on number of leaves function returns optimal collapsing depth
     */
    function getRecommendedAutoCollapse(root) {
        var leafCount = root.leaves.length;
        if (leafCount < 50) {
            return null;
        } else {
            //return (Math.floor(Math.log(leafCount)) + 1);
            // how many levels will be expanded, 10 is pushing it
            return (Math.floor(Math.log(leafCount)) > 8 ? 10 : (Math.floor(Math.log(leafCount) + 3)));
        }

    }

    /*
    depending on number of splits function returns maximum number of collapsing depth
     */
    function getMaxAutoCollapse() {
        var maxDepth = [];

        for (var i = 0; i < renderedTrees.length; i++) {
            var maxDepthTmp = 0;
            postorderTraverse(renderedTrees[i].root, function (e) {
                if (e.depth > maxDepthTmp) {
                    maxDepthTmp = e.depth;
                }
            }, true);
            maxDepth.push(maxDepthTmp);
        }
        return Math.max.apply(Math, maxDepth) - 1;
    }

    /*
     return trees in tree array trees
     */
    function getTrees() {
        return trees
    }

    /*
    remove a tree from array of trees
     */
    function removeTree(name) {
        trees.splice(findTreeIndex(name), 1);
        for (var i = 0; i < renderedTrees.length; i++) {
            if (renderedTrees[i].name === name) {
                $("#" + renderedTrees[i].data.canvasId).empty();
                if (renderedTrees[i].data.scaleId && settings.enableScale) {
                    $(renderedTrees[i].data.scaleId).empty();
                }
            }
        }
    }

    /*
     Function to find maxBranchSupport in order to scale branchSupport values between 0 and 1
     1) [0,1]
     2) [0,100]
     3) [0,1000] swisstree only
     */
    function findScaleValueBranchSupport(tree) {
        var branchSupport = [];
        postorderTraverse(tree, function (d) {
            if (d["branchSupport"]) {
                branchSupport.push(d["branchSupport"])
            }
        });
        var tmpMaxBranchSupport = Math.max.apply(Math, branchSupport);

        if (tmpMaxBranchSupport <= 1) {
            maxBranchSupport = 1
        } else if (tmpMaxBranchSupport <= 100) {
            maxBranchSupport = 100
        } else if (tmpMaxBranchSupport <= 1000) {
            maxBranchSupport = 1000
        }
        else {
            maxBranchSupport = undefined
        }

    }

    /*
     Can be called externally to render the color scale for tree comparison in a div
     */
    function renderColorScale(scaleId) {
        var colorScale = d3.scale.linear()
            .domain(colorScaleDomain)
            .range(colorScaleRange);
        var width = 75;
        var steps = 10;
        var height = 25;
        var svgHeight = height + 20;
        var svg = d3.select("#" + scaleId).append("svg")
            .attr("width", width + "px")
            .attr("height", svgHeight + "px")
            .append("g");
        svg.append("svg:title").text("Similarity to most common node");

        for (var i = 0; i < steps; i++) {
            svg.append("rect")
                .attr("width", (width / steps) + "px")
                .attr("height", height + "px")
                .attr("fill", colorScale(i / steps))
                .attr("x", ((width / steps) * i) + "px")
        }
        svg.append("text")
            .text("0")
            .attr("x", 0)
            .attr("y", height + 13)
            .attr("fill", "black");
        // .attr("font-weight", 600);
        svg.append("text")
            .text("1")
            .attr("x", width - 8)
            .attr("y", height + 13)
            .attr("fill", "black");
        // .attr("font-weight", 600);
    }

    /*
    Function that returns unvisible children or visible children if one or the other are given as input
     */
    function getChildren(d) {
        return d._children ? d._children : (d.children ? d.children : []);
    }

    /*
    Changes text in the length scale according to changes in vis
     */
    function applyScaleText(scaleText, zoomScale, root) {
        // no scaletext if it's supressed
        if(!scaleText){ return false; }
        if (root.children || root._children) {
            var children = getChildren(root);
            var length = 0;
            var offset = 0;
            for (var i = 0; i < children.length; i++) {
                length = getLength(children[i]);
                offset = children[i].baseY;
                var test_length = length.toFixed(3);
                if (test_length !== 0 && offset !== 0) { //take the first one unequal zero
                    break;
                }
            }
            var text = (((scaleLineWidth / offset) * length) / zoomScale).toFixed(2);
            scaleText.text(text);
        }
    }

    /*
     returns number of leaf nodes that are children of d (includes self if self is leaf)
     */
    function getTotalChildLeaves(d) {
        if (d.children || d._children) {
            var total = 0;
            var children = getChildren(d);
            for (var i = 0; i < children.length; i++) {
                total = total + getTotalChildLeaves(children[i]);
            }
            return total;
        } else {
            return 1;
        }
    }

    /*
     returns number of leaf nodes that are children of d (includes self if self is leaf)
     */
    function getTotalChildNodes(d) {
        var totalNodes = 0;
        postorderTraverse(d, function () {
            totalNodes++;
        }, true);
        return totalNodes;
    }

    /*
     returns list of leaf nodes that are children of d
     */
    function getChildLeaves(d) {
        if (d.children || d._children) {
            var leaves = [];
            var children = getChildren(d);
            for (var i = 0; i < children.length; i++) {
                leaves = leaves.concat(getChildLeaves(children[i]));
            }
            return leaves;
        } else {
            return [d];
        }
    }

    /*
     Adds d as the parent value of all of its children
     */
    function addParents(d) {
        var children = getChildren(d);
        for (var i = 0; i < children.length; i++) {
            children[i].parent = d;
            addParents(children[i]);
        }
    }

    /*
     returns longest visible branch or triangle
     */
    function getMaxLengthVisible(root) {
        var max = 0;

        function getMax_internal(d, max) {
            if (d.children) {
                var children = d.children;
                for (var i = 0; i < children.length; i++) {
                    max = Math.max(getMax_internal(children[i], max), max)
                }
                return max;
            } else {
                var maxLength = (typeof d.triangleLength == 'undefined' || d.length > d.triangleLength) ? d.length : d.triangleLength;

                if(maxLength > max) {
                    longestNode = d;
                    return maxLength;
                }

                return max;
            }
        }

        return getMax_internal(root, max);
    }

    function getMaxLength(root) {

        var max = 0;

        function getMax_internal(d, max) {
            if (d.children || d._children) {
                var children = getChildren(d);
                for (var i = 0; i < children.length; i++) {
                    max = Math.max(getMax_internal(children[i], max), max)
                }
                return max;
            } else {
                return (d.length ? Math.max(d.length, max) : max)
            }
        }

        return getMax_internal(root, max);

    }

    function getTotalLength(node) {
        var sum = 0;

        postorderTraverse(node, function (d) {
            sum += d.length;
        }, true);

        return sum;
    }

    /*
     get total length of a node from root
     */
    function getLength(d) {
        if (d.parent) {
            return d.length + getLength(d.parent);
        } else {
            return 0;
        }
    }

    function getLongestBranchLength(root){

        var max = 0;
        var prosessCollapsed = false;

        function getMax_internal(d, max) {
            var children = getChildren(d);

            // visible children or or first level of collapsed branch
            if (children.length == 0 || prosessCollapsed) {

                prosessCollapsed = false;

                var branchLength = getLength(d);
                if(max < branchLength){
                    max = branchLength;
                    longestBranch = d;
                }

                return max;

            } else {

                if(!prosessCollapsed) {

                    if(d._children) {
                        prosessCollapsed = true;
                    }

                    for (var i = 0; i < children.length; i++) {
                        max = Math.max(getMax_internal(children[i], max), max)
                    }


                }

                return max;

            }

        }

        return getMax_internal(root, max);

    }

    /*
     Description:
     Traverses and performs function f on treenodes in postorder
     Arguments:
     d: the tree object
     f: callback function
     do_children (optional, default: true): consider invisible children?
     Comments:
     if do_children === false, doesn't traverse _children, only children
     _children means the children are not visible in the visualisation, i.e they are collapsed
     */
    function postorderTraverse(d, f, do_children) {
        if (do_children === undefined) { //check whether variable is defined, e.g. string, integer ...
            do_children = true;
        }
        var children = [];
        if (do_children) {
            children = getChildren(d);
        } else {
            if (d.children) {
                children = d.children
            }
        }
        if (children.length > 0) {
            for (var i = 0; i < children.length; i++) {
                postorderTraverse(children[i], f, do_children);
            }
            f(d);
            return;

        } else {
            f(d);
            return;
        }
    }
    /*
     function important for rerooting to create new top leave root node
     */
    function newNode(d) { // private method
        return {
            parent: null,
            children: [],
            name: "",
            ID: "",
            length: 0,
            mouseoverHighlight: false,
            mouseoverLinkHighlight: false,
            elementS: d.elementS
        };
    }

    /*
     Function to dynamically reroot a tree at a specific node
     Taken and adapted from knlh.js....
     tree = tree.root
     newRoot = d
     */
    /* Reroot: put the root in the middle of node and its parent */
    function reroot(tree, node) {
        var idCount = 0;
        var root = tree.root;
        var name = tree.name;
        if (node.parent !== root) {

            if (manualReroot == false) {//ensure that always the lengths of branches are conserved!
                backupRoot = root;
                manualReroot = true;
            } else {
                root = backupRoot;
            }

            var i, d, tmp;
            var btmp, bd;
            var p, q, r, s, new_root;
            if (node == root) return root;
            var dist = node.length / 2;
            tmp = node.length;
            btmp = node.branchSupport;
            /* p: the central multi-parent node
             * q: the new parent, previous a child of p
             * r: old parent
             * i: previous position of q in p
             * d: previous distance p->d
             */
            q = new_root = newNode(node.parent); //node.parent ensures the correct coulering of the branches when rerooting
            q.children[0] = node; //new root
            //q.children[0].ID = node.ID;
            q.children[0].length = dist;
            q.children[0].branchSupport = btmp;
            p = node.parent;
            q.children[0].parent = q;
            for (i = 0; i < p.children.length; ++i)
                if (p.children[i] == node) break;
            q.children[1] = p;
            //q.children[1].ID =  makeId("node_");
            d = p.length;
            bd = p.branchSupport;
            p.length = tmp - dist;
            p.branchSupport = btmp;
            r = p.parent;
            p.parent = q;


            while (r != null) {
                s = r.parent;
                /* store r's parent */
                p.children[i] = r;
                /* change r to p's children */
                for (i = 0; i < r.children.length; ++i) /* update i */
                    if (r.children[i] == p) break;
                r.parent = p;
                /* update r's parent */
                tmp = r.length;
                r.length = d;
                d = tmp;
                /* swap r->d and d, i.e. update r->d */
                btmp = r.branchSupport;
                r.branchSupport = bd;
                bd = btmp;
                q = p;
                p = r;
                r = s;
                /* update p, q and r */
            }


            /* now p is the root node */
            if (p.children.length == 2) { /* remove p and link the other child of p to q */
                r = p.children[1 - i];
                /* get the other child */
                for (i = 0; i < q.children.length; ++i) /* the position of p in q */
                    if (q.children[i] == p) break;
                r.length += p.length;
                r.parent = q;
                q.children[i] = r;
                /* link r to q */
            } else { /* remove one child in p */
                for (j = k = 0; j < p.children.length; ++j) {
                    p.children[k] = p.children[j];
                    if (j != i) ++k;

                }
                --p.children.length;
            }

            //var idCounter = 0;
            tree.root = new_root;
            tree.data.root = tree.root; //create clickEvent that is given to update function

            postorderTraverse(tree.root, function (d) {
                //d.bcnhighlight = null;
                //d.highlight = 0;
                //d.clickedHighlight = null;
                d.ID = name + "_node_" + idCount; // reset the IDs after rerooting
                d.leaves = getChildLeaves(d);
                idCount++;
            }, true);

            // if searchbar shown hide it when rerooting and remove all search highlight
            d3.selectAll(".link").attr("class", "link");
            //hideSearchBar(tree.data.canvasId);

            return tree;
        } else {
            return tree;
        }
    }


    function getTreeFromCanvasId(id) {
        var name = $("#" + id + " > svg").attr('id');
        return trees[findTreeIndex(name)];

    }


    /*---------------
     /
     /    EXTERNAL: Function to create URL with attached gist-ID for export of visualization
     /
     ---------------*/
    function exportTreeToGist(isCompared){

        /*
         Function to write JSON structure to gist
         */
        function writeJSONtoGist(sourceData, callback) {
            var currentTrees = sourceData;

            // get original newick since parser can not handle _children
            postorderTraverse(currentTrees.root, function (d) {
                if (d._children) {
                    d.children = d._children;
                    d._children = null;
                }
            });

            var nwk_original = jsonToNwk(currentTrees.root, false);
            var nwk_collapsed = jsonToNwk(currentTrees.root, true);


            var dataOut = currentTrees.name + "$$" + nwk_original + "$$" + nwk_collapsed;
            postorderTraverse(currentTrees.root, function (d) {
                if (d.collapsed) {
                    d._children = d.children;
                    d.children = null;
                }
            });

            var tmp = {
                "description": "a gist for a user with token api call via ajax",
                "public": true,
                "files": {"file1.json": {"content": dataOut}}
            };

            return $.ajax({
                async: false,
                url: settings.gistSaveServerURL,
                type: 'POST',
                dataType: 'json',
                data: {jsondata: JSON.stringify(tmp)},
                success: callback

            });

        }

        var tmpURL = window.location.href.split("#");
        var outURL = tmpURL[0] + "#";
        var tree1;

        if (isCompared) {
            tree1 = trees[trees.length - 2];
            var tree2 = trees[trees.length - 1];

            var gistID1;
            var gistID2;
            writeJSONtoGist(tree1, function (data) {
                gistID1 = data.id;
            });

            writeJSONtoGist(tree2, function (data) {
                gistID2 = data.id;
            });

            if(gistID1 === undefined || gistID2 === undefined){
                return "Error: Gists could not be created";
            }

            outURL += encodeURIComponent(gistID1 + "-" + gistID2);

        } else {
            tree1 = trees[trees.length - 1];
            var gistID;
            writeJSONtoGist(tree1, function (data) {
                gistID = data.id;
            });

            if(gistID === undefined){
                return "Error: Gist could not be created";
            }

            outURL += encodeURIComponent(gistID);
        }


        return outURL;

    }


    /*---------------
     /
     /    EXTERNAL: Function to retrieve visualization using tree obtained from gist
     /
     ---------------*/
    function addTreeGistURL(gistID, name) {

        var newTree;

        try {

            var request = new XMLHttpRequest();
            request.open('GET', settings.gistSaveServerURL + "?gistid="+gistID, false);
            request.send(null);

            if (request.status === 200) {
                newTree = JSON.parse(request.responseText).files['file1.json'].content;
            } else {
                throw "Error: Github Gist was not found! ("+request.status+")";
            }

        } catch (e){

            $('#modalTitleError').html('Github Error');
            $('#modalBodyError').html(e);
            $('#myErrorModal').modal('show');
            return false;

        }

        var idCounter = 0;
        settings.autoCollapse = null;
        if (name === undefined) {
            var num = trees.length;
            name = "Tree " + num;
        }

        //console.log(newTree);
        var parsedNwk = newTree.split("$$");
        try {
            var collapsedInfoTree = convertTree(parsedNwk[2]); // calls convert function from above
        } catch (err) {
            throw "Invalid Newick";
        }

        postorderTraverse(collapsedInfoTree, function (d) {
            d.ID = name + "_node_" + idCounter;
            d.leaves = getChildLeaves(d);
            d.mouseoverHighlight = false; //when mouse is over node
            d.mouseoverLinkHighlight = false; //when mouse is over branch between two nodes
            idCounter++;
        });

        var fullTree = {
            root: collapsedInfoTree,
            name: name,
            nwk: parsedNwk[1],
            compare: false,
            data: {}
        };
        fullTree.data.autoCollapseDepth = getRecommendedAutoCollapse(collapsedInfoTree);

        trees.push(fullTree);


        return fullTree

    }

    function rgb2hex(rgbString) {

        var rgb = rgbString.split(".");

        var R = parseInt(rgb[0]);
        var G = parseInt(rgb[1]);
        var B = parseInt(rgb[2]);

        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }

        return "#" + componentToHex(R) + componentToHex(G) + componentToHex(B);

    }

    function ladderizeTree(tree, direction) {


        function sortChildrenByNumLeaves(d, tree, direction) {
            var childIdxToLeaveNumMap = {};

            for (var i = 0; i < d.children.length; i++) {
                childIdxToLeaveNumMap[i] = d.children[i].leaves.length
            }
            // Create items array
            var items = Object.keys(childIdxToLeaveNumMap).map(function (key) {
                return [parseInt(key), childIdxToLeaveNumMap[key]];

            });

            if (direction == 'ascending') {
                items.sort(function (first, second) {
                    return second[1] - first[1]
                });
            }
            else if (direction == 'descending') {
                items.sort(function (first, second) {
                    return first[1] - second[1]
                });
            }
            settings.loadingCallback();
            setTimeout(function () {
                // here the actual rotation happens
                var tmp = [];
                for (var i = 0; i < items.length; i++) {
                    tmp.push(d.children[items[i][0]]);
                }
                d.children = tmp;

                update(d, tree.data);

                settings.loadedCallback();
            }, 2);

        }

        postorderTraverse(tree.root, function (d) {
            //console.log(d);
            if (d.children && d.parent) {
                var currentNode = d;
                sortChildrenByNumLeaves(d, tree, direction);
            } else if (!d.parent) {
                sortChildrenByNumLeaves(d, tree, direction);
            }
        });

    }


    /*---------------
     /
     /    UPDATE: Main function that is every time called once an action on the visualization is performed
     /
     ---------------*/
    function update(source, treeData, duration, treeToggle) {

        //time taken for animations in ms
        if (duration === undefined) {
            duration = 750;
        }

        if (treeToggle === undefined) {
            treeToggle = false;
        } else {
            duration = 1;
        }
        if (treeToggle === true) {
            duration = 0;
        }

        // Color scale for compare mode and bcn values from light yellow to dark blue
        var colorScale = d3.scale.linear()
            .domain(colorScaleDomain)
            .range(colorScaleRange);

        // Color scale for branchsupport from white to dark red
        var colorScaleRest = d3.scale.linear()
            .domain(colorScaleDomain)
            .range(colorScaleRangeRest);

        // Compute the new tree layout.
        var nodes = treeData.tree.nodes(treeData.root).reverse();
        var links = treeData.tree.links(nodes);

        var leaves = treeData.root.leaves.length;
        var leavesVisible = getVisibleLeaves(treeData.root);

        var height = $(".vis-container").height();
        var renderHeight = height - paddingVertical * 2;
        var leavesHidden = 0;
        var triangles = 0;
        var treeName = getTreeName(treeData);

        function getTreeName(treeData){
            var treeNameElements = treeData.root.ID.split("_");
            return treeNameElements[0]+"_"+treeNameElements[1];
        }

        postorderTraverse(treeData.root, function (d) {
            if (d._children) {
                leavesHidden += d.leaves.length;
                triangles += 1;
            }
        }, false);

        var newHeight;

        //calculate treeHeight if we are squashing tree into visible space
        if (settings.fitTree === "scale" && treeData.prevNoLeavesVisible) {
            var newHeight = 1;
            if (leavesVisible > 0) {
                newHeight = renderHeight / (leavesVisible + leavesHidden);
                treeData.treeHeight = newHeight;
            }
        }
        if (settings.fitTree === "scale" && leavesVisible === 0 && !treeData.prevNoLeavesVisible) {
            newHeight = renderHeight / (leavesVisible + leavesHidden);
            newHeight = (newHeight * triangleHeightDivisor);
            newHeight = newHeight - (newHeight / triangleHeightDivisor / 2);
            treeData.treeHeight = newHeight;
        }

        if (leavesVisible > 0) {
            treeData.prevNoLeavesVisible = false;
        } else {
            treeData.prevNoLeavesVisible = true;
        }

        // False if visible leaves, true otherwise
        // Set to true in renderTree
        treeData.prevNoLeavesVisible = !(leavesVisible > 0);

        var leafHeight = treeData.treeHeight;
        height = leaves * leafHeight;
        var trianglePadding = leafHeight;

        //helper function to calculate all the leaf nodes visible, including the nodes with the collapsing
        //important to scale even big renderings onto the screen
        var visNodes = 0;

        function getLeavesShown(e) {
            function getLeavesShownInner(d) {
                if (d.children) {
                    for (var i = 0; i < d.children.length; i++) {
                        getLeavesShownInner(d.children[i]);
                    }
                } else {
                    visNodes += 1;
                }
            }

            getLeavesShownInner(e);
            return visNodes;
        }

        var allVisLeaves = getLeavesShown(treeData.root);
        var divisor = ((treeData.root.leaves.length - allVisLeaves) > 0) ? allVisLeaves : treeData.root.leaves.length; //number of leaves when collapsed


        //helper function to get info about number of collapsed nodes in a subtree
        function getCollapsedParams(e) {
            var collapsedHeightInner = 0;
            var leavesHiddenInner = 0;

            function getCollapsedHeight(d) {
                if (d._children && !d.children) {
                    var offset = leafHeight / triangleHeightDivisor * d.leaves.length;
                    if (offset < amendedLeafHeight) { //condition ensures the right spacing if the triangle is smaller than the distance between two leaves
                        collapsedHeightInner += amendedLeafHeight;
                    } else {
                        collapsedHeightInner += ((leafHeight / triangleHeightDivisor * d.leaves.length) + (trianglePadding * 2));
                    }
                    leavesHiddenInner += d.leaves.length;
                } else if (d.children) {
                    for (var i = 0; i < d.children.length; i++) {
                        getCollapsedHeight(d.children[i]);
                    }
                }
            }

            getCollapsedHeight(e);
            return {
                collapsedHeight: collapsedHeightInner,
                leavesHidden: leavesHiddenInner
            }
        }

        var params = getCollapsedParams(treeData.root); //helper function getCollapsedParams(e) above is called and saved in params
        var collapsedHeight = params.collapsedHeight; // height of collapsed leaves with collapsed branches
        var amendedLeafHeight = ((treeData.root.leaves.length * leafHeight) - collapsedHeight) / (divisor);
        //calculate the vertical position for a node in the visualisation
        //yes x is vertical position, blame d3's tree vis structure not me...
        var test = 0;
        function setXPos(d, upperBound) {
            var params;
            var collapsedHeight;

            if (d.children) { // defines the vertical position of the inner nodes
                for (var i = 0; i < d.children.length; i++) {
                    setXPos(d.children[i], upperBound);
                    test+=1;

                    params = getCollapsedParams(d.children[i]);
                    collapsedHeight = params.collapsedHeight;
                    var leavesHidden = params.leavesHidden;
                    upperBound += (((d.children[i].leaves.length - leavesHidden) * amendedLeafHeight) + collapsedHeight);
                }
                d.x = d.children[0].x+((d.children[d.children.length-1].x- d.children[0].x)/2);
            } else if (d._children) { //gets the position of the nodes that lead to the triangles
                params = getCollapsedParams(d);
                collapsedHeight = params.collapsedHeight;
                d.x = upperBound + (collapsedHeight / 2);
            } else { // defines the vertical position of the leaves only
                d.x = upperBound + (amendedLeafHeight / 2);
            }
            d.x = d.x;
        }


        /*
         define the vertical position of the shown leaves depending on some bound and traverse this information to all leaves
         */
        function setXPosLeaves(d, upperBound) {
            if (d.children) {
                var newBound = upperBound;
                for (var i = 0; i < d.children.length; i++) {
                    setXPosLeaves(d.children[i], newBound);
                    upperBound += d.children[i].leaves.length * amendedLeafHeight;
                }
            }
        }

        var maxLength = treeData.maxLength;
        // returns length in absolute coordinates of the whole tree

        // magic number?
        var lengthMult = treeData.treeWidth + 10;

        //calculate horizontal position of nodes
        var newLenghtMult = 0;
        var lengthMultiplier = lengthMult/maxLength;
        nodes.forEach(function (d) {
            if (settings.useLengths) { //setting selected by user
                d.y = getLength(d) * lengthMultiplier; //adjust position to screen size
                d.baseY = d.y;
            } else {
                d.y = d.depth * lengthMult / 10;
                d.baseY = d.y;
                if (d.y > newLenghtMult) {
                    newLenghtMult = d.y
                }
            }
            // pull the whole tree up
            d.y = d.y - 90;
        });

        // this ensures that when lengths are not used when rerooting the plot is still drawn similar
        if (newLenghtMult > lengthMult) {
            lengthMult = newLenghtMult
        }

        //align tip labels
        nodes.forEach(function (d) {
            if (settings.alignTipLabels && (!d.children || d._children)) {
                d.y = lengthMult - 90;
            }
        });

        //mirror right tree
        if (settings.mirrorRightTree && renderedTrees.length > 1){
            var treeNameElements = treeData.root.ID.split("_");
            var treeName = treeNameElements[0]+"_"+treeNameElements[1];
            var oppositeTreeName = d3.select("#vis-container2 svg").attr("id");
            var treeIdx = findTreeIndex(oppositeTreeName);

            nodes.forEach(function(d) {
                if (treeName === trees[treeIdx].name && settings.mirrorRightTree){
                    d.y = lengthMult - d.y;
                }
            });
            //return text width to adjust position of text when mirror
            function getTextWidth(txt){
                var c = document.createElement("canvas");
                var ctx = c.getContext("2d");
                ctx.font = settings.fontSize + "px Arial";
                var textWidth = ctx.measureText(txt).width;
                return textWidth
            }
        } else {
            var treeIdx = trees.length -1;
        }

        setXPos(treeData.root, 0);
        // Update the nodes…
        // Assign a unique numeric identifer to each node
        // "zero" being the number of leaves
        var node = treeData.svg.selectAll("g.node")
            .data(nodes, function (d) {
                return d.id || (d.id = ++treeData.i);
            })
            .attr("id", function (d) {
                return d.ID;
            });

        // Enter any new nodes at the parent's previous position.
        // Perform the actual drawing
        var nodeEnter = node.enter().append("g")
            .filter(function(d){
                return d.keep
            })
            .attr("class", "node")
            .attr("transform", function (d) {
                if (source === treeData.root) {
                    if (d.parent) {
                        return "translate(" + d.parent.y + "," + d.parent.x + ")";
                    } else {
                        return "translate(" + source.y0 + "," + source.x0 + ")";
                    }
                } else {
                    return "translate(" + source.y0 + "," + source.x0 + ")";
                }
            })
            .attr("id", function (d) {
                return d.ID;
            })
            .on("mouseover", nodeMouseover)
            .on("mouseout", nodeMouseout)
            .on("click", treeData.clickEvent); //comes from getClickEvent

        //perform the actual drawing
        nodeEnter.append("circle")
            .attr("class", "node")
            .attr("r", settings.nodeSize * 2);

        nodeEnter.append("rect")
            .attr("class", "node")
            .attr("y", "-5px")
            .attr("x", "-5px")
            .attr("width", "0px")
            .attr("height", "0px");

        // define visualization of labels on internal nodes
        nodeEnter.append("text")
            .attr("class", "node")

            .attr("x", function(d) {
                if ((!d.children || d._children) && treeName === trees[treeIdx].name && settings.mirrorRightTree){
                    return -13 - getTextWidth(d.name);
                } else if ((d.children || d._children) && !d.evolutionaryEvents) {
                    return -13;
                } else {
                    return 13;
                }

            })
            .attr("dy", function (d) {
                //ensures that length labels are on top of branch
                if (!(d.children || d._children) || d.evolutionaryEvents)  {
                //if (!(d.children || d._children) || isDefined(d.evolutionaryEvents))  {
                    return ".3em";
                } else {
                    return "-.3em";
                }
            })
            .attr("dx", function (d) {
                if (d.children || d._children) {
                    return ".3em";
                } else {
                    return "-.3em";
                }
            })
            .attr("text-anchor", function (d) {
                return ((d.children || d._children) && !d.evolutionaryEvents) ? "end" : "start";
            })
            .style("fill-opacity", 1e-6)
            .attr("font-size", function (d) {
                return settings.fontSize + "px"
            });


        nodeEnter.append("text")
            .attr("class", "triangleText")
            .attr("dy", ".35em")
            //.style("fill-opacity", 1e-6)
            .attr("font-size", function (d) {
                return settings.fontSize + "px"
            });

        nodeEnter.append("path")
            .attr("class", "triangle")
            .attr("d", function (d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            });

        d3.selectAll('g.node')
            .filter(function(d){
                return d.evolutionaryEvents != false
            })
            .each(addStack);

        if(showHistogramLegend && hasHistogramData){
            d3.select('#histogram-legend').remove();
            addMainLegend(treeName);
        }

        //instant node changes
        node.select("text")
            .attr("font-size", function (d) {
                return settings.fontSize + "px"
            });

        node.select("circle")
            .attr("r", function (d) {
                if (d.bcnhighlight) {
                    return (settings.nodeSize * 1.5);
                }
                return settings.nodeSize;
            })
            .style("fill", function (d) {
                if (d[currentS]) {
                    if (d._children) {
                        return "red";
                    } else {
                        return colorScale(d[currentS])
                    }
                }
            });

        node.select("rect")
            .attr("width", function (d) {
                if (d.clickedHighlight || d.bcnhighlight) {
                    return (settings.nodeSize * 2) + "px";
                } else {
                    return "0px";
                }
            })
            .attr("height", function (d) {
                if (d.clickedHighlight || d.bcnhighlight) {
                    return (settings.nodeSize * 2) + "px";
                } else {
                    return "0px";
                }
            })
            .style("fill", function (d) {
                if (d.clickedHighlight || d.bcnhighlight) {
                    return "red"; //changed from red, so that boxes look different when highlighted to when searched
                }
            })
            .attr("y", -settings.nodeSize + "px")
            .attr("x", -settings.nodeSize + "px");

        // Node changes with transition
        var nodeUpdate;
        if (treeToggle === true) {
            nodeUpdate = node.attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            });
        } else {
            nodeUpdate = node.transition()
                .duration(duration)
                .attr("transform", function (d) {
                    return "translate(" + d.y + "," + d.x + ")";
                });
        }

        // Add text to nodes and leaves
        nodeUpdate.select("text")
            .style("fill-opacity", 1)

            .attr("x", function(d) {
                if ((!d.children || d._children) && treeName === trees[treeIdx].name && settings.mirrorRightTree){ //mirrored right tree
                    return -13 - getTextWidth(d.name);
                } else if ((!d.children && !d._children) || d.evolutionaryEvents) { //leaves left tree
                    return 13
                } else { //internal nodes
                    if (treeName === trees[treeIdx].name && settings.mirrorRightTree){ //internal nodes right tree
                        return 23
                    } else { //internal nodes left tree
                        return -13
                    }

                }
            })
            .text(function (d) {
                if ((!d.children && !d._children) || d.evolutionaryEvents) { //print leaf names
                    return d.name
                } else {
                    if (settings.internalLabels === "none") {
                        return "";
                    } else if (settings.internalLabels === "name") { //print bootstrap values
                        return d.branchSupport
                    } else if (settings.internalLabels === "color") { //print bootstrap values
                        return d.branchSupport
                    } else if (settings.internalLabels === "species") { //print species values
                        return d.species
                    } else if (settings.internalLabels === "taxonomyID") { //print taxonomy values
                        return d.taxonomy
                    } else if (settings.internalLabels === "ECNumber") { //print ec number values for this node
                        return d.ECNumber
                    } else if (settings.internalLabels === "length") {
                        if (d.length) {
                            return d.length.toFixed(3);
                        }

                    } else if (settings.internalLabels === "likelihood") {
                        if (d.likelihood) {
                            return d.likelihood.toFixed(3);
                        }
                    } else if (settings.internalLabels === "orthologous") {
                        if (d.orthologous) {
                            return d.orthologous;
                        }
                    } else if (settings.internalLabels === "superorthologous") {
                        if (d.superorthologous) {
                            return d.superorthologous;
                        }

                    } else if (settings.internalLabels === "subtree") {
                        if (d.subtree === 'Y') {
                            return 'Y';
                        } else {
                            return 'N';
                        }

                    } else if (settings.internalLabels === "collapseThis") {
                        if (d.collapseThis === 'Y') {
                            return 'Y';
                        } else {
                            return 'N';
                        }


                    } else if (settings.internalLabels === "duplication") {
                        if (d.duplication === 'Y') {
                            return 'duplication';
                        } else {
                            return 'speciation';
                        }

                    } else if (settings.internalLabels === "similarity" && d.similarity) {
                        return d.similarity;
                    }
                }
            });

        // Transition exiting nodes to the parent"s new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function (d) {
                if (source === treeData.root) {
                    var e = findHighestCollapsed(d);
                    return "translate(" + e.y + "," + e.x + ")";
                } else {
                    return "translate(" + source.y + "," + source.x + ")";
                }
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6)
            .attr("stroke", "none");

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        nodeExit.select("path")
            .attr("d", function (d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            });

        nodeExit.select(".triangleText")
            .attr("x", 0)
            .each("end", function () {
                d3.select(this).text("")
            });

        //function important for collapsing
        node.each(function (d) {
            if (d._children) {

                var offset = leafHeight / triangleHeightDivisor * d.leaves.length / 2;
                var canvasWidth = document.getElementById(treeData.canvasId).scrollWidth;
                var xlength = d.triangleLength * (lengthMult / maxLength);
                var ylength = offset; //height of half of the triangle

                d3.select(this).select("path").transition().duration(duration) // (d.searchHighlight) ? 0 : duration)
                    .attr("d", function(d) {
                        if(treeName === trees[treeIdx].name && settings.mirrorRightTree){
                            return "M" + 0 + "," + 0 + "L" + -xlength + "," + (-ylength) + "L" + -xlength + "," + (ylength) + "L" + 0 + "," + 0;
                        } else {
                            return "M" + 0 + "," + 0 + "L" + xlength + "," + (-ylength) + "L" + xlength + "," + (ylength) + "L" + 0 + "," + 0;
                        }
                    })
                    .style("fill", function (d) {
                        if (d[currentS]) {
                            return colorScale(d[currentS]); // changes colour of the collapsed triangle shape
                        }

                    });
                d3.select(this).select(".triangleText").attr("font-size", function (d) {
                    return settings.fontSize + "px"
                });
                d3.select(this).select(".triangleText").transition().duration(duration)
                    .text(function (d) {
                        var text = d.leaves[0].name + " ... " + d.leaves[d.leaves.length - 1].name;
                        return text;
                    })
                    .attr("x", function (d) {
                        //var xpos = (avg - (getLength(d) * (lengthMult / maxLength))) + 5;
                        var text = d.leaves[0].name + " ... " + d.leaves[d.leaves.length - 1].name;
                        if(treeName === trees[treeIdx].name && settings.mirrorRightTree){
                            var xpos = d.triangleLength * (lengthMult / maxLength) + 5;
                            if (xpos > canvasWidth) { // ensures that triangle doesn't go out of visible space
                                xpos = xlength + 5;
                            }
                            return -xpos - getTextWidth(text);
                        } else {
                            var xpos = d.triangleLength * (lengthMult / maxLength) + 5;
                            if (xpos > canvasWidth) { // ensures that triangle doesn't go out of visible space
                                xpos = xlength + 5;
                            }
                            return xpos;
                        }
                    });
            }
            if (d.children) {
                d3.select(this).select("path").transition().duration(duration)
                    .attr("d", function (d) {
                        return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
                    });
                d3.select(this).select(".triangleText").transition().duration(duration)
                    .attr("x", 0)
                    .each("end", function () {
                        d3.select(this).text("")
                    });
            }
        });


        /*
         Helper function for rendering lines
         Called twice, once for black bg lines, once for foreground coloured lines in comparison view
         */
        function renderLinks(type) {

            // Update the links…
            var select = (type === "bg") ? "linkbg" : "link";
            // return an array of all the DOM element of class path.front
            // which data is the list of IDs of each links
            var link = treeData.svg.selectAll("path." + select)
            // Links is the data array which each element is assigned a target ID key
            // Any element in the specified data array whose key is different
            // from keys of all the existing elements, becomes a part of the enter selection.
            // If the key of a new element matches the key of one of the existing elements
            // then it is NOT a part of the enter selection.
                .data(links, function (d) {
                    return d.target.id;
                })
                .attr("id", function (d) { //adds source.id of node
                    return d.source.ID + '_' + d.target.ID;
                })
                .style("stroke", function (d) {
                    var e = d.target;
                    var f = d.source;
                    if (f[currentS] && (settings.internalLabels === "none")) {
                        return colorScale(e[currentS])
                    } else if (e["branchSupport"] && (settings.internalLabels === "name")) { // color branch according to branch support
                        return colorScaleRest(parseFloat(e["branchSupport"]) / maxBranchSupport)
                    } else if (e["specifiedBranchColor"] && (settings.internalLabels === "color")) { // color branch according to prespecified rgb values in the nhx file
                        return rgb2hex(e["specifiedBranchColor"])
                    } else { // return the standard color
                        return "grey"
                    }
                });

            // Enter any new links at the parent"s previous position.
            // enter().insert will create as many elements as the number of elements in the enter selection
            // If the specified type is a string, inserts a new element of this type (tag name)
            // before the element matching the specified before selector for each selected element.
            // For example, a before selector :first-child will prepend nodes before the first child.
            link.enter().insert("path", "g")
                .attr("class", function (d) {
                    if (type === "bg") {
                        return "linkbg";
                    } else {
                        return "link";
                    }
                })
                .attr("id", function (d) { //adds source.id of node
                    return d.source.ID + '_' + d.target.ID;
                })
                .attr("d", function (d) {
                    d = d.source;
                    var output;
                    if (source === treeData.root) {
                        if (d.parent) { //draws the paths between nodes starting at root node
                            output = "M" + d.parent.y + "," + d.parent.x + "L" + d.parent.y + "," + d.parent.x + "L" + d.parent.y + "," + d.parent.x;
                        } else { //here when reroot is selected....
                            output = "M" + source.y + "," + source.x + "L" + source.y + "," + source.x + "L" + source.y + "," + source.x;
                        }
                    } else {
                        output = "M" + source.y + "," + source.x + "L" + source.y + "," + source.x + "L" + source.y + "," + source.x;
                    }
                    return output;
                })
                .style("stroke-width", function () {
                    if (type === "bg") {
                        return (parseInt(settings.lineThickness) + 2);
                    } else if (type === "front") {
                        return settings.lineThickness;
                    }
                })
                .style("stroke", function (d) {
                    var e = d.target;
                    var f = d.source;
                    if (f[currentS] && (settings.internalLabels === "none")) {
                        return colorScale(f[currentS])
                    } else if (e["branchSupport"] && (settings.internalLabels === "name")) {
                        return colorScaleRest(parseFloat(e["branchSupport"]) / maxBranchSupport)
                    } else if (e["specifiedBranchColor"] && (settings.internalLabels === "color")) { // color branch according to prespecified rgb values in the nhx file
                        return rgb2hex(e["specifiedBranchColor"])
                    } else {
                        return "grey"
                    }
                })
                .style("fill", "none") //this line is important for the export function
                .on("click", treeData.clickEventLink);

            link.select("rect")
                .attr("width", function (d) {
                    if (d.clickedHighlight) {
                        return (settings.nodeSize * 2) + "px";
                    } else {
                        return "0px";
                    }
                })
                .attr("height", function (d) {
                    if (d.clickedHighlight) {
                        return (settings.nodeSize * 2) + "px";
                    } else {
                        return "0px";
                    }
                })
                .style("fill", function (d) {
                    if (d.clickedHighlight) {
                        return d.clickedHighlight;
                    }
                })
                .attr("y", -settings.nodeSize + "px")
                .attr("x", -settings.nodeSize + "px");

            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .style("stroke-width", function () {
                    if (type === "bg") {
                        return (parseInt(settings.lineThickness) + 2);
                    } else if (type === "front") {
                        return settings.lineThickness;
                    }
                })
                .attr("d", function (d) {
                    return "M" + d.source.y + "," + d.source.x + "L" + d.source.y + "," + d.target.x + "L" + d.target.y + "," + d.target.x;
                });


            // Transition exiting nodes to the parent"s new position.
            link.exit().transition()
                .duration(duration)
                .attr("d", function (d) {
                    d = d.source;
                    if (source === treeData.root) {
                        var e = findHighestCollapsed(d);
                        return "M" + e.y + "," + e.x + "L" + e.y + "," + e.x + "L" + e.y + "," + e.x;
                    } else {
                        return "M" + source.y + "," + source.x + "L" + source.y + "," + source.x + "L" + source.y + "," + source.x;
                    }
                })
                .remove();

        }

        renderLinks("front");

        // stash the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        //calculate the new scale text
        if (settings.enableScale){
            applyScaleText(treeData.scaleText, treeData.zoomBehaviour.scale(), treeData.root);
        }

        //event listeners for nodes to handle mouseover highlighting, important because all children nodes have to be highlighted
        //input d is currently selected node....
        function nodeMouseover(d) {
            //function to color subtree downstream of a selected node in green
            function colorLinkNodeOver(n) {
                if (n.children) {
                    for (var i = 0; i < n.children.length; i++) {
                        d3.select("#" + n.ID + "_" + n.children[i].ID).classed("select", true);
                        colorLinkNodeOver(n.children[i]);
                    }
                }
                if (!settings.enableFisheyeZoom) { //as long as fishEyeZoom is turned off
                    d3.select("g").select("#" + n.ID).classed("select", true);
                    d3.select("#" + n.ID).select("text").classed("select", true);
                    d3.select("#" + n.ID).select("circle").classed("select", true);
                    d3.select("#" + n.ID).select("path").classed("select", true);
                    d3.select("#" + n.ID).select(".triangleText").classed("select", true);
                    d3.select("#" + n.ID).select(".triangle").classed("select", true);
                }
            }

            colorLinkNodeOver(d);
        }

        function nodeMouseout(d) {
            function colorLinkNodeOver(n) {
                if (n.children) {
                    for (var i = 0; i < n.children.length; i++) {
                        d3.select("#" + n.ID + "_" + n.children[i].ID).classed("select", false);
                        colorLinkNodeOver(n.children[i]);
                    }
                }
                if (!settings.enableFisheyeZoom) {
                    d3.select("g").select("#" + n.ID).classed("select", false);
                    d3.select("#" + n.ID).select("text").classed("select", false);
                    d3.select("#" + n.ID).select("circle").classed("select", false);
                    d3.select("#" + n.ID).select("path").classed("select", false);
                    d3.select("#" + n.ID).select(".triangleText").classed("select", false);
                    d3.select("#" + n.ID).select(".triangle").classed("select", false);
                }
            }

            colorLinkNodeOver(d);
        }

        // this part ensures that when clicking on a node or elsewhere in the screen the tooltip disappears
        $('html').click(function (d) {
            if (compareMode) {
                if ((d.target.getAttribute("class") !== "link" && d.target.getAttribute("class") !== "node" && d.target.getAttribute("class") !== "linkbg" && d.target.getAttribute("class") !== "link search" && d.target.getAttribute("class") !== "node select")) {
                    $(".tooltipElem").remove()
                }
            } else {
                if ((d.target.getAttribute("class") !== "link" && d.target.getAttribute("class") !== "node" && d.target.getAttribute("class") !== "link search" && d.target.getAttribute("class") !== "node select")) {
                    $(".tooltipElem").remove()
                }
            }
        });

    }

    /*
     Hook up the zoom slider on the vis to zoomEvent
     */
    function applyEventListeners(treeData) {
        $("input#zoomSlider" + treeData.id + ".zoomSlider").on("input change", function () {
            treeData.zoomBehaviour.scale($("#zoomSlider" + treeData.id).val());
            treeData.zoomBehaviour.event(treeData.svg);
        });

    }

    /*
     Functions for handling actions of tree spacing controls
     */
    function sizeHorizontal(treeData, increase) {
        if (increase) {
            treeData.treeWidth = parseInt(treeData.treeWidth) + 40;
            treeData.treeWidth = (treeData.treeWidth > 5) ? treeData.treeWidth : 5;

        } else {
            treeData.treeWidth = parseInt(treeData.treeWidth) - 40;
            treeData.treeWidth = (treeData.treeWidth > 5) ? treeData.treeWidth : 5;

        }
    }

    function sizeVertical(treeData, increase) {
        if (increase) {
            treeData.treeHeight = parseInt(treeData.treeHeight) + 1;
            treeData.treeHeight = (treeData.treeHeight > 1) ? treeData.treeHeight : 1;
        } else {
            treeData.treeHeight = parseInt(treeData.treeHeight) - 1;
            treeData.treeHeight = (treeData.treeHeight > 1) ? treeData.treeHeight : 1;
        }
    }

    /**
     *
     * Sizes trees vertical and horizontal lengths by given amount
     *
     * @param treeData
     * @param increase
     */
    function sizeSetVertical(treeData, newHeight) {

        if (!(initTreeHeight)) {
            initTreeHeight = treeData.treeHeight;
        }

        if (newHeight) {
            newHeight = ((parseInt(newHeight) + initTreeHeight) > maxTreeHeight) ? maxTreeHeight : (initTreeHeight + parseInt(newHeight));
            treeData.treeHeight = (newHeight > minTreeHeight) ? newHeight : minTreeHeight;
        }
    }

    function sizeSetHorizontal(treeData, newWidth) {

        if (!(initTreeWidth)) {
            initTreeWidth = treeData.treeWidth;
        }

        if (newWidth) {
            newWidth = ((parseInt(newWidth) + initTreeWidth) > maxTreeWidth) ? maxTreeWidth : (initTreeWidth + parseInt(newWidth));
            treeData.treeWidth = (newWidth > minTreeWidth) ? newWidth : minTreeWidth;
        }

    }



    /**
     * Find the highest collapsed node in the parents of a node
     *
     * @param d
     * @returns {*}
     */
    function findHighestCollapsed(d) {
        if (d.parent) {
            if (d._children && d.parent.children) {
                return d;
            } else {
                return (findHighestCollapsed(d.parent));
            }
        } else {
            return d;
        }
    }

    /********************************************************************************
     * creates undo button for given canvas
     *
     * @param canvasId id of the canvas, "global" creates global undo button that always undo the last change
     */

    function createUndoButton(canvasId) {

        function buildUndoButton(canvasId) {
            var undo = d3.select("#" + canvasId + " .btn-group-menu").append("div")
                .attr("class", "undo");

            undo.append("a")
                .attr("class", "btn btn-sm sharp undoButton")
                .attr("title", "undo last tree manipulation")
                .attr("id", "undobtn" + canvasId)
                .attr("data-count", 0)
                .append("span")
                .attr("class", "fa fa-undo")
                .attr("aria-hidden", "true");
        }

        if(canvasId == "global"){
            undo("phylo", "undo")
        } else {
            buildUndoButton(canvasId);
            undo(canvasId, "undobtn" + canvasId);
        }

    }


    function createSharing(canvasId, downloadClass){

        function buildShareButton(canvasId, downloadClass){
            var shareTools = d3.select("#" + canvasId).select("."+downloadClass).append("div")
                .attr("class", "share");

            shareTools.append("button")
                .attr("id", "shareButton")
                .attr("class", "btn btn-sm sharp share")
                .attr("title", "share tree as gist in the cloud")
                .attr("type", "button")
                .append("span")
                .attr("class", "fas fa-cloud-upload-alt")
                /*.attr("aria-hidden","true");*/

        }

        buildShareButton(canvasId, downloadClass);

        $("#shareButton, #cloudShare").click(function(e) {
            var mode = $("#mode-buttons .active").attr('id');
            if (mode === "compare-btn") {
                try {
                    var exportURLGist = treecomp.exportTreeToGist(true);
                    if(exportURLGist.toLowerCase().indexOf("error") !== -1){
                        throw(exportURLGist)
                    }
                    $('#modalBody').empty();
                    $('#modalBody').append("<a href='" + exportURLGist  + "'>"+exportURLGist+"</a>");
                } catch (e) {
                    $('#modalTitleError').html('Error!');
                    $('#modalBodyError').empty();
                    $('#modalBodyError').html(e);
                    $('#myErrorModal').modal('show');
                    return false;

                }
            } else if (mode === "view-btn"){
                try{
                    var exportURLGist = treecomp.exportTreeToGist(false);

                    if(exportURLGist.indexOf("ERROR") !== -1){

                        throw(exportURLGist)
                    }
                    $('#modalBody').empty();
                    $('#modalBody').append("<a href='" + exportURLGist  + "'>"+exportURLGist+"</a>");
                } catch (e) {
                    $('#modalTitleError').html(e);
                    $('#modalBodyError').empty();
                    $('#modalBodyError').html(e);
                    $('#myErrorModal').modal('show');
                    return false;
                }
            }

            $('#myModal').modal('show');

        });
    }

    function createExportBar(canvasId, baseTree, compareMode){

        function buildExportBar(canvasId) {
            var exportTools = d3.select("#" + canvasId + " .btn-group-menu").append("div")
                .attr("class", "exportTools");

            exportTools.append("a")
                .attr("class", "btn btn-sm sharp exportButton")
                .attr("title", "export or share tree visualization")
                .append("span")
                .attr("class", "fa fa-download")
                .attr("aria-hidden","true");

            var exportMenu = d3.select("#" + canvasId).append("div")
                .attr("class", "exportMenu toolmenu");
            if (settings.enableDownloadButtons) {
                exportMenu.append("li")
                    .attr("class", "exportText")
                    .append("div")
                    .attr("class", "export")
                    .text("Export");
            }

            if (settings.enableCloudShare) {
                exportMenu.append("li")
                    .attr("class", "exportText")
                    .append("div")
                    .attr("class", "share")
                    .text("Share");
            }
        }
        buildExportBar(canvasId);

        if (settings.enableDownloadButtons) {
            createTreeDownload(canvasId, "export");
        }

        if (settings.enableCloudShare) {
            createSharing(canvasId, "share");
        }

        d3.select("#" + canvasId).select(".exportButton")

            .on("click", function () {
                $("#" + canvasId + " .toolmenu").not(".exportMenu").hide()
                $("#" + canvasId + " .opacity").removeClass("opacity")
                $("#" + canvasId + " .exportMenu").slideToggle(200);
                if($("#" + canvasId + " .exportMenu").is(':visible')){
                    $("#" + canvasId + " .exportButton").addClass("opacity");
                }

            });
    }

    function createToolbar(canvasId, baseTree, compareMode){

        function buildToolbar(canvasId) {
            var treeTools = d3.select("#" + canvasId + " .btn-group-menu").append("div")
                .attr("class", "treeTools");

            treeTools.append("a")
                .attr("class", "btn btn-sm sharp treeToolsButton")
                .attr("title", "tools for tree manipulation")
                .append("span")
                .attr("class", "fa fa-wrench")
                .attr("aria-hidden", "true");

            var treeToolsMenu = d3.select("#" + canvasId).append("div")
                .attr("class", "treeToolsMenu toolmenu");

            treeToolsMenu.append("li")
                .attr("class", "treeToolsText")
                .append("div")
                .attr("class", "rescale")
                .text("Rescale");

            treeToolsMenu.append("li")
                .attr("class", "treeToolsText")
                .append("div")
                .attr("class", "zoom")
                .text("Zoom");


            treeToolsMenu.append("li")
                .attr("class", "treeToolsText")
                .append("div")
                .attr("class", "ladderize")
                .text("Ladderize");


            if (compareMode) {
                treeToolsMenu.append("li")
                    .attr("class", "treeToolsText")
                    .append("div")
                    .attr("class", "oppositeTreeAction")
                    .text("Equalize trees");
            }
        }

        buildToolbar(canvasId);

        if (settings.enableSizeControls) {
            createTreeRescale(canvasId, "rescale", baseTree);
        }

        if (settings.enableZoomSliders) {
            createZoomSlider(canvasId, "zoom", baseTree);
        }

        if (settings.enableLadderizeTreeButton) {
            createLadderizedTree(canvasId, "ladderize", baseTree);
        }


        if (settings.enableOppositeTreeActions && compareMode) {
            createOppositeTreeActions(canvasId, "oppositeTreeAction");
        }

        d3.select("#" + canvasId).select(".treeToolsButton")

            .on("click", function () {
                $("#" + canvasId + " .toolmenu").not(".treeToolsMenu").hide()
                $("#" + canvasId + " .opacity").removeClass("opacity")
                $("#" + canvasId + " .treeToolsMenu").slideToggle(200);
                if($("#" + canvasId + " .treeToolsMenu").is(':visible')){
                    $("#" + canvasId + " .treeToolsButton").addClass("opacity");
                }

            });
    }

    function createStackToolbar(canvasId, baseTree, compareMode){

        function buildStackToolbar(canvasId) {
            //var stackTools = d3.select("#" + canvasId).append("div")
            var stackTools = d3.select("#" + canvasId + " .btn-group-menu").append("div")
                .attr("class", "stackTools");

            stackTools.append("a")
                .attr("class", "btn btn-sm sharp stackToolsButton")
                .attr("title", "tools for histogram manipulation")
                .append("span")
                .attr("class", "fa fa-chart-bar")
                .attr("aria-hidden", "true");

            var stackToolsMenu = d3.select("#" + canvasId).append("div")
                .attr("class", "stackToolsMenu toolmenu");

            if(hasHistogramData){
                stackToolsMenu.append("li")
                    .attr("class", "stackToolsText")
                    .append("div")
                    .attr("class", "stackwidthzoom")
                    .text("Stack Width");

                stackToolsMenu.append("li")
                    .attr("class", "stackToolsText")
                    .append("div")
                    .attr("class", "stackheightzoom")
                    .text("Stack Height");

                stackToolsMenu.append("li")
                    .attr("class", "stackToolsText")
                    .append("div")
                    .attr("class", "stacklabelswitch")
                    .text("Histogram Labels");

                stackToolsMenu.append("li")
                    .attr("class", "stackToolsText")
                    .append("div")
                    .attr("class", "stacklegendswitch")
                    .text("Histogram Legend");

                stackToolsMenu.append("li")
                    .attr("class", "stackToolsText")
                    .append("div")
                    .attr("class", "stackscaleswitch")
                    .text("Histogram scale");

                stackToolsMenu.append("li")
                    .attr("class", "stackToolsText")
                    .append("div")
                    .attr("class", "stackinfoswitch")
                    .text("Displayed info");
            }
        }


        if (settings.enableStackZoomSliders) {

            if(hasHistogramData) {

                buildStackToolbar(canvasId);

                createStackZoomSlider(canvasId, "stackwidthzoom", baseTree, stackMinWidth, stackMaxWidth, stackStep, stackWidth);
                createStackZoomSlider(canvasId, "stackheightzoom", baseTree, stackMinHeight, stackMaxHeight, stackStep, stackHeight);
                createHistogramLabelVisibilityBtn(canvasId, "stacklabelswitch");
                createHistogramLegendVisibilityBtn(canvasId, "stacklegendswitch");
                createHistogramScaleSwitchBtn(canvasId, "stackscaleswitch", baseTree);
                createHistogramInfoSwitchBtn(canvasId, "stackinfoswitch", baseTree);
            }
        }

        d3.select("#" + canvasId).select(".stackToolsButton")
            .on("click", function () {
                $("#" + canvasId + " .toolmenu").not(".stackToolsMenu").hide()
                $("#" + canvasId + " .opacity").removeClass("opacity")
                $("#" + canvasId + " .stackToolsMenu").slideToggle(200);
                if($("#" + canvasId + " .stackToolsMenu").is(':visible')){
                    $("#" + canvasId + " .stackToolsButton").addClass("opacity");
                }

            });
    }

    function createOppositeTreeActions(canvasId, oppositeTreeActionsClass) {
        /***************************************************************************
         *
         * Function to find best corresponding root in opposite tree and
         * automatically perform re-rooting on that root works only
         * in "compare mode" and needs the canvasId to know which tree will
         * be manipulated
         *
         ****************************************************************************/
        function findBestCorrespondingTree(canvasId) {
            var isCompared = true;
            var canvasLeft = "vis-container1";
            var canvasRight = "vis-container2";
            var tree;
            var fixedTree;

            if (canvasId === canvasLeft) { //ensures that the right tree is fixed
                tree = getTreeFromCanvasId(canvasLeft);
                fixedTree = getTreeFromCanvasId(canvasRight);
            } else {
                tree = getTreeFromCanvasId(canvasRight);
                fixedTree = getTreeFromCanvasId(canvasLeft);
            }

            settings.loadingCallback();
            setTimeout(function () {
                //------
                //
                // Main part: reroot at the node that is most similar to fixed tree root
                //
                //------
                var rerootedTree;
                if (fixedTree.root.children[0].elementBCN.parent) {
                    expandPathToNode(fixedTree.root.children[0].elementBCN);
                    rerootedTree = reroot(tree, fixedTree.root.children[0].elementBCN);
                }

                if (isCompared) {
                    var index1 = findTreeIndex(tree.name);
                    var index2 = findTreeIndex(fixedTree.name);
                    preprocessTrees(trees[index1], trees[index2]);
                    //settings.loadedCallback();

                    if (rerootedTree !== undefined) {
                        update(tree.root, rerootedTree.data);
                    }
                    update(fixedTree.root, fixedTree.data);
                }
            }, 2);
        };

        /*---------------
         /
         /  Function to swap on nodes to optimize the visualisation between two trees
         /      works only in "compare mode" and needs the canvasId to know which tree will
         /      be manipulated
         /
         ---------------*/
        function findBestCorrespondingLeafOrder(canvasId) {

            var canvasLeft = "vis-container1";
            var canvasRight = "vis-container2";
            var tree;
            var fixedTree;

            if (canvasId === canvasLeft) { //ensures that the right tree is fixed
                tree = getTreeFromCanvasId(canvasLeft);
                fixedTree = getTreeFromCanvasId(canvasRight);
            } else {
                tree = getTreeFromCanvasId(canvasRight);
                fixedTree = getTreeFromCanvasId(canvasLeft);
            }

            //------
            // SWAP branches at a specific node
            // input: node d with its children
            //------
            function rotate(d) {
                var first;
                var second;
                if (d.children) {
                    first = d.children[0];
                    second = d.children[1];
                    d.children[0] = second;
                    d.children[1] = first;
                } else if (d._children) {
                    first = d._children[0];
                    second = d._children[1];
                    d._children[0] = second;
                    d._children[1] = first;
                }

            }

            //------
            // GET the leafnames part of a specific node d
            // input: node d with its children
            //------
            function getChildLeafNames(d) {
                var leafNames = [];
                var leaves = getChildLeaves(d);
                for (var i = 0; i < leaves.length; i++) {
                    leafNames.push(leaves[i].name);
                }
                return leafNames;
            }

            //------
            // GET the corresponding node based on best overlap of leaves between two trees
            // input: treeLeaves (getChildLeafNames) and ifixedTree the fixed tree as input
            //------
            function getCorrespondingNode(treeLeaves, ifixedTree) {

                var bestCorrespondingFixTreeLeaves = "";
                var bestCount = 0;
                postorderTraverse(ifixedTree.root, function (d) {
                    if (d.children || d._children) {
                        var fixedTreeLeaves = getChildLeafNames(d);
                        var count = 0;

                        for (var i = 0; i < fixedTreeLeaves.length; i++) {
                            if (treeLeaves.indexOf(fixedTreeLeaves[i]) !== -1) {
                                count += 1;
                            }
                        }

                        if (count > bestCount) {
                            bestCorrespondingFixTreeLeaves = fixedTreeLeaves;
                            bestCount = count;
                        }
                    }
                }, true);

                return bestCorrespondingFixTreeLeaves;
            }

            //------
            //
            // Main part: traverses all nodes of tree and if different leaf order in fixedTree calls the rotate function
            //
            //------
            postorderTraverse(tree.root, function (d) {

                if (d.children || d._children) {
                    var leaves = getChildLeafNames(d);
                    var fixedLeaves = getCorrespondingNode(leaves, fixedTree);
                    if (leaves[0] !== fixedLeaves[0] && leaves[leaves.length - 1] !== fixedLeaves[fixedLeaves.length - 1]) {
                        rotate(d);
                    }
                }
            }, true);

            update(tree.root, tree.data);
            settings.loadedCallback();
        }

        function buildOppositeTreeActionsButtons(canvasId, oppositeTreeActionsClass) {
            var oppositeTreeActionButton = d3.select("#" + canvasId).select("." + oppositeTreeActionsClass).append("div")
                .attr("class", "btn-group opTreeAcGroup");
            oppositeTreeActionButton.append("button")
                .attr("id", "opTreeAcButton")
                .attr("class", "btn btn-sm sharp opTreeAcButtonReroot")
                .attr("title", "reroot according to opposite tree")
                .attr("type", "button")
                .append("span")
                .text("reroot");
            oppositeTreeActionButton.append("button")
                .attr("id", "opTreeAcButton")
                .attr("class", "btn btn-sm sharp opTreeAcButtonReorder")
                .attr("title", "reorder according to opposite tree")
                .attr("type", "button")
                .append("span")
                .text("reorder");
        }

        /*----------------------
         |
         | Renders middle buttons in compare mode for rerooting and resorting
         |
         ----------------------*/

        // draws buttons to swap one tree and not the other
        if (settings.enableFixedButtons) {
            buildOppositeTreeActionsButtons(canvasId, oppositeTreeActionsClass);
        }


        d3.select("#" + canvasId).select(".opTreeAcButtonReroot")
            .on("click", function () {
                settings.loadingCallback();
                setTimeout(function () {
                    findBestCorrespondingTree(canvasId);
                }, 2);
            });

        d3.select("#" + canvasId).select(".opTreeAcButtonReorder")
            .on("click", function () {
                settings.loadingCallback();
                setTimeout(function () {
                    findBestCorrespondingLeafOrder(canvasId);
                }, 2);
            });

    }

    function createLeafSearch(canvasId, name) {

        var baseTree = trees[findTreeIndex(name)];

        /*
         Helper function allows to search even partial strings
         */
        function stringSearch(string, start) {
            var does = true;
            var n;
            if (start !== "") {
                n = string.search(start);
            } else {
                n = -1;
            }
            if (n === -1) {
                does = false;
            }
            return does;
        }

        function createToolbarContainer(canvasId){

            d3.select("#" + canvasId).append("div").attr("class", "btn-group-menu");

        }

        function buildSearchBox(canvasId) {

            d3.select("#" + canvasId + " .btn-group-menu").append("div")
                .attr("class", "search")
                .append("input")
                .attr("class", "searchInput")
                .attr("type", "text")
                .attr("placeholder", "search")
                .attr("autofocus");

            var searchDiv = d3.select("#" + canvasId + " .btn-group-menu").append("div")
                .attr("class", "searchBox");

            var searchDivA = searchDiv.append("a")
                .attr("class", "btn btn-sm sharp searchButton")
                .attr("title", "search by leaf name");

            searchDivA.append("span")
                .attr("class", "glyphicon glyphicon-search")
                .attr("aria-hidden", "true");

            var searchBox = d3.select("#" + canvasId + " .search").append("div")
                .attr("class", "searchResultsBox")
                .append("ul")
                .attr("class", "searchResultsList");

        }


        function displaySearchResults(results, canvasId, baseTree) {
            for (var i = 0; i < results.length; i++) {
                var resultsList = d3.select("#" + canvasId).select(".searchResultsList");
                resultsList.append("li")
                    .append("a")
                    .attr("class", i)
                    .attr("id", results[i].name)
                    .attr("href", "#")
                    .text(results[i].name);

                var indices = [];
                // click on a leaf from the list and highlight only its path
                d3.select("#" + canvasId).select("#" + results[i].name).on("click", function () {
                    var index = $(this).attr("class");
                    //var index = i;
                    indices.push(parseInt(index));

                    var j;

                    for (j = 0; j < results.length; j++) {
                        if (indices.indexOf(j) < 0) {
                            expandPathToLeaf(results[j], true, false);
                        }
                    }
                    if (settings.selectMultipleSearch) { // allows to select multiple entries containing the same letter
                        for (j = 0; j < indices.length; j++) {
                            expandPathToLeaf(results[indices[j]], false);
                        }
                    } else {
                        for (j = 0; j < indices.length - 1; j++) { // allows only to select one entry
                            expandPathToLeaf(results[indices[j]], true, false);
                        }
                        expandPathToLeaf(results[indices[indices.length - 1]], false, true); // uncollapse the tree and set ids to paths
                        update(baseTree, baseTree.data);
                        expandPathToLeaf(results[indices[indices.length - 1]], false, true); // set clicked link to class link search
                    }
                    update(baseTree, baseTree.data);
                    if (settings.moveOnClick) { // this part is responsible to move the opposite highlighted node to the center
                        var currentScale = baseTree.data.zoomBehaviour.scale();
                        var y = (-results[indices[j]].y + ($("#" + baseTree.data.canvasId).width() / 2) / currentScale);
                        var x = (-results[indices[j]].x + ($("#" + baseTree.data.canvasId).height() / 2) / currentScale);
                        baseTree.data.zoomBehaviour.translate([y, x]);
                        d3.select("#" + baseTree.data.canvasId + " svg g")
                            .transition(1500)
                            .attr("transform", "scale(" + currentScale + ")" + "translate(" + baseTree.data.zoomBehaviour.translate() + ")");
                    }

                });
            }
        }

        function showSearchBar(canvasId) {
            d3.select("#" + canvasId).select(".searchInput")
                .transition().duration(600)
                .style("width", "150px")
                .style("display", "inline-block")
                .node().focus();

        }

        function hideSearchBar(canvasId) {
            d3.select("#" + canvasId).select(".searchResultsList")
                .empty();

            d3.select("#" + canvasId).select(".searchResultsBox")
                .transition().duration(600)
                .style("display", "none");

            d3.select("#" + canvasId).select(".searchInput")
                .transition().duration(600)
                .style("width", "0px")
                .style("display", "none");

            $("#" + canvasId + " .searchInput").val("");
        }

        createToolbarContainer(canvasId);
        buildSearchBox(canvasId);

        d3.select("#" + canvasId).select(".searchButton").on("click", function () {

            $("#" + canvasId + " .toolmenu").not(".search").hide()
            $("#" + canvasId + " .opacity").removeClass("opacity")
            if($("#" + canvasId + " .searchInput").is(':visible')){
                $("#" + canvasId + " .search").addClass("opacity");
            }

            var searchInput = $("#" + canvasId + ' .searchInput');
            if (searchInput.is(":visible")) {

                postorderTraverse(baseTree.data.root, function(d) { // ensures that highlighted search is removed when button of search is inactive
                    if(d.parent){
                        d3.select("#"+d.parent.ID+"_"+d.ID).classed("search", false);
                        d3.select("#"+d.ID).select("circle").classed("search", false);
                        d3.select("#"+d.ID).select("text").classed("search", false);
                    }
                });
                update(baseTree.root, baseTree.data);

                hideSearchBar(canvasId);

            } else { //if search unselected then remove orange highlight from branches
                showSearchBar(canvasId);
            }
        });

        // variable i is set to the number of leaves
        var leafObjs = [];
        for (var i = 0; i < baseTree.root.leaves.length; i++) {
            leafObjs.push(baseTree.root.leaves[i]);
        }


        //main event handler, performs search every time a char is typed so can get realtime results
        $("#" + canvasId + " .searchInput").bind("paste keyup", function () {
            $("#" + canvasId + " .searchResultsList").empty();
            var text = $(this).val();

            // results is a list of leaves
            // which name matches the key(s) pressed
            // (auto-completion)
            var results = _.filter(leafObjs, function (leaf) {
                return stringSearch(leaf.name.toLowerCase(), text.toLowerCase());
            });

            var results_name = [];
            var i;
            for (i = 0; i < results.length; i++) {
                results_name.push(results[i].name)
            }
            postorderTraverse(baseTree.data.root, function (d) {
                expandPathToLeaf(d, true, false);
            });
            update(baseTree.root, baseTree.data);

            if (typeof results_name !== "undefined" && results_name !== null && results_name.length > 0) {
                $("#" + canvasId + " .searchResultsBox").slideDown(200);
                $("#" + canvasId + " .searchResultsList").empty();

                postorderTraverse(baseTree.data.root, function (d) {
                    if (results_name.indexOf(d.name) > -1) {
                        expandPathToLeaf(d, false, false);
                    }
                });
                update(baseTree.root, baseTree.data);

                displaySearchResults(results, canvasId, baseTree);
            }
            else {
                $("#" + canvasId + " .searchResultsList").empty();
                $("#" + canvasId + " .searchResultsBox").slideUp(200, function () {
                    $("#" + canvasId + " .searchResultsBox").css({
                        "display": "none"
                    });
                });
            }
        });

        // ensures that searchbar is removed when clicking on canvas
        $(document).click(function(event) {
            // exclude find menuitem click
            if(!$(event.target).closest('.search').length && $('.searchInput').is(":visible") && event.target.id != 'find' ) {
                postorderTraverse(baseTree.data.root, function(d) { // ensures that highlighted search is removed when button of search is inactivepyen
                    if(d.parent){
                        d3.select("#"+d.parent.ID+"_"+d.ID).classed("search", false)
                        d3.select("#"+d.ID).select("circle").classed("search", false);
                        d3.select("#"+d.ID).select("text").classed("search", false);
                    }
                });

                hideSearchBar(canvasId);
            }
        });
    }

    function createTreeToggle(name, canvas, scale, oppositeCanvas, oppositeScale) {
        /*----------------------
         |
         | Function that renders the drop down menu once multiple trees are loaded
         |
         ----------------------*/
        function renderTreeToggleDropDown(name, canvas, scale, oppositeCanvas, oppositeScale) {
            var index = findTreeIndex(name);
            var numTrees = trees[index].total;
            var indexStartTree = index;
            var indexLastTree = trees[index].last;


            var treeToggleDropDown = d3.select("#" + canvas + " .treeToggleButtons").append("div")
                .attr("class", "treeToggleDropdown");

            var treeToggleButtons = treeToggleDropDown.append("button")
                .attr("id", "treeToggleDropdownButton")
                .attr("class", "btn btn-sm sharp treeToggleDropdown-toggle")
                .attr("title", "toggle trees dropdown")
                .on('click', function () {
                    $("#dropDownList" + canvas).toggle();
                });

            ///span element is added in order to easier display and place the tree numbers on the dropDown menu
            var dropdownToggleButtonText = treeToggleButtons.append("span")
                .attr("id", "treeToggleDropdownText")
                .attr("class", "text-center")
                .text("1/" + (numTrees));

            var treeToggleOptions = treeToggleDropDown.append("div")
                .attr("class", "treeToggleDropdown-content")
                .attr("id", "dropDownList" + canvas)
                .append("ul").attr("class", "list-unstyled");

            for (var i = indexStartTree; i <= indexLastTree; i++) {
                treeToggleOptions.append("li").append("a")
                    .attr("id", canvas + "_tree_" + i)
                    .text(trees[i].part + 1)
                    .on('click', function () {
                        var splitId = d3.select(this).attr("id").split("_");
                        var ind = parseInt(splitId[splitId.length - 1]);
                        dropDownAction(ind)
                    });
            }

            function dropDownAction(ind) {
                d3.select("#" + canvas + " svg").remove();
                var toggledTree = trees[ind];
                var newName = toggledTree.name;
                renderedTrees = [];
                if(oppositeCanvas !== undefined){ // compare mode
                    var oppositeName = d3.select("#" + oppositeCanvas + " svg").attr("id");
                    d3.select("#" + oppositeCanvas + " svg").remove();
                    var index2 = findTreeIndex(oppositeName);
                    var oppositeTree = trees[index2];
                    initialiseTree(toggledTree.root, settings.autoCollapse);
                    initialiseTree(oppositeTree.root, settings.autoCollapse);

                    // render tress (workers) -> once done, run comprison (workers)
                    toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, true, oppositeTree);
                    toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, true, oppositeTree);
                    renderTree(toggledTree, newName, canvas, scale, oppositeName, true);

                    oppositeTree.data.clickEvent = getClickEventListenerNode(oppositeTree, true, toggledTree);
                    oppositeTree.data.clickEventLink = getClickEventListenerLink(oppositeTree, true, toggledTree);
                    renderTree(oppositeTree, oppositeName, oppositeCanvas, oppositeScale, newName, true);

                    settings.loadingCallback();
                    setTimeout(function () {
                        preprocessTrees(toggledTree, oppositeTree);
                    }, 5);

                } else { // view mode
                    settings.loadingCallback();
                    setTimeout(function () {

                        initialiseTree(toggledTree.root, settings.autoCollapse);
                        toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, false, {});
                        toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, false, {});
                        renderTree(toggledTree, newName, canvas, scale, undefined, true);

                        settings.loadedCallback();
                    }, 2);
                }
                var toggleStart = toggledTree.part + 1;
                dropdownToggleButtonText.text(toggleStart + "/" + numTrees);
            }

            // ensures that searchbar is removed when clicking on canvas
            $(document).click(function (event) {
                if (!$(event.target).closest('.treeToggleDropdown').length && $('.treeToggleDropdown-content').is(":visible")) {
                    $("#dropDownList" + canvas).hide()
                }
            });

        }


        /*----------------------
         |
         | Function that renders tree toggle buttons allows to have multiple trees to be loaded
         |
         ----------------------*/
        function renderTreeToggleButtons(canvas, scale, oppositeCanvas, oppositeScale) {

            var treeToggleButtons = d3.select("#" + canvas).append("div")
                .attr("class", "treeToggleButtons");

            treeToggleButtons.append("button")
                .attr("type", "button")
                .attr("class", "btn btn-sm sharp treeToggleButton")
                .attr("id", "leftToggleButton")
                .attr("title", "toggle trees to the left")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-left")
                .attr("aria-hidden", "true");

            treeToggleButtons.append("button")
                .attr("type", "button")
                .attr("class", "btn btn-sm sharp treeToggleButton")
                .attr("id", "rightToggleButton")
                .attr("title", "toggle trees to the right")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-right")
                .attr("aria-hidden", "true");


            function actionLeft(oldName, oppositeTreeName) {
                var index1 = findTreeIndex(oldName);
                var num_trees = trees[index1].last;
                trees[index1].display = false;
                if (trees[index1].part === 0) {
                    var toggledTree = trees[num_trees];
                } else {
                    var toggledTree = trees[index1 - 1];
                }
                toggledTree.display = true;
                var new_name = toggledTree.name;
                renderedTrees = [];

                if (oppositeTreeName !== undefined) { // compare mode
                    var index2 = findTreeIndex(oppositeTreeName);
                    var oppositeTree = trees[index2];
                    initialiseTree(toggledTree.root, settings.autoCollapse);
                    initialiseTree(oppositeTree.root, settings.autoCollapse);

                    // render tress (workers) -> once done, run comprison (workers)
                    toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, true, oppositeTree);
                    toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, true, oppositeTree);
                    renderTree(toggledTree, new_name, canvas, scale, oppositeTreeName, true);

                    oppositeTree.data.clickEvent = getClickEventListenerNode(oppositeTree, true, toggledTree);
                    oppositeTree.data.clickEventLink = getClickEventListenerLink(oppositeTree, true, toggledTree);
                    renderTree(oppositeTree, oppositeTreeName, oppositeCanvas, oppositeScale, new_name, true);

                    settings.loadingCallback();
                    setTimeout(function () {
                        preprocessTrees(toggledTree, oppositeTree);
                    }, 5);
                    var toggleStart = toggledTree.part + 1;
                    var toggleEnd = toggledTree.total;
                    d3.select("#" + canvas + " #treeToggleDropdownText").text(toggleStart + "/" + toggleEnd);
                } else { // view mode
                    settings.loadingCallback();
                    setTimeout(function () {
                        initialiseTree(toggledTree.root, settings.autoCollapse);
                        toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, false, {});
                        toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, false, {});
                        renderTree(toggledTree, new_name, canvas, scale, undefined, true);
                        settings.loadedCallback();
                    }, 2);
                    var toggleStart = toggledTree.part + 1;
                    var toggleEnd = toggledTree.total;
                    d3.select("#" + canvas + " #treeToggleDropdownText").text(toggleStart + "/" + toggleEnd);
                }


            }

            function actionRight(oldName, oppositeTreeName) {
                var index1 = findTreeIndex(oldName);
                var sub_index = trees[index1].part;
                var num_trees = trees[index1].last;
                trees[index1].display = false;

                // main function to assure cycling when toggle action is called
                if (index1 === (num_trees)) {
                    var toggledTree = trees[num_trees - sub_index];
                } else {
                    var toggledTree = trees[index1 + 1];
                }

                toggledTree.display = true;
                var new_name = toggledTree.name;
                renderedTrees = [];
                if (oppositeTreeName !== undefined){
                    var index2 = findTreeIndex(oppositeTreeName);
                    var oppositeTree = trees[index2];
                    initialiseTree(toggledTree.root, settings.autoCollapse);
                    initialiseTree(oppositeTree.root, settings.autoCollapse);

                    toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, true, oppositeTree);
                    toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, true, oppositeTree);
                    renderTree(toggledTree, new_name, canvas, scale, oppositeTreeName, true);

                    oppositeTree.data.clickEvent = getClickEventListenerNode(oppositeTree, true, toggledTree);
                    oppositeTree.data.clickEventLink = getClickEventListenerLink(oppositeTree, true, toggledTree);
                    renderTree(oppositeTree, oppositeTreeName, oppositeCanvas, oppositeScale, new_name, true);

                    settings.loadingCallback();
                    setTimeout(function () {
                        preprocessTrees(toggledTree, oppositeTree);
                    }, 5);
                    var toggleStart = toggledTree.part + 1;
                    var toggleEnd = toggledTree.total;
                    d3.select("#" + canvas + " #treeToggleDropdownText").text(toggleStart + "/" + toggleEnd);
                } else {
                    settings.loadingCallback();
                    setTimeout(function () {

                        initialiseTree(toggledTree.root, settings.autoCollapse);
                        toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, false, {});
                        toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, false, {});
                        //clear the canvas of any previous visualisation
                        renderTree(toggledTree, new_name, canvas, scale, undefined, true);
                        settings.loadedCallback();
                    }, 2);
                    var toggleStart = toggledTree.part + 1;
                    var toggleEnd = toggledTree.total;
                    d3.select("#" + canvas + " #treeToggleDropdownText").text(toggleStart + "/" + toggleEnd);
                }


            }

            var timeoutIdleft = 0;
            $("#" + canvas + " #leftToggleButton").mousedown(function () {
                var oldName = d3.select("#" + canvas + " svg").attr("id"); // get the old name of the tree as assigned by the render tree function
                d3.select("#" + canvas + " svg").remove();

                if (oppositeCanvas !== undefined) { // compare mode
                    var oppositeTreeName = d3.select("#" + oppositeCanvas + " svg").attr("id");
                    d3.select("#" + oppositeCanvas + " svg").remove();
                    actionLeft(oldName, oppositeTreeName);
                } else { // view mode
                    actionLeft(oldName);
                }

                timeoutIdleft = setInterval(actionLeft, 150);
            }).bind('mouseup mouseleave', function () {
                clearTimeout(timeoutIdleft);
            });

            var timeoutIdRight = 0;
            $("#" + canvas + " #rightToggleButton").mousedown(function () {
                var oldName = d3.select("#" + canvas + " svg").attr("id"); // get the old name of the tree as assigned by the render tree function
                d3.select("#" + canvas + " svg").remove();

                if (oppositeCanvas !== undefined) { // compare mode
                    var oppositeTreeName = d3.select("#" + oppositeCanvas + " svg").attr("id");
                    d3.select("#" + oppositeCanvas + " svg").remove();
                    actionRight(oldName, oppositeTreeName);
                } else { // view mode
                    actionRight(oldName);
                }

                timeoutIdRight = setInterval(actionRight, 150);
            }).bind('mouseup mouseleave', function () {
                clearTimeout(timeoutIdRight);
            });
        }

        renderTreeToggleButtons(canvas, scale, oppositeCanvas, oppositeScale);
        renderTreeToggleDropDown(name, canvas, scale, oppositeCanvas, oppositeScale);

    }

    function createTreeRescale(canvasId, rescaleClass, baseTree) {

        function buildRescaleButtons(canvasId) {
            var rescaleDiv = d3.select("#" + canvasId).select("." + rescaleClass).append("div")
                .attr("class", "rescaleButtons");

            //up button
            rescaleDiv.append("button")
                .attr("class", "btn btn-sm sharp rescaleButton")
                .attr("id", "upButton")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-up")
                .attr("aria-hidden", "true");

            //left button
            rescaleDiv.append("button")
                .attr("class", "btn btn-sm sharp rescaleButton")
                .attr("id", "leftButton")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-left")
                .attr("aria-hidden", "true");

            //right button
            rescaleDiv.append("button")
                .attr("class", "btn btn-sm sharp rescaleButton")
                .attr("id", "rightButton")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-right")
                .attr("aria-hidden", "true");

            //down button
            rescaleDiv.append("button")
                .attr("class", "btn btn-sm sharp rescaleButton")
                .attr("id", "downButton")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-down")
                .attr("aria-hidden", "true");
        }


        buildRescaleButtons(canvasId);

        // set up function for buttons on left top corner
        function actionUp() {
            sizeVertical(baseTree.data, false);
            update(baseTree.root, baseTree.data, 0);
        }

        function actionDown() {
            sizeVertical(baseTree.data, true);
            update(baseTree.root, baseTree.data, 0);
        }

        function actionLeft() {
            sizeHorizontal(baseTree.data, false);
            update(baseTree.root, baseTree.data, 0);
        }

        function actionRight() {
            sizeHorizontal(baseTree.data, true);
            update(baseTree.root, baseTree.data, 0);
        }

        var timeoutIdUp = 0;
        $("#" + canvasId + " #upButton").mousedown(function () {
            actionUp();
            timeoutIdUp = setInterval(actionUp, 150);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(timeoutIdUp);
        });

        var timeoutIddown = 0;
        $("#" + canvasId + " #downButton").mousedown(function () {
            actionDown();
            timeoutIddown = setInterval(actionDown, 150);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(timeoutIddown);
        });

        var timeoutIdleft = 0;
        $("#" + canvasId + " #leftButton").mousedown(function () {
            actionLeft();
            timeoutIdleft = setInterval(actionLeft, 150);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(timeoutIdleft);
        });

        var timeoutIdRight = 0;
        $("#" + canvasId + " #rightButton").mousedown(function () {
            actionRight();
            timeoutIdRight = setInterval(actionRight, 150);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(timeoutIdRight);
        });
    }

    function addLogo(svg) {
        // TODO load with ajax
        var logo_xml = '<svg id="exportLogo" x="0" y="0"><g id="g4169"> <path d="m 29.606259,23.679171 1.905511,0 c 0.193778,0.617882 0.290669,1.188505 0.290672,1.711869 0.466506,-0.545171 1.022728,-0.99222 1.668668,-1.341146 0.653108,-0.348904 1.295455,-0.523362 1.927043,-0.523373 0.976073,1.1e-5 1.86603,0.261698 2.669869,0.78506 0.810999,0.523383 1.442581,1.221215 1.894747,2.093495 0.459321,0.865028 0.688986,1.802739 0.688998,2.813134 -1.2e-5,1.010407 -0.229677,1.951752 -0.688998,2.824038 -0.452166,0.865023 -1.083748,1.559219 -1.894747,2.082592 -0.803839,0.516105 -1.693796,0.774156 -2.669869,0.774157 -0.638765,-1e-6 -1.284701,-0.163554 -1.937809,-0.490663 -0.653117,-0.334377 -1.20575,-0.770521 -1.657902,-1.308434 l 0,6.542172 -1.711731,0 0,-12.713622 c -2e-6,-0.552441 -0.04665,-1.170313 -0.139953,-1.853616 -0.08613,-0.683283 -0.20096,-1.148504 -0.344499,-1.395663 m 2.196183,5.539039 c -3e-6,1.133981 0.355261,2.093499 1.065795,2.878557 0.717702,0.777793 1.561006,1.166688 2.529916,1.166687 0.954543,10e-7 1.79067,-0.392528 2.508385,-1.177592 0.717697,-0.785056 1.07655,-1.740939 1.076561,-2.867652 -1.1e-5,-1.1267 -0.358864,-2.082583 -1.076561,-2.867652 -0.717715,-0.79232 -1.553842,-1.188485 -2.508385,-1.188495 -0.96891,10e-6 -1.812214,0.396175 -2.529916,1.188495 -0.710534,0.785069 -1.065798,1.740952 -1.065795,2.867652" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4145" /> <path d="m 43.224746,34.75725 0,-16.279106 1.711731,0 0,7.152775 c 0.437798,-0.610593 0.94378,-1.112159 1.517951,-1.504699 0.581337,-0.399789 1.151913,-0.599688 1.71173,-0.599699 0.602867,1.1e-5 1.141147,0.123585 1.614841,0.370723 0.473678,0.23989 0.854062,0.570633 1.141153,0.99223 0.287074,0.421615 0.502386,0.897739 0.645937,1.428373 0.143531,0.523382 0.215302,1.083101 0.215312,1.679158 l 0,6.760245 -1.6902,0 0,-6.760245 c -8e-6,-0.33437 -0.0323,-0.65421 -0.09689,-0.959518 -0.05742,-0.305294 -0.154315,-0.603326 -0.290672,-0.894097 -0.136371,-0.298024 -0.337329,-0.534268 -0.602873,-0.708736 -0.265559,-0.181718 -0.584938,-0.272581 -0.958139,-0.272591 -0.473692,10e-6 -0.96891,0.243524 -1.485653,0.730544 -0.509576,0.487036 -0.925846,1.05039 -1.24881,1.69006 -0.315795,0.632417 -0.47369,1.177598 -0.473687,1.635543 l 0,5.53904 -1.711731,0" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4147" /> <path d="m 53.581256,23.679171 1.776325,0 3.423461,8.472114 3.337338,-8.472114 1.797856,0 -6.4163,16.388142 -1.819387,0 2.22848,-5.658979 -4.327773,-10.729163" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4149" /> <path d="m 67.415055,34.75725 -1.71173,0 0,-16.279106 1.71173,0 0,16.279106" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4151" /> <path d="m 80.882824,26.361462 c 0.523914,0.872297 0.785877,1.824546 0.785889,2.856748 -1.2e-5,1.032215 -0.261975,1.984463 -0.785889,2.856749 -0.523937,0.872291 -1.234467,1.562854 -2.131589,2.071689 -0.897143,0.501566 -1.873223,0.752348 -2.928244,0.752349 -1.062213,-1e-6 -2.04547,-0.250783 -2.949776,-0.752349 -0.897136,-0.508835 -1.607665,-1.199398 -2.131589,-2.071689 -0.523928,-0.872286 -0.78589,-1.824534 -0.785889,-2.856749 -10e-7,-1.032202 0.261961,-1.984451 0.785889,-2.856748 0.523924,-0.87955 1.234453,-1.570111 2.131589,-2.071688 0.904306,-0.508825 1.887563,-0.763242 2.949776,-0.763253 1.055021,1.1e-5 2.031101,0.254428 2.928244,0.763253 0.897122,0.501577 1.607652,1.192138 2.131589,2.071688 m -9.20459,2.856748 c -3e-6,1.126713 0.405501,2.082596 1.216513,2.867652 0.811004,0.785064 1.794261,1.177593 2.949775,1.177592 1.1555,10e-7 2.142346,-0.392528 2.960541,-1.177592 0.818175,-0.792325 1.227268,-1.748208 1.227279,-2.867652 -1.1e-5,-1.112162 -0.409104,-2.060776 -1.227279,-2.845844 -0.818195,-0.792321 -1.805041,-1.188485 -2.960541,-1.188495 -1.155514,10e-6 -2.138771,0.396174 -2.949775,1.188495 -0.811012,0.785068 -1.216516,1.733682 -1.216513,2.845844" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4153" /> <path d="m 84.532366,34.0049 c -2e-6,-0.247148 0.08612,-0.457951 0.258374,-0.63241 0.172247,-0.181725 0.380382,-0.272588 0.624405,-0.27259 0.244018,2e-6 0.452152,0.09087 0.624405,0.27259 0.179424,0.174459 0.269137,0.385262 0.269141,0.63241 -4e-6,0.239881 -0.08972,0.454318 -0.269141,0.643314 -0.17943,0.181727 -0.387564,0.27259 -0.624405,0.27259 -0.236846,0 -0.444981,-0.09087 -0.624405,-0.27259 -0.172252,-0.188996 -0.258376,-0.403433 -0.258374,-0.643314" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee" id="path4155" /> <path d="m 89.527608,21.08411 c -10e-7,-0.239866 0.08253,-0.447035 0.247608,-0.621507 0.172248,-0.174444 0.380383,-0.261673 0.624406,-0.261687 0.23684,1.4e-5 0.437798,0.08724 0.602874,0.261687 0.172246,0.174472 0.258371,0.381641 0.258374,0.621507 -3e-6,0.247162 -0.08254,0.457964 -0.247609,0.632409 -0.165075,0.167203 -0.369621,0.250796 -0.613639,0.250783 -0.244023,1.3e-5 -0.452158,-0.08358 -0.624406,-0.250783 -0.165074,-0.174445 -0.247609,-0.385247 -0.247608,-0.632409 m 1.356465,13.67314 -0.968904,0 0,-11.056271 0.968904,0 0,11.056271" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee" id="path4157" /> <path d="m 99.593447,23.526521 c 0.753583,1.1e-5 1.474873,0.149027 2.163883,0.447048 0.68899,0.298043 1.28468,0.701476 1.78709,1.210302 0.50238,0.508844 0.90072,1.115812 1.19499,1.820905 0.29424,0.705108 0.44137,1.442918 0.44139,2.213434 -2e-5,0.777797 -0.14715,1.519242 -0.44139,2.224339 -0.29427,0.705104 -0.69261,1.312071 -1.19499,1.820905 -0.50241,0.501568 -1.0981,0.905001 -1.78709,1.210301 -0.68901,0.298033 -1.4103,0.447049 -2.163883,0.447049 -1.543077,0 -2.860068,-0.556084 -3.950979,-1.668254 -1.090916,-1.112166 -1.636373,-2.456945 -1.636372,-4.03434 -10e-7,-1.032202 0.247608,-1.984451 0.742827,-2.856748 0.502393,-0.87955 1.180625,-1.570111 2.0347,-2.071688 0.861243,-0.508825 1.797849,-0.763242 2.809824,-0.763253 m -4.629212,5.691689 c -2e-6,1.301171 0.452153,2.416973 1.356467,3.347412 0.911483,0.923175 2.009573,1.38476 3.294277,1.384759 1.284681,10e-7 2.379191,-0.461584 3.283511,-1.384759 0.91147,-0.930439 1.36721,-2.046241 1.36722,-3.347412 -1e-5,-1.293889 -0.45575,-2.402423 -1.36722,-3.325603 -0.90432,-0.923164 -1.99883,-1.38475 -3.283511,-1.38476 -1.284704,10e-6 -2.382794,0.461596 -3.294277,1.38476 -0.904314,0.92318 -1.356469,2.031714 -1.356467,3.325603" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee" id="path4159" /> </g> <g id="g4014" transform="translate(12.84,20.592727)"> <g transform="translate(0,-0.065)" id="g3992"> <polygon style="fill:#939598" id="polygon461" points="5.7,0.23 11.86,0.23 11.86,1.65 7.12,1.65 7.12,6.04 11.86,6.04 11.86,7.46 11.86,7.46 5.7,7.46 " class="cls-2" /> <polygon style="fill:#939598" id="polygon463" points="0,7.08 3.51,7.08 3.51,8.49 1.43,8.49 1.45,15.84 12.68,15.84 12.68,17.26 12.68,17.26 0.04,17.26 " class="cls-2" /> <polygon style="fill:#939598" id="polygon465" points="10.49,11.02 10.49,12.44 10.49,12.44 2.84,12.44 2.84,7.79 4.26,7.79 4.26,11.02 " class="cls-2" transform="translate(0,-0.15225398)" /> <polygon style="fill:#bcbec0" id="polygon467" points="4.26,4.55 4.26,7.79 4.26,7.79 2.84,7.79 2.84,3.13 6.41,3.13 6.41,4.55 " class="cls-3" transform="matrix(1,0,0,0.85463687,0,0.4549866)" /> <rect style="fill:#939598;fill-opacity:1" id="rect3926-3" width="1.4240631" height="1.7319686" x="2.8396611" y="7.0799503" /> <rect style="fill:#939598;fill-opacity:1" id="rect3926-6" width="1.3864813" height="1.6934805" x="5.7012329" y="2.9206221" /> </g> <g id="g4005"> <g id="g3984"> <polygon class="cls-2" points="94.93,12.33 94.93,10.91 99.87,10.91 99.87,6.46 94.93,6.46 94.93,5.04 101.29,5.04 101.29,12.33 101.29,12.33 " id="polygon453" style="fill:#939598" /> <polygon class="cls-2" points="94.72,17.36 94.72,15.94 104.87,15.94 104.9,5.41 102.74,5.41 102.74,3.99 106.32,3.99 106.29,17.36 106.29,17.36 " id="polygon455" style="fill:#939598" /> <polygon class="cls-2" points="95.51,1.42 95.51,0 103.45,0 103.45,4.7 103.45,4.7 102.03,4.7 102.03,1.42 " id="polygon457" style="fill:#939598" /> <polygon class="cls-3" points="102.03,7.97 102.03,4.7 103.45,4.7 103.45,9.39 103.45,9.39 100.65,9.39 100.65,7.97 " id="polygon459" style="fill:#bcbec0" /> <rect y="3.9876499" x="102.02941" height="1.4238259" width="1.4579451" id="rect3926" style="fill:#939598;fill-opacity:1" /> <rect y="7.884686" x="99.887817" height="1.6934805" width="1.397205" id="rect3926-7" style="fill:#939598;fill-opacity:1" /> </g> </g> </g> </g> </svg>';


        svg.append("g").html(logo_xml);

    }

    function addMainLegend(svgId) {

        var width = 230;
        var height = 80;
        var svgHeight = height + 25;
        var legendRectSize = 20;
        var margin = 25;
        var legendTxtSize = 12;
        if(infoStack == "genes"){
            var dataLabels = ["Gained", "Duplicated", "Retained", "Lost" ]
        } else {
            var dataLabels = ["Gained", "Duplication", "Lost" ]
        }

        // to position legends correctly
        var rects = dataLabels.length - 1;

        var legendDrag = d3.behavior.drag()
            .origin(function() {
                var g = this;
                return {x: d3.transform(g.getAttribute("transform")).translate[0],
                    y: d3.transform(g.getAttribute("transform")).translate[1]};
            })
            .on('dragstart', function(){
                // we don't want to move the whole tree
                d3.event.sourceEvent.stopPropagation();
            })

            .on("drag", function(d, i) {
                g = this;
                translate = d3.transform(g.getAttribute("transform")).translate;
                x = d3.event.dx + translate[0],
                y = d3.event.dy + translate[1];
                d3.select(g).attr("transform", "translate(" + x + ", "+ y +")");
            });

        var legendSvg = d3.select("#" + svgId).append("svg").call(legendDrag)
             .attr("id", "histogram-legend")
             .attr("x", margin)
             .attr("y", margin)
             .attr("width", width + "px")
             .attr("height", svgHeight + "px")
             .append("g");

        legendSvg.append("line")
            .attr("x1", -75)
            .attr("y1", rects * legendRectSize)
            .attr("x2", 200)
            .attr("y2", rects * legendRectSize)
            .attr("class", "divline")
            .attr("stroke-width", 2)
            .attr("stroke", "black");

        legendSvg.selectAll('rect')
            .data(dataLabels)
            .enter()
            .append('rect')
            .attr('x', 110)
            .attr('y', function(d, i){
                return i * legendRectSize;
            })
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .attr('fill', function(d, i){
                return color[d];
            });

        legendSvg.selectAll('text')
            .data(dataLabels)
            .enter()
            .append('text')
            .text(function(d){
                return d;
            })
            .attr('x', 110 + legendRectSize + 5)
            .attr('y', function(d, i){
                return i * legendRectSize + 12;
            })
            .attr('text-anchor', 'start')
            .attr('alignment-baseline', 'hanging')
            .attr("font-size", legendTxtSize).attr("stroke", "black");


        legendSvg
            .append('text')
            .attr("class", "legendGeneTotal")
            .text("Total # of "+infoStack)
            .attr('x', 0)
            .attr('y', rects * legendRectSize - 5)
            .attr('text-anchor', 'start')
            .attr("font-size", legendTxtSize).attr("stroke", "black");

        d3.selectAll(".legendGeneTotal").moveToFront();

    }

    function addStack(d, i){

        // don't draw histograms more than once
        // TODO find more d3 way of doing this
        try {
            if(d3.select("#"+d.ID+" g").classed("stackGroup")){
                return "";
            };
        }
        catch(err){ }

        if(!d.evolutionaryEvents || d.evolutionaryEvents == false) {
            return "";
        }

        var svg = d3.select(this);
        var h = stackHeight;
        var w = stackWidth;
        var margin = 8;
        var xInitialRightMargin = 35;
        var xDistanceFromNode = w + xInitialRightMargin;
        var txtDistanceFromBar = w + margin;
        var legendTxtSize = 12;

        var stackData = [];

        stackData[infoStack] = barStack(d, infoStack);

        for (var key in stackData) {

            if (key == infoStack) {
                var data = stackData[key];

                var y = d3.scale.linear()
                    .domain([0, d3.max(data, function (d) {
                        return d3.max(d, function (d) {
                            return d.y0 + d.y;
                        });
                    })])
                    .range([h, 0]);

                var stackDrag = d3.behavior.drag()
                    .origin(function () {
                        var g = this;
                        return {
                            x: d3.transform(g.getAttribute("transform")).translate[0],
                            y: d3.transform(g.getAttribute("transform")).translate[1]
                        };
                    })
                    .on('dragstart', function () {
                        // we don't want to move the whole tree
                        d3.event.sourceEvent.stopPropagation();
                    })
                    .on("drag", function (d, i) {
                        g = this;
                        translate = d3.transform(g.getAttribute("transform")).translate;
                        // todo leftmargin needs width of the "parent"
                        //translate[0] = (translate[0] < -48) ? -48 : translate[0];
                        translate[0] = (translate[0] > xInitialRightMargin - 4) ? xInitialRightMargin - 4 : translate[0];
                        x = d3.event.dx + translate[0],
                            y = d3.event.dy + translate[1];

                        // keep it vertically aligned
                        // TODO restrict X to parents "parent" width, we just don't know the
                        // width of the parent
                        var parentId = '#' + g.parentNode.previousSibling.id

                        d3.select(g).attr("transform", "translate(" + x + ", 0)");
                    });
                /*

                        function computeDimensions(selection) {
                          var dimensions = null;
                          var node = selection.node();

                          if (node instanceof SVGElement) { // check if node is svg element
                            dimensions = node.getBBox();
                          } else { // else is html element
                            dimensions = node.getBoundingClientRect();
                          }
                          console.log(dimensions);
                          return dimensions;
                        }
                */

                var stackGroup = svg.append("g").classed("stackGroup", true).call(stackDrag);

                if (settings.showHistogramValues) {
                    var legends = stackGroup.selectAll("text")
                        .data(data)
                        .enter()
                        .append("text")
                        .classed("legendtxt", true)
                        .text(function (d) {
                            return d[0].realsize != 0 ? d[0].realsize : "";
                        }).attr("x", function () {
                            return (0 - xDistanceFromNode) + txtDistanceFromBar;
                        }).attr("y", function (d) {
                            // TODO adjust based on feedback
                            if(d[0].y0 < 0){
                                // legend below zero line
                                return legendTxtSize+2;
                            }

                            // if bar height smaller than text size, put text on bottom
                            if(d[0].y < legendTxtSize && d[0].y0 > 0) {
                                return -(d[0].y0 - d[0].y);
                            }

                            // center legend text vertically with some extra padding
                            return -(d[0].y0 - ((d[0].y + legendTxtSize)/2));
                        }).attr("font-size", legendTxtSize).attr("stroke", "black")

                }

                if (settings.showHistogramSummaryValue) {

                    var summaryLegend = stackGroup.selectAll(".stackGroup")
                        .data(function (d) {
                            return [d];
                        })
                        .enter()
                        .append("text")
                        .classed("legendsummarytxt", true)
                        .text(function (d) {
                            return d.numberGenes > 0 ? d.numberGenes : "";
                        }).attr("x", function () {
                            return 0 - (xDistanceFromNode + 30)
                        }).attr("y", function (d) {
                            return 0 - margin;
                        }).attr("font-size", legendTxtSize).attr("stroke", "black")

                }

                var stackSlices = stackGroup.selectAll("rect")
                    .data(data)
                    .enter()
                    .append("rect");

                var slices = stackSlices
                    .style("fill", function (d, i) {
                        return color[d[0].sizelbl];
                    })
                    .style("opacity", 0.8)
                    .attr("y", function (d) {
                        return 0 - d[0].y0;
                    })
                    .attr("x", function (d) {
                        return 0 - xDistanceFromNode;
                    })
                    .attr("height", function (d) {
                        return d[0].size
                    })

                    .attr("width", w)

                d3.selectAll(".stackGroup").moveToFront();

            }

        }

    }

    function getStackNormalizer(d, type){

        if(type == 'genes' || !type){

            if(maxStackHeight == "max" && largestGenome > 0){
                var normalizer = stackHeight / largestGenome;
            } else if(Number.isInteger(maxStackHeight)){
                var normalizer = maxStackHeight / (d.identical + d.duplicated + d.gained + Math.abs(d.lost));
            } else {
                var normalizer = stackHeight / (d.identical + d.duplicated + d.gained + Math.abs(d.lost));
            }

        } else {

            if(maxStackHeight == "max" && largestEvents > 0){
                var normalizer = stackHeight / largestEvents;
            } else if(Number.isInteger(maxStackHeight)){
                var normalizer = maxStackHeight / (d.duplication + d.gained + Math.abs(d.lost));
            } else {
                var normalizer = stackHeight / (d.duplication + d.gained + Math.abs(d.lost));
            }

        }

        return normalizer;

    }

    function barStack(seriesDataAll, type) {

        if(type == 'genes' || !type) {
            var data = [[{}], [{}], [{}], [{}]];
        } else {
            var data = [[{}], [{}], [{}]];
        }
        var size = 0;
        var d = seriesDataAll.evolutionaryEvents;
        var posBase = 0; // positive base
        var stackIndex = 0;
        var seriesIndex = 0;

        var normalizer = getStackNormalizer(d, type);

        /* in case there's no eveolutionary events */
        normalizer = !isFinite(normalizer) ? 1 : normalizer;

        var StackSizeIdentical = (d.identical) ? stackScale(d.identical, normalizer) : 0;
        var StackSizeDuplicated = (d.duplicated) ? stackScale(d.duplicated, normalizer) : 0;
        var StackSizeDuplication = (d.duplication) ? stackScale(d.duplication, normalizer) : 0;
        var StackSizeGained = (d.gained) ? stackScale(d.gained, normalizer) : 0;
        var StackSizeLost = (d.lost) ? stackScale(d.lost, normalizer) : 0;
        var posStackSize = StackSizeGained + StackSizeDuplicated + StackSizeIdentical;

        if(type == 'genes' || !type){

            realSize = Math.abs(d.identical);
            var posBase = posBase + StackSizeIdentical;
            data[stackIndex][seriesIndex] = new seriesElement('Retained', realSize, StackSizeIdentical, posBase, posStackSize)
            stackIndex++;

            realSize = Math.abs(d.duplicated);
            var posBase = posBase + StackSizeDuplicated
            data[stackIndex][seriesIndex] = new seriesElement('Duplicated', realSize, StackSizeDuplicated, posBase, posStackSize)
            stackIndex++;

        } else {

            realSize = Math.abs(d.duplication);
            var posBase = posBase + StackSizeDuplication
            data[stackIndex][seriesIndex] = new seriesElement('Duplication', realSize, StackSizeDuplication, posBase, posStackSize)
            stackIndex++;

        }

        realSize = Math.abs(d.gained);
        var posBase = posBase + StackSizeGained
        data[stackIndex][seriesIndex] = new seriesElement('Gained', realSize, StackSizeGained, posBase, posStackSize)
        stackIndex++;

        realSize = Math.abs(d.lost);
        /* move lost down a little to make it easier to hover it and not the node line */
        data[stackIndex][seriesIndex] = new seriesElement('Lost', realSize, StackSizeLost, -1, posStackSize)

        function seriesElement(sizeLbl, realSize, size, y0, posStackSize){
            this.sizelbl = sizeLbl
            this.realsize = realSize
            this.size = Math.abs(size)
            this.y = size
            this.y0 = y0
            this.posStackSize = posStackSize;
        }

        function stackScale(val, normalizer){
            return val * normalizer;
        }

        data.extent = d3.extent(
            d3.merge(
                d3.merge(
                    data.map(function(e) {
                        return e.map(function(f) {
                            return [f.y0, f.y0 - f.size]
                        })
                    })
                )
            )
        )

        return data;
    }

    d3.selection.prototype.moveToFront = function() {
        return this.each(function() {
            this.parentNode.appendChild(this);
        });
    };

    function createLadderizedTree(canvasId, ladderizeClass, baseTree) {
        //renders the manual zoom slider if turned on
        var ladderizeButton = d3.select("#" + canvasId).select("." + ladderizeClass).append("div");
        ladderizeButton.append("button")
            .attr("id", "ladderizeAscButton")
            .attr("class", "btn btn-sm sharp asc")
            .attr("title", "Ladderize Tree")
            .attr("type", "button")
            .append("span")
            .text("asc");

        d3.select("#" + canvasId).select(".asc")
            .on('click', function () {
                toggleActiveBtn("asc", "ladderize");
                ladderizeTree(baseTree, "ascending")
            });

        //var downloadButton = d3.select("#"+canvasId).select("."+ladderizeClass).append("div");
        ladderizeButton.append("button")
            .attr("id", "ladderizeDescButton")
            .attr("class", "btn btn-sm sharp desc")
            .attr("title", "Ladderize Tree")
            .attr("type", "button")
            .append("span")
            .text("desc");

        d3.select("#" + canvasId).select(".desc")
            .on('click', function () {
                toggleActiveBtn("desc", "ladderize");
                ladderizeTree(baseTree, "descending")
            });
    }

    function toggleActiveBtn(activateElem, parentClass){

          var activeClass = "activebtn";
          d3.selectAll("."+parentClass+" .btn").classed(activeClass, false);
          d3.select("."+activateElem).classed(activeClass, true);

    }

    function createHistogramLabelVisibilityBtn(canvasId, histVisClass) {
        var histLabels = d3.select("#" + canvasId).select("." + histVisClass);
        if (histLabels.attr("opacity") == 1){
            histLabels.active = true;
            var histLblShowBtnTxt = "Show";
        } else {
            histLabels.active = false;
            var histLblShowBtnTxt = "Hide";
        }

        var histVisLblBtn = d3.select("#" + canvasId).select("." + histVisClass).append("div");
        histVisLblBtn.append("button")
            .attr("id", "histLblShowBtn")
            .attr("class", "btn btn-sm sharp")
            .attr("title", "Visibility of all values")
            .attr("type", "button")
            .append("span")
            .attr("id", "histLblShowBtnTxt")
            .text(histLblShowBtnTxt)

        d3.select("#" + canvasId).select("#histLblShowBtn")
            .on('click', function () {
                var active = histLabels.active ? false : true,
                newOpacity = active ? 0 : 1;
                d3.selectAll(".legendtxt, .legendsummarytxt").style("opacity", newOpacity);
                histLabels.active = active;
                if(active){
                    d3.select(this).text("Show");
                } else {
                    d3.select(this).text("Hide");
                }
        });

    }


    function createHistogramLegendVisibilityBtn(canvasId, legendVisClass) {

        var histLegendLabels = d3.select("#" + canvasId).select("." + legendVisClass);

        if (histLegendLabels.attr("opacity") == 1){
            histLegendLabels.active = true;
            var histLegendShowBtnTxt = "Show";
        } else {
            histLegendLabels.active = false;
            var histLegendShowBtnTxt = "Hide";
        }

        var histLegendVisLblBtn = d3.select("#" + canvasId).select("." + legendVisClass).append("div");
        histLegendVisLblBtn.append("button")
            .attr("id", "histLegendShowBtn")
            .attr("class", "btn btn-sm sharp")
            .attr("title", "Visibility of legend")
            .attr("type", "button")
            .append("span")
            .attr("id", "histLegendShowBtnTxt")
            .text(histLegendShowBtnTxt)

        d3.select("#" + canvasId).select("#histLegendShowBtn")
            .on('click', function () {
                var active = histLegendVisLblBtn.active ? false : true,
                newOpacity = active ? 0 : 1;
                d3.selectAll("#histogram-legend").style("opacity", newOpacity);
                histLegendVisLblBtn.active = active;
                if(active){
                    d3.select(this).text("Show");
                } else {
                    d3.select(this).text("Hide");
                }
        });

    }

    function createHistogramScaleSwitchBtn(canvasId, scaleSwitchClass, baseTree) {

        function buildScaleButton(canvasId, scaleSwitchClass) {

            var scaleButton = d3.select("#" + canvasId).select("." + scaleSwitchClass).append("div")
                .attr("class", "btn-group export-group");
            scaleButton.append("button")
            /*.attr("id", "exportButton") */
                .attr("class", "btn btn-sm sharp normalised")
                .attr("title", "Scale histograms as normalised")
                .attr("type", "button")
                .append("span")
                .text("Ratio");
            scaleButton.append("button")
                .attr("class", "btn btn-sm sharp fixed")
                .attr("title", "Scale histograms as fixed")
                .attr("type", "button")
                .append("span")
                .text("Fixed");

        }

        // draw button
        buildScaleButton(canvasId, scaleSwitchClass);

        // normalised ratio
        d3.select("#" + canvasId).select(".normalised")
            .on('click', function () {
                maxStackHeight = "ratio";
                toggleActiveBtn("normalised", "stackscaleswitch");
                updateHistogramScale(canvasId, baseTree);
            });

        // max ratio
        d3.select("#" + canvasId).select(".fixed")
            .on("click", function () {
                maxStackHeight = "max";
                toggleActiveBtn("fixed", "stackscaleswitch");
                updateHistogramScale(canvasId, baseTree);
            });

    }


    function updateHistogramScale(canvasId, baseTree){
        d3.select("#" + canvasId).selectAll(".stackGroup").remove();
        update(baseTree.root, baseTree.data, 0);

    }

    function createHistogramInfoSwitchBtn(canvasId, infoSwitchClass, baseTree) {

        function buildInfoButton(canvasId, infoSwitchClass) {

            var scaleButton = d3.select("#" + canvasId).select("." + infoSwitchClass).append("div")
                .attr("class", "btn-group export-group");
            scaleButton.append("button")
            /*.attr("id", "exportButton") */
                .attr("class", "btn btn-sm sharp events")
                .attr("title", "Show events")
                .attr("type", "button")
                .append("span")
                .text("Events");
            scaleButton.append("button")
                .attr("class", "btn btn-sm sharp genes")
                .attr("title", "Show genes")
                .attr("type", "button")
                .append("span")
                .text("Genes");

        }

        // draw button
        buildInfoButton(canvasId, infoSwitchClass);

        // normalised ratio
        d3.select("#" + canvasId).select(".events")
            .on('click', function () {
                infoStack = "events";
                toggleActiveBtn("events", "stackinfoswitch");
                updateHistogramScale(canvasId, baseTree);
            });

        // max ratio
        d3.select("#" + canvasId).select(".genes")
            .on("click", function () {
                infoStack = "genes";
                toggleActiveBtn("genes", "stackinfoswitch");
                updateHistogramScale(canvasId, baseTree);
            });

    }


    function splitsToBitString(tree, funcType) {

        function getLeafNames(leaves) {
            var allLeafNames = [];
            for (var i = 0; i < leaves.length; i++) {
                allLeafNames.push(leaves[i].name);
            }
            return allLeafNames.sort()
        }

        var allLeaves = tree.root.leaves;
        var allLeafNames = getLeafNames(allLeaves);
        var allLeafMaxNum = bigInt(Math.pow(2, allLeafNames.length) - 1);

        var allSplits = [];
        var allBinaryStrings = [];
        var allSplitsDict = {};

        postorderTraverse(tree.root, function (d) {
            if (d.children || d._children && (funcType === "RF" || funcType === "SPR" || funcType === "EUC")){
                var leafNames = getLeafNames(d.leaves);
                var binaryString = "";
                for (var i = 0; i < allLeafNames.length; i++) {
                    if (leafNames.indexOf(allLeafNames[i]) !== -1) {
                        binaryString += "1";
                    } else {
                        binaryString += "0";
                    }
                }
                var tmpNum = bigInt(parseInt(binaryString, 2));
                if (tmpNum.compare(allLeafMaxNum.over(2)) === 1) {
                    var num = allLeafMaxNum.minus(tmpNum);
                    // console.log(binaryString)
                    binaryString = stringInverter(binaryString);
                    // console.log(binaryString)
                } else {
                    var num = tmpNum;
                }
                allBinaryStrings.push(binaryString); // strings
                //allSplits.push(num); // numbers (??)
                allSplitsDict[binaryString] = d.length; // string - length dictionary
            }
        }, true);
        return [allSplitsDict, allBinaryStrings];
    }

    function calcRFDist(leftTree, rightTree) {
        var leftSplits = splitsToBitString(leftTree, 'RF');
        var rightSplits = splitsToBitString(rightTree, 'RF');
        var allSplitsIDs = _.uniq(leftSplits[1].concat(rightSplits[1]));
        var intersectingSplitsIDs = _.intersection(leftSplits[1],rightSplits[1]);
        var rf = allSplitsIDs.length - intersectingSplitsIDs.length;
        var rfRelative = rf / ((leftTree.root.leaves.length - 3)+(rightTree.root.leaves.length - 3));

        return [rf, rfRelative.toFixed(2)];
    }


    function calcEuclidean(leftTree, rightTree) {
        var branchScore = 0;
        var leftData = splitsToBitString(leftTree, 'EUC'); // [0]: object, [1]: list of strings
        var rightData = splitsToBitString(rightTree, 'EUC');

        var leftDataDict = leftData[0];
        var leftDataList = leftData[1];
        var rightDataDict = rightData[0];
        var rightDataList = rightData[1];

        // console.log('leftDataDict', leftDataDict);
        var uniqueData = _.uniq(leftDataList.concat(rightDataList));  //array of strings without duplications
        // console.log('uniqueData', uniqueData);
        var agrSplits = _.intersection(leftDataList,rightDataList); //agreement splits

        for (var i = 0; i < uniqueData.length; i++) {
            var tmpStr = uniqueData[i];
            if(agrSplits.indexOf(tmpStr) !== -1 ) {
                branchScore += Math.pow((leftDataDict[tmpStr] - rightDataDict[tmpStr]), 2);
            }
            else if (leftDataList.indexOf(tmpStr) !== -1){
                branchScore += Math.pow(leftDataDict[tmpStr], 2);
        }
            else {
                branchScore += Math.pow(rightDataDict[tmpStr], 2);
            }
        }

        var euclDist = Math.sqrt(branchScore);
        return euclDist.toFixed(3)
    }


    function calcSPR(leftTree, rightTree) {
        var globalCount = 0;

        var leftSplitsStr = splitsToBitString(leftTree, 'SPR')[1];
        var rightSplitsStr =  splitsToBitString(rightTree, 'SPR')[1];

        var agrSplits = intersectBuilder(leftSplitsStr, rightSplitsStr)[0];
        var uniqueSplitsLeft = intersectBuilder(leftSplitsStr, rightSplitsStr)[1];
        var uniqueSplitsRight = intersectBuilder(leftSplitsStr, rightSplitsStr)[2];

        // checking whether unique splits exist
        if (uniqueSplitsLeft.length !== 0 || uniqueSplitsRight.length !== 0) {
            globalCount = minDsFinder(globalCount, agrSplits, uniqueSplitsLeft, uniqueSplitsRight);
            var SPR = globalCount - 1;
        } else {
            SPR = 0;
        }
        return SPR
    }


    // in strings corresponding to cherries, find index of leaf to be cut
    function getCherries (splitStr) {

        var zeroCount = counter(splitStr)[0];
        var oneCount = counter(splitStr)[1];
        if (oneCount == 2) {
            var tmpInd = splitStr.indexOf("1");
        }
        else if (zeroCount == 2) {
            tmpInd = splitStr.indexOf("0");
        }
        return tmpInd
    }

    function intersectBuilder (leftSplits, rightSplits) {
        var uniqueSplitsLeft = [];
        var uniqueSplitsRight = [];
        var agrSplits = _.intersection(leftSplits,  rightSplits);

        uniqueSplitsLeft = leftSplits.filter(function(x) {
            return !rightSplits.includes(x);
        } );

        uniqueSplitsRight = rightSplits.filter(function(x) {
            return !leftSplits.includes(x);
        } );

        uniqueSplitsLeft = _.uniq(uniqueSplitsLeft);
        uniqueSplitsRight = _.uniq(uniqueSplitsRight);

        return [agrSplits, uniqueSplitsLeft, uniqueSplitsRight]
    }

    // update lists, cutting the leaf found by getCherries or minStrSplicer from all splits
    function updateList(myList, tmpInd) {
        var newList = [];
        for (var i = 0; i < myList.length; i++){
            var tmpStr = myList[i];
            tmpStr = tmpStr.slice(0, tmpInd) + tmpStr.slice(tmpInd + 1);

            //invert strings in case on the wrong side of the tree
            var zeroCount = counter(tmpStr)[0];
            var oneCount = counter(tmpStr)[1];
            if (oneCount > zeroCount){
                tmpStr = stringInverter(tmpStr);
            }

            if (oneCount > 1) {
                newList.push(tmpStr);
            }
        }
        return newList
    }


    // counts the number of characters avoiding loops
    function counter (myString){
        var myStringTmp = myString;
        myString = myString.replace(/1/g, "");
        var zeroCount = myString.length;
        myStringTmp = myStringTmp.replace(/0/g, "");
        var oneCount = myStringTmp.length;
        return [zeroCount, oneCount]
    }


    // invert '1's into '0's when required
    function stringInverter(myString) {
        var b1 = myString.replace(/1/g,"a");
        var b2 = b1.replace(/0/g,"1");
        var b3 = b2.replace(/a/g,"0");
        return b3
    }

    // iterate through agr. splits until no cherries to cut
    function simplifySplits (agrSplits, leftSplits, rightSplits){
        var extend = false;
        for (var i = 0; i < agrSplits.length; i++) {
            var tmpStr = agrSplits[i];
            var cherInd = getCherries(tmpStr);
            if (typeof (cherInd) !== 'undefined') {
                extend = true;
                leftSplits = updateList(leftSplits, cherInd);
                rightSplits = updateList(rightSplits, cherInd);
                agrSplits = updateList(agrSplits, cherInd);
            }
        }

        if (extend){
            return simplifySplits (agrSplits, leftSplits, rightSplits);
        }
        return [agrSplits, leftSplits, rightSplits];
    }

    // bitwise xor operator on a pair of strings
    function xorStringBuilder (bitString1, bitString2) {
        var xorString = "";
        for (var i = 0; i < bitString1.length; i++) {
            xorString = xorString.concat(bitString1.charCodeAt(i) ^ bitString2.charCodeAt(i));
        }
        return xorString
    }

    // construct disagreement split matrix
    function matrixBuilder (leftSplits, rightSplits) {

        //fill in the matrix and determine number of '1'
        var dsMatrix = [];
        var tmpDsMatrix = [];
        for (var i = 0; i < leftSplits.length; i++) {
            dsMatrix.push([]);
            tmpDsMatrix.push([]);
            for (var j = 0; j < rightSplits.length; j++) {
                var tmpStr = xorStringBuilder(leftSplits[i], rightSplits[j]);
                var tmpNum = 0;
                for (var l = 0; l < tmpStr.length; l++) {
                    if (tmpStr[l] == '1') {
                        tmpNum += 1
                    }
                }

                tmpDsMatrix[i].push(tmpNum);
                dsMatrix[i].push(tmpStr);

            }
        }
        return [dsMatrix, tmpDsMatrix]
    }

    // cut the leaves in disagreement
    function minStrSplicer(minimumString, myList) {
        var tmpInd = minimumString.indexOf('1'); //TODO: are you going through the list????
        if (tmpInd != -1) {
            minimumString = minimumString.slice(0, tmpInd) + minimumString.slice(tmpInd + 1);
            myList = updateList(myList, tmpInd);
            return minStrSplicer(minimumString, myList);
        }
        return myList
    }


    // this function actually does iteration
    function minDsFinder (globalCount, agrSplits, leftSplits, rightSplits) {
        globalCount += 1;
        //TODO: here has to be the intersection called again (remove from main and put here)
        var simplifiedSplits = simplifySplits(agrSplits, leftSplits, rightSplits); // remove agr. cherries
        // agrSplits = simplifiedSplits[0];
        leftSplits = simplifiedSplits[1];
        rightSplits = simplifiedSplits[2];

        var intersections = intersectBuilder(leftSplits, rightSplits);
        agrSplits = intersections[0];  // rebuild splits lists
        leftSplits = intersections[1];
        rightSplits = intersections[2];


        if (leftSplits.length != 0 && rightSplits.length != 0) {

            var matrix = matrixBuilder(leftSplits, rightSplits);// build the xor string/number lists
            var dsMatrix = matrix[0];
            var tmpDsMatrix = matrix[1];
            var minRow = tmpDsMatrix.map(function (row) { // find the shortest DS
                return Math.min.apply(Math, row);
            });
            var minValue = Math.min.apply(null, minRow);
            // console.log(minValue);

            for (var i = 0; i < tmpDsMatrix.length; i++) {
                for (var j = 0; j < tmpDsMatrix[i].length; j++) {
                    if (tmpDsMatrix[i][j] == minValue) {
                        var minString = dsMatrix[i][j];
                        break;
                    }
                }
            }

            var agrSplitsUpd = minStrSplicer(minString, agrSplits);
            var leftSplitsUpd = minStrSplicer(minString, leftSplits);
            var rightSplitsUpd = minStrSplicer(minString, rightSplits);
            //console.log(leftSplitsUpd);
            // we should see that all the splits are of the same length!!!
            //TODO: here you have to make sure that we are still looking at the right side of the tree (you should allways have a smaller number of 1s than 0s, if the same number you have define what you are looking at 0011 or 1100 )
            return minDsFinder(globalCount, agrSplitsUpd, leftSplitsUpd, rightSplitsUpd);

        }
        return globalCount
    }

    function getIntersectionOfLeaves(leftLeaves, rightLeaves){
        return _.intersection(leftLeaves, rightLeaves)
    }

    function getIntersectingTrees(leftTree, rightTree, commonLeaves){
        var leftTreeIndex = findTreeIndex(leftTree.name);
        var rightTreeIndex = findTreeIndex(rightTree.name);
        postorderTraverse(leftTree.root, function(d){
            if (!d.children && !d._children){
                if (commonLeaves.indexOf(d.name) < 0){
                    updateUndo(leftTreeIndex, "restore_branch", d);
                    var cutTree = cutBranch(d, leftTree);
                    var index1 = findTreeIndex(leftTree.name);
                    var index2 = findTreeIndex(rightTree.name);

                    preprocessTrees(trees[index1], trees[index2]);
                    update(leftTree.root, cutTree.data);
                    update(rightTree.root, rightTree.data);
                }
            }

        });
        postorderTraverse(rightTree.root, function(d){
            if (!d.children && !d._children){
                if (commonLeaves.indexOf(d.name) < 0){
                    updateUndo(rightTreeIndex, "restore_branch", d);
                    var cutTree = cutBranch(d, rightTree);
                    var index1 = findTreeIndex(rightTree.name);
                    var index2 = findTreeIndex(leftTree.name);

                    preprocessTrees(trees[index1], trees[index2]);
                    update(rightTree.root, cutTree.data);
                    update(leftTree.root, leftTree.data);
                }
            }

        });

    }


    function calcDist() {
        var leftIdx = d3.select("#vis-container1").select("svg").attr("id").split("_")[1];
        var rightIdx = d3.select("#vis-container2").select("svg").attr("id").split("_")[1];
        var leftTree = trees[leftIdx];
        var rightTree = trees[rightIdx];
        if((leftTree.root.deepLeafList.length > 100 || rightTree.root.deepLeafList.length > 100) ){

            $('#modalTitleError').html('Too complex tree');
            $('#modalBodyError').html("One or both trees have too many leaves. 100 leaves is the maximum.");
            $('#myErrorModal').modal('show');
            return false;

        }

        var leftLeaves = leftTree.root.deepLeafList.sort();
        var rightLeaves = rightTree.root.deepLeafList.sort();
        var commonLeaves = getIntersectionOfLeaves(leftLeaves, rightLeaves);
        var sameLeaves = _.isEqual(leftLeaves, rightLeaves);
        if (sameLeaves) {
            var distArray = [];
            distArray.push(calcRFDist(leftTree, rightTree), calcEuclidean(leftTree, rightTree), calcSPR(leftTree, rightTree));// add other metrics here
            return distArray
        } else {
            alert('Trees have different leaf sets. Left and right trees are trimmed')
            getIntersectingTrees(leftTree, rightTree, commonLeaves);
            var distArray = [];
            distArray.push(calcRFDist(leftTree, rightTree), calcEuclidean(leftTree, rightTree), calcSPR(leftTree, rightTree));// add other metrics here
            return distArray

        }

    }

    function createTreeDownload(canvasId, downloadClass){

        function buildDownloadButton(canvasId, downloadClass) {

            var downloadButton = d3.select("#"+canvasId).select("."+downloadClass).append("div")
                .attr("class", "btn-group export-group");
            downloadButton.append("button")
                /*.attr("id", "exportButton") */
                .attr("class", "btn btn-sm sharp nwk")
                .attr("title", "export tree as nwk string")
                .attr("type", "button")
                .append("span")
                .text("nwk");
            downloadButton.append("button")
                /*.attr("id", "exportButton") */
                .attr("class", "btn btn-sm sharp svg")
                .attr("title", "export tree as svg")
                .attr("type", "button")
                .append("span")
                .text("svg");
            downloadButton.append("button")
                /*.attr("id", "exportButton") */
                .attr("class", "btn btn-sm sharp png")
                .attr("title", "export tree as png")
                .attr("type", "button")
                .append("span")
                .text("png");
        }

        // draws download buttons
        if (settings.enableDownloadButtons) {

            // draw button
            buildDownloadButton(canvasId, downloadClass);

            // PNG
            d3.select("#"+canvasId).select(".png")
                .on('click', function () {
                    var svg = d3.select("#" + canvasId + " > svg");
                    addLogo(svg);
                    var name = svg.attr("id");
                    var svgString = getSVGString(svg.node());
                    var exportElement = svg.node();
                    var width = exportElement.getBoundingClientRect().width;
                    var height = exportElement.getBoundingClientRect().height;
                    svgString2Image(svgString, 2 * width, 2 * height, 'png', save);
                    function save(dataBlob, filesize) {
                        var filename = (name) ? name+"." : "";
                        saveAs(dataBlob, filename+'phylo.io.png'); // FileSaver.js function
                    }
                    svg.select("#exportLogo").remove();
                });

            // SVG
            d3.select("#"+canvasId).select(".svg")
                .on("click", function (){
                    var svg = d3.select("#" + canvasId + " svg");
                    addLogo(svg);
                    var name = svg.attr("id");
                    var svgString = getSVGString(svg.node());
                    var blob = new Blob([svgString], {"type": "image/svg+xml;base64,"+ btoa(svgString)});
                    saveAs(blob, name+".svg");
                    svg.select("#exportLogo").remove();
                });

            // NWK
            d3.select("#"+canvasId).select(".nwk")
                .on("click", function (){
                    var name = d3.select("#" + canvasId + " svg").attr("id");
                    var tree = trees[findTreeIndex(name)];
                    var nwkString = tree2Newick(tree.root);
                    var blob = new Blob([nwkString], {"type": "text/plain;charset=utf-8," + encodeURIComponent(nwkString)});
                    saveAs(blob, "phylo.io.nwk");
                });

            // Below are the functions that handle actual exporting:
            // getSVGString ( svgNode ) and svgString2Image( svgString, width, height, format, callback )
            function getSVGString( svgNode ) {
                svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
                var cssStyleText = getCSSStyles( svgNode );
                appendCSS( cssStyleText, svgNode );

                var serializer = new XMLSerializer();
                var svgString = serializer.serializeToString(svgNode);
                svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
                svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix

                return svgString;

                function getCSSStyles( parentElement ) {
                    var selectorTextArr = [];

                    // Add Parent element Id and Classes to the list
                    selectorTextArr.push( '#'+parentElement.id );
                    for (var c = 0; c < parentElement.classList.length; c++)
                            if ( !contains('.'+parentElement.classList[c], selectorTextArr) )
                                selectorTextArr.push( '.'+parentElement.classList[c] );

                    // Add Children element Ids and Classes to the list
                    var nodes = parentElement.getElementsByTagName("*");
                    for (var i = 0; i < nodes.length; i++) {
                        var id = nodes[i].id;
                        if ( !contains('#'+id, selectorTextArr) )
                            selectorTextArr.push( '#'+id );

                        var classes = nodes[i].classList;
                        for (var c = 0; c < classes.length; c++)
                            if ( !contains('.'+classes[c], selectorTextArr) )
                                selectorTextArr.push( '.'+classes[c] );
                    }

                    // Extract CSS Rules
                    var extractedCSSText = "";
                    for (var i = 0; i < document.styleSheets.length; i++) {
                        var s = document.styleSheets[i];

                        try {
                            if(!s.cssRules) continue;
                        } catch( e ) {
                                if(e.name !== 'SecurityError') throw e; // for Firefox
                                continue;
                            }

                        var cssRules = s.cssRules;
                        for (var r = 0; r < cssRules.length; r++) {
                            if ( contains( cssRules[r].selectorText, selectorTextArr ) )
                                extractedCSSText += cssRules[r].cssText;
                        }
                    }


                    return extractedCSSText;

                    function contains(str,arr) {
                        return arr.indexOf( str ) === -1 ? false : true;
                    }

                }

                function appendCSS( cssText, element ) {
                    var styleElement = document.createElement("style");
                    styleElement.setAttribute("type","text/css");
                    styleElement.innerHTML = cssText;
                    var refNode = element.hasChildNodes() ? element.children[0] : null;
                    element.insertBefore( styleElement, refNode );
                }
            }

            function svgString2Image( svgString, width, height, format, callback ) {
                var format = format ? format : 'png';

                var imgsrc = 'data:image/svg+xml;base64,'+ btoa( unescape( encodeURIComponent( svgString ) ) ); // Convert SVG string to dataurl

                var canvas = document.createElement("canvas");
                var context = canvas.getContext("2d");

                canvas.width = width;
                canvas.height = height;

                var image = new Image;
                image.onload = function() {

                    context.clearRect ( 0, 0, width, height );
                    context.fillStyle = "#ffffff";
                    context.fillRect(0, 0, width, height);
                    context.drawImage(image, 0, 0, width, height);

                    canvas.toBlob( function(blob) {
                        var filesize = Math.round( blob.length/1024 ) + ' KB';
                        if ( callback ) callback( blob, filesize );
                    });
                };
                image.src = imgsrc;
            }

        }

    }

    function createZoomSlider(canvasId, zoomClass, baseTree){
        var name = baseTree.name;
        //renders the manual zoom slider if turned on
        if (settings.enableZoomSliders) {
            d3.select("#"+canvasId).select("."+zoomClass).append("div")
                .attr("class", "zoomSliderContainer")
                .append("input")
                .attr("type", "range")
                .attr("class", "zoomSlider")
                .attr("id", "zoomSlider" + findTreeIndex(name))
                .attr("min", "0.05")
                .attr("max", "5")
                .attr("value", "1.00")
                .attr("step", "0.01");
        }
    }

    function createStackZoomSlider(canvasId, stackZoomClass, baseTree, min, max, step, def){
        var name = baseTree.name;
        //renders the manual histogram and tree size sliders if turned on
        if (settings.enableStackZoomSliders) {
            d3.select("#"+canvasId).select("."+stackZoomClass).append("div")
                .attr("class", "stackZoomSliderContainer")
                .append("input")
                .attr("type", "range")
                .attr("class", "stackZoomSlider")
                .attr("id", stackZoomClass)
                .attr("min", min)
                .attr("max", max)
                .attr("value", def)
                .attr("step", step)
                .on('change', function(d, i) {
                    var rangeval = +this.value;
                    if(this.id == 'treeheighthzoom'){
                        sizeSetVertical(baseTree.data, rangeval);
                    } else if(this.id == 'treewidthzoom'){
                        sizeSetHorizontal(baseTree.data, rangeval);
                    } else if(this.id == 'stackwidthzoom'){
                        stackWidth = rangeval;
                        d3.select("#" + canvasId).selectAll(".stackGroup").remove();
                    } else if(this.id == 'stackheightzoom'){
                        stackHeight = rangeval;
                        d3.select("#" + canvasId).selectAll(".stackGroup").remove();
                    }

                    update(baseTree.root, baseTree.data, 0);

                })

        }
    }

    // helper function to set up canvas to place the tree inside
    function initializeRenderTreeCanvas(name, canvasId, scaleId, otherTreeName){

        //get the trees by name
        var baseTree = trees[findTreeIndex(name)];
        if (otherTreeName !== undefined) {
            compareMode = true;
        }
        // renderedTrees.push(baseTree);

        //clear the canvas of any previous visualisation
        $("#" + canvasId).empty();
        jQuery.extend(baseTree.data, {
            canvasId: canvasId
        });

        if (scaleId && settings.enableScale){
            $("#" + scaleId).empty();
            jQuery.extend(baseTree.data, {
                scaleId: scaleId
            });
        }
    }

    /*---------------
     /
     /    Main function for setting up a d3 visualisation of a tree
     /
     ---------------*/
    function renderTree(baseTree, name, canvasId, scaleId, otherTreeName, treeToggle) {

        //get the trees by name
        if (otherTreeName !== undefined) {
            compareMode = true;
        } else {
            compareMode = false;
        }

        renderedTrees.push(baseTree);

        $("#"+canvasId+" .treeTools").remove();
        $("#"+canvasId+" .treeToolsMenu").remove();
        $("#"+canvasId+" .exportTools").remove();
        $("#"+canvasId+" .stackTools").remove();
        $("#"+canvasId+" .undo").remove();
        $("#"+canvasId+" .searchBox").remove();
        $("#"+canvasId+" .search").remove();
        $("#"+canvasId+" .rescaleButtons").remove();
        $("#"+canvasId+" .zoomSlider").remove();

        //clear the canvas of any previous visualisation
        if (scaleId  && settings.enableScale){
            $("#" + scaleId).empty();
            scaleId = "#" + scaleId;
        }

        //set up the d3 vis
        //var width = $("#" + canvasId).width();
        // use whole window width - collapsed sidebar width for tree vis
        if(compareMode){
            var width = ($(window).width() - paddingHorizontal) / 2;
        } else {
            var width = $(window).width() - paddingHorizontal;
        }

        var height = $("#" + canvasId).height();
        var tree = d3.layout.tree()
            .size([height, width]);

        var svg = d3.select("#" + canvasId).append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("version", "1.1")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("id", name)
            .append("g");

        // defines the zoom behaviour
        var zoomBehaviour = d3.behavior.zoom()
            .scaleExtent([settings.scaleMin, settings.scaleMax])
            .on("zoom", zoom);

        var zoomBehaviourSemantic = d3.behavior.zoom()
            .on("zoom", semanticZoom);

        $(".zoomSlider").attr("min", settings.scaleMin);
        $(".zoomSlider").attr("max", settings.scaleMax);

        //choose which zoom event to call depending on current zoom mode
        if (settings.zoomMode === "traditional") {
            d3.select("#" + canvasId + " svg")
                .call(zoomBehaviour);
        } else if (settings.zoomMode === "semantic") {
            d3.select("#" + canvasId + " svg")
                .call(zoomBehaviourSemantic);
        }
        var root = baseTree.root;
        root.x0 = height / 2;
        root.y0 = 0;

        //render the scale if we have somewhere to put it
        if (scaleId && settings.enableScale) {
            var translatewidth = 100;
            // TODO magic number?
            var translateheight = height - 100;

            d3.select("#" + canvasId + " svg")
                .append("g")
                .attr("transform", "translate(" + translatewidth + "," + translateheight + ")")
                .append("path")
                .attr("d", function() {
                    scaleLineWidth = width * 0.25;
                    return "M" + scaleLinePadding + ",20L" + (scaleLineWidth + scaleLinePadding) + ",20"
                })
                .attr("stroke-width", 1)
                .attr("stroke", settings.scaleColor);
            var scaleText = d3.select("#" + canvasId + " svg").append("text")
                .attr("transform", "translate(" + translatewidth + "," + translateheight + ")")
                .attr("x", scaleLineWidth / 2 + scaleLinePadding)
                .attr("y", 36)
                .attr("font-family", "sans-serif")
                .text("0")
                .attr("font-size", "14px")
                .attr("fill", settings.scaleColor)
                .attr("text-anchor", "middle");
            jQuery.extend(baseTree.data, {
                scaleText: scaleText,
                scaleId: scaleId
            });
        }

        // variable i is set to the number of leaves (see above)
        jQuery.extend(baseTree.data, {
            canvasId: canvasId,
            root: root,
            tree: tree,
            svg: svg,
            i: 0,
            id: findTreeIndex(name),
            zoomBehaviour: zoomBehaviour,
            zoomBehaviourSemantic: zoomBehaviourSemantic,
        });

        postorderTraverse(baseTree.data.root, function(d) {
            // if node has non empty evolutionaryEvents object we have histogram data
            if(!hasHistogramData && d.evolutionaryEvents && _.isObject(d.evolutionaryEvents) ) {
                hasHistogramData = true;
            }

            d.leaves = getChildLeaves(d);
            d.mouseoverHighlight = false;
            if (d.children || d._children){
                d.triangleLength = getCollapsedTriangleLength(d);
            }
        });


        createLeafSearch(canvasId, name);
        createToolbar(canvasId, baseTree, compareMode);
        createStackToolbar(canvasId, baseTree, compareMode);
        createExportBar(canvasId);
        createUndoButton(canvasId);

        // just create it many times
        createUndoButton("global");

        // make toolmenu as wide as button group
        $('.toolmenu').css("width" , d3.select('.btn-group-menu').node().getBoundingClientRect().width);

        applyEventListeners(baseTree.data);
        jQuery.extend(baseTree.data, {
            treeWidth: settings.treeWidth,
            treeHeight: settings.treeHeight
        });

        if (settings.fitTree === "scale") {
            var renderHeight = height - paddingVertical * 2;
            var leavesVisible = getVisibleLeaves(baseTree.root);
            var leavesHidden = 0;
            var triangles = 0;
            postorderTraverse(baseTree.root, function(d) {
                if (d._children) {
                    leavesHidden += d.leaves.length;
                    triangles += 1;
                }
            }, false);

            var newHeight;
            if (leavesVisible > 0) {
                newHeight = renderHeight / ((leavesVisible + leavesHidden) * 0.9);

            } else {
                newHeight = renderHeight / ((leavesVisible + leavesHidden) * 0.9);
                newHeight = (newHeight * triangleHeightDivisor);
                newHeight = newHeight - (newHeight / triangleHeightDivisor / 2);
                baseTree.data.prevNoLeavesVisible = true;
            }

            var longest = 0;
            addParents(baseTree.data.root);
            // find longest path between leaf to root
            postorderTraverse(baseTree.data.root, function(d) {
                var l = getLength(d);
                if (l > longest) {
                    longest = l;
                }
            });

            // returns length of longest node
            //maxLength = getMaxLengthVisible(baseTree.data.root);
            baseTree.data.maxLength = getLongestBranchLength(baseTree.data.root);
            baseTree.data.treeWidth = width - paddingHorizontal;
            baseTree.data.treeHeight = newHeight;
        }

        update(baseTree.root, baseTree.data, undefined, treeToggle);

        // where zoom centers
        baseTree.data.zoomBehaviour.translate([90, 25]);
        baseTree.data.zoomBehaviour.scale(0.8);
        // move the tree to the coordinates and scale it smaller
        d3.select("#" + baseTree.data.canvasId + " svg g")
            .attr("transform", "translate(" + [90, 25] + ") scale(0.8)")
            .attr("class", "treegroup");

        d3.select(self.frameElement).style("height", "500px");

        function semanticZoom() {
            var scale = d3.event.scale;
            var prev = baseTree.data.prevSemanticScale;
            if (prev > scale) {
                sizeVertical(baseTree.data, true);
                sizeHorizontal(baseTree.data, true);
                update(baseTree.root, baseTree.data, 0);
                baseTree.data.prevSemanticScale = scale;
                if (baseTree.data.prevTransform) {
                    zoomBehaviourSemantic.translate(baseTree.data.prevTransform);
                } else {
                    zoomBehaviourSemantic.translate([0, 0]);
                }
            } else if (prev < scale) {
                sizeVertical(baseTree.data, false);
                sizeHorizontal(baseTree.data, false);
                update(baseTree.root, baseTree.data, 0);
                if (baseTree.data.prevTransform) {
                    zoomBehaviourSemantic.translate(baseTree.data.prevTransform);
                } else {
                    zoomBehaviourSemantic.translate([0, 0]);
                }
            } else if (prev === scale) {

                var translation = d3.event.translate;
                zoomBehaviourSemantic.translate(translation);
                if (settings.enableScale){
                    applyScaleText(scaleText, scale, root);
                }
                baseTree.data.prevTransform = translation;
                d3.select("#" + canvasId + " svg g")
                    .attr("transform", "translate(" + translation + ")");
            }
            baseTree.data.prevSemanticScale = scale;

        }

        function zoom() {

            var scale = d3.event.scale;
            var translation = d3.event.translate;
            zoomBehaviour.translate(translation);
            zoomBehaviour.scale(scale);

            if(settings.enableScale){
                applyScaleText(scaleText, scale, root);
            }

            if (settings.enableZoomSliders) {
                $("#zoomSlider" + baseTree.data.id).val(scale);
            }
            d3.select("#" + canvasId + " svg > g").attr("transform", "translate(" + translation + ")" + " scale(" + scale + ")");
            d3.selectAll(".tooltipElem").remove();

            var tooltips = $("[id$=tooltipElem]	");
            for (var i = 0; i < tooltips.length; i++) {
                var tooltip = tooltips[i];
                if (scrolling) {
                    tooltip.parentNode.removeChild(tooltip)
                } else {
                    tooltipTransMat = $('#' + tooltip.id).css("-webkit-transform").match(/(-?[0-9\.]+)/g);
                    tooltip.style['-webkit-transform'] = "translate(" + (parseFloat(tooltipTransMat[4]) + dx) + "px," + (parseFloat(tooltipTransMat[5]) + dy) + "px)"
                }
            }

        }

        toggleActiveBtn("genes", "stackinfoswitch");
        toggleActiveBtn("normalised", "stackscaleswitch");
        toggleActiveBtn("desc", "ladderize");

    }

    /*---------------
     /
     /    Returns number of visible leaves in the tree
     /
     ---------------*/
    function getVisibleLeaves(d) {
        var visible = 0;
        postorderTraverse(d, function(e) {
            var children = getChildren(e);
            if (children.length === 0) {
                visible += 1;
            }
        }, false);
        return visible;
    }

    /*---------------
     /
     /    EXTERNAL: update the collapsed nodes according to the new render depth
     /
     ---------------*/
    function changeAutoCollapseDepth(depth) {
        settings.autoCollapse = depth;

        for (var i = 0; i < renderedTrees.length; i++) {
            if (depth === null) {
                uncollapseAll(renderedTrees[i].root);
            } else {
                limitDepth(renderedTrees[i].root, depth);
            }
        }

        if (renderedTrees.length === 2) {
            settings.loadingCallback();
            setTimeout(function() {
                // renderedTrees and trees index do not
                // necessarily correspond
                getVisibleBCNsUsingWorkers(findTreeIndex(renderedTrees[0].name), findTreeIndex(renderedTrees[1].name));
                update(renderedTrees[0].root, renderedTrees[0].data);
                update(renderedTrees[1].root, renderedTrees[1].data);
            }, 2);
        } else {
            update(renderedTrees[0].root, renderedTrees[0].data);
        }
    }

    /*---------------
     /
     /    Expand all collapsed nodes on the path to given leaf node
     /
     ---------------*/
    function expandPathToLeaf(leaf, unhighlight, uncollapse) {
        if (unhighlight === undefined) {
            unhighlight = false;
        }
        if (uncollapse === undefined) {
            uncollapse = true;
        }

        if (leaf.parent) {
            if (!unhighlight) {
                if (uncollapse && leaf.parent._children) {
                    leaf.parent.children = leaf.parent._children;
                    leaf.parent._children = null;
                }
                d3.select("#"+leaf.parent.ID+"_"+leaf.ID).classed("search", true);
                d3.select("#"+leaf.ID).select("circle").classed("search", true);
                d3.select("#"+leaf.ID).select("text").classed("search", true);
            }
            else {
                d3.select("#"+leaf.parent.ID+"_"+leaf.ID).classed("search", false);
                d3.select("#"+leaf.ID).select("circle").classed("search", false);
                d3.select("#"+leaf.ID).select("text").classed("search", false);
            }
            expandPathToLeaf(leaf.parent, unhighlight, uncollapse);
        }
    }

    /**
     Expand all collapsed nodes on path to internal node
     */
    function expandPathToNode(node) {
        if (node.parent) {
            if (node.parent._children) {
                node.parent.children = node.parent._children;
                node.parent._children = null;
            }
            expandPathToNode(node.parent);
        }
    }


    /**
     Calculate the Best Corresponding Node (BCN) for all visible nodes (not collapsed) in the tree
     if recalculate==false, doesn't calculate for a node if it already has a value
     Algorithm adapted from: TreeJuxtaposer: Scalable Tree Comparison Using Focus+Context with Guaranteed Visibility, Munzner et al. 2003
     */
    function getVisibleBCNs(tree1, tree2, recalculate) {

        if (recalculate === undefined) {
            recalculate = true;
        }

        function getAllBCNs(d, t) {
            var children = getChildren(d);
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
        getAllBCNs(tree1, tree2);
        getAllBCNs(tree2, tree1);
    }

    /**
     Description:
     Calculate the Best Corresponding Node (BCN) for all visible nodes (not collapsed) in the tree
     if recalculate==false, doesn't calculate for a node if it already has a value
     Algorithm adapted from: TreeJuxtaposer: Scalable Tree Comparison Using Focus+Context with Guaranteed Visibility, Munzner et al. 2003

     First compares all nodes of tree1 to tree2 and then all nodes of tree2 to tree1
     At the end of the function, each node from each tree will end up with a BCN and a similarity score
     */
    function getVisibleBCNsUsingWorkers(index1, index2, recalculate, highlight) {

        var tree1 = trees[index1].root;
        var tree2 = trees[index2].root;


        if (recalculate === undefined) {
            recalculate = true;
        }

        if (highlight === undefined) {
            highlight = false;
        }

        var worker1 = $.work({file: './js/bcn_processor.js', args: {tree1: tree1, tree2: tree2, recalculate: recalculate} });
        var worker2 = $.work({file: './js/bcn_processor.js', args: {tree1: tree2, tree2: tree1, recalculate: recalculate} });

        $.when(worker1, worker2).done(function(t1, t2){
            var bcnvalT1 = [];
            var bcnobjT1 = [];
            var bcnvalT2 = [];
            var bcnobjT2 = [];

            postorderTraverse(t1,function(d){
                bcnobjT1.push(d.elementBCN);
                bcnvalT1.push(d.elementS);

            });
            postorderTraverse(t2,function(d){
                bcnobjT2.push(d.elementBCN);
                bcnvalT2.push(d.elementS);
            });

            var i;

            i = 0;
            postorderTraverse(trees[index1].data.root,function(d){
                d.elementBCN = bcnobjT1[i];
                d.elementS = bcnvalT1[i];
                i++;
            });

            i = 0;
            postorderTraverse(trees[index2].data.root,function(d){
                d.elementBCN = bcnobjT2[i];
                d.elementS = bcnvalT2[i];
                i++;
            });


            if (!highlight) {

                update(trees[index1],trees[index1].data);
                update(trees[index2],trees[index2].data);

                // When adding a new link (by expanding a node for instance)
                // the links array gets updated, but the enter function does not
                // return the right selection
                // (acts as if nothing was added at all)
                // Thus the tree looks clumsy
                // Please note that in case "Collapse" followed by a "Expand"
                // this issue does not occur...
                // And the bug is specific to the new implementation
                // using workers

                // The reason is the following:
                // the new nodes are added at the beginning of the list and are assigned
                // already existing numeric IDs...
                // Example:
                // New nodes:
                // TARGET ID: node_8657 TARGET NUMERIC ID: 739
                // TARGET ID: node_8994 TARGET NUMERIC ID: 738
                // 739 and 738 are already assigned to 2 existing nodes:
                // TARGET ID: node_8354 TARGET NUMERIC ID: 738
                // TARGET ID: node_7193 TARGET NUMERIC ID: 739
                //
                // To fix this bug, we need to reset all the numeric identifiers
                // Please note that the numeric identifiers are built by incrementing the
                // number of leaves in the tree.

                compareMode = true;
                settings.loadedCallback();
            }
        });
    }

    /**
     Description:
     Calculates some stuff needed for calculating BCNs later on
     First associate via parameter correspondingLeaf all the leaves from tree1 with a common leaf (= same name)
     in tree 2 and vice versa.
     Then, for each node in each tree, get the list of leaves
     Lastly, call getVisibleBCNs (description above)

     Arguments:
     index1 index of the first tree in the trees table
     index2 index of the second tree in the trees table
     */
    function preprocessTrees(trees1, trees2) {

        var tree1 = trees1.root;
        var tree2 = trees2.root;

        for (var i = 0; i < tree1.leaves.length; i++) {
            for (var j = 0; j < tree2.leaves.length; j++) {
                if (tree1.leaves[i].name === tree2.leaves[j].name) {
                    tree1.leaves[i].correspondingLeaf = tree2.leaves[j];
                    tree2.leaves[j].correspondingLeaf = tree1.leaves[i];
                }
            }
        }

        createDeepLeafList(tree1);
        createDeepLeafList(tree2);

        var isChrome = !!window.chrome && !!window.chrome.webstore;

        if(trees1.name === undefined){ // this part is important due to the clonening . . .
            trees1.name = trees1.root.ID.split("_")[0]+"_"+trees1.root.ID.split("_")[1]
        } else if (trees2.name === undefined){
            trees2.name = trees2.root.ID.split("_")[0]+"_"+trees2.root.ID.split("_")[1]
        }

        // use web workers only if trees are very large
        if((tree1.deepLeafList.length > 100 || tree2.deepLeafList.length > 100) && !isChrome){
            getVisibleBCNsUsingWorkers(findTreeIndex(trees1.name), findTreeIndex(trees2.name));
        } else {
            getVisibleBCNs(tree1,tree2);
            update(trees[findTreeIndex(trees1.name)],trees[findTreeIndex(trees1.name)].data);
            update(trees[findTreeIndex(trees1.name)],trees[findTreeIndex(trees2.name)].data);
            settings.loadedCallback();
        }

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
        for (var i = 0; i < tree.leaves.length; i++) {
            var test = $.inArray(tree.leaves[i].name, node.deepLeafList);
            if (test > -1){
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
    }

    /**
     Description:
     Creates list of leaves of each node in subtree rooted at v

     Note:
     Difference between deep leaf list and leaves in:
     (A:0.1,B:0.2,(C:0.3,D:0.4):0.5);
     - Root has leaves: A, B, C and D (terminal leaves)
     - Root has deep leaves: A, B, C, D and CD (terminal leaves + intermediate leaves)
     */
    function createDeepLeafList(_tree) {

        postorderTraverse(_tree, function(d){
            var deepLeafList = [];
            for (var i=0; i < d.leaves.length; i++){
                deepLeafList.push(d.leaves[i].name)
            }
            d.deepLeafList = deepLeafList;
        });
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

        var intersect = _.intersection(lv, ln).length;
        return intersect / (lvlen + lnlen - intersect);
    }

    /**
     get index of a tree in trees by its name
     */
    function findTreeIndex(name) {
        for (var i = 0; i < trees.length; i++) {
            if (name === trees[i].name) {
                return i;
            }
        }
    }

    function initialiseTree(tree, autocollapse) {
        findScaleValueBranchSupport(tree);
        uncollapseAll(tree); // use postorderTraverse, does not call update function
        stripPreprocessing(tree); // use postorderTraverse, reset all existing settings
        getDepths(tree); // get all the children and set their level in the hierarchy

        // use postorderTraverse to set the collapsed the children to _children
        postorderTraverse(tree, function(d) {
            if (d.name==="collapsed" || d.collapsed) {
                d._children = d.children;
                d.collapsed = true;
                d.children = null;
            }
        });

        if (autocollapse !== null) {
            limitDepth(tree, autocollapse);
        }
    }
    /*---------------
     /
     /    EXTERNAL: external function for initialising a tree comparison visualisation
     /
     ---------------*/
    function compareTrees(name1, canvas1, name2, canvas2, scale1, scale2) {
        renderedTrees = [];

        var index1 = findTreeIndex(name1);
        var index2 = findTreeIndex(name2);

        //initialize all functions
        initializeRenderTreeCanvas(name1, canvas1, scale1);
        initializeRenderTreeCanvas(name2, canvas2, scale2);

        var firstTree1 = trees[index1];
        var firstTree2 = trees[index2];

        initialiseTree(firstTree1.root, settings.autoCollapse);
        initialiseTree(firstTree2.root, settings.autoCollapse);

        // render tress (workers) -> once done, run comprison (workers)
        firstTree1.data.clickEvent = getClickEventListenerNode(firstTree1, true, firstTree2);//Click event listener for nodes
        firstTree1.data.clickEventLink = getClickEventListenerLink(firstTree1, true, firstTree2);//Click event listener for links. Assigns a function to the event.
        renderTree(firstTree1, name1, canvas1, scale1, name2);

        firstTree2.data.clickEvent = getClickEventListenerNode(firstTree2, true, firstTree1);
        firstTree2.data.clickEventLink = getClickEventListenerLink(firstTree2, true, firstTree1);
        renderTree(firstTree2, name2, canvas2, scale2, name1);

        settings.loadingCallback();
        setTimeout(function() {
            preprocessTrees(firstTree1, firstTree2);
        }, 10);



        // 4 cases to check if left and right have multiple trees
        if (trees[index1].hasOwnProperty("multiple") && trees[index2].hasOwnProperty("multiple")){

            createTreeToggle(name1, canvas1, scale1, canvas2, scale2);
            createTreeToggle(name2, canvas2, scale2, canvas1, scale1);

        }else if (trees[index1].hasOwnProperty("multiple") && !trees[index2].hasOwnProperty("multiple")) {

            createTreeToggle(name1, canvas1, scale1, canvas2, scale2);

        }else if (!trees[index1].hasOwnProperty("multiple") && trees[index2].hasOwnProperty("multiple")) {

            createTreeToggle(name2, canvas2, scale2, canvas1, scale1);

        }

    }

    /*---------------
     /
     /    EXTERNAL: external function for initialising a single tree visualisation
     /
     ---------------*/
    function viewTree(name, canvasId, scaleId) {

        renderedTrees = [];
        var index = findTreeIndex(name);
        initializeRenderTreeCanvas(name, canvasId, scaleId);
        if (trees[index].hasOwnProperty("multiple")){
            var firstTree = trees[index];
            var newName = firstTree.name;


            initialiseTree(firstTree.root, settings.autoCollapse);
            firstTree.data.clickEvent = getClickEventListenerNode(firstTree, false, {});
            firstTree.data.clickEventLink = getClickEventListenerLink(firstTree, false, {});
            renderTree(firstTree, newName, canvasId, scaleId);

            createTreeToggle(name, canvasId, scaleId);

        } else{
            //updateUndo(index);
            initialiseTree(trees[index].root, settings.autoCollapse);
            trees[index].data.clickEvent = getClickEventListenerNode(trees[index], false, {});
            trees[index].data.clickEventLink = getClickEventListenerLink(trees[index], false, {});
            renderTree(trees[index], name, canvasId, scaleId);

        }
    }

    /*
     collapse all nodes deeper in tree than depth
     */
    function limitDepth(d, depth) {
        if (d.depth > depth) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
                d.collapsed = true;
            }
        } else {
            uncollapseNode(d);
        }
        var children = getChildren(d);
        for (var i = 0; i < children.length; i++) {
            limitDepth(children[i], depth);
        }
    }

    /*
     uncollapse all collapsed nodes
     */
    function uncollapseAll(root, tree) {
        postorderTraverse(root, uncollapseNode);
        if (tree !== undefined) {
            update(root, tree.data);
        }
    }

    /*
     uncollapse single node.
     */
    function uncollapseNode(d) {
        if (d._children) {
            d.children = d._children;
            d._children = null;
        }
    }

    /*
     Strip everything from the last time the tree was rendered
     prevents rendering bugs on second render
     */
    function stripPreprocessing(root) {
        postorderTraverse(root, function(d) {
            d.elementBCN = null;
            d.elementS = null;
            d.x = null;
            d.y = null;
            d.x0 = null;
            d.y0 = null;
            d.source = null;
            d.target = null;
            d.baseX = null;
            d.baseY = null;
            d.id = null;
        });
    }

    /*
     annotate each node in the tree with its depth
     */
    function getDepths(root, inc) {
        if (inc === undefined) {
            inc = 0;
        }
        root.depth = inc;
        var children = getChildren(root);
        inc += 1;
        for (var i = 0; i < children.length; i++) {
            getDepths(children[i], inc);
        }
    }

    /*
     clear tooltips from the visualisation
     */
    function removeTooltips(svg) {
        if (svg) {
            svg.selectAll(".tooltipElem").remove();
        }
    }


    // function that allows to swap two branches when clicking on note d
    function rotate(d, tree, comparedTree) {
        var load = false;
        if (comparedTree && d._children) {
            load = true;
            settings.loadingCallback();
        }
        setTimeout(function() {
            if (load) {
                settings.loadedCallback();
            }
            // here the actual rotation happens
            var first = d.children[0];
            var second = d.children[1];
            d.children[0] = second;
            d.children[1] = first;

            update(d, tree.data);
        }, 2);

    }

    function collapse(d, tree, comparedTree) {

        /* Called on collapse AND uncollapse / expand. */
        var load = false;
        if (comparedTree && d._children) {
            load = true;
            settings.loadingCallback();
        }
        setTimeout(function() {
            if (d.children) {
                d.collapsed = true;
                d._children = d.children;
                d.children = null;
            } else {
                d.collapsed = false;
                d.children = d._children;
                d._children = null;

                if (comparedTree) {
                    // fixed bug on collapsing then highlighting and uncollapsing
                    if (d.clickedParentHighlight) {
                        postorderTraverse(d, function(e) {
                            e.clickedParentHighlight = true;
                        });
                    }
                    postorderTraverse(d, function(e) {
                        BCN(e, comparedTree.root);
                    }, false);
                }
            }
            if (load) {
                settings.loadedCallback(); // stops the spinning wheels
            }
            update(d, tree.data);
        }, 2);

    }

    function collapseAll(d, tree, comparedTree, forceUncollapse) {
        var load = false;
        if (comparedTree && d._children) {
            load /*._children*/= true;  // _children causes the spinny wheel to never go 'load' and go away
            settings.loadingCallback();
        }

        if (forceUncollapse === undefined){
            forceUncollapse = false
        }
        setTimeout(function() {
            if (d._children || forceUncollapse) {// used when collapsed for uncollapsing
                postorderTraverse(d, function(e) {
                    if (e._children) {
                        e.collapsed = false;
                        e.children = e._children;
                        e._children = null;
                    }
                    if (comparedTree) {
                        if (d.clickedParentHighlight) {
                            postorderTraverse(d, function(e) {
                                e.clickedParentHighlight = true;
                            });
                        }
                        BCN(e, comparedTree.root);
                    }
                });
            } else if (d.children) { //used when uncollapsed for collapsing
                postorderTraverse(d, function(e) {
                    if (e.children) {
                        e.collapsed = true;
                        e._children = e.children;
                        e.children = null;
                    }
                });
            }
            if (load) {
                settings.loadedCallback();
            }

            update(d, tree.data);
        }, 2)

    }


    function highlight(d, tree, comparedTree) {
        var bcnColors = d3.scale.category20();

        if (comparedTree) {
            function colorLinkNodeOver(n, hl) {
                if (n.children) {
                    for (var i = 0; i < n.children.length; i++) {
                        colorLinkNodeOver(n.children[i], hl);
                    }
                }
                if (hl) {
                    n.clickedParentHighlight = true;
                } else {
                    n.clickedParentHighlight = false;
                }
            }

            function clearHighlight(itree) {
                var new_d = itree;
                var doClear = false;
                postorderTraverse(itree,function(e){
                    if (e.clickedHighlight){
                        new_d = e;
                        doClear = true;
                    }
                },false);
                if (doClear){
                    new_d.clickedHighlight = false;
                    var index = highlightedNodes.indexOf(new_d);

                    if (index > -1) {
                        highlightedNodes.splice(index, 1);
                    }
                    new_d[currentBCN].bcnhighlight = false;
                    var leaves = new_d.leaves;
                    var otherTreeData = comparedTree.data;
                    for (var i = 0; i < leaves.length; i++) {
                        if(leaves[i].correspondingLeaf !== undefined){
                            leaves[i].correspondingLeaf.correspondingHighlight = false;
                        }
                    }

                    colorLinkNodeOver(new_d, false);
                    update(new_d, tree.data);
                    update(otherTreeData.root, otherTreeData);
                }
            }

            var leaves;
            var otherTree;
            var otherTreeData;
            var i;
            if (!_.contains(highlightedNodes, d)) {
                clearHighlight(tree.root);
                if (highlightedNodes.length < maxHighlightedNodes) {
                    d.clickedHighlight = "red";
                    d[currentBCN].bcnhighlight = bcnColors(highlightedNodes.length);
                    highlightedNodes.push(d);
                    leaves = d.leaves;
                    otherTree = comparedTree.root;
                    otherTreeData = comparedTree.data;

                    for (i = 0; i < leaves.length; i++) {
                        if(leaves[i].correspondingLeaf !== undefined) {
                            leaves[i].correspondingLeaf.correspondingHighlight = true;
                        }

                    }
                    expandPathToNode(d[currentBCN]);
                    settings.loadingCallback();
                    setTimeout(function() {
                        getVisibleBCNs(otherTree, tree.root, false);
                        settings.loadedCallback();
                        colorLinkNodeOver(d, true);
                        update(d, tree.data);
                        update(otherTreeData.root, otherTreeData);
                        if (settings.moveOnClick && (d[currentBCN].y && d[currentBCN].x)) { // this part is
                            // responsible to move the
                            // opposite highlighted
                            // node to the center
                            var currentScale = otherTreeData.zoomBehaviour.scale();

                            var y = (-d[currentBCN].y + ($("#" + otherTreeData.canvasId).width() / 2) / currentScale);
                            var x = (-d[currentBCN].x + ($("#" + otherTreeData.canvasId).height() / 2) / currentScale);

                            otherTreeData.zoomBehaviour.translate([y, x]);
                            d3.select("#" + otherTreeData.canvasId + " svg g")
                                .transition(1500)
                                .attr("transform", "scale(" + currentScale + ")" + "translate(" + otherTreeData.zoomBehaviour.translate() + ")");
                        }
                    }, 2);

                }
            } else {
                d.clickedHighlight = false;
                var index = highlightedNodes.indexOf(d);

                if (index > -1) {
                    highlightedNodes.splice(index, 1);
                }
                d[currentBCN].bcnhighlight = false;
                leaves = d.leaves;
                otherTree = comparedTree.root;
                otherTreeData = comparedTree.data;

                for (i = 0; i < leaves.length; i++) {
                    leaves[i].correspondingLeaf.correspondingHighlight = false;
                }
                colorLinkNodeOver(d, false);
                update(d, tree.data);
                update(otherTreeData.root, otherTreeData);
            }
        }
    }

    // if (!d.children && !d._children && d.searchHighlight === true) {
    //     expandPathToLeaf(d, true);
    //     update(tree.root, tree.data);
    // }

    function getSibling(d){
        var sibling = undefined;
        //var indexSibling = d.parent.children.indexOf(sibling);
        if (d.parent.children.length >= 2){
            for (var i = 0; i < d.parent.children.length; i++ ){
                if (d.parent.children[i] !== d){
                    sibling = d.parent.children[i];
                }
            }
        }
        return sibling
    }

    function cutBranch(d, tree) {
        var sibling = getSibling(d);
        var droot = d.parent;
        if (droot === tree.root){
            d.parent.children[0] = sibling.children[0];
            d.parent.children[1] = sibling.children[1];
        } else {
            var droot_index = droot.parent.children.indexOf(droot);
            if (d.parent.parent.children[droot_index] != undefined){
                var newLenght = sibling.length + d.parent.parent.children[droot_index].length;
                sibling.length = newLenght;
            }
            d.parent.parent.children[droot_index] = sibling;

        }
        postorderTraverse(tree.data.root, function(e) {
            e.leaves = getChildLeaves(e);
        });

        return tree;
    }

    function editLabel(d, tree, comparedTree) {
        // Read in input
        var new_label = prompt('Enter new label');
        var current_label = d.name;

        if (new_label !== current_label) {
            var found = false;

            function check_label(e) {
                //checking for the same label in another part of the tree.
                if (e.name === new_label) {
                    found = true;
                } else if (!found && e.children) {
                    e.children.forEach(check_label);
                }
            };

            check_label(tree.root);
            if (comparedTree && !found) {
                check_label(comparedTree.root);
            }
            if (!found) {
                // Change on this d and any matched d.
                d.name = new_label;  // TODO: strip HTML tags....
                if (d.correspondingLeaf) {
                    d.correspondingLeaf.name = new_label;
                }
                // Update both trees
                update(d, tree.data);
                if (comparedTree) {
                    update(comparedTree.root, comparedTree.data);
                }
            } else {
                // Found label already
            }
        }
    }

    /*
     get relevant event listener for clicking on a link depending on what mode is selected
     */
    function getClickEventListenerLink(tree, isCompared, comparedTree) {
        var treeIndex = findTreeIndex(tree.name);
        function linkClick(e) {
            var d = e.target;
            var root = tree.root.children[0];
            var svg = tree.data.svg;

            //render the tooltip on click
            //user then chooses which function above to call
            var triWidth = 10;
            var triHeight = 15;
            var rectWidth = 150;
            var rectHeight = 90;

            var rpad = 10;
            var tpad = 18;
            var textDone = 0;
            var textInc = 18;


            // ensures that operations on branches and nodes are displayed on top of links and nodes
            d3.selection.prototype.moveToFront = function() {
                return this.each(function() {
                    this.parentNode.appendChild(this);
                });
            };

            d3.selectAll(".tooltipElem").remove(); // ensures that not multiple reactangles are open when clicking on another node
            var coordinates = d3.mouse(this.parentNode.parentNode);
            var parent = d3.select(this.parentNode.parentNode);
            var maxX = parseInt(parent.style("width"), 10);
            var x = coordinates[0];
            var y = coordinates[1];
            var triangleY = y - triHeight;
            var triangleX = x;
            triangleType = "triangle-down";
            // menu above node by the height of the rectangle and triangle
            menuTop = triangleY - rectHeight;

            if(y < rectHeight + triHeight) {
                triangleY = y + triHeight;
                y += rectHeight + triHeight * 2;
                // flip triangle, menubox below node
                triangleType = "triangle-up";
                menuTop = triangleY;

            }

            /* make sure the menu appears inside the svg container */
            if(x < rectWidth/2 + 5) {
                x = rectWidth/2 + 10;
            } else if(x + rectWidth > maxX - 5) {
                x = maxX - (rectWidth/2 + 10);
            }

            //draw the little triangle
            var tooltipContainer = d3.select(this.parentNode.parentNode).append("g")
                .attr("class", "tooltipElem")
                .attr("position","absolute")
                .attr("top", x)
                .attr("left",y)
                .attr("width", rectWidth)
                .attr("height", triHeight+rectHeight)
                .moveToFront();

            tooltipContainer.append('path')
            .attr("d", d3.svg.symbol().type(triangleType).size(400))
            .attr("transform", function(d) { return "translate(" + triangleX + "," + triangleY + ")"; })
            .style("fill", "black")

            tooltipContainer.append("rect")
                .style("fill", "black")
                .attr("x", function(){
                    return x-(rectWidth / 2);

                })
                .attr("y", function() {
                    return menuTop;
                })

                .attr("width", rectWidth)
                .attr("height", rectHeight)
                .attr("rx", 6)
                .attr("ry", 6);

            function add_menu_item(selector, text_f, act_f) {
                // get coordinates of mouse click event

                d3.select(selector).append("text")
                    .attr("class", "tooltipElem tooltipElemText")
                    .attr("y", (menuTop + tpad + textDone))
                    .attr("x", (x+(-rectWidth / 2) + rpad))
                    .attr("id", text_f)
                    .text(function(d) {
                        text = text_f(d);
                        if (text) {
                            textDone += textInc;
                            return(text);
                        }
                    })
                    .on("click", act_f);
            };

            add_menu_item(".tooltipElem",
                function(){
                    return 'reroot >'
                },
                function(){
                    // This is to reroot
                    d = e.target;
                    postorderTraverse(d, function(e) {
                        e.mouseoverHighlight = false;
                    });
                    if (tree.root.children.length < 3){
                        updateUndo(treeIndex, "reroot", root);
                    } else {
                        updateUndo(treeIndex, "reset", root);
                    }
                    var rerootedTree = reroot(tree, d);
                    settings.loadingCallback();
                    setTimeout(function() {
                        if (isCompared){
                            var index1 = findTreeIndex(tree.name);
                            var index2 = findTreeIndex(comparedTree.name);

                            preprocessTrees(trees[index1], trees[index2]);
                            update(tree.root, rerootedTree.data);
                            update(comparedTree.root, comparedTree.data);
                            settings.loadedCallback();
                        } else {
                            update(tree.root, rerootedTree.data);
                            settings.loadedCallback();
                        }
                    }, 2);
                    manualReroot = true;
                });

            add_menu_item(".tooltipElem",
                function () { // text function
                    return "trim branch >";
                },
                function () {
                    d = e.target;

                    // action function
                    postorderTraverse(d, function (e) {
                        e.mouseoverHighlight = false;
                    });
                    updateUndo(treeIndex, "restore_branch", d);
                    var cutTree = cutBranch(d, tree);
                    settings.loadingCallback();
                    setTimeout(function() {
                        if (isCompared){
                            var index1 = findTreeIndex(tree.name);
                            var index2 = findTreeIndex(comparedTree.name);

                            preprocessTrees(trees[index1], trees[index2]);
                            update(tree.root, cutTree.data);
                            update(comparedTree.root, comparedTree.data);
                            settings.loadedCallback();
                        } else {
                            update(tree.root, cutTree.data);
                            settings.loadedCallback();
                        }
                    }, 2);
                    manualReroot = true;

                });

            $(document).click(function(event) {
                if(!$(event.target).closest('#tooltipElem').length && $('#tooltipElem').is(":visible")) {
                    $('#tooltipElem').hide()
                }
            });
            d3.select(this.parentNode.parentNode).selectAll(".tooltipElemText").each(function(d) {
                d3.select(this).on("mouseover", function(d) {
                    d3.select(this).transition().duration(50).style("fill", "green").style("cursor", "pointer");
                });
                d3.select(this).on("mouseout", function(d) {
                    d3.select(this).transition().duration(50).style("fill", "white");
                });
            });
        }

        return linkClick
    }

    /*
     get relevant event listener for clicking on a node depending on what mode is selected
     */
    function getClickEventListenerNode(tree, isCompared, comparedTree) {
        var treeIndex = findTreeIndex(tree.name);
        function nodeClick(d) {
            var svg = tree.data.svg;


            var triWidth = 10;
            var triHeight = 15;
            var rectWidth = 160;
            var rectHeight = 120;

            var rpad = 10;
            var tpad = 18;
            var textDone = 0;
            var textInc = 18;

            // ensures that operations on branches and nodes are displayed on top of links and nodes
            d3.selection.prototype.moveToFront = function() {
                return this.each(function() {
                    this.parentNode.appendChild(this);
                });
            };

            d3.selectAll(".tooltipElem").remove(); // ensures that not multiple reactangles are open when clicking on another node
            var coordinates = d3.mouse(this.parentNode.parentNode);
            var parent = d3.select(this.parentNode.parentNode);
            var maxX = parseInt(parent.style("width"), 10);
            var x = coordinates[0];
            var y = coordinates[1];
            var triangleY = y - triHeight;
            var triangleX = x;
            triangleType = "triangle-down";
            // menu above node by the height of the rectangle and triangle
            menuTop = triangleY - rectHeight;

            if(y < rectHeight + triHeight) {
                triangleY = y + triHeight;
                y += rectHeight + triHeight * 2;
                // flip triangle, menubox below node
                triangleType = "triangle-up";
                menuTop = triangleY;

            }

            /* make sure the menu appears inside the svg container */
            if(x < rectWidth/2 + 5) {
                x = rectWidth/2 + 10;
            } else if(x + rectWidth/2 > maxX - 5) {
                x = maxX - (rectWidth/2 + 10);
            }

            //draw the little triangle
            var tooltipContainer = d3.select(this.parentNode.parentNode).append("g")
                .attr("class", "tooltipElem")
                .attr("top", x)
                .attr("left", y)
                .attr("width", rectWidth)
                .attr("height", triHeight+rectHeight)
                .moveToFront();

            tooltipContainer.append('path')
            .attr("d", d3.svg.symbol().type(triangleType).size(400))
            .attr("transform", function(d) { return "translate(" + triangleX + "," + triangleY + ")"; })
            .style("fill", "black")

            tooltipContainer.append("rect")
                .style("fill", "black")
                .attr("x", function(){
                    return x-(rectWidth / 2);

                })
                .attr("y", function() {
                    return menuTop;
                })

                .attr("width", rectWidth)
                .attr("height", rectHeight)
                .attr("rx", 6)
                .attr("ry", 6);


            function add_menu_item(selector, text_f, act_f) {
                d3.select(selector).append("text")
                    .attr("class", "tooltipElem tooltipElemText")
                    .attr("y", (menuTop + tpad + textDone))
                    .attr("x", (x+(-rectWidth / 2) + rpad))
                    .attr("id", text_f)
                    .text(function(d) {
                        var text = text_f(d);
                        if (text) {
                            textDone += textInc;
                            return(text);
                        }
                    })
                    .on("click", act_f);
            };

            if (d.children || d._children) {

                tooltipContainer.append("line")
                    .attr("x1", (x+(-rectWidth / 2)))
                    .attr("x2", (x+(-rectWidth / 2))+rectWidth)
                    .attr("y1", (menuTop + tpad + textDone)+6)
                    .attr("y2", (menuTop + tpad + textDone)+6)
                    .attr("stroke", "white")
                    .attr("stroke-width", "1");

                d3.select(".tooltipElem").append("text")
                    .attr("class", "tooltipElemInfoText")
                    .attr("y", (menuTop + tpad + textDone))
                    .attr("x", (x+(-rectWidth / 2) + rpad))
                    .attr("id", "infoText")
                    .text(function() {
                        if (d.elementS){
                            return '#leaf: '+d.leaves.length+' | bcn: '+ d.elementS.toFixed(2);
                        } else {
                            return '#leaf: '+d.leaves.length;
                        }
                    });
                // small extra space after infotext line
                textDone += textInc + 4;
            }

            if (!d.children && !d._children) {
                add_menu_item(".tooltipElem",
                    function () { // text function
                        return 'edit label >'
                    },
                    function () {
                        // undo function
                        updateUndo(treeIndex, "edit", d);

                        // action function
                        editLabel(d);
                        d.mouseoverHighlight = false;
                    });
            }
            if (d.parent && (d._children || d.children)) {
                add_menu_item(".tooltipElem",
                    function () { // text function
                        if (d._children !== undefined && !d.children) { // children invisible
                            return "expand >";
                        } else if (d.children) { //children visible
                            return "collapse >";
                        }
                    },
                    function () {
                        // undo functionality
                        updateUndo(treeIndex, "collapse_expand", d);

                        // action function
                        postorderTraverse(d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        if(isCompared){
                            collapse(d, tree, comparedTree);
                        } else {
                            collapse(d, tree);
                        }

                    });

                add_menu_item(".tooltipElem",
                    function () {
                        if (d._children) {
                            return "expand all >";
                        } else if (d.children) {
                            return "collapse all >";
                        }
                    },
                    function () {
                        // undo functionality
                        updateUndo(treeIndex, "collapse_expand_all", d);

                        postorderTraverse(d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        if(isCompared){
                            collapseAll(d, tree, comparedTree);
                        } else {
                            collapseAll(d, tree);
                        }

                    });
            };

            //TODO: this has to be changed that also the subtree can be all expanded
            if (d.children || d._children) {
                add_menu_item(".tooltipElem",
                    function() {
                        // If d has *any* descendant that is collapsed, show label.
                        var found = false;

                        function check_collapsed(e) {
                            if (e._children && e !== d) {
                                found = true;
                            } else if(!found && e.children) {
                                e.children.forEach(check_collapsed);
                            }
                        };
                        check_collapsed(d);
                        if (found) {
                            return "expand all >";
                        }
                    },
                    function () {
                        // undo functionality
                        function check_collapsed(e) {
                            if(e.children) {
                                e.children.forEach(check_collapsed);
                            } else if (e._children && e !== d) {
                                updateUndo(treeIndex, "expand_all", e);
                            }
                        };
                        check_collapsed(d);


                        postorderTraverse(d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        uncollapseAll(d, tree);
                    });
            }

            // swap subtree menu option
            if (d.children) {
                add_menu_item(".tooltipElem",
                    function() {
                        return "swap subtrees >";
                    },
                    function () {
                        updateUndo(treeIndex, "swap", d);
                        postorderTraverse (d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        if (isCompared){
                            rotate(d,tree,comparedTree);
                            update(tree.root, tree.data);
                        } else {
                            rotate(d,tree);
                            update(tree.root, tree.data);
                        }
                    });
            };


            if (d.parent && d.elementBCN) {
                add_menu_item(".tooltipElem",
                    function () {
                        if (d.clickedHighlight) {
                            return "unhighlight >";
                        } else {
                            return "highlight >";
                        }
                    },
                    function () {
                        updateUndo(treeIndex, {"highlight":d});
                        postorderTraverse (d, function(e) {
                            e.mouseoverHighlight = false;
                        });
                        if (isCompared){
                            highlight(d, tree, comparedTree);
                        } else {
                            highlight(d, tree);
                        }

                    });
            }

            d3.select(this.parentNode.parentNode).selectAll(".tooltipElemText").each(function(d) {
                d3.select(this).on("mouseover", function(d) {
                    d3.select(this).transition().duration(50).style("fill", "green").style("cursor", "pointer");
                });
                d3.select(this).on("mouseout", function(d) {
                    d3.select(this).transition().duration(50).style("fill", "white");
                });
            });

        }
        return nodeClick;
    }

    /*-----------------------------------
     * Update the undo global lists:
     *   undoTreeData
     *   undoTreeDataIndex
     * input:
     *   treeIndex: the current tree part of the global list of trees
     */
    function clone(obj){
        var clonedObjectsArray = [];
        var originalObjectsArray = []; //used to remove the unique ids when finished
        var next_objid = 0;

        function objectId(obj) {
            if (obj == null) return null;
            if (obj.__obj_id == undefined){
                obj.__obj_id = next_objid++;
                originalObjectsArray[obj.__obj_id] = obj;
            }
            return obj.__obj_id;
        }

        function cloneRecursive(obj) {
            if (null == obj || typeof obj == "string" || typeof obj == "number" || typeof obj == "boolean") return obj;

            // Handle Date
            if (obj instanceof Date) {
                var copy = new Date();
                copy.setTime(obj.getTime());
                return copy;
            }

            // Handle Array
            if (obj instanceof Array) {
                var copy = [];
                for (var i = 0; i < obj.length; ++i) {
                    copy[i] = cloneRecursive(obj[i]);
                }
                return copy;
            }

            // Handle Object
            if (obj instanceof Object) {
                if (clonedObjectsArray[objectId(obj)] != undefined)
                    return clonedObjectsArray[objectId(obj)];

                var copy;
                if (obj instanceof Function)//Handle Function
                    copy = function(){return obj.apply(this, arguments);};
                else
                    copy = {};

                clonedObjectsArray[objectId(obj)] = copy;

                for (var attr in obj)
                    if (attr != "__obj_id" && obj.hasOwnProperty(attr))
                        copy[attr] = cloneRecursive(obj[attr]);

                return copy;
            }


            throw new Error("Unable to copy obj! Its type isn't supported.");
        }
        var cloneObj = cloneRecursive(obj);



        //remove the unique ids
        for (var i = 0; i < originalObjectsArray.length; i++)
        {
            delete originalObjectsArray[i].__obj_id;
        };

        return cloneObj;
    }

    /*-----------------------------------
     * Update the undo global lists:
     *   undoTreeData
     *   undoTreeDataIndex
     * input:
     *   treeIndex: the current tree part of the global list of trees
     */
    function updateUndo(treeIndex, treeAction, treeActionData){

        undoIndex = undoIndex + 1;

        if ($("#vis-container2").length !== 0) { // important since redo action need opposite tree
            if(treeIndex === (trees.length-1)){
                undoTreeDataIndex.push([treeIndex, treeIndex-1]);
            }else{
                undoTreeDataIndex.push([treeIndex, treeIndex+1]);
            }
        } else {
            undoTreeDataIndex.push([treeIndex]);
        }

        undoActionFunc.push(treeAction);
        undoActionData.push(treeActionData);
        var tmpTree = clone(trees[treeIndex].data);
        undoFullTreeData.push(tmpTree);
        $(".undoButton, .globalUndoBtn").attr("data-count", undoIndex);

    }

    /*-----------------------------------
     * External function that allows to add an undo functionality on tree operations
     * input:
     * buttonId: id element of the button that will perform the undo functionality
     * canvasId: canvas where the button is in, to which canvas' tree the undo effects, "phylo" is special case and
     * undos the last change always
     */
    function undo(canvasId, buttonId){

        d3.select("#"+canvasId).select("#"+buttonId)

            .on("click", function(){

                function findCanvasId(d){
                    var treeIDSplit = d.ID.split("_");
                    var treeID = treeIDSplit[0]+"_"+treeIDSplit[1];
                    var id = $('#'+treeID).last().parent().prop('id');
                    return id;
                }

                if ($("#vis-container2").length !== 0 && canvasId != "phylo"){ // compare mode

                    // find tree in the right canvas
                    var slice_index = undefined;
                    for (var i = 0; i< undoActionData.length; i++){
                        if (findCanvasId(undoActionData[i]) === canvasId){
                            slice_index = i;
                        }
                    }
                    var tmpIndex = undoIndex;

                    // update canvas with previous tree in the right canvas
                    if(tmpIndex > 0 && slice_index !== undefined){
                        undoIndex = undoIndex - 1;
                        var undoAction = undoActionFunc.splice(slice_index,1)[0];
                        var undoData = undoActionData.splice(slice_index,1)[0];
                        var undoTreeIdx = undoTreeDataIndex.splice(slice_index,1)[0];
                        var undoFullTreeD = undoFullTreeData.splice(slice_index,1)[0];

                    }
                } else { // view mode
                    var tmpIndex = undoIndex;
                    if(tmpIndex > 0){
                        undoIndex = undoIndex - 1;

                        var undoAction = undoActionFunc.pop();
                        var undoData = undoActionData.pop();
                        var undoTreeIdx = undoTreeDataIndex.pop();
                        var undoFullTreeD = undoFullTreeData.pop();

                    }
                }


                if(undoAction === 'collapse_expand'){
                    if (undoTreeIdx.length === 2){
                        collapse(undoData, trees[undoTreeIdx[0]],trees[undoTreeIdx[1]]);
                    } else {
                        collapse(undoData, trees[undoTreeIdx]);
                    }

                }

                if(undoAction === 'collapse_expand_all'){
                    if (undoTreeIdx.length === 2){
                        collapseAll(undoData, trees[undoTreeIdx[0]],trees[undoTreeIdx[1]]);
                    } else {
                        collapseAll(undoData, trees[undoTreeIdx]);
                    }
                }

                if(undoAction === 'expand_all'){
                    if (undoTreeIdx.length === 2){
                        collapseAll(undoData, trees[undoTreeIdx[0]],trees[undoTreeIdx[1]]);
                    } else {
                        collapseAll(undoData, trees[undoTreeIdx]);
                    }
                }

                if(undoAction === 'reroot'){
                    if (undoTreeIdx.length === 2){
                        var tree = trees[undoTreeIdx[0]];
                        var comparedTree = trees[undoTreeIdx[1]];
                        var rerootedTree = reroot(tree, undoData);
                    }else {
                        var tree = trees[undoTreeIdx];
                        var rerootedTree = reroot(trees[undoTreeIdx], undoData);
                    }
                    settings.loadingCallback();
                    setTimeout(function() {
                        if (comparedTree){
                            var index1 = findTreeIndex(tree.name);
                            var index2 = findTreeIndex(comparedTree.name);

                            preprocessTrees(trees[index1], trees[index2]);
                            update(tree.root, rerootedTree.data);
                            update(comparedTree.root, comparedTree.data);
                            settings.loadedCallback();
                        } else {
                            update(trees[undoTreeIdx].root, rerootedTree.data);
                            settings.loadedCallback();
                        }
                    }, 2);
                }

                if(undoAction === 'swap'){
                    if (undoTreeIdx.length === 2){
                        rotate(undoData, trees[undoTreeIdx[0]],trees[undoTreeIdx[1]]);
                        update(trees[undoTreeIdx].root, trees[undoTreeIdx].data);
                    } else {
                        rotate(undoData, trees[undoTreeIdx]);
                        update(trees[undoTreeIdx].root, trees[undoTreeIdx].data);
                    }

                }

                if(undoAction === 'edit'){
                    if (undoTreeIdx.length === 2){
                        editLabel(undoData, trees[undoTreeIdx[0]],trees[undoTreeIdx[1]]);
                    } else {
                        editLabel(undoData, trees[undoTreeIdx]);
                    }
                }

                if(undoAction === 'highlight'){
                    if (undoTreeIdx.length === 2){
                        highlight(undoData, trees[undoTreeIdx[0]],trees[undoTreeIdx[1]]);
                    } else {
                        highlight(undoData, trees[undoTreeIdx]);
                    }
                }

                if(undoAction === 'reset'){
                    alert("unrooted starting tree cannot be rerooted to origin, please re-render")
                }

                if(undoAction === 'restore_branch'){
                    if(undoTreeIdx.length === 2){
                        var index1 = undoTreeIdx[0];
                        var index2 = undoTreeIdx[1];

                        var comparedTree = trees[index2];
                        var tmp = clone(undoFullTreeD.root);
                        trees[index1].data.root = tmp;
                        trees[index1].root = tmp;
                    } else {
                        var tmp = clone(undoFullTreeD.root);
                        trees[undoTreeIdx].data.root = tmp;
                        trees[undoTreeIdx].root = tmp;
                    }
                    settings.loadingCallback();
                    setTimeout(function() {
                        if (comparedTree){
                            preprocessTrees(trees[index1].data, comparedTree);
                            update(trees[index1].root, trees[index1].data);
                            update(comparedTree.root, comparedTree.data);
                            settings.loadedCallback();
                        } else {
                            update(trees[undoTreeIdx], trees[undoTreeIdx].data);
                            settings.loadedCallback();
                        }
                    }, 2);
                    settings.loadedCallback();
                }

                if (tmpIndex === 1){
                    undoActionFunc = [];
                    undoActionData = [];
                    undoTreeDataIndex = [];
                    undoFullTreeData = [];
                }

                $(".undoButton, .globalUndoBtn").attr("data-count", undoIndex);

            })



    }

    /*------
     /
     /    SVG export button
     /
     ------*/
    function exportBothTrees(canvasIDLeft, canvasIDRight){
        var svg = d3.select("#" + canvasIDLeft + " > svg");
        addLogo(svg);

        // Copy left tree
        var svg1 = document.getElementById(canvasIDLeft).getElementsByTagName('svg')[0].cloneNode(true);
        var svg2 = document.getElementById(canvasIDRight).getElementsByTagName('svg')[0].cloneNode(true);
        var colorscale = document.getElementById('colorScale').getElementsByTagName('svg')[0].cloneNode(true);

        // Double the width on svg1
        var l_w = parseInt(svg1.getAttribute('width')),
            r_w = parseInt(svg2.getAttribute('width'));
        svg1.setAttribute('width', (l_w + r_w));
        // Add right tree into left tree's svg
        var g = document.createElement('g');
        var lastElementIndex = svg2.childNodes.length - 3;
        var scaleTextIndex = svg2.childNodes.length - 2;

        if (lastElementIndex > -1) {
            g.setAttribute('transform', 'translate(' + l_w + ', 0)');
            main = svg2.childNodes[lastElementIndex];
            scale = svg2.childNodes[scaleTextIndex];
            scaleText = svg2.lastElementChild;

            g.appendChild(main);
            g.appendChild(scale);
            g.appendChild(scaleText);
            g.appendChild(colorscale);

            svg1.appendChild(g);
        }

        svgExport.setAttribute('hreflang', 'image/svg+xml');
        svgExport.setAttribute('href', 'data:image/svg+xml;base64,\n' + btoa(svg1.outerHTML));
        svgExport.setAttribute("download", "Phylo.io-cmp.svg");

        svg.select("#exportLogo").remove();
    }

    function isDefined(o) {
        var undefined;
        return o !== undefined;
    }

    //return all the externalised functions
    return {
        init: init,
        undo: undo,
        inputTreeFile: inputTreeFile,
        viewTree: viewTree,
        renderColorScale: renderColorScale,
        addTree: addTree,
        addTreeGistURL: addTreeGistURL,
        exportTreeToGist: exportTreeToGist,
        exportBothTrees: exportBothTrees,
        removeTree: removeTree,
        getTrees: getTrees,
        compareTrees: compareTrees,
        changeTreeSettings: changeTreeSettings,
        changeCanvasSettings: changeCanvasSettings,
        getMaxAutoCollapse: getMaxAutoCollapse,
        changeAutoCollapseDepth: changeAutoCollapseDepth,
        calcDist: calcDist,
        addMainLegend: addMainLegend

    }
};
