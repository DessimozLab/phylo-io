TreeCompare = (function() {

    var trees = [];
    var backupRoot = [];
    var renderedTrees = [];
    var gistID="";

    //global variable set if manual reroot used!!!
    var manualReroot = false;

    var scaleLineWidth = 0;
    var scaleLinePadding = 10;

    var compareMode = false;

    var maxDepth = 0;

    /*
     colors for the color scale for comparing nodes to best common node
     */
    //orange:
    //var colorScaleRange = ['rgb(254,240,217)', 'rgb(253,212,158)', 'rgb(253,187,132)', 'rgb(252,141,89)', 'rgb(227,74,51)', 'rgb(179,0,0)'];

    //blue - green - yellow - red
    //var colorScaleRange = ['rgb(255,51,51)', 'rgb(255,255,51)', 'rgb(153,255,51)', 'rgb(51,255,51)', 'rgb(51,255,255)', 'rgb(51,51,255)'];

    //red - blue
    //var colorScaleRange = ['rgb(0,33,229)', 'rgb(70,8,225)', 'rgb(162,16,221)', 'rgb(218,24,190)', 'rgb(214,31,110)', 'rgb(210,39,39)'];

    //grey - black
    var colorScaleRange = ['rgb(37,52,148)', 'rgb(44,127,184)', 'rgb(65,182,196)', 'rgb(127,205,187)', 'rgb(199,233,180)', 'rgb(255,255,204)'];

    var colorScaleDomain = [1, 0.8, 0.6, 0.4, 0.2, 0];

    var padding = 20;
    var paddingVertical = 50;
    var paddingHorizontal = 100;

    var scaleTextColor = "white";

    var triangleHeightDivisor = 4;

    var defaultLineColor = "grey";

    var currentS = "elementS";
    var currentBCN = "elementBCN";

    var highlightedNodes = [];
    var maxHighlightedNodes = 20;

    var settings = {
        useLengths: true,
        selectMultipleSearch: false,
        fontSize: 14,
        lineThickness: 3,
        nodeSize: 3,
        treeWidth: 500,
        treeHeight: 15,
        moveOnClick: true,
        enableZoomSliders: true,
        scaleMin: 0.05,
        scaleMax: 5,
        scaleColor: "black",
        loadingCallback: function() {},
        loadedCallback: function() {},
        internalLabels: "none", //none, name, length, similarity
        enableDownloadButtons: true,
        enableRerootFixedButtons: false,
        enableFisheyeZoom: false,
        zoomMode: "traditional", //semantic, traditional
        fitTree: "scale", //none, scale
        enableSizeControls: true,
        enableSearch: true,
        autoCollapse: null
    };

    /*
     called externally to get the TreeCompare object
     */
    function init(settingsIn) {
        var settingsIn = settingsIn ? settingsIn : {};
        changeSettings(settingsIn);
        return this;
    }

    /*  
     called on window resize to ensure the svg canvas fits the parent container
     */
    function resize() {
        for (var i = 0; i < renderedTrees.length; i++) {
            var data = renderedTrees[i].data;
            $("#" + data.canvasId + " svg").width($("#" + data.canvasId).width());
            $("#" + data.canvasId + " svg").height($("#" + data.canvasId).height());
        }

    }

    window.onresize = resize;

    /*
     create ID with random number generator
     */
    function makeId(prefix) {
        prefix || (prefix = '');
        var output = prefix + Math.floor(1000 + Math.random() * 9000);
        return output;
    }

    /* 
     external function for changing settings, any rendered trees are updated
     */
    function changeSettings(settingsIn) {
        settings.useLengths = (!(settingsIn.useLengths === undefined)) ? settingsIn.useLengths : settings.useLengths;
        settings.selectMultipleSearch = (!(settingsIn.selectMultipleSearch === undefined)) ? settingsIn.selectMultipleSearch : settings.selectMultipleSearch;
        settings.fontSize = (!(settingsIn.fontSize === undefined)) ? settingsIn.fontSize : settings.fontSize;
        settings.lineThickness = (!(settingsIn.lineThickness === undefined)) ? settingsIn.lineThickness : settings.lineThickness;
        settings.nodeSize = (!(settingsIn.nodeSize === undefined)) ? settingsIn.nodeSize : settings.nodeSize;
        settings.treeWidth = (!(settingsIn.treeWidth === undefined)) ? settingsIn.treeWidth : settings.treeWidth;
        settings.treeHeight = (!(settingsIn.treeHeight === undefined)) ? settingsIn.treeHeight : settings.treeHeight;
        settings.moveOnClick = (!(settingsIn.moveOnClick === undefined)) ? settingsIn.moveOnClick : settings.moveOnClick;
        settings.enableZoomSliders = (!(settingsIn.enableZoomSliders === undefined)) ? settingsIn.enableZoomSliders : settings.enableZoomSliders;
        settings.scaleMin = (!(settingsIn.scaleMin === undefined)) ? settingsIn.scaleMin : settings.scaleMin;
        settings.scaleMax = (!(settingsIn.scaleMax === undefined)) ? settingsIn.scaleMax : settings.scaleMax;
        settings.scaleColor = (!(settingsIn.scaleColor === undefined)) ? settingsIn.scaleColor : settings.scaleColor;
        settings.loadingCallback = (!(settingsIn.loadingCallback === undefined)) ? settingsIn.loadingCallback : settings.loadingCallback;
        settings.loadedCallback = (!(settingsIn.loadedCallback === undefined)) ? settingsIn.loadedCallback : settings.loadedCallback;
        settings.internalLabels = (!(settingsIn.internalLabels === undefined)) ? settingsIn.internalLabels : settings.internalLabels;
        settings.enableDownloadButtons = (!(settingsIn.enableDownloadButtons === undefined)) ? settingsIn.enableDownloadButtons : settings.enableDownloadButtons;
        settings.enableFixedButtons = (!(settingsIn.enableFixedButtons === undefined)) ? settingsIn.enableFixedButtons : settings.enableFixedButtons;
        settings.zoomMode = (!(settingsIn.zoomMode === undefined)) ? settingsIn.zoomMode : settings.zoomMode;
        settings.fitTree = (!(settingsIn.fitTree === undefined)) ? settingsIn.fitTree : settings.fitTree;
        settings.enableSizeControls = (!(settingsIn.enableSizeControls === undefined)) ? settingsIn.enableSizeControls : settings.enableSizeControls;
        settings.enableSearch = (!(settingsIn.enableSearch === undefined)) ? settingsIn.enableSearch : settings.enableSearch;
        settings.autoCollapse = (!(settingsIn.autoCollapse === undefined)) ? settingsIn.autoCollapse : settings.autoCollapse;
        if (!(settingsIn.treeWidth === undefined)) {
            for (var i = 0; i < trees.length; i++) {
                jQuery.extend(trees[i].data, {
                    treeWidth: settingsIn.treeWidth
                });
            }
        }
        if (!(settingsIn.treeHeight === undefined)) {
            for (var i = 0; i < trees.length; i++) {
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

    /*
    parse json when shared tree is loaded, ensures that adjusted visualization parameters are preserved
     */
    function jsonToNwk(json,addLabels) {
        //TODO: here add searchHighlihgt and make sure that branchlengths are preserved
        function nested(nest){
            var subtree = "";

            if(nest.hasOwnProperty('children')){
                var children = [];
                nest.children.forEach(function (child) {
                    var subsubtree = nested(child);
                    children.push(subsubtree);
                });
                var substring = children.join();
                if(nest.hasOwnProperty('name')){
                    subtree = "("+substring+")" + nest.name;
                    if(addLabels){
                        if(nest.clickedHighlight){
                            subtree += "@@clickedHighlight"
                        }
                        if(nest.bcnhighlight){
                            subtree += "@@bcnhighlight";
                        }
                        if(nest.collapsed){
                            subtree += "@@collapsed";
                        }
                        if(nest.clickedParentHighlight){
                            subtree += "@@clickedParentHighlight";
                        }
                        if(nest.correspondingHighlight){
                            subtree += "@@correspondingHighlight";
                        }
                    }
                }
                if(nest.hasOwnProperty('length')){
                    subtree = subtree + ":"+nest.length;
                }
            }else {
                var leaf = "";
                if(nest.hasOwnProperty('name')){
                    leaf = nest.name;
                    if(addLabels){
                        if(nest.clickedParentHighlight){
                            leaf += "@@clickedParentHighlight";
                        }
                        if(nest.correspondingHighlight){
                            leaf += "@@correspondingHighlight";
                        }
                    }
                }
                if(nest.hasOwnProperty('length')){
                    leaf = leaf + ":"+nest.length;
                }
                subtree = subtree + leaf;
            }
            return subtree;
        }
        return nested(json) +";";
    }

    /*
     This function checks the consistency of the input string for the tree
     */
    function checkTreeInput(s){
        var tokens = s.split(/\s*(;|\(|\[|\]|\)|,|:)\s*/);
        var outError = "";

        function returnNumElementInArray(inArray,element){
            var numOfTrue = 0;
            for(var i=0;i<inArray.length;i++){
                if(inArray[i] === element)
                    numOfTrue++;
            }
            return numOfTrue;
        }
        if (returnNumElementInArray(tokens,"(") > returnNumElementInArray(tokens,")")){
            outError = "TooLittle)";
        } else if (returnNumElementInArray(tokens,"(") < returnNumElementInArray(tokens,")")){
            outError = "TooLittle(";
        } else if (tokens.indexOf(":") == -1 || tokens.indexOf("(") == -1 || tokens.indexOf(")") == -1){
            outError = "NotNwk"
        } else if (isNaN(tokens[tokens.indexOf(":")+1])){
            outError = "NotNwk"
        }

        return outError;
    }

    /*
     Newick to JSON converter, just copied code from newick.js
     */
    function convertTree(s) { //s is newick file format
        var ancestors = [];
        var tree = {};

        s = s.replace(/(\r\n|\n|\r)/gm,""); // remove all new line characters

        var tokens = s.split(/\s*(;|\(|\[|\]|\)|,|:)\s*/); //already splits the NHX format as well

        function getIdxToken(tokenArray, queryToken){
            var posTokens = [];
            for (var i = 0; i < tokenArray.length; i++){
                if (tokenArray[i] == queryToken){
                    posTokens.push(i)
                }

            }
            return posTokens;
        }

        // the following part keeps the NHX datastructure
        var square_bracket_start = getIdxToken(tokens,"[");
        var square_bracket_end = getIdxToken(tokens,"]");
        var new_tokens = [];
        var j = 0;
        for (var i = 0; i < tokens.length; i++){
            if (tokens[i] == "["){
                var dist_square_bracket = square_bracket_end[j] - square_bracket_start[j];
                new_tokens.push(tokens[i]);
                new_tokens.push(tokens.slice(i+1,i+dist_square_bracket).join(""));
                new_tokens.push(tokens[i+dist_square_bracket]);
                i = i + dist_square_bracket;
                j = j + 1;
            }else{
                new_tokens.push(tokens[i]);
            }
        }

        try { //catch error when newick is not in place
            if (tokens=="") throw "empty";// calls convert function from above
        } catch (err) {
            throw "NoTree";
        }

        try {
            if (checkTreeInput(s)=="TooLittle)") throw "empty"; // TODO:change this to &&NHX and not []
        } catch (err) {
                throw "TooLittle)"
        }

        try {
            if (checkTreeInput(s)=="TooLittle(") throw "empty"; // TODO:change this to &&NHX and not []
        } catch (err) {
            throw "TooLittle("
        }


        function check_nhx_variable(nhx_array, string_to_check){
            var found_pos = -1;
            for (var i = 0; i < nhx_array.length; i++){
                if (nhx_array[i].indexOf(string_to_check)!=-1){
                    found_pos = i;
                }
            }

            return found_pos;
        }

        for (var i = 0; i < new_tokens.length; i++) {
            var token = new_tokens[i];
            switch (token) {
                case '(': // new children
                    var subtree = {};
                    tree.children = [subtree];
                    ancestors.push(tree);
                    tree = subtree;
                    break;
                case ',': // another branch
                    var subtree = {};
                    ancestors[ancestors.length - 1].children.push(subtree);
                    tree = subtree;
                    break;
                case '['://TODO: input NHX format
                    var x = new_tokens[i + 1];
                    if (x.indexOf("&&NHX")!=-1){ //if NHX format
                        var nhx_tokens = x.split(/:/);
                        var tmp_idx = check_nhx_variable(nhx_tokens, "B=");
                        if (tmp_idx!=-1){
                            var branchSupport = nhx_tokens[tmp_idx].split("=");
                            tree.branchSupport = branchSupport[1];
                        }

                    }else{
                        if (!(x===";" || x==="")){
                            tree.branchSupport = x;
                        }
                    }
                    break;
                case ']':
                    //var x = new_tokens[i - 1];
                    //tree.branchSupport = x;
                    break;
                case ')': // optional
                    tree = ancestors.pop();
                    var x = new_tokens[i + 1];
                    if (!(x===";" || x==="")){
                        tree.branchSupport = x;
                    }
                    break;
                case ':': // optional length next
                    break;
                default:
                    var x = new_tokens[i - 1];
                    if (x == ')' || x == '(' || x == ',') {
                        var tree_meta = token.split("@@"); // separation of metadata for export
                        tree.name = tree_meta[0];
                        tree.length = 0.1; // this is used in the case the tree does not have any branch values
                        if(tree_meta.indexOf("collapsed")!==-1){
                            tree.collapsed = true;
                        }else{
                            tree.collapsed = false;
                        }
                        if(tree_meta.indexOf("clickedParentHighlight")!==-1){
                            tree.clickedParentHighlight = true;
                        }
                        if(tree_meta.indexOf("correspondingHighlight")!==-1) {
                            tree.correspondingHighlight = true;
                        }
                        if(tree_meta.indexOf("bcnhighlight")!==-1) {
                            tree.bcnhighlight = true;
                        }
                        if(tree_meta.indexOf("clickedHighlight")!==-1){
                            tree.clickedHighlight = true;
                        }
                    } else if (x == ':') {
                        tree.length = parseFloat(token);
                    }
            }
        }
        return tree;
    }

    /*
     Called externally and allows to drag and drop text files for tree input
     */
    function inputTreeFile(newickIn){
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
                text   : ["txt", "nh", "nhx", "nwk", "tre", "tree"]
            };

            var file_name_tokens = file[0].name.split(".");
            var file_name_ending = file_name_tokens[file_name_tokens.length-1];

            if (accept.text.indexOf(file_name_ending) > -1){
                var reader;
                reader = new FileReader();
                reader.onload = function(event) {
                    if(!(checkTreeInput(event.target.result)=="NotNwk")){
                        $("#" + newickIn).val(event.target.result);
                        $("#renderErrorMessage").empty();
                    } else {
                        $("#renderErrorMessage").empty();
                        $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">This is not a tree file!</div>')).hide().slideDown(300);
                        $("#" + newickIn).attr("placeholder","Paste your tree or drag and drop your tree file here").val("");
                    }

                };
                reader.onloadend = onFileLoaded;
                reader.readAsText(file[0]);
                if(file[0].name == "")
                {
                    $("#" + newickIn+ "Label").attr("placeholder","Untitled").val("");
                }
                else
                {
                    $("#" + newickIn + "Label").val(file[0].name);
                }
            } else {
                $("#renderErrorMessage").empty();
                $("#" + newickIn + "Label").text("No file");
                $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">Only the following file endings are accepted: txt, nh, nhx, nwk, tre, tree</div>')).hide().slideDown(300);
                //$("#" + newickIn).val("");
                $("#" + newickIn+ "Label").attr("placeholder","Untitled").val("");
                $("#" + newickIn).attr("placeholder","Paste your tree or drag and drop your tree file here").val("");
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
        var newickInButton = document.getElementById(newickIn+"Button");
        var control = document.getElementById(newickIn+"File");
        newickInButton.addEventListener('click',function(event){
            event.preventDefault();
            control.click();
            //$(this).find('span').toggleClass('glyphicon-file').toggleClass('glyphicon-remove');
        },false);


        control.addEventListener("change", function(event) {

            // When the control has changed, there are new files

            var file = control.files;


            var accept = {
                text   : ["txt", "nh", "nhx", "nwk", "tre", "tree"]
            };

            var file_name_tokens = file[0].name.split(".");
            var file_name_ending = file_name_tokens[file_name_tokens.length-1];

            if (accept.text.indexOf(file_name_ending) > -1){
                var reader = new FileReader();
                reader.onload = function(event) {
                    if(!(checkTreeInput(event.target.result)=="NotNwk")){
                        $("#" + newickIn).val(event.target.result);
                        $("#renderErrorMessage").empty();
                    } else {
                        $("#renderErrorMessage").empty();
                        $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">This is not a tree file!</div>')).hide().slideDown(300);
                        $("#" + newickIn+ "Label").attr("placeholder","Untitled").val("");
                        $("#" + newickIn).attr("placeholder","Paste your tree or drag and drop your tree file here").val("");
                    }

                };
                reader.onloadend = onFileLoaded;
                reader.readAsText(file[0]);
                if(file[0].name == "")
                {
                    $("#" + newickIn+ "Label").attr("placeholder","Untitled").val("");
                }
                else
                {
                    $("#" + newickIn + "Label").val(file[0].name);
                }

            } else {
                $("#renderErrorMessage").empty();
                $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">Only the following file endings are accepted: txt, nh, nhx, nwk, tre, tree</div>')).hide().slideDown(300);
                //$("#" + newickIn).val("");
                $("#" + newickIn+ "Label").attr("placeholder","Untitled").val("");
                $("#" + newickIn).attr("placeholder","Paste your tree or drag and drop your tree file here").val("");
            }


        }, false);

    }

    /*
     Called externally to convert a tree and add to internal tree structure
     */
    function addTree(newick, name) {

        if (name === undefined) {
            var num = trees.length;
            name = "Tree " + num;
        }
        var tree = convertTree(newick);

        /*try {
         var tree = convertTree(newick); // calls convert function from above
         //console.log(tree)
         } catch (err) {
         throw "Invalid Newick";
         }*/
        for (var i = 0; i < trees.length; i++) {
            if (name === trees[i].name) {
                throw "Tree With Name Already Exists";
            }
        }
        //add required parameters to each node
        postorderTraverse(tree, function(d) {
            d.ID = makeId("node_");
            d.leaves = getChildLeaves(d);
            d.clickedParentHighlight = false;
            d.mouseoverHighlight = false; //when mouse is over node
            d.mouseoverLinkHighlight = false; //when mouse is over branch between two nodes
            d.correspondingHighlight = false;
            d.collapsed = false; //variable to obtain the node/nodes where collapsing starts
        });

        var root_ID = makeId("node_");
        for (var i = 0; i < tree.children.length; i++){
            tree.children[i].ID = root_ID;
        }

        var fullTree = {
            root: tree,
            name: name,
            data: {}
        };
        fullTree.data.autoCollapseDepth = getRecommendedAutoCollapse(tree);

        trees.push(fullTree);

        return fullTree;
    }

    /*
    depending on number of leaves function returns optimal collapsing depth
     */
    function getRecommendedAutoCollapse(root) {
        var leafCount = root.leaves.length;
        if (leafCount < 50) {
            return null;
        } else {
            return (Math.floor(Math.log(leafCount)) + 1);
        }

    }

    /*
    depending on number of splits function returns maximum number of collapsing depth
     */
    function getMaxAutoCollapse() {
        var maxDepth = [];

        for (var i = 0; i < renderedTrees.length; i++) {
            var maxDepthTmp = 0;
            postorderTraverse(renderedTrees[i].root, function(e){
                if (e.depth > maxDepthTmp){
                    maxDepthTmp = e.depth;
                }
            },true);
            maxDepth.push(maxDepthTmp);
        }
        return Math.max.apply(Math, maxDepth)-1;
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
                if (renderedTrees[i].data.scaleId) {
                    $(renderedTrees[i].data.scaleId).empty();
                }
            }
        }
    }

    /*
     Can be called externally to render the color scale for tree comparison in a div
     */
    function renderColorScale(scaleId) {
        var colorScale = d3.scale.linear()
            .domain(colorScaleDomain)
            .range(colorScaleRange);
        var width = 200;
        var steps = 100;
        var height = 30;
        var svgHeight = height + 25;
        var svg = d3.select("#" + scaleId).append("svg")
            .attr("width", width + "px")
            .attr("height", svgHeight + "px")
            .append("g");
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
            .attr("y", height + 20)
            .attr("fill", settings.scaleColor);
        svg.append("text")
            .text("1")
            .attr("x", width - 10)
            .attr("y", height + 20)
            .attr("fill", settings.scaleColor)

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
        if (root.children || root._children) {
            var children = getChildren(root);
            var length = 0;
            var offset = 0;
            for (var i = 0; i < children.length; i++) {
                length = getLength(children[i]);
                offset = children[i].baseY;
                var test_length = length.toFixed(3);
                if (test_length != 0 && offset != 0) { //take the first one unequal zero
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
    returns longest length from root, modified by katoh
        Seemingly the original version considers terminal branches only,
        and returns zero when the tree is ((A:0,B:0):1,(C:0,D:0):1);
    */
    function getMaxLength(root) {
        var max = 0;
        function getMax_internal(d,distfromroot) {
            distfromroot+=d.length;
            if (d.children || d._children) {
                var children = getChildren(d);
                for (var i = 0, ilim=children.length; i < ilim; i++) {
                    getMax_internal(children[i],distfromroot);
                }
            } else {
                if (distfromroot>max) max = distfromroot;
            }
        }
        getMax_internal(root,0);
        return max;
    }

    /*
    returns longest length from root for visible nodes only (d)
     */
    function getMaxLengthVisible(root) {
        var max = 0;
        function getMax_internal(d,distfromroot) {
            distfromroot+=d.length;
            if (d.children) {
                var children = getChildren(d);
                for (var i = 0, ilim=children.length; i < ilim; i++) {
                    getMax_internal(children[i],distfromroot);
                }
            } else {
                if (distfromroot>max) max = distfromroot;
            }
        }
        getMax_internal(root,0);
        return max;
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

    /*
     traverses and performs function f on treenodes in postorder
     if do_children === false, doesn't traverse _children, only children
     _children means the children are not visible in the visualisation, i.e they are collapsed
     */
    function postorderTraverse(d, f, do_children) {
        if (do_children === undefined) { //check whether variable is defined, e.g. string, integer ...
            do_children = true;
        }
        var children = [];
        if (do_children) {
            var children = getChildren(d);
        } else {
            if (d.children) {
                children = d.children;
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


    /*---------------
     /
     /  Function to find best corresponding root in opposite tree and automatically perform rerooting on that root
     /      works only in "compare mode" and needs the canvasId to know which tree will
     /      be manipulated
     /
     ---------------*/
    function findBestCorrespondingTree(canvasId){
        var isCompared = true;
        if (canvasId=="vis-container1"){ //ensures that the right tree is fixed
            var tree = trees[trees.length-2];
            var fixedTree = trees[trees.length-1];

        }else{
            var tree = trees[trees.length-1];
            var fixedTree = trees[trees.length-2];

        }

        //------
        // Make a new_node as root point
        // input: node d with its children
        //------
        function new_node(d) { // private method
            return {parent:null, children:[], name:"", ID: "", length:0, mouseoverHighlight:false, mouseoverLinkHighlight:false, elementS: d.elementS};
        }

        //------
        // REROOT function to change root point based on determined node
        // input: itree - to rerooted tree
        //        node - the target node of the branch where rerooting should happen
        //        iFinalView - condition
        //------
        //TODO: this function is implemented twice and could probably be done in a more efficient way
        function reroot(itree, node, iFinalView)
        {
            var rerooting = true;
            for (var i = 0; i < itree.root.children.length; i++){
                if (node.ID == itree.root.children[i].ID){
                    rerooting = false;
                }
            }
            if(rerooting){
                var load = false;

                if (isCompared) {
                    load = true;
                }
                var root = itree.root;

                if(manualReroot==false) {//ensure that always the lengths of branches are conserved!
                    backupRoot = root;
                    manualReroot = true;
                } else {
                    root = backupRoot;
                }



                var i, d, tmp;
                var btmp, bd;
                var p, q, r, s, new_root;
                if (node == root) return root;
                var dist = node.length/2;
                tmp = node.length;
                btmp = node.branchSupport;
                //console.log(node);
                /* p: the central multi-parent node
                 * q: the new parent, previous a child of p
                 * r: old parent
                 * i: previous position of q in p
                 * d: previous distance p->d
                 */
                q = new_root = new_node(node.parent); //node.parent ensures the correct coulering of the branches when rerooting
                //console.log(q);
                q.ID = node.ID;
                q.children[0] = node; //new root
                q.children[0].length = dist;
                q.children[0].branchSupport = btmp;
                p = node.parent;
                q.children[0].parent = q;
                for (i = 0; i < p.children.length; ++i)
                    if (p.children[i] == node) break;
                q.children[1] = p;
                d = p.length;
                bd = p.branchSupport;
                p.length = tmp - dist;
                p.branchSupport = btmp;
                r = p.parent;
                p.parent = q;


                while (r != null) {
                    s = r.parent; /* store r's parent */
                    p.children[i] = r; /* change r to p's children */
                    for (i = 0; i < r.children.length; ++i) /* update i */
                        if (r.children[i] == p) break;
                    r.parent = p; /* update r's parent */
                    tmp = r.length; r.length = d; d = tmp; /* swap r->d and d, i.e. update r->d */
                    btmp = r.branchSupport; r.branchSupport = bd; bd = btmp;
                    q = p; p = r; r = s; /* update p, q and r */
                    if(isCompared) { //ensures that only partially the BCNs are recomputed
                        q.elementBCN = null;
                    }
                }

                /* now p is the root node */
                if (p.children.length == 2) { /* remove p and link the other child of p to q */
                    r = p.children[1 - i]; /* get the other child */
                    for (i = 0; i < q.children.length; ++i) /* the position of p in q */
                        if (q.children[i] == p) break;
                    r.length += p.length;
                    r.parent = q;
                    q.children[i] = r; /* link r to q */
                } else { /* remove one child in p */
                    for (j = k = 0; j < p.children.length; ++j) {
                        p.children[k] = p.children[j];
                        if (j != i) ++k;
                    }
                    --p.children.length;
                }


                try{
                    postorderTraverse(new_root, function(d) {
                        d.leaves = getChildLeaves(d);
                    },true);
                } catch (e) {
                    console.log("Didn't work", e);
                }

                itree.root = new_root;
                itree.data.root = itree.root;
                if (isCompared){
                    postRerootClean(itree.root, iFinalView);
                }
            }
        }


        //------
        // function important to fix all parameters after rerooting
        // input: root - the root of a tree
        //        iFinalView - condition
        //------
        function postRerootClean(root,iFinalView) {

            function getSimilarity(itree1, itree2) {

                for (var i = 0; i < itree1.leaves.length; i++) {
                    for (var j = 0; j < itree2.leaves.length; j++) {
                        if (itree1.leaves[i].name === itree2.leaves[j].name) {
                            itree1.leaves[i].correspondingLeaf = itree2.leaves[j];
                            itree2.leaves[j].correspondingLeaf = itree1.leaves[i];
                        }
                    }
                }

                postorderTraverse(itree1, function(d) {
                    d.deepLeafList = createDeepLeafList(d);
                },false);
                postorderTraverse(itree2, function(d) {
                    d.deepLeafList = createDeepLeafList(d);
                },false);

                return getElementS(itree1, itree2);
            }

            var tree1 = tree;
            var tree2 = fixedTree;

            //var t0 = performance.now();
            tree1.similarities = getSimilarity(tree1.root, root);
            tree2.similarities = getSimilarity(tree2.root, root);
            //var t1 = performance.now();
            //console.log("Call getSimilarity took " + (t1 - t0) + " milliseconds.");

            //update coloring when rerooted
            function updateVisibleBCNs(itree1, itree2, recalculate){

                if (recalculate === undefined) {
                    recalculate = true;
                }

                function getAllBCNs(d, t) {
                    var children = d.children ? d.children : [];
                    if (children.length > 0) {
                        for (var a = 0; a < children.length; a++) {
                            getAllBCNs(children[a], t);
                        }
                        if (recalculate || !d.elementBCN || d.elementBCN == null) {
                            BCN(d, t);
                        }
                        return;
                    } else {
                        if (recalculate || !d.elementBCN || d.elementBCN == null) {
                            BCN(d, t);
                        }
                        return;
                    }
                }
                getAllBCNs(itree1, itree2);
            }

            //var t0 = performance.now();
            updateVisibleBCNs(tree1.root, tree2.root, false);
            //var t1 = performance.now();
            //console.log("Call updateVisibleBCNs took " + (t1 - t0) + " milliseconds.");

            if(iFinalView){
                //var t0 = performance.now();
                updateVisibleBCNs(tree2.root, tree1.root, true);
                //var t1 = performance.now();
                //console.log("Call updateVisibleBCNs took " + (t1 - t0) + " milliseconds.");

                //var t0 = performance.now();
                update(tree2.root, tree2.data);
                update(tree1.root, tree1.data);
                //var t1 = performance.now();
                //console.log("Call update took " + (t1 - t0) + " milliseconds.");
            }

        }

        //------
        //
        // Main part: traverse through all nodes and reroot at the node that is most similar to fixed tree root
        //
        //------
        if (fixedTree.root.children[0].elementBCN.parent){
            expandPathToNode(fixedTree.root.children[0].elementBCN);
            reroot(tree, fixedTree.root.children[0].elementBCN, true);
        }


    }

    /*---------------
     /
     /  Function to swap on nodes to optimize the visualisation between two trees
     /      works only in "compare mode" and needs the canvasId to know which tree will
     /      be manipulated
     /
     ---------------*/
    function findBestCorrespondingLeafOrder(canvasId){

        if (canvasId=="vis-container1"){ //ensures that the right tree is fixed based on canvasID
            var tree = trees[trees.length-2];
            var fixedTree = trees[trees.length-1];

        }else{
            var tree = trees[trees.length-1];
            var fixedTree = trees[trees.length-2];

        }

        //------
        // SWAP branches at a specific node
        // input: node d with its children
        //------
        function rotate(d) {
            if (d.children){
                var first = d.children[0];
                var second = d.children[1];
                d.children[0] = second;
                d.children[1] = first;
            }else if(d._children){
                var first = d._children[0];
                var second = d._children[1];
                d._children[0] = second;
                d._children[1] = first;
            }

        }

        //------
        // GET the leafnames part of a specific node d
        // input: node d with its children
        //------
        function getChildLeafNames(d){
            var leafNames = [];
            var leaves = getChildLeaves(d);
            //console.log(getChildren(d));
            for (var i = 0; i < leaves.length; i++){
                leafNames.push(leaves[i].name);
            }
            return leafNames;
        }

        //------
        // GET the corresponding node based on best overlap of leaves between two trees
        // input: treeLeaves (getChildLeafNames) and ifixedTree the fixed tree as input
        //------
        function getCorrespondingNode(treeLeaves, ifixedTree){
            var bestCorrespondingFixTreeLeaves = "";
            var bestCount = 0;
            postorderTraverse(ifixedTree.root, function(d){
                if (d.children || d._children){
                    var fixedTreeLeaves = getChildLeafNames(d);
                    var count = 0;
                    for (var i = 0; i < fixedTreeLeaves.length; i++){

                        if(treeLeaves.indexOf(fixedTreeLeaves[i]) !== -1){
                            count += 1;
                        }
                    }

                    if (count > bestCount){
                        bestCorrespondingFixTreeLeaves = fixedTreeLeaves;
                        bestCount = count;
                    }
                }
            },true);

            return bestCorrespondingFixTreeLeaves;
        }


        //------
        //
        // Main part: traverses all nodes of tree and if different leaf order in fixedTree calls the rotate function
        //
        //------
        postorderTraverse(tree.root,function(d){
            if (d.children || d._children){
                var leaves = getChildLeafNames(d);
                var fixedLeaves = getCorrespondingNode(leaves,fixedTree);
                if (leaves[0]!==fixedLeaves[0] && leaves[leaves.length-1]!==fixedLeaves[fixedLeaves.length-1]){
                    rotate(d);
                }
            }
        },true);
        update(tree.root, tree.data);
    }


    /*---------------
     /
     /    EXTERNAL: Function to create URL with attached gist-ID for export of visualization
     /
     ---------------*/
    function exportTree(isCompared){

        /*
         Function to write JSON structure to gist
         */
        function writeJSONtoGist(sourceData, callback){
            var currentTrees = sourceData;

            // get original newick since parser can not handle _children
            postorderTraverse(currentTrees.root, function(d) {
                if (d._children) {
                    d.children = d._children;
                    d._children = null;
                }
            });

            var nwk_original = jsonToNwk(currentTrees.root,false);
            var nwk_collapsed = jsonToNwk(currentTrees.root,true);


            var dataOut = currentTrees.name+"$$"+nwk_original+"$$"+nwk_collapsed;
            postorderTraverse(currentTrees.root, function(d) {
                if (d.collapsed) {
                    d._children = d.children;
                    d.children = null;
                }
            });

            var tmp = {"description": "a gist for a user with token api call via ajax","public": true,"files": {"file1.json": {"content": dataOut}}};
            return $.ajax({
                async: false,
                url: 'https://api.github.com/gists',
                type: 'POST',
                dataType: 'json',
                data: JSON.stringify(tmp),
                success: callback
            });
        }

        var tmpURL = window.location.href.split("#");
        var outURL = tmpURL[0] + "#";

        if (isCompared){
            var tree1 = trees[trees.length-2];
            var tree2 = trees[trees.length-1];

            var gistID1;
            var gistID2;
            writeJSONtoGist(tree1, function(data){
                gistID1 = data.id;
            });

            writeJSONtoGist(tree2, function(data){
                gistID2 = data.id;
            });

            outURL += encodeURIComponent(gistID1 + "#" + gistID2);

        }else {

            var tree1 = trees[trees.length-1];

            writeJSONtoGist(tree1, function(data){
                gistID = data.id;
            });

            outURL += encodeURIComponent(gistID);
        }


        return outURL;

    }


    /*---------------
     /
     /    EXTERNAL: Function to retrieve visualization using tree obtained from gist
     /
     ---------------*/
    function addTreeGistURL(gistID, name){

        settings.autoCollapse = null;
        if (name === undefined) {
            var num = trees.length;
            name = "Tree " + num;
        }

        /*
         Function to obtain json tree structure from gist
         */
        function gistToJSON(id, callback) {

            var objects = [];
            $.ajax({
                async: false,
                url: 'https://api.github.com/gists/'+id,
                type: 'GET',
                dataType: 'json'
            }).success( function(gistdata) {
                // This can be less complicated if you know the gist file name
                for (file in gistdata.files) {
                    if (gistdata.files.hasOwnProperty(file)) {
                        //var o = CircularJSON.parse(gistdata.files[file].content);
                        var o = gistdata.files[file].content;
                        if (o) {
                            objects.push(o);
                        }
                    }
                }
                if (objects.length > 0) {
                    return callback(objects[0]);
                }
            }).error( function(e) {
                // ajax error
            });
        }

        var newTree;
        gistToJSON(gistID, function(data){
            newTree = data;
            return newTree;
        });

        var parsedNwk = newTree.split("$$");
        //console.log(parsedNwk);
        try {
            var collapsedInfoTree = convertTree(parsedNwk[2]); // calls convert function from above
        } catch (err) {
            throw "Invalid Newick";
        }

        postorderTraverse(collapsedInfoTree, function(d) {
            d.ID = makeId("node_");
            d.leaves = getChildLeaves(d);
            d.mouseoverHighlight = false; //when mouse is over node
            d.mouseoverLinkHighlight = false; //when mouse is over branch between two nodes
        });

        var fullTree = {
            root: collapsedInfoTree,
            name: name,
            nwk: parsedNwk[1],
            compare:false,
            data: {}
        };
        fullTree.data.autoCollapseDepth = getRecommendedAutoCollapse(collapsedInfoTree);

        trees.push(fullTree);
        return fullTree;

    }

    /*---------------
     /
     /    UPDATE: Main function that is every time called once an action on the visualization is performed
     /
     ---------------*/
    function update(source, treeData, duration) {

        //time taken for animations in ms
        if (duration === undefined) {
            duration = 750;
        }


        var colorScale = d3.scale.linear()
            .domain(colorScaleDomain)
            .range(colorScaleRange);

        // Compute the new tree layout.
        var nodes = treeData.tree.nodes(treeData.root).reverse();
        var links = treeData.tree.links(nodes);
        var leaves = treeData.root.leaves.length;
        var leavesVisible = getVisibleLeaves(treeData.root);
        var width = $("#" + treeData.canvasId).width();
        var height = $("#" + treeData.canvasId).height();
        var renderHeight = height - paddingVertical * 2;
        var leavesHidden = 0;
        var triangles = 0;
        postorderTraverse(treeData.root, function(d) {
            if (d._children) {
                leavesHidden += d.leaves.length;
                triangles += 1; // changed from 1
            }
        }, false);

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

        var leafHeight = treeData.treeHeight;
        var height = leaves * leafHeight/2;
        var trianglePadding = leafHeight;

        //helper function to calculate all the leaf nodes visible, including the nodes with the collapsing
        //important to scale even big renderings onto the screen
        var visNodes = 0;
        function getLeavesShown(e){
            function getLeavesShownInner(d){
                if(d._children){
                    visNodes += 1;
                }else if(d.children){
                    for (var i = 0; i < d.children.length; i++) {
                        getLeavesShownInner(d.children[i]);

                    }
                }else{
                    visNodes +=1;
                }
            }
            getLeavesShownInner(e);
            //console.log(visNodes);
            return visNodes;

        }

        var allVisLeaves = getLeavesShown(treeData.root);
        var divisor = ((treeData.root.leaves.length - allVisLeaves) > 0) ? allVisLeaves : treeData.root.leaves.length; //number of leaves when collapsed

        //helper function to get info about number of collapsed nodes in a subtree
        function getCollapsedParams(e) {
            var collapsedHeightInner = 0;
            var leavesHiddenInner = 0;

            function getCollapsedHeight(d) {
                if (d._children) {
                    var offset = leafHeight / triangleHeightDivisor * d.leaves.length;
                    if (offset < amendedLeafHeight){ //condition ensures the right spacing if the triangle is smaller than the distance between two leaves
                        collapsedHeightInner += amendedLeafHeight;
                    }else {
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
                //collapsedHeight: 2*Math.log(leavesHiddenInner)/Math.log(2),
                leavesHidden: leavesHiddenInner
            }
        }

        var params = getCollapsedParams(treeData.root); //helper function getCollapsedParams(e) above is called and saved in params
        var collapsedHeight = params.collapsedHeight; // height of tree with collapsed branches
        var amendedLeafHeight = ((treeData.root.leaves.length * leafHeight) - collapsedHeight) / (divisor);

        //calculate the vertical position for a node in the visualisation
        //yes x is vertical position, blame d3's tree vis structure not me...
        function setXPos(d, upperBound) {
            if (d.children) { // defines the vertical position of the inner nodes
                for (var i = 0; i < d.children.length; i++) {
                    setXPos(d.children[i], upperBound);

                    var params = getCollapsedParams(d.children[i]);
                    var collapsedHeight = params.collapsedHeight;
                    var leavesHidden = params.leavesHidden;

                    upperBound += (((d.children[i].leaves.length - leavesHidden) * amendedLeafHeight) + collapsedHeight);

                }
                d.x = d.children[0].x+((d.children[d.children.length-1].x- d.children[0].x)/2);

            } else if (d._children) { //gets the position of the nodes that lead to the triangles
                var params = getCollapsedParams(d);
                var collapsedHeight = params.collapsedHeight;
                d.x = upperBound + (collapsedHeight/2);
            } else { // defines the vertical position of the leaves only
                d.x = upperBound + (amendedLeafHeight/2);
            }
            d.x = d.x;
        }

        function getRightMostSibling(d) {

            while (d.children)
            {
                d = d.children[d.children.length-1];
            }
            return d;
        }

        /*
        define the vertical position of the shown leaves depending on some bound and traverse this information to all leaves
         */
        function setXPosLeaves(d,upperBound){
            if(d.children){
                var newBound = upperBound;
                for (var i =0; i< d.children.length; i++){
                    setXPosLeaves(d.children[i],newBound);
                    upperBound += d.children[i].leaves.length * amendedLeafHeight;
                }
            }
        }

        // returns length from root to farthest leaf in branch lengths
        var maxLength = getMaxLengthVisible(treeData.root);
        // returns length in absolute coordinates of the whole tree
        var lengthMult = treeData.treeWidth;

        //calculate horizontal position of nodes
        nodes.forEach(function(d) {
            if (settings.useLengths) { //setting selected by user
                d.y = getLength(d) * (lengthMult / maxLength); //adjust position to screen size
                d.baseY = d.y;
            } else {
                d.y = d.depth * lengthMult / 10;
                d.baseY = d.y;
            }
            d.y = d.y + padding;
        });

        setXPos(treeData.root, 0);

        // Update the nodes…
        var node = treeData.svg.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++treeData.i);
            });

        // Enter any new nodes at the parent's previous position.
        // Perform the actual drawing
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
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
            .attr("id", function(d){
                return d.ID;
            })
            .style("cursor", "pointer")
            .on("mouseover", nodeMouseover)
            .on("mouseout", nodeMouseout)
            .on("click", treeData.clickEvent); //comes from getClickEvent

        //perform the actual drawing
        nodeEnter.append("circle")
            .attr("class", "node")
            .attr("r", settings.nodeSize)
            .style("fill", function(d) {
                if (d.bcnhighlight) {
                    return d.bcnhighlight;
                } else if (d[currentS] && d.highlight < 1) {
                    return colorScale(d[currentS])
                } else {
                    return (d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight) ? "green" : d._children ? "orange" : "black"; //last changed from black
                }
            });

        nodeEnter.append("rect")
            .attr("class", "node")
            .attr("y", "-5px")
            .attr("x", "-5px")
            .attr("width", "0px")
            .attr("height", "0px")
            .style("fill", "magenta")
            .style("stroke-width", "2px")
            .style("stroke", "black");

        // define visualization of labels on internal nodes
        nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? -13 : 13;
            })
            .attr("dy", function(d) {
                if(!(d.children || d._children)) { //ensures that length labels are on top of branch
                    return ".3em";
                } else {
                    return "-.3em";
                }
            })
            .attr("dx", function(d) {
                if(d.children || d._children) {
                    return ".3em";
                } else {
                    return "-.3em";
                }
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .style("fill-opacity", 1e-6)
            .attr("font-size", function(d) {
                return settings.fontSize + "px"
            })
            .style("font-family", "sans-serif");


        nodeEnter.append("text")
            .classed("triangleText", true)
            .attr("dy", ".35em")
            .style("fill-opacity", 1e-6)
            .attr("font-size", function(d) {
                return settings.fontSize + "px"
            })
            .style("font-family", "sans-serif");

        nodeEnter.append("path")
            .attr("d", function(d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            });

        //instant node changes
        node.select("text")
            .style("font-weight", function(d) {
                return (d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight) ? "bold" : "normal";
            })
            .style("fill", function(d) { // change the colour of the leaf text
                return d.searchHighlight ? "orange" /* changed from red*/ : ((d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight) ? "green" : "black");
            })
            .attr("font-size", function(d) {
                return settings.fontSize + "px"
            });

        node.select("circle")
            .attr("r", function(d) {
                if (d.bcnhighlight) {
                    return (settings.nodeSize * 1.5);
                }
                return settings.nodeSize;
            })
            .style("fill", function(d) {
                if (d.bcnhighlight) {
                    d.bcnhighlight  ="green"; //changed from green
                    return d.bcnhighlight;
                } else if (d.searchHighlight) {
                    return "orange"; //changed from red
                } else if (d[currentS] && !(d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight)) {
                    if (d._children){
                        return "blue"; //changed from orange
                    }else {
                        return colorScale(d[currentS])
                    }
                } else {
                    return (d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight) ? "green" : d._children ? "orange" : "black";
                }
            });

        node.select("rect")
            .attr("width", function(d) {
                if (d.clickedHighlight || d.bcnhighlight) {
                    return (settings.nodeSize * 2) + "px";
                } else {
                    return "0px";
                }
            })
            .attr("height", function(d) {
                if (d.clickedHighlight || d.bcnhighlight) {
                    return (settings.nodeSize * 2) + "px";
                } else {
                    return "0px";
                }
            })
            .style("fill", function(d) {
                if (d.clickedHighlight || d.bcnhighlight) {
                    //return d.clickedHighlight;
                    return "green"; //changed from red, so that boxes look different when highlighted to when searched
                }
            })
            .attr("y", -settings.nodeSize + "px")
            .attr("x", -settings.nodeSize + "px");


        // Node changes with transition
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1)
            .text(function(d) {
                if (!d.children && !d._children) { //print leaf names
                    return d.name
                } else {
                    if (settings.internalLabels === "none") {
                        return "";
                    } else if (settings.internalLabels === "name") { //print bootstrap values
                        return d.branchSupport
                    } else if (settings.internalLabels === "length") {
                        if (d.length) {
                            return d.length.toFixed(3);
                        }
                    } else if (settings.internalLabels === "similarity") {
                        if (d[currentS]) {
                            return d[currentS].toFixed(3);
                        }
                    }

                }
            });

        // Transition exiting nodes to the parent"s new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                if (source === treeData.root) {
                    var e = findHeighestCollapsed(d);
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
            .attr("d", function(d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            });

        nodeExit.select(".triangleText")
            .attr("x", 0)
            .style("fill-opacity", 1e-6)
            .each("end", function() {
                d3.select(this).text("")
            });

        //function important for collapsing
        node.each(function(d) {
            if (d._children) {
                var total = 0;
                _.each(d.leaves, function(e) {
                    total = total + (getLength(e) * (lengthMult / maxLength));
                });
                var avg = total / d.leaves.length;
                var offset = leafHeight / triangleHeightDivisor * d.leaves.length / 2;
                //var offset = Math.round(leafHeight*(2 * Math.log(d.leaves.length) / Math.log(2)));
                var xlength = (avg - (getLength(d) * (lengthMult / maxLength))); //length of triangle
                var ylength = offset; //height of half of the triangle

                d3.select(this).select("path").transition().duration(duration) // (d.searchHighlight) ? 0 : duration)
                    .attr("d", function(d) {
                        return "M" + 0 + "," + 0 + "L" + xlength + "," + (-ylength) + "L" + xlength + "," + (ylength) + "L" + 0 + "," + 0;
                    })
                    .style("fill", function(d) {
                        if (d[currentS]) {
                            if (!d.clickedParentHighlight && !d.searchHighlight) {
                                return colorScale(d[currentS]); // changes colour of the collapsed triangle shape
                            } else if (d.clickedParentHighlight) {
                                // Click highlight
                                return "green";
                            } else {
                                // Search highlight
                                return "orange";
                            }
                        } else {
                            return "black"; //changed from black
                        }

                    });
                d3.select(this).select(".triangleText").attr("font-size", function(d) {
                    return settings.fontSize + "px"
                });
                d3.select(this).select(".triangleText").transition().duration(duration)
                    .style("fill-opacity", 1)
                    .text(function(d) {
                        var text = d.leaves[0].name + " ... " + d.leaves[d.leaves.length - 1].name;
                        return text;
                    })
                    .style("fill", function(d) {
                        var allHighlighted = true;
                        var allNotHighlighted = true;
                        for (var i = 0; i < d.leaves.length; i++) {
                            if (!d.leaves[i].correspondingHighlight) {
                                allHighlighted = false;
                            } else {
                                allNotHighlighted = false;
                            }
                        }
                        if (allHighlighted) {
                            d3.select(this).style("font-weight", "bold");
                            return "green";
                        } else if (!allHighlighted && !allNotHighlighted) {
                            d3.select(this).style("font-weight", "bold");
                            return "#99CC00"; // "#99CC00"
                        } else {
                            d3.select(this).style("font-weight", "normal");
                            return "black";
                        }
                    })
                    .attr("x", function(d) {
                        var xpos = (avg - (getLength(d) * (lengthMult / maxLength))) + 5;
                        return xpos;
                    });
            }
            if (d.children) {
                d3.select(this).select("path").transition().duration(duration)
                    .attr("d", function(d) {
                        return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
                    });
                d3.select(this).select(".triangleText").transition().duration(duration)
                    .attr("x", 0)
                    .style("fill-opacity", 1e-6)
                    .each("end", function() {
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
            //console.log(select);
            var link = treeData.svg.selectAll("path." + select)
                .data(links, function(d) {
                    return d.target.id;
                })
                .style("stroke", function(d) {
                    //if (type === "front") {
                    var e = d.target;
                    if (e.searchHighlight) {
                        return "orange"; //changed from "red"
                    }
                    if (e.mouseoverLinkHighlight){//color branch for re-rooting
                        return "green"
                    }
                    var d = d.source;
                    if (d[currentS] && !(d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight)) {
                        return colorScale(d[currentS])
                    } else {
                            if (d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight || e.mouseoverLinkHighlight) {
                                return "green";
                                //TODO: insert some code about checking whether parent is highlighted, then update all children as highlighted
                            } else {
                                return defaultLineColor; //changed from defaultLineColor;
                            }

                    }
                });

            // Enter any new links at the parent"s previous position.
            link.enter().insert("path","g")
                .attr("class", function(d) {
                    if (type === "bg") {
                        return "linkbg";
                    } else {
                        return "link";
                    }
                })
                .attr("d", function(d) {
                    var d = d.source;
                    if (source === treeData.root) {
                        if (d.parent) { //draws the paths between nodes starting at root node
                            var output = "M" + d.parent.y + "," + d.parent.x + "L" + d.parent.y + "," + d.parent.x + "L" + d.parent.y + "," + d.parent.x;
                            return output;
                        } else { //here when reroot is selected....
                            var output = "M" + source.y + "," + source.x + "L" + source.y + "," + source.x + "L" + source.y + "," + source.x;
                            return output;
                        }
                    } else {
                        var output = "M" + source.y + "," + source.x + "L" + source.y + "," + source.x + "L" + source.y + "," + source.x;
                        return output;
                    }

                })
                .attr("id", function(d) { //adds source.id of node
                    return d.source.ID+':'+ d.target.ID;
                })
                .style("fill", "none")
                .style("stroke-width", function() {
                    if (type === "bg") {
                        return (parseInt(settings.lineThickness) + 2);
                    } else if (type === "front") {
                        return settings.lineThickness;
                    }
                })
                .style("stroke", function(d) {
                    var e = d.target;
                    if (e.searchHighlight) {
                        return "orange"; //changed from red
                    }
                    if (e.mouseoverLinkHighlight){ //color branch between two nodes in green for re-rooting
                        return "green";
                    }
                    var d = d.source;
                    if (d[currentS] && !(d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight || e.mouseoverLinkHighlight)) {
                        return colorScale(d[currentS])
                    } else {
                        if (d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight || e.mouseoverLinkHighlight || d.clickedHighlight){ //here the color of the branches after the selected node is set to green
                            return "green";
                        } else {
                            return defaultLineColor;
                        }
                    }
                })
                .style("cursor", "pointer")
                .on("mouseover",linkMouseover)
                .on("mouseout",linkMouseout)
                .on("click", treeData.clickEventLink);

            link.select("rect")
                .attr("width", function(d) {
                    if (d.clickedHighlight) {
                        return (settings.nodeSize * 2) + "px";
                    } else {
                        return "0px";
                    }
                })
                .attr("height", function(d) {
                    if (d.clickedHighlight) {
                        return (settings.nodeSize * 2) + "px";
                    } else {
                        return "0px";
                    }
                })
                .style("fill", function(d) {
                    if (d.clickedHighlight) {
                        //console.log(d.clickedHighlight);
                        return d.clickedHighlight;
                    }
                })
                .attr("y", -settings.nodeSize + "px")
                .attr("x", -settings.nodeSize + "px");

            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .style("stroke-width", function() {
                    if (type === "bg") {
                        return (parseInt(settings.lineThickness) + 2);
                    } else if (type === "front") {
                        return settings.lineThickness;
                    }
                })
                .attr("d", function(d) {
                    return "M" + d.source.y + "," + d.source.x + "L" + d.source.y + "," + d.target.x + "L" + d.target.y + "," + d.target.x;
                });


            // Transition exiting nodes to the parent"s new position.
            link.exit().transition()
                .duration(duration)
                .attr("d", function(d) {
                    var d = d.source;
                    if (source === treeData.root) {
                        var e = findHeighestCollapsed(d);
                        return "M" + e.y + "," + e.x + "L" + e.y + "," + e.x + "L" + e.y + "," + e.x;
                    } else {
                        return "M" + source.y + "," + source.x + "L" + source.y + "," + source.x + "L" + source.y + "," + source.x;
                    }
                })
                .remove();

        }
        renderLinks("front");

        // stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        // wait for transition before generating download
        if (settings.enableDownloadButtons) {
            setTimeout(function() {
                updateDownloadLinkContent(treeData.canvasId);
            }, duration);
        }

        //calculate the new scale text
        applyScaleText(treeData.scaleText, treeData.zoomBehaviour.scale(), treeData.root);


        //event listeners for nodes to handle mouseover highlighting
        //input d is currently selected node....
        function nodeMouseover(d) {
            //function to color all downstream branches of a selected node in green
            function colorLinkNodeOver(n) {
                if (n.children) {
                    for (var i = 0; i < n.children.length; i++) {
                        colorLinkNodeOver(n.children[i]);
                    }
                }
                if (!settings.enableFisheyeZoom) { //as long as fishEyeZoom is turned off
                    n.mouseoverHighlight = true;
                }
            }
            colorLinkNodeOver(d);
            if (!settings.enableFisheyeZoom) {
                update(d, treeData);
            }
        }

        function nodeMouseout(d) {
            function colorLinkNodeOver(n) {
                if (n.children) {
                    for (var i = 0; i < n.children.length; i++) {
                        colorLinkNodeOver(n.children[i]);
                    }
                }
                if (!settings.enableFisheyeZoom) {
                    n.mouseoverHighlight = false;
                }
            }

            colorLinkNodeOver(d);
            if (!settings.enableFisheyeZoom) {
                update(d, treeData);
            }
        }

        //event listeners for branches to handle mouseover highlighting
        //branch is highlithed between two nodes
        //TODO: branch from root should not be able to highlight and there should be no click function possible
        function linkMouseover(d) {
            function colorLinkMouseOver(n) {
                if (n.children) {
                    colorLinkMouseOver(n.children[0]);

                }
                if (!settings.enableFisheyeZoom) { //as long as fishEyeZoom is turned off
                    n.target.mouseoverLinkHighlight = true;
                }
            }
            colorLinkMouseOver(d);
            //console.log(d);
            if (!settings.enableFisheyeZoom) {
                update(d.source, treeData);
            }
        }

        function linkMouseout(d) {
            function colorLinkMouseOver(n) {
                if (n.children) {
                    colorLinkMouseOver(n.children[0]);

                }
                if (!settings.enableFisheyeZoom) { //as long as fishEyeZoom is turned off
                    n.target.mouseoverLinkHighlight = false;
                }
            }
            colorLinkMouseOver(d);
            //console.log(d);
            if (!settings.enableFisheyeZoom) {
                update(d.source, treeData);
            }
        }

        // this part ensures that when clicking on a node or elsewhere in the screen the tooltip disappears
        $('html').click(function(d) {
            if(compareMode){
                var tree1 = trees[trees.length-2];
                var tree2 = trees[trees.length-1];
                if((d.target.getAttribute("class")!=="link" && d.target.getAttribute("class")!=="node" && d.target.getAttribute("class")!=="linkbg"))
                {
                    removeTooltips(tree1.data.svg);
                    removeTooltips(tree2.data.svg);
                }
            }else{
                if((d.target.getAttribute("class")!=="link" && d.target.getAttribute("class")!=="node"))
                {
                    removeTooltips(treeData.svg);
                }
            }


        });

    }

    /*
     Hook up the zoom slider on the vis to zoomEvent
     */
    function applyEventListeners(treeData) {
        $("#zoomSlider" + treeData.id).on("input change", function() {
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

    /*
     Update the content of the SVG download link
     */
    function updateDownloadLinkContent(canvasId) {
        $("#downloadButtons" + canvasId).empty();
        var html = d3.select("#" + canvasId + " svg")
            .attr("version", 1.1)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .node().outerHTML;
        var downloadButton = d3.select("#downloadButtons" + canvasId).append("a")
            .attr("title", "file.svg")
            .attr("href-lang", "image/svg+xml")
            .attr("href", "data:image/svg+xml;base64,\n" + btoa(html))
            .text("SVG")
            .attr("class", "glyphicon glyphicon-download-alt");

        $("#downloadButtons" + canvasId + " a").css({
            "color": "#999"
        });


        /*
        Renaming download file to treename input box
        Author: Jospeh Treford
         */
        isCompared = (document.getElementById('vis-container1').className.split(' ').indexOf('vis-container') === (-1));
        if (isCompared) {
            labelId = (canvasId[canvasId.length - 1] == 1) ? "newickIn1Label" : "newickIn2Label";
        } else {
            labelId = "newickInSingleLabel";
        }
        download_fn = document.getElementById(labelId).value;
        download_fn = (download_fn === '') ? "PhyloIO_Tree" : download_fn;
        downloadButton.attr("download", download_fn);

        /*
        console.log(document.getElementById("newickIn1Label").value);
            downloadButton.attr("download", document.getElementById("newickIn1Label").value);
        } else {
            console.log(document.getElementById("newickIn2Label").value);
            downloadButton.attr("download", document.getElementById("newickIn2Label").value);
        };
        */
        // TODO so at the moment, it works if you hover over the tree to cause the update funciton to work otherwise it saves it as 'download';
        // TODO it also does not work for the single view tree, as it uses the name from the last tree
    }

    /*
     Helper function allows to search even partial strings
     */
    function stringSearch(string, start){
        var does = true;
        if(start !== ""){
            var n = string.search(start);
        }else{
            var n = -1;
        }
        //console.log(n);
        if (n==-1) {
            does = false;
        }
        return does;
    }

    /*
     Find the heighest collapsed node in the parents of a node
     */
    function findHeighestCollapsed(d) {
        if (d.parent) {
            if (d._children && d.parent.children) {
                return d;
            } else {
                return (findHeighestCollapsed(d.parent));
            }
        } else {
            return d;
        }
    }

    /*---------------
     /
     /    Main function for setting up a d3 visualisation of a tree
     /
     ---------------*/
    function renderTree(name, canvasId, scaleId, otherTreeName) {

        //get the trees by name
        var baseTree = trees[findTreeIndex(name)];
        if (otherTreeName !== undefined) {
            var otherTree = trees[findTreeIndex(name)];
            compareMode = false;
        }
        renderedTrees.push(baseTree);

        //clear the canvas of any previous visualisation
        $("#" + canvasId).empty();
        $("#" + scaleId).empty();
        scaleId = "#" + scaleId;

        //renders the manual zoom slider if turned on
        if (settings.enableZoomSliders) {
            $("#" + canvasId).append('<div class="zoomSliderContainer">Zoom: <input type="range" class="zoomSlider" id="zoomSlider' + findTreeIndex(name) + '" min="0.05" max="5" value="1.00" step="0.01"></input></div>');
            $(".zoomSliderContainer").css({
                "position": "absolute",
                "color": "black",
                "margin-left": "5px",
                "margin-top": "5px",
            });
        }

        //add the tree width/height controls and attach their event handlers
        if (settings.enableSizeControls) {
            var topMargin = settings.enableZoomSliders ? "50px" : "10px";
            $("#" + canvasId).append('<div id="zoomButtons"></div>');
            $("#" + canvasId + " #zoomButtons").append('<button type="button" id="upButton" class="btn btn-primary zoomButton"><span class="glyphicon glyphicon-arrow-up" aria-hidden="true"></span></button>');
            $("#" + canvasId + " #zoomButtons").append('<button type="button" id="leftButton" class="btn btn-primary zoomButton"><span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span></button>');
            $("#" + canvasId + " #zoomButtons").append('<button type="button" id="rightButton" class="btn btn-primary zoomButton"><span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span></button>');
            $("#" + canvasId + " #zoomButtons").append('<button type="button" id="downButton" class="btn btn-primary zoomButton"><span class="glyphicon glyphicon-arrow-down" aria-hidden="true"></span></button>');
            $("#" + canvasId + " #zoomButtons").css({
                "width": "78px",
                "top": "50px",
                "left": "10px",
                "position": "absolute"
            });
            $("#" + canvasId + " .zoomButton").css({
                "font-size": "10px",
                "width": "26px",
                "height": "26px",
                "vertical-align": "top",
                "opacity":"0.3"
            });
            $("#" + canvasId + " .zoomButton").on("mouseover", function() {
                $(this).css({
                    "opacity": "1"
                })
            });
            $("#" + canvasId + " .zoomButton").on("mouseout", function() {
                $(this).css({
                    "opacity": "0.3"
                })
            });
            $("#" + canvasId + " .zoomButton span").css({
                "vertical-align": "middle"
            });
            $("#" + canvasId + " #upButton").css({
                "display": "block",
                "margin-left": "26px",
            });
            $("#" + canvasId + " #leftButton").css({
                "float": "left"
            });
            $("#" + canvasId + " #rightButton").css({
                "margin-left": "26px",
                "float": "right"
            });
            $("#" + canvasId + " #downButton").css({
                "display": "block",
                "margin-left": "26px",
            });

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
            $("#" + canvasId + " #upButton").mousedown(function() {
                actionUp();
                timeoutIdUp = setInterval(actionUp, 150);
            }).bind('mouseup mouseleave', function() {
                clearTimeout(timeoutIdUp);
            });

            var timeoutIddown = 0;
            $("#" + canvasId + " #downButton").mousedown(function() {
                actionDown();
                timeoutIddown = setInterval(actionDown, 150);
            }).bind('mouseup mouseleave', function() {
                clearTimeout(timeoutIddown);
            });

            var timeoutIdleft = 0;
            $("#" + canvasId + " #leftButton").mousedown(function() {
                actionLeft();
                timeoutIdleft = setInterval(actionLeft, 150);
            }).bind('mouseup mouseleave', function() {
                clearTimeout(timeoutIdleft);
            });

            var timeoutIdRight = 0;
            $("#" + canvasId + " #rightButton").mousedown(function() {
                actionRight();
                timeoutIdRight = setInterval(actionRight, 150);
            }).bind('mouseup mouseleave', function() {
                clearTimeout(timeoutIdRight);
            });
        }


        //set up the d3 vis
        var i = 0;

        var width = $("#" + canvasId).width();
        var height = $("#" + canvasId).height();

        var tree = d3.layout.tree()
            .size([height, width]);

        var diagonal = d3.svg.diagonal()
            .projection(function(d) {
                return [d.y, d.x];
            });

        var svg = d3.select("#" + canvasId).append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g");

        // draws link to download svg
        if (settings.enableDownloadButtons) {
            $("#" + canvasId).append('<div id="downloadButtons' + canvasId + '"></div>');

            if (canvasId.search("1")!=-1){
                $("#downloadButtons" + canvasId).css({
                    "left": "5px",
                    "bottom": "5px",
                    "position": "absolute"

                });
            } else if(canvasId.search("2")!=-1){
                $("#downloadButtons" + canvasId).css({
                    "right": "5px",
                    "bottom": "5px",
                    "position": "absolute"

                });

            }

        }
        // draws buttons to swap one tree and not the other
        if (settings.enableFixedButtons) {
            var canvasLeft = "vis-container1";
            var canvasRight = "vis-container2";

            if(canvasId === canvasLeft){
                $("#" + canvasId).append('<table id="fixedButtonsText' + canvasId + '"></table>');
                $("#fixedButtonsText"+canvasId).css({
                    "right": "30px",
                    "background-color": "white",
                    "bottom": "0px",
                    "font-size": "14px",
                    "color": "#999",
                    "position": "absolute"

                });
                var row1 = d3.select("#fixedButtonsText"+canvasId).append("tr");

                row1.append("td")
                    .attr("align","center")
                    .attr("width","15px")
                    .append("span")
                    .attr("class","glyphicon glyphicon-circle-arrow-left")
                    .style("cursor","pointer")
                    .attr("id","rerootButton"+canvasId);

                var row2 = d3.select("#fixedButtonsText"+canvasId).append("tr");

                row2.append("td")
                    .attr("align","center")
                    .attr("width","15px")
                    .append("span")
                    .attr("class","glyphicon glyphicon-circle-arrow-left")
                    .style("cursor","pointer")
                    .attr("id","swapButton"+canvasId);
            } else {
                $("#" + canvasId).append('<table id="fixedButtonsText' + canvasId + '"></table>');

                $("#fixedButtonsText"+canvasId).css({
                    "left": "-30px",
                    "background-color": "white",
                    "bottom": "0px",
                    "font-size": "14px",
                    "color": "#999",
                    "position": "absolute"

                });

                var row1 = d3.select("#fixedButtonsText"+canvasId).append("tr");
                row1.append("td")
                    .attr("align","center")
                    .attr("width","60px")
                    .text("reroot")
                    .attr("title","find best rooting point according to opposite tree and reroot")
                    .attr("id","reroot-text");
                row1.append("td")
                    .attr("align","center")
                    .attr("width","15px")
                    .append("span")
                    .attr("class","glyphicon glyphicon-circle-arrow-right")
                    .style("cursor","pointer")
                    .attr("id","rerootButton"+canvasId);

                var row2 = d3.select("#fixedButtonsText"+canvasId).append("tr");
                row2.append("td")
                    .attr("align","center")
                    .attr("width","60px")
                    .text("reorder")
                    .attr("title","reorder leaves according to opposite tree")
                    .attr("id","reorder-text");
                row2.append("td")
                    .attr("align","center")
                    .attr("width","15px")
                    .append("span")
                    .attr("class","glyphicon glyphicon-circle-arrow-right")
                    .style("cursor","pointer")
                    .attr("id","swapButton"+canvasId);
            }
        }

        var timeoutIdReroot = 0;
        // action when clicking on reroot button in the center of the compare mode
        $("#" + "rerootButton" + canvasId).mousedown(function() {
            var load = true;
            settings.loadingCallback();
            setTimeout(function() {
                findBestCorrespondingTree(canvasId);
                if (load) {
                    settings.loadedCallback();
                }
            },2);
        }).bind('mouseup mouseleave', function() {
            clearTimeout(timeoutIdReroot);
        });

        // action when clicking on swap button in the center of the compare mode
        $("#" + "swapButton" + canvasId).mousedown(function() {
            var load = true;
            settings.loadingCallback();
            setTimeout(function() {
                findBestCorrespondingLeafOrder(canvasId);
                if (load) {
                    settings.loadedCallback();
                }
            },2);
        }).bind('mouseup mouseleave', function() {
            clearTimeout(timeoutIdReroot);
        });

        //set up search box and attach event handlers
        if (settings.enableSearch) {
            $("#" + canvasId).append('<div id="searchBox' + canvasId + '"><a class="btn btn-default" id="searchButton' + canvasId + '"><span class="glyphicon glyphicon-search" aria-hidden="true"></span></a><input type="text" placeholder="search" id="searchInput' + canvasId + '" autofocus></input></div>');
            $('#searchBox' + canvasId).append('<div id="resultsBox' + canvasId + '"><ul id="resultsList' + canvasId + '"></ul></div>');
            $("#searchBox" + canvasId).css({
                "max-width": "250px",
                "min-height": "45px",
                "padding": "5px",
                "right": "5px",
                "top": "5px",
                "position": "absolute",
                "background-color": "gray",
                "-webkit-border-radius": "5px",
                "-moz-border-radius": "5px",
                "border-radius": "5px"

            });
            $("#searchInput" + canvasId).css({
                "float": "right",
                "width": "0px",
                "margin-left": "0px",
                "margin-top": "5px",
                "display": "none"

            });
            $("#searchButton" + canvasId).css({
                "width": "50px",
                "float": "right"

            });
            $("#resultsBox" + canvasId).css({
                "width": "200px",
                "position": "absolute",
                "margin-right": "10px",
                "max-height": "200px",
                "overflow": "scroll",
                "margin-top": "40px",
                "background-color": "#efefef",
                "-webkit-box-shadow": "0px 0px 2px 1px rgba(0,0,0,0.75)",
                "-moz-box-shadow": "0px 0px 2px 1px rgba(0,0,0,0.75)",
                "box-shadow": "0px 0px 2px 1px rgba(0,0,0,0.75)",
                "display": "none",
                "padding-top": "10px"

            });

            function hideSearchBar() {
                visible = false;
                $("#resultsList" + canvasId).empty();
                $("#resultsBox" + canvasId).slideUp(300, function() {
                    $("#resultsBox" + canvasId).css({
                        "display": "none"
                    });
                });
                $("#searchInput" + canvasId).animate({
                    width: "0px"
                }, 600, function() {
                    $("#searchInput" + canvasId).css({
                        "display": "none"
                    });
                    $("#searchInput" + canvasId).val("");
                });
            }


            var visible = false;
            $('#searchButton' + canvasId).click(function() {
                if (!visible) {
                    visible = true;
                    postorderTraverse(baseTree.data.root, function(d) {
                        d.searchHighlight =false;
                    });
                    update(baseTree.root,baseTree.data);
                    $("#searchInput" + canvasId).css({
                        "display": "inline"
                    });
                    $("#searchInput" + canvasId).animate({
                        width: "150px"
                    }, 600, function() {
                        $("#searchInput" + canvasId).focus();
                    });

                } else { //if search unselected then remove orange highlight from branches
                    postorderTraverse(baseTree.data.root, function(d) {
                        d.searchHighlight =false;
                    });
                    update(baseTree.root,baseTree.data);
                    hideSearchBar();
                }
            });

            var leafObjs = [];
            for (var i = 0; i < baseTree.root.leaves.length; i++) {
                leafObjs.push(baseTree.root.leaves[i]);
            }

            $("#" + canvasId + " svg").click(function() {
                hideSearchBar();
            });


            //var t0 = performance.now();
            //main event handler, performs search every time a char is typed so can get realtime results
            $("#searchInput" + canvasId).bind("paste keyup", function() {
                $("#resultsList" + canvasId).empty();
                var text = $(this).val();
                var results = _.filter(leafObjs, function(leaf) {
                    //return startsWith(leaf.name.toLowerCase(), text.toLowerCase());
                    return stringSearch(leaf.name.toLowerCase(), text.toLowerCase());
                });
                var results_name = [];
                for (var i = 0; i < results.length; i++){
                    results_name.push(results[i].name)
                }
                postorderTraverse(baseTree.data.root,function(d){
                    expandPathToLeaf(d,true,false);
                });
                update(baseTree.root,baseTree.data);

                if (typeof results_name != "undefined" && results_name != null && results_name.length > 0) {
                    $("#resultsBox" + canvasId).slideDown(200);
                    $("#resultsList" + canvasId).empty();

                    postorderTraverse(baseTree.data.root,function(d){
                        if(results_name.indexOf(d.name)>-1){
                            expandPathToLeaf(d,false,false);
                        }
                    });
                    update(baseTree.root,baseTree.data);

                    for (var i = 0; i < results.length; i++) {
                        $("#resultsList" + canvasId).append('<li class="' + i + '"><a href="#">' + results[i].name + '</a></li>');
                        $("#resultsList" + canvasId + " li").css({
                            "margin-left": "-25px",
                            "list-style-type": "none",
                            "cursor": "pointer",
                            "cursor": "hand"
                        });
                        var indices = [];
                        $("#resultsList" + canvasId + " ." + i).on("click", function() {
                            var index = $(this).attr("class");
                            indices.push(parseInt(index));
                            for (var i = 0; i<results.length; i++){
                                if (indices.indexOf(i)<0){
                                    expandPathToLeaf(results[i],true,false);
                                }
                            }
                            if (settings.selectMultipleSearch) { // allows to select multiple entries containing the same letter
                                for (var i = 0; i<indices.length; i++){
                                    expandPathToLeaf(results[indices[i]],false);
                                }
                            } else {
                                for (var i = 0; i<indices.length-1; i++){ // allows only to select one entry
                                    expandPathToLeaf(results[indices[i]],true,false);
                                }
                                expandPathToLeaf(results[indices[indices.length-1]],false);
                            }

                            if (otherTreeName !== undefined) {
                                //calculate any emerging node's BCNs if they haven't been shown yet and are exposed by search
                                settings.loadingCallback();
                                setTimeout(function() {
                                    getVisibleBCNs(baseTree.root, otherTree.root, false);
                                    settings.loadedCallback();
                                    update(baseTree.root, baseTree.data);
                                }, 2);
                            } else {
                                update(baseTree.root, baseTree.data);
                            }
                        });
                    }

                }
                else {
                    $("#resultsList" + canvasId).empty();
                    $("#resultsBox" + canvasId).slideUp(200, function() {
                        $("#resultsBox" + canvasId).css({
                            "display": "none"
                        });
                    });
                }
                //var t1 = performance.now();
                //console.log("main event handler " + (t1 - t0) + " milliseconds.");

            });
        }

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
        if (scaleId) {
            d3.select(scaleId).append("svg")
                .attr("width", $(scaleId).width())
                .attr("height", $(scaleId).height())
                .append("g");
            //draw scale line
            d3.select(scaleId + " svg").append("path")
                .attr("d", function() {
                    var width = parseFloat(d3.select(scaleId + " svg").style("width"));
                    scaleLineWidth = width * 0.75;
                    return "M" + scaleLinePadding + ",20L" + (scaleLineWidth + scaleLinePadding) + ",20"
                })
                .attr("stroke-width", 1)
                .attr("stroke", settings.scaleColor);
            var scaleText = d3.select(scaleId + " svg").append("text")
                .attr("x", scaleLineWidth / 2 + scaleLinePadding)
                .attr("y", 35)
                .attr("font-family", "sans-serif")
                .text("0")
                .attr("font-size", "14px")
                .attr("fill", settings.scaleColor)
                .attr("text-anchor", "middle");
            jQuery.extend(baseTree.data, {
                scaleText: scaleText
            });
        }

        jQuery.extend(baseTree.data, {
            canvasId: canvasId,
            root: root,
            tree: tree,
            svg: svg,
            i: i,
            id: findTreeIndex(name),
            zoomBehaviour: zoomBehaviour,
            zoomBehaviourSemantic: zoomBehaviourSemantic,
            scaleId: scaleId
        });
        postorderTraverse(baseTree.data.root, function(d) {
            d.leaves = getChildLeaves(d);
            //d.clickedParentHighlight = false;
            //d.correspondingHighlight = false;
            d.mouseoverHighlight = false;
        });

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

            var newHeight = 1;
            if (leavesVisible > 0) {
                newHeight = renderHeight / (leavesVisible + leavesHidden);
            } else {
                newHeight = renderHeight / (leavesVisible + leavesHidden);
                newHeight = (newHeight * triangleHeightDivisor);
                newHeight = newHeight - (newHeight / triangleHeightDivisor / 2);
                baseTree.data.prevNoLeavesVisible = true;
            }

            var longest = 0;
            addParents(baseTree.data.root);
            postorderTraverse(baseTree.data.root, function(d) {
                var l = getLength(d);
                if (l > longest) {
                    longest = l;
                }
            });
            var maxLength = getMaxLengthVisible(baseTree.data.root);
            var newWidth = (width / longest) * maxLength - paddingHorizontal * 2;
            if (newWidth < 0) {
                newWidth = (width / longest) * maxLength;
            }
            baseTree.data.treeWidth = newWidth;
            baseTree.data.treeHeight = newHeight;
        }
        update(baseTree.root, baseTree.data);
        baseTree.data.zoomBehaviour.translate([100, 100]);
        baseTree.data.zoomBehaviour.scale(0.8);
        d3.select("#" + baseTree.data.canvasId + " svg g")
            .attr("transform", "translate(" + [100, 100] + ") scale(0.8)");
        getFisheye();


        //handle all the fisheye zoom stuff
        // TODO is not working correctly and should be depracted
        d3.select("#" + canvasId).on("mousemove", function() {
            if (settings.enableFisheyeZoom) {
                var link = svg.selectAll("path.link");
                var linkbg = svg.selectAll("path.linkbg");
                var node = svg.selectAll("g.node");
                var scale = zoomBehaviour.scale();

                var fisheye = d3.fisheye.circular()
                    .radius(600 / (scale * 3))
                    .distortion(2 / (scale / 0.9));

                var mousePos = [(d3.mouse(this)[1] - zoomBehaviour.translate()[1]) / scale, (d3.mouse(this)[0] - zoomBehaviour.translate()[0]) / scale];
                fisheye.focus(mousePos);

                node.each(function(d) {
                    d.fisheye = fisheye(d);
                });

                node.select("circle")
                    .attr("r", function(d) {
                        return d.fisheye.z * settings.nodeSize;
                    })
                    .attr("cy", function(d) {
                        return d.fisheye.x - d.x;
                    });

                node.select("path")
                    .attr("d", function(d) {
                        if (d._children) {
                            var maxLength = getMaxLength(baseTree.root);
                            var lengthMult = baseTree.data.treeWidth;
                            var total = 0;
                            var leafHeight = baseTree.data.treeHeight;
                            _.each(d.leaves, function(e) {
                                total = total + (getLength(e) * (lengthMult / maxLength));
                            });
                            var avg = total / d.leaves.length;
                            var offset = leafHeight / triangleHeightDivisor * d.leaves.length / 2;
                            return "M" + 0 + "," + (d.fisheye.x - d.x) + "L" + ((avg - (getLength(d) * (lengthMult / maxLength)))) + "," + ((-offset) - d.x + d.fisheye.x) + "L" + (avg - (getLength(d) * (lengthMult / maxLength))) + "," + (offset - d.x + d.fisheye.x) + "L" + 0 + "," + (d.fisheye.x - d.x);
                        }
                    });

                node.select(".triangleText")
                    .attr("y", function(d) {
                        return d.fisheye.x - d.x;
                    })
                    .attr("font-size", function(d) {
                        if (d3.select(this).attr("font-size")) {
                            var mult = (d.fisheye.z / 2) > 1 ? (d.fisheye.z / 2) : 1;
                            return settings.fontSize * mult;
                        }
                    });
                node.select("rect")
                    .attr("width", function(d) {
                        if (d.clickedHighlight) {
                            return d.fisheye.z * settings.nodeSize * 2;
                        }
                    })
                    .attr("height", function(d) {
                        if (d.clickedHighlight) {
                            return d.fisheye.z * settings.nodeSize * 2;
                        }
                    })
                    .attr("y", function(d) {
                        return d.fisheye.x - d.x - (d.fisheye.z * settings.nodeSize);
                    });

                node.select("text")
                    .attr("font-size", function(d) {
                        if (d3.select(this).attr("font-size")) {
                            var mult = (d.fisheye.z / 2) > 1 ? (d.fisheye.z / 2) : 1;
                            return settings.fontSize * mult;
                        }
                    })
                    .attr("y", function(d) {
                        return d.fisheye.x - d.x;

                    });

                link.select(".triangleText")
                    .attr("y", function(d) {
                        return d.fisheye.x - d.x;
                    })
                    .attr("font-size", function(d) {
                        if (d3.select(this).attr("font-size")) {
                            var mult = (d.fisheye.z / 2) > 1 ? (d.fisheye.z / 2) : 1;
                            return settings.fontSize * mult;
                        }
                    });

                link.select("rect")
                    .attr("width", function(d) {
                        if (d.clickedHighlight) {
                            return d.fisheye.z * settings.nodeSize * 2;
                        }
                    })
                    .attr("height", function(d) {
                        if (d.clickedHighlight) {
                            return d.fisheye.z * settings.nodeSize * 2;
                        }
                    })
                    .attr("y", function(d) {
                        return d.fisheye.x - d.x - (d.fisheye.z * settings.nodeSize);
                    });

                link.select("text")
                    .attr("font-size", function(d) {
                        if (d3.select(this).attr("font-size")) {
                            var mult = (d.fisheye.z / 2) > 1 ? (d.fisheye.z / 2) : 1;
                            return settings.fontSize * mult;
                        }
                    })
                    .attr("y", function(d) {
                        return d.fisheye.x - d.x;

                    });
                link.attr("d", function(d) {
                    return "M" + d.source.y + "," + d.source.fisheye.x + "L" + d.source.y + "," + d.target.fisheye.x + "L" + d.target.y + "," + d.target.fisheye.x;
                });

                linkbg.attr("d", function(d) {
                    return "M" + d.source.y + "," + d.source.fisheye.x + "L" + d.source.y + "," + d.target.fisheye.x + "L" + d.target.y + "," + d.target.fisheye.x;
                });
            }
        });// End of fisheye zoom stuff

        d3.select(self.frameElement).style("height", "500px");

        function semanticZoom() {
            var scale = d3.event.scale;
            var prev = baseTree.data.prevSemanticScale;
            var prevTransform = [0, 0];
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
                }} else if (prev == scale) {
                var zoomPadding = 100;
                var wcanvas = $("#" + canvasId + " svg").width();
                var hcanvas = $("#" + canvasId + " svg").height();
                var displayedWidth = w;
                var h = d3.select("#" + canvasId + " svg g").node().getBBox().height;
                var w = d3.select("#" + canvasId + " svg g").node().getBBox().width;
                var translation = d3.event.translate;
                var tbound = -(h - hcanvas) - (zoomPadding * scale);
                var bbound = zoomPadding;
                var lbound = -(w - wcanvas) - (zoomPadding * scale);
                var rbound = zoomPadding;
                applyScaleText(scaleText, scale, root);
                // limit translation to thresholds
                if (h < (hcanvas - (zoomPadding * 2))) {
                    bbound = tbound - zoomPadding;
                    tbound = zoomPadding;
                }
                if (w < (wcanvas - (zoomPadding * 2))) {
                    rbound = lbound - zoomPadding;
                    lbound = zoomPadding;
                }
                translation = [
                    Math.max(Math.min(translation[0], rbound), lbound),
                    Math.max(Math.min(translation[1], bbound), tbound)
                ];
                zoomBehaviourSemantic.translate(translation);
                baseTree.data.prevTransform = translation;
                d3.select("#" + canvasId + " svg g")
                    .attr("transform", "translate(" + translation + ")");
            }
            baseTree.data.prevSemanticScale = scale;

        }

        function zoom() {
            var zoomPadding = 100;
            var wcanvas = $("#" + canvasId + " svg").width();
            var hcanvas = $("#" + canvasId + " svg").height();
            var displayedWidth = w * scale;
            var scale = d3.event.scale;
            var h = d3.select("#" + canvasId + " svg g").node().getBBox().height * scale;
            var w = d3.select("#" + canvasId + " svg g").node().getBBox().width * scale;
            var translation = d3.event.translate;
            var tbound = -(h - hcanvas) - (zoomPadding * scale);
            var bbound = zoomPadding;
            var lbound = -(w - wcanvas) - (zoomPadding * scale);
            var rbound = zoomPadding;
            applyScaleText(scaleText, scale, root);
            // limit translation to thresholds
            if (h < (hcanvas - (zoomPadding * 2))) {
                bbound = tbound - zoomPadding;
                tbound = zoomPadding;
            }
            if (w < (wcanvas - (zoomPadding * 2))) {
                rbound = lbound - zoomPadding;
                lbound = zoomPadding;
            }

            translation = [
                Math.max(Math.min(translation[0], rbound), lbound),
                Math.max(Math.min(translation[1], bbound), tbound)
            ];
            zoomBehaviour.translate(translation);
            zoomBehaviour.scale(scale);
            if (settings.enableZoomSliders) {
                $("#zoomSlider" + baseTree.data.id).val(scale);
            }
            d3.select("#" + canvasId + " svg g")
                .attr("transform", "translate(" + translation + ")" + " scale(" + scale + ")");
            updateDownloadLinkContent(canvasId);
        }
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
            maxDepth = getMaxAutoCollapse();
            //console.log(maxDepth);
            if (depth === null) {
                uncollapseAll(renderedTrees[i].root);
            } else {
                limitDepth(renderedTrees[i].root, depth);
            }
        }

        if (renderedTrees.length === 2) {
            settings.loadingCallback();
            setTimeout(function() {
                getVisibleBCNs(renderedTrees[0].root, renderedTrees[1].root, false);
                update(renderedTrees[0].root, renderedTrees[0].data);
                update(renderedTrees[1].root, renderedTrees[1].data);
                settings.loadedCallback();
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
            if (!unhighlight && uncollapse) {
                if (leaf.parent._children) {
                    leaf.parent.children = leaf.parent._children;
                    leaf.parent._children = null;
                }
                leaf.searchHighlight = true;
            }
            else if (!unhighlight && !uncollapse) {
                leaf.searchHighlight = true;
            } else {
                leaf.searchHighlight = false;
            }

        expandPathToLeaf(leaf.parent, unhighlight, uncollapse);
        }
    }

    /*
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


    /*
     Calculate the Best Corresponding Node (BCN) for all visible nodes (not collapsed) in the tree
     if recalculate==false, doesn't calculate for a node if it aleady has a value
     Algorithm adapted from: TreeJuxtaposer: Scalable Tree Comparison Using Focus+Context with Guaranteed Visibility, Munzner et al. 2003
     */
    function getVisibleBCNs(tree1, tree2, recalculate) {

        if (recalculate === undefined) {
            recalculate = true;
        }

        function getAllBCNs(d, t) {
            var children = d.children ? d.children : [];
            //var children = getChildren(d);
            if (children.length > 0) {
                for (var a = 0; a < children.length; a++) {
                    getAllBCNs(children[a], t);
                }
                //var t0 = performance.now();
                if (recalculate || !d.elementBCN) {
                    BCN(d, t);
                }
                //var t1 = performance.now();
                //console.log("Call getVisibleBCNs:BCN if children " + (t1 - t0) + " milliseconds.");
                return;
            } else {
                if (recalculate || !d.elementBCN) {
                    BCN(d, t);
                }
                return;
            }
        }
        //var t0 = performance.now();
        getAllBCNs(tree1, tree2);
        getAllBCNs(tree2, tree1);
        //var t1 = performance.now();
        //console.log("Call getVisibleBCNs:getAllBCNs took " + (t1 - t0) + " milliseconds.");
    }

    /*
     Calculates some stuff needed for calculating BCNs later on
     */
    function preprocessTrees(index1, index2) {
        var tree1 = trees[index1].root;
        var tree2 = trees[index2].root;

        //var t0 = performance.now();
        for (var i = 0; i < tree1.leaves.length; i++) {
            for (var j = 0; j < tree2.leaves.length; j++) {
                if (tree1.leaves[i].name === tree2.leaves[j].name) {
                    tree1.leaves[i].correspondingLeaf = tree2.leaves[j];
                    tree2.leaves[j].correspondingLeaf = tree1.leaves[i];
                }
            }
        }
        //var t1 = performance.now();
        //console.log("Call preprocessTrees:double loop took " + (t1 - t0) + " milliseconds.");

        postorderTraverse(tree1, function(d) {
            d.deepLeafList = createDeepLeafList(d);
        });
        postorderTraverse(tree2, function(d) {
            d.deepLeafList = createDeepLeafList(d);
        });

        //var t0 = performance.now();
        getVisibleBCNs(tree1, tree2);
        //var t1 = performance.now();
        //console.log("Call preprocessTrees:getVisibleBCNs took " + (t1 - t0) + " milliseconds.");
        //}
    }

    /*
     get a spanning tree containing leaves given
     -> node is set to opposite tree
     -> leaves are searched in opposite tree in order to find the spanning tree
     */
    function getSpanningTree(node, leaves) {
        var nodes = [];
        for (var i = 0; i < node.leaves.length; i++) {
            for (var z = 0; z < leaves.length; z++) {
                if (node.leaves[i].name === leaves[z].name) {
                    nodes.push(node);
                    var children = getChildren(node);
                    for (var j = 0; j < children.length; j++) {
                        nodes = nodes.concat(getSpanningTree(children[j], leaves));
                    }
                    return nodes;
                }
            }
        }
        return nodes;

    }
    function namesOnly(leaf) {
        return leaf.name;
    }

    //get the best corresponding node in opposite tree for node v
    function BCN(v, tree) {

        var elementBCNNode = null;
        var maxElementS = 0;
        var leaves = v.leaves;
        //var t0 = performance.now();
        var spanningTree = getSpanningTree(tree, leaves);
        //var t1 = performance.now();
        //console.log("Call BCN:getSpanningTree took " + (t1 - t0) + " milliseconds.");

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
        //console.log(v.elementBCN);
    }

    /*
     creates list of leaves of each node in subtree rooted at v
     */
    function createDeepLeafList(v) {
        var deepLeafList = [];
        var counter = 0;

        function buildDeepLeafList(d) {
            var children = getChildren(d);
            if (children.length > 0) {
                if (counter > 0) {
                    deepLeafList.push(_.sortBy(_.map(d.leaves, namesOnly), function(str) {
                        return str
                    }).toString());
                }
                counter += 1;
                for (var i = 0; i < children.length; i++) {
                    buildDeepLeafList(children[i]);
                }
                return;
            } else {
                deepLeafList.push(d.name);
                return;
            }
        }
        buildDeepLeafList(v);
        return deepLeafList;

    }

    /*
     get the comparison score between two nodes
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
     get index of a tree in trees by its name
     */
    function findTreeIndex(name) {
        for (var i = 0; i < trees.length; i++) {
            if (name === trees[i].name) {
                return i;
            }
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
        settings.loadingCallback();
        setTimeout(function() {
            //var t0 = performance.now();
            uncollapseAll(trees[index1].root);
            uncollapseAll(trees[index2].root);
            //var t1 = performance.now();
           // console.log("uncollapseAll " + (t1 - t0) + " milliseconds.");

           // var t0 = performance.now();
            stripPreprocessing(trees[index1].root);
            stripPreprocessing(trees[index2].root);
            //var t1 = performance.now();
            //console.log("stripPreprocessing " + (t1 - t0) + " milliseconds.");

            //var t0 = performance.now();
            getDepths(trees[index1].root);
            getDepths(trees[index2].root);
            //var t1 = performance.now();
            //console.log("getDepths " + (t1 - t0) + " milliseconds.");


            postorderTraverse(trees[index1].root, function(d) {
                if (d.name==="collapsed" || d.collapsed) {
                    d._children = d.children;
                    d.collapsed = true;
                    d.children = null;
                    //d.name=""
                }
            });

            postorderTraverse(trees[index2].root, function(d) {
                if (d.name==="collapsed" || d.collapsed) {
                    d._children = d.children;
                    d.collapsed = true;
                    d.children = null;
                    //d.name=""
                }
            });


            if (settings.autoCollapse !== null) {
                limitDepth(trees[index1].root, settings.autoCollapse);
                limitDepth(trees[index2].root, settings.autoCollapse);
            }
            //var t0 = performance.now();
            preprocessTrees(index1, index2);
            //var t1 = performance.now();
            //console.log("Call preprocessTrees took " + (t1 - t0) + " milliseconds.");

            trees[index1].data.clickEvent = getClickEventListenerNode(trees[index1], true, trees[index2]);//Click event listener for nodes
            trees[index2].data.clickEvent = getClickEventListenerNode(trees[index2], true, trees[index1]);
            trees[index1].data.clickEventLink = getClickEventListenerLink(trees[index1], true, trees[index2]);//Click event listener for links
            trees[index2].data.clickEventLink = getClickEventListenerLink(trees[index2], true, trees[index1]);

            //var t0 = performance.now();
            renderTree(name1, canvas1, scale1, name2);
            renderTree(name2, canvas2, scale2, name1);
            //var t1 = performance.now();
            //console.log("Call renderTree took " + (t1 - t0) + " milliseconds.");


            compareMode = true;
            settings.loadedCallback();
        }, 5);

    }

    /*---------------
     /
     /    EXTERNAL: external function for initialising a single tree visualisation
     /
     ---------------*/
    function viewTree(name, canvasId, scaleId) {
        renderedTrees = [];
        var index = findTreeIndex(name);
        settings.loadingCallback();
        setTimeout(function() {
            uncollapseAll(trees[index].root);
            stripPreprocessing(trees[index].root);
            getDepths(trees[index].root);

            postorderTraverse(trees[index].root, function(d) {
                if (d.name==="collapsed" || d.collapsed) {
                    d._children = d.children;
                    d.collapsed = true;
                    d.children = null;
                    //d.name=""
                }
            });


            if (settings.autoCollapse !== null) {
                limitDepth(trees[index].root, settings.autoCollapse);
            }
            trees[index].data.clickEvent = getClickEventListenerNode(trees[index], false, {});
            trees[index].data.clickEventLink = getClickEventListenerLink(trees[index], false, {});
            renderTree(name, canvasId, scaleId);
            settings.loadedCallback();
        }, 2);

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
            //d.bcnhighlight = null;
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
            //debugger;
        }
    }

    /*
     init the fisheye distortion plugin
     //TODO this is not used so far
     */
    function getFisheye() {
        /*
         Fisheye Distortion Plugin from d3-plugins
         https://github.com/d3/d3-plugins/tree/master/fisheye
         Code by mbostock
         */
        return (function() {
            d3.fisheye = {
                scale: function(scaleType) {
                    return d3_fisheye_scale(scaleType(), 3, 0);
                },
                circular: function() {
                    var radius = 200,
                        distortion = 2,
                        k0,
                        k1,
                        focus = [0, 0];

                    function fisheye(d) {
                        var dx = d.x - focus[0],
                            dy = d.y - focus[1],
                            dd = Math.sqrt(dx * dx + dy * dy);
                        if (!dd || dd >= radius) return {
                            x: d.x,
                            y: d.y,
                            z: dd >= radius ? 1 : 10
                        };
                        var k = k0 * (1 - Math.exp(-dd * k1)) / dd * .75 + .25;
                        return {
                            x: focus[0] + dx * k,
                            y: focus[1] + dy * k,
                            z: Math.min(k, 10)
                        };
                    }

                    function rescale() {
                        k0 = Math.exp(distortion);
                        k0 = k0 / (k0 - 1) * radius;
                        k1 = distortion / radius;
                        return fisheye;
                    }

                    fisheye.radius = function(_) {
                        if (!arguments.length) return radius;
                        radius = +_;
                        return rescale();
                    };

                    fisheye.distortion = function(_) {
                        if (!arguments.length) return distortion;
                        distortion = +_;
                        return rescale();
                    };

                    fisheye.focus = function(_) {
                        if (!arguments.length) return focus;
                        focus = _;
                        return fisheye;
                    };

                    return rescale();
                }
            };

            function d3_fisheye_scale(scale, d, a) {

                function fisheye(_) {
                    var x = scale(_),
                        left = x < a,
                        range = d3.extent(scale.range()),
                        min = range[0],
                        max = range[1],
                        m = left ? a - min : max - a;
                    if (m == 0) m = max - min;
                    return (left ? -1 : 1) * m * (d + 1) / (d + (m / Math.abs(x - a))) + a;
                }

                fisheye.distortion = function(_) {
                    if (!arguments.length) return d;
                    d = +_;
                    return fisheye;
                };

                fisheye.focus = function(_) {
                    if (!arguments.length) return a;
                    a = +_;
                    return fisheye;
                };

                fisheye.copy = function() {
                    return d3_fisheye_scale(scale.copy(), d, a);
                };

                fisheye.nice = scale.nice;
                fisheye.ticks = scale.ticks;
                fisheye.tickFormat = scale.tickFormat;
                return d3.rebind(fisheye, scale, "domain", "range");
            }
        })();
        /*----------------------------------------*/
    }

    /*
     clear tooltips from the visualisation
     */
    function removeTooltips(svg) {
        svg.selectAll(".tooltipElem").remove();
    }

    /*
     get relevant event listener for clicking on a link depending on what mode is selected
     */
    function getClickEventListenerLink(tree, isCompared, comparedTree) {

        function linkClick(e) {
            var d = e.target;
            var svg = tree.data.svg;

            function new_node(d) { // private method
                return {parent:null, children:[], name:"", ID:"",length:0, mouseoverHighlight:false, mouseoverLinkHighlight:false, elementS:d.elementS};
            }
            /*
             Function to dynamically reroot a tree at a specific node
             Taken and adapted from knlh.js....
             tree = tree.root
             newRoot = d
             */
            /* Reroot: put the root in the middle of node and its parent */
            function reroot(tree, node)
            {
                var root = tree.root;
                if(node.parent !== root){
                    var load = false;
                    if (isCompared) {
                        load = true;
                        settings.loadingCallback();
                    }
                    setTimeout(function() {

                        if(manualReroot==false) {//ensure that always the lengths of branches are conserved!
                            backupRoot=root;
                            manualReroot=true;
                        } else {
                            root = backupRoot;
                        }

                        var i, d, tmp;
                        var btmp, bd;
                        var p, q, r, s, new_root;
                        if (node == root) return root;
                        var dist = node.length/2;
                        tmp = node.length;
                        btmp = node.branchSupport;
                        /* p: the central multi-parent node
                         * q: the new parent, previous a child of p
                         * r: old parent
                         * i: previous position of q in p
                         * d: previous distance p->d
                         */
                        q = new_root = new_node(node.parent); //node.parent ensures the correct coulering of the branches when rerooting
                        q.ID = makeId("node_");
                        q.children[0] = node; //new root
                        q.children[0].length = dist;
                        q.children[0].branchSupport = btmp;
                        p = node.parent;
                        q.children[0].parent = q;
                        for (i = 0; i < p.children.length; ++i)
                            if (p.children[i] == node) break;
                        q.children[1] = p;
                        q.children[1].ID =  makeId("node_");
                        d = p.length;
                        bd = p.branchSupport;
                        p.length = tmp - dist;
                        p.branchSupport = btmp;
                        r = p.parent;
                        p.parent = q;


                        while (r != null) {
                            s = r.parent; /* store r's parent */
                            p.children[i] = r; /* change r to p's children */
                            for (i = 0; i < r.children.length; ++i) /* update i */
                                if (r.children[i] == p) break;
                            r.parent = p; /* update r's parent */
                            tmp = r.length; r.length = d; d = tmp; /* swap r->d and d, i.e. update r->d */
                            btmp = r.branchSupport; r.branchSupport = bd; bd = btmp;
                            q = p; p = r; r = s; /* update p, q and r */
                            if(isCompared) { //ensures that only partially the BCNs are recomputed
                                q.elementBCN = null;
                            }
                        }


                        /* now p is the root node */
                        if (p.children.length == 2) { /* remove p and link the other child of p to q */
                            r = p.children[1 - i]; /* get the other child */
                            for (i = 0; i < q.children.length; ++i) /* the position of p in q */
                                if (q.children[i] == p) break;
                            r.length += p.length;
                            r.parent = q;
                            q.children[i] = r; /* link r to q */
                        } else { /* remove one child in p */
                            for (j = k = 0; j < p.children.length; ++j) {
                                p.children[k] = p.children[j];
                                if (j != i) ++k;
                            }
                            --p.children.length;
                        }

                        postorderTraverse(new_root, function(d) {
                            //d.bcnhighlight = null;
                            //d.highlight = 0;
                            //d.clickedHighlight = null;
                            d.ID = makeId("node_");
                            d.leaves = getChildLeaves(d);
                        },false);
                        //new_root.leaves = getChildLeaves(new_root);
                        tree.root = new_root;
                        tree.data.root = tree.root; //create clickEvent that is given to update function

                        if (isCompared){
                            postRerootClean(tree.root, tree.name);
                        }

                        if (load) {
                            settings.loadedCallback();
                        }

                        update(tree.root, tree.data);

                    }, 2);
                }


            }


            function postRerootClean(root,name) {
                //highlightedNodes = [];

                //get the two trees that are compared
                function getSimilarity(tree1, tree2) {
                    for (var i = 0; i < tree1.leaves.length; i++) {
                        for (var j = 0; j < tree2.leaves.length; j++) {
                            if (tree1.leaves[i].name === tree2.leaves[j].name) {
                                tree1.leaves[i].correspondingLeaf = tree2.leaves[j];
                                tree2.leaves[j].correspondingLeaf = tree1.leaves[i];
                            }
                        }
                    }

                    postorderTraverse(tree1, function(d) {
                        d.deepLeafList = createDeepLeafList(d);
                    },false);
                    postorderTraverse(tree2, function(d) {
                        d.deepLeafList = createDeepLeafList(d);
                    },false);

                    //update(d, tree.data);
                    //update(otherTreeData.root, otherTreeData);
                    return getElementS(tree1, tree2);
                }

                var tree1 = tree;
                var tree2 = comparedTree;
                trees[trees.length-2].similarities = getSimilarity(tree1.root, root);
                trees[trees.length-1].similarities = getSimilarity(tree2.root, root);

                //update coloring when rerooted
                function updateVisibleBCNs(tree1, tree2, recalculate){

                    if (recalculate === undefined) {
                        recalculate = true;
                    }

                    function getAllBCNs(d, t) {
                        var children = d.children ? d.children : [];
                        //var children = getChildren(d);
                        if (children.length > 0) {
                            for (var a = 0; a < children.length; a++) {
                                getAllBCNs(children[a], t);
                            }
                            if (recalculate || !d.elementBCN || d.elementBCN == null) {
                                BCN(d, t);
                            }
                            return;
                        } else {
                            if (recalculate || !d.elementBCN || d.elementBCN == null) {
                                BCN(d, t);
                            }
                            return;
                        }
                    }
                    getAllBCNs(tree1, tree2);
                }

                updateVisibleBCNs(tree1.root, tree2.root, false);
                updateVisibleBCNs(tree2.root, tree1.root, true);
                if(tree1.name == name){
                    update(tree2.root, tree2.data);
                }
                if(tree2.name == name){
                    update(tree1.root, tree1.data);
                }



            }

            if (!d.children && !d._children && d.searchHighlight === true) {
                expandPathToLeaf(d, true);
                update(tree.root, tree.data);
            }

            //render the tooltip on click
            //user then chooses which function above to call
            var triWidth = 10;
            var triHeight = 15;
            var rectWidth = 150;
            var rectHeight = 90;

            removeTooltips(svg);

            //d3.selectAll(".tooltipElem").remove(); // ensures that not multiple reactangles are open when clicking on another node

            // get coordinates of mouse click event
            var coordinates = [0, 0];
            coordinates = d3.mouse(this);
            var x = coordinates[0];
            var y = coordinates[1];


            d3.select(this.parentNode).append("rect")
                .attr("class", "tooltipElem")
                .attr("x", function(){
                    return x-(rectWidth / 2);
                })
                .attr("y", function() {
                    return y-triHeight - rectHeight + 1;
                })
                .attr("width", rectWidth)
                .attr("height", rectHeight)
                .attr("rx", 10)
                .attr("ry", 10)
                .style("fill", "gray");
            //draw the little triangle
            d3.select(this.parentNode).append("path")
                .attr("class", "tooltipElem")
                .style("fill", "gray")
                .attr("d", function() {
                    return "M" + x + "," + y + "L" + (x-triWidth) + "," + (y-triHeight) + "L" + (x+triWidth) + "," + (y-triHeight);
                })
                .style("fill", "gray");

            var rpad = 10;
            var tpad = 20;
            var textDone = 0;
            var textInc = 20;

            d3.select(this.parentNode).append("text")
                .attr("class", "tooltipElem tooltipElemText")
                .attr("y", (y-rectHeight - triHeight + tpad + textDone))
                .attr("x", (x+(-rectWidth / 2) + rpad))
                .style("fill", "white")
                .style("font-weight", "bold")
                .text("reroot")
                .style("cursor", "pointer")
                .on("click", function(d) { // This is to reroot
                    d = e.target;
                    postorderTraverse(d, function(e) {
                        e.mouseoverHighlight = false;
                    });
                    reroot(tree, d);
                    removeTooltips(svg);
                    manualReroot = true;
                    //if (!manualReroot){
                    //    manualReroot = true;
                    //}

                });

            $(document).click(function(event) {
                if(!$(event.target).closest('#tooltipElem').length) {
                    if($('#tooltipElem').is(":visible")) {
                        $('#tooltipElem').hide()
                    }
                }
            });

            d3.select(this.parentNode).selectAll(".tooltipElemText").each(function(d) {
                d3.select(this).on("mouseover", function(d) {
                    d3.select(this).transition().duration(50).style("fill", "black");
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

        function nodeClick(d) {
            var svg = tree.data.svg;

            // function that allows to swap two branches when clicking on note d
            function rotate(d) {
                var load = false;
                if (isCompared && d._children) {
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

            function collapse(d) {
                /* Called on collapse AND uncollapse / expand. */
                var load = false;
                if (isCompared && d._children) {
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
                        if (isCompared) {
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
                        settings.loadedCallback();
                    }
                    update(d, tree.data);
                }, 2);

            }

            function collapseAll(d,forceUncollapse) {
                var load = false;
                if (isCompared && d._children) {
                    load /*._children*/= true;  // _children causes the spinny wheel to never go 'load' and go away
                    settings.loadingCallback();
                }

                if (forceUncollapse == undefined){
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
                            if (isCompared) {
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

            function highlight(d) {
                var bcnColors = d3.scale.category20();
                if (isCompared) {
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


                    if (!_.contains(highlightedNodes, d)) {
                        clearHighlight(tree.root);
                        if (highlightedNodes.length < maxHighlightedNodes) {
                            //d.clickedHighlight = bcnColors(highlightedNodes.length);
                            d.clickedHighlight = "red";
                            d[currentBCN].bcnhighlight = bcnColors(highlightedNodes.length);
                            highlightedNodes.push(d);
                            var leaves = d.leaves;
                            var otherTree = comparedTree.root;
                            var otherTreeData = comparedTree.data;
                            var otherTreeLeaves = otherTreeData.leaves;
                            //clearHighlight(tree.root);
                            //clearHighlight(otherTree);


                            for (var i = 0; i < leaves.length; i++) {
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
                                if (settings.moveOnClick) {
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
                        var bcnid = d[currentBCN] ? d[currentBCN].id : -1;
                        var leaves = d.leaves;
                        var otherTree = comparedTree.root;
                        var otherTreeData = comparedTree.data;
                        var otherTreeLeaves = otherTreeData.leaves;

                        for (var i = 0; i < leaves.length; i++) {
                            leaves[i].correspondingLeaf.correspondingHighlight = false;
                        }

                        colorLinkNodeOver(d, false);
                        update(d, tree.data);
                        update(otherTreeData.root, otherTreeData);

                    }

                }
            }

            if (!d.children && !d._children && d.searchHighlight === true) {
                expandPathToLeaf(d, true);
                update(tree.root, tree.data);
            }

            function edit_label(d) {
                // Read in input
                new_label = prompt('Enter new label');
                current_label = d.name;

                if (new_label != current_label) {
                    var found = false;

                    function check_label(e) {
                        //checking for the same label in another part of the tree.
                        if (e.name == new_label) {
                            found = true;
                        } else if (!found && e.children) {
                            e.children.forEach(check_label);
                        }
                    };

                    check_label(tree.root);
                    if (isCompared && !found) {
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
                        if (isCompared) {
                            update(comparedTree.root, comparedTree.data);
                        }
                    } else {
                        // Found label already
                        alert('New label found already in tree(s).');
                    }
                }
            }

            //render the tooltip on click
            //user then chooses which function above to call
            var triWidth = 10;
            var triHeight = 15;
            var rectWidth = 150;
            var rectHeight = 110;

            removeTooltips(svg);

            // this is defining the path of the tooltip
            // start of menu box container
            d3.select(this).append("path")
                .attr("class", "tooltipElem")
                .attr("d", function(d) {
                    return "M" + 0 + "," + 0 + "L" + (-triWidth) + "," + (-triHeight) + "L" + (triWidth) + "," + (-triHeight);
                })
                .style("fill", "gray");
            // this is defining the tooltip
            d3.select(this).append("rect")
                .attr("class", "tooltipElem")
                .attr("x", function(d) {
                    return -(rectWidth / 2);
                })
                .attr("y", function(d) {
                    return -triHeight - rectHeight + 1;
                })
                .attr("width", rectWidth)
                .attr("height", rectHeight)
                .attr("rx", 10)
                .attr("ry", 10)
                .style("fill", "gray");

            var rpad = 10;
            var tpad = 20;
            var textDone = 0;
            var textInc = 20;
            //end of menu box container
            // start of menu buttons

            function add_menu_item(selector, text_f, act_f) {
                d3.select(selector).append("text")
                    .attr("class", "tooltipElem tooltipElemText")
                    .attr("y", (-rectHeight - triHeight + tpad + textDone))
                    .attr("x", ((-rectWidth / 2) + rpad))
                    .style("fill", "white")
                    .style("font-weight", "bold")
                    .text(function(d) {
                        text = text_f(d);
                        if (text) {
                            textDone += textInc;
                            return(text);
                        }
                    })
                    .on("click", act_f);
            };

            if (!d.children && !d._children) {
                add_menu_item(this,
                    function (d) { // text function
                        return 'edit label >'
                    },
                    function (d) { // action function
                        edit_label(d);
                        d.mouseoverHighlight = false;
                        removeTooltips(svg);
                    });
            }
            if (d.parent && (d._children || d.children)) {
                add_menu_item(this,
                    function (d) { // text function
                        if (d._children) { // children invisible
                            return "expand >";
                        } else if (d.children) { //children visible
                            return "collapse >";
                        }
                    },
                    function (d) { // action function
                        postorderTraverse(d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        collapse(d);
                        removeTooltips(svg);
                    });

                add_menu_item(this,
                    function (d) {
                        if (d._children) {
                            return "expand all >";
                        } else if (d.children) {
                            return "collapse all >";
                        }
                    },
                    function (d) {
                        postorderTraverse(d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        collapseAll(d);
                        removeTooltips(svg);
                    });
            };

            //TODO: this has to be changed that also the subtree can be all expanded
            if (d.children || d._children) {
                add_menu_item (this,
                      function(d) {
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
                    function (d) {
                        postorderTraverse(d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        uncollapseAll(d, tree);
                        removeTooltips(svg);
                    });
            }

            // swap subtree menu option
            if (d.children) {
                add_menu_item (this,
                    function(d) {
                        return "swap subtrees >";
                    },
                    function (d) {
                        postorderTraverse (d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        rotate(d);
                        update(tree.root, tree.data);
                        removeTooltips(svg);
                    });
            };


            if (d.parent && d.elementBCN) {
                add_menu_item (this,
                    function (d) {
                        if (d.clickedHighlight) {
                            return "unhighlight >";
                        } else {
                            return "highlight >";
                        }
                    },
                    function (d) {
                        postorderTraverse (d, function(e) {
                            e.mouseoverHighlight = false;
                        });
                        highlight(d);
                        removeTooltips(svg);
                    });
            }

            // end of menu buttons
            d3.selection.prototype.moveToFront = function() {
                return this.each(function() {
                    this.parentNode.appendChild(this);
                });
            };
            d3.select(this).moveToFront();
            d3.select(this).selectAll(".tooltipElemText").each(function(d) {
                d3.select(this).on("mouseover", function(d) {
                    d3.select(this).transition().duration(50).style("fill", "black");
                });
                d3.select(this).on("mouseout", function(d) {
                    d3.select(this).transition().duration(50).style("fill", "white");
                });
            });

        }

        return nodeClick;

    }

    //return all the externalised functions
    return {
        init: init,
        inputTreeFile: inputTreeFile,
        viewTree: viewTree,
        renderColorScale: renderColorScale,
        addTree: addTree,
        addTreeGistURL: addTreeGistURL,
        exportTree: exportTree,
        removeTree: removeTree,
        getTrees: getTrees,
        compareTrees: compareTrees,
        changeSettings: changeSettings,
        getMaxAutoCollapse: getMaxAutoCollapse,
        changeAutoCollapseDepth: changeAutoCollapseDepth
    }
})();
