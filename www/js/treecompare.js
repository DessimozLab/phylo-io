TreeCompare = (function() {

    var trees = [];
    var renderedTrees = [];

    var scaleLineWidth = 0;
    var scaleLinePadding = 10;

    /*
        colors for the color scale for comparing nodes to best common node
    */
    var colorScaleRange = ['rgb(254,240,217)', 'rgb(253,212,158)', 'rgb(253,187,132)', 'rgb(252,141,89)', 'rgb(227,74,51)', 'rgb(179,0,0)'];
    var colorScaleDomain = [1, 0.8, 0.6, 0.4, 0.2, 0];

    var padding = 20;

    var scaleTextColor = "white";

    var triangleHeightDivisor = 3;

    var defaultLineColor = "black";

    var currentS = "elementS";
    var currentBCN = "elementBCN";

    var highlightedNodes = [];
    var maxHighlightedNodes = 20;


    var settings = {
        useLengths: true,
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
        external function for changing settings, any rendered trees are updated
    */
    function changeSettings(settingsIn) {
        settings.useLengths = (!(settingsIn.useLengths === undefined)) ? settingsIn.useLengths : settings.useLengths;
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
        settings.enableFisheyeZoom = (!(settingsIn.enableFisheyeZoom === undefined)) ? settingsIn.enableFisheyeZoom : settings.enableFisheyeZoom;
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

    function updateAllRenderedTrees() {
        for (var i = 0; i < renderedTrees.length; i++) {
            update(renderedTrees[i].data.root, renderedTrees[i].data);
        }
    }

    /*
        Newick to JSON converter
    */
    function convertTree(s) {
        var ancestors = [];
        var tree = {};
        var tokens = s.split(/\s*(;|\(|\)|,|:)\s*/);
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
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
                case ')': // optional name next
                    tree = ancestors.pop();
                    break;
                case ':': // optional length next
                    break;
                default:
                    var x = tokens[i - 1];
                    if (x == ')' || x == '(' || x == ',') {
                        tree.name = token;
                    } else if (x == ':') {
                        tree.length = parseFloat(token);
                    }
            }
        }
        return tree
    }

    /*
        Called externally to convert a tree and add to internal tree structure
    */
    function addTree(newick, name) {
        if (name === undefined) {
            var num = trees.length;
            name = "Tree " + num;
        }
        try {
            var tree = convertTree(newick);
            console.log(tree)
        } catch (err) {
            throw "Invalid Newick";
        }
        for (var i = 0; i < trees.length; i++) {
            if (name === trees[i].name) {
                throw "Tree With Name Already Exists"
            }
        }
        //add required parameters to each node
        postorderTraverse(tree, function(d) {
            d.leaves = getChildLeaves(d);
            d.clickedParentHighlight = false;
            d.mouseoverHighlight = false;
            d.correspondingHighlight = false;
        });
        var fullTree = {
            root: tree,
            name: name,
            data: {}
        };
        trees.push(fullTree);
        return fullTree;
    }

    function getTrees() {
        return trees
    }

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
                offset = children[i].y;
                if (length != 0 && offset != 0) {
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
        returns longest length between two nodes of all nodes in subtree from node passed to function
    */
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

        } else {
            f(d);

        }
    }

    /*
        Main update function for updating visualisation
    */
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
        //console.log(nodes)
        var links = treeData.tree.links(nodes);
        //console.log(links)
        var leaves = treeData.root.leaves.length;
        //console.log(leaves)
        var leavesVisible = getVisibleLeaves(treeData.root);
        var width = $("#" + treeData.canvasId).width();
        var height = $("#" + treeData.canvasId).height();
        var renderHeight = height - padding * 2;
        var leavesHidden = 0;
        var triangles = 0;
        postorderTraverse(treeData.root, function(d) {
            if (d._children) {
                leavesHidden += d.leaves.length;
                triangles += 1;
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


        var height = leaves * leafHeight;
        var trianglePadding = leafHeight;

        //helper function to get info about number of collapsed nodes in a subtree
        function getCollapsedParams(e) {
            var collapsedHeightInner = 0;
            var leavesHiddenInner = 0;

            function getCollapsedHeight(d) {
                if (d._children) {
                    collapsedHeightInner += ((leafHeight / triangleHeightDivisor * d.leaves.length) + (trianglePadding * 2));
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
        var collapsedHeight = params.collapsedHeight; // getCollapsedParams(e)
        var leavesHidden = params.leavesHidden; // getCollapsedParams(e)


        // Set parameters for setXPos function....
        var divisor = ((treeData.root.leaves.length - leavesHidden) > 0) ? (treeData.root.leaves.length - leavesHidden) : 1;
        var amendedLeafHeight = ((treeData.root.leaves.length * leafHeight) - collapsedHeight) / (divisor);
        var center = (leaves / 2) * leafHeight;

        //calculate the vertical position for a node in the visualisation
        //yes x is vertical position, blame d3's tree vis structure not me...
        //TODO: here has to be changed in order that the node for the parents is in the center between the highest and lowest of its children
        function setXPos(d, upperBound) {
            if (d.children) {
                var originalUpperBound = upperBound;
                for (var i = 0; i < d.children.length; i++) {
                    setXPos(d.children[i], upperBound);
                    var collapsedHeight = 0;
                    var leavesHidden = 0;
                    var params = getCollapsedParams(d.children[i]);
                    var collapsedHeight = params.collapsedHeight;
                    var leavesHidden = params.leavesHidden;
                    upperBound += (((d.children[i].leaves.length - leavesHidden) * amendedLeafHeight) + collapsedHeight);
                }
                d.x = originalUpperBound + ((upperBound - originalUpperBound) / 2)
            } else if (d._children) {
                var params = getCollapsedParams(d);
                var collapsedHeight = params.collapsedHeight;
                d.x = upperBound + (collapsedHeight / 2);
            } else {
                d.x = upperBound + amendedLeafHeight / 2;
            }
            d.x = d.x
            //d.x = d.x + padding;
        }

        var maxLength = getMaxLength(treeData.root);

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
            .style("cursor", "pointer")
            .on("mouseover", nodeMouseover)
            .on("mouseout", nodeMouseout)
            .on("click", treeData.clickEvent);


        nodeEnter.append("circle")
            .attr("r", settings.nodeSize)
            .style("fill", function(d) {
                if (d.bcnhighlight) {
                    return d.bcnhighlight;
                } else if (d[currentS] && d.highlight < 1) {
                    return colorScale(d[currentS])
                } else {
                    return (d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight) ? "green" : d._children ? "orange" : "black";
                }
            });

        nodeEnter.append("rect")
            .attr("y", "-5px")
            .attr("x", "-5px")
            .attr("width", "0px")
            .attr("height", "0px")
            .style("fill", "magenta")
            .style("stroke-width", "2px")
            .style("stroke", "black");

        nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? -13 : 13;
            })
            .attr("dy", ".35em")
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
                return d.searchHighlight ? "red" : ((d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight) ? "green " : "black");
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
                    return d.bcnhighlight;
                } else if (d.searchHighlight) {
                    return "red";
                } else if (d[currentS] && !(d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight)) {
                    return colorScale(d[currentS])
                } else {
                    return (d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight) ? "green" : d._children ? "orange" : "black";
                }
            })
            .style("stroke", "black")
            .style("stroke-width", 1);


        node.select("rect")
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
                    return d.clickedHighlight;
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
                if (!d.children && !d._children) {
                    return d.name
                } else {
                    if (settings.internalLabels === "none") {
                        return "";
                    } else if (settings.internalLabels === "name") {
                        return d.name
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

        node.each(function(d) {
            if (d._children) {
                var total = 0;
                _.each(d.leaves, function(e) {
                    total = total + (getLength(e) * (lengthMult / maxLength));
                });
                var avg = total / d.leaves.length;
                var offset = leafHeight / triangleHeightDivisor * d.leaves.length / 2;

                d3.select(this).select("path").transition().duration(duration)
                    .attr("d", function(d) {
                        return "M" + 0 + "," + 0 + "L" + (avg - (getLength(d) * (lengthMult / maxLength))) + "," + (-offset) + "L" + (avg - (getLength(d) * (lengthMult / maxLength))) + "," + (offset) + "L" + 0 + "," + 0;
                    })
                    .style("fill", function(d) {
                        if (d[currentS]) {
                            return colorScale(d[currentS])
                        } else {
                            return "black";
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
            var link = treeData.svg.selectAll("path." + select)
                .data(links, function(d) {
                    return d.target.id;
                })
                .style("stroke", function(d) {
                    if (type === "front") {
                        var e = d.target;
                        if (e.searchHighlight) {
                            return "red";
                        }
                        var d = d.source;
                        if (d[currentS] && !(d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight)) {
                            return colorScale(d[currentS])
                        } else {
                            return (d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight) ? "green" : defaultLineColor;
                        }
                    } else if (type === "bg") {
                        return "black"
                    }
                });

            // Enter any new links at the parent"s previous position.
            link.enter().insert("path", "g")
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
                        if (d.parent) {
                            return "M" + d.parent.y + "," + d.parent.x + "L" + d.parent.y + "," + d.parent.x + "L" + d.parent.y + "," + d.parent.x;
                        } else {
                            return "M" + source.y + "," + source.x + "L" + source.y + "," + source.x + "L" + source.y + "," + source.x;
                        }
                    } else {
                        return "M" + source.y + "," + source.x + "L" + source.y + "," + source.x + "L" + source.y + "," + source.x;
                    }

                })
                .style("fill", "none")
                .style("stroke-width", function() {
                    if (type === "bg") {
                        return (parseInt(settings.lineThickness) + 2);
                    } else if (type === "front") {
                        return settings.lineThickness
                    }
                })
                .style("stroke", function(d) {
                    if (type === "front") {
                        var e = d.target;
                        if (e.searchHighlight) {
                            return "red";
                        }
                        var d = d.source;
                        if (d[currentS] && !(d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight)) {
                            return colorScale(d[currentS])
                        } else {
                            return (d.clickedParentHighlight || d.correspondingHighlight || d.mouseoverHighlight) ? "green" : defaultLineColor;
                        }
                    } else if (type === "bg") {
                        return "black"
                    }
                });

            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .style("stroke-width", function() {
                    if (type === "bg") {
                        return (parseInt(settings.lineThickness) + 2);
                    } else if (type === "front") {
                        return settings.lineThickness
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
        if (treeData.root[currentS]) {
            renderLinks("bg");
        }
        renderLinks("front");


        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        //wait for transition before generating download
        if (settings.enableDownloadButtons) {
            setTimeout(function() {
                updateDownloadLinkContent(treeData.canvasId)
            }, duration);
        }

        //calculate the new scale text 
        applyScaleText(treeData.scaleText, treeData.zoomBehaviour.scale(), treeData.root);


        //event listeners for nodes to handle mouseover highlighting
        function nodeMouseover(d) {
            function colorLink(n) {
                if (n.children) {
                    for (var i = 0; i < n.children.length; i++) {
                        colorLink(n.children[i]);
                    }
                }
                if (!settings.enableFisheyeZoom) {
                    n.mouseoverHighlight = true;
                }
            }
            colorLink(d);
            if (!settings.enableFisheyeZoom) {
                update(d, treeData);
            }
        }

        function nodeMouseout(d) {
            function colorLink(n) {
                if (n.children) {
                    for (var i = 0; i < n.children.length; i++) {
                        colorLink(n.children[i]);
                    }
                }
                if (!settings.enableFisheyeZoom) {
                    n.mouseoverHighlight = false;
                }
            }

            colorLink(d);
            if (!settings.enableFisheyeZoom) {
                update(d, treeData);
            }
        }

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
        d3.select("#downloadButtons" + canvasId).append("a")
            .attr("title", "file.svg")
            .attr("href-lang", "image/svg+xml")
            .attr("href", "data:image/svg+xml;base64,\n" + btoa(html))
            .text("Download As SVG")
            .attr("download", "PhyloIO_Tree");
        $("#downloadButtons" + canvasId + " a").css({
            "color": "#999"
        });
    }

    /*
        Helper function to see if a string starts with another string (used in the real time search)
    */
    function startsWith(string, start) {
        var does = true;
        for (var i = 0; i < string.length; i++) {
            if (string[i] && start[i]) {
                does = does && (string[i] === start[i]);
            }
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


    //
    //
    //   Main function for setting up a d3 visualisation of a tree
    //
    //

    function renderTree(name, canvasId, scaleId, otherTreeName) {
        //get the trees by name
        var baseTree = trees[findTreeIndex(name)];
        if (otherTreeName !== undefined) {
            var otherTree = trees[findTreeIndex(name)];
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
                "margin-left": "10px",
                "margin-right": "10px",
                "margin-top": topMargin,
                "position": "absolute"
            });
            $("#" + canvasId + " .zoomButton").css({
                "font-size": "10px",
                "width": "26px",
                "height": "26px",
                "vertical-align": "top"
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


            //TODO: Apply event listeners and handlers
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
                timeoutIdUp = setInterval(actionUp, 50);
            }).bind('mouseup mouseleave', function() {
                clearTimeout(timeoutIdUp);
            });

            var timeoutIddown = 0;
            $("#" + canvasId + " #downButton").mousedown(function() {
                actionDown();
                timeoutIddown = setInterval(actionDown, 50);
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

        if (settings.enableDownloadButtons) {
            $("#" + canvasId).append('<div id="downloadButtons' + canvasId + '"></div>');
            $("#downloadButtons" + canvasId).css({
                "margin-left": "2px",
                "bottom": "5px",
                "position": "absolute"

            });
        }

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
                        "display": "none",
                    });
                    $("#searchInput" + canvasId).val("");
                });
            }


            var visible = false;
            $('#searchButton' + canvasId).click(function() {
                if (!visible) {
                    visible = true;
                    $("#searchInput" + canvasId).css({
                        "display": "inline"
                    });
                    $("#searchInput" + canvasId).animate({
                        width: "150px"
                    }, 600, function() {
                        $("#searchInput" + canvasId).focus();
                    });

                } else {

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

            //main event handler, performs search every time a char is typed so can get realtime results
            $("#searchInput" + canvasId).bind("paste keyup", function() {
                $("#resultsList" + canvasId).empty();
                var text = $(this).val();
                var results = _.filter(leafObjs, function(leaf) {
                    return startsWith(leaf.name.toLowerCase(), text.toLowerCase());
                });
                if (text !== "") {
                    $("#resultsBox" + canvasId).slideDown(200);
                    $("#resultsList" + canvasId).empty();

                    for (var i = 0; i < results.length; i++) {
                        $("#resultsList" + canvasId).append('<li class="' + i + '"><a href="#">' + results[i].name + '</a></li>');
                        $("#resultsList" + canvasId + " li").css({
                            "margin-left": "-25px",
                            "list-style-type": "none",
                            "cursor": "pointer",
                            "cursor": "hand"
                        });
                        $("#resultsList" + canvasId + " ." + i).on("click", function() {
                            var index = $(this).attr("class");
                            expandPathToLeaf(results[index]);
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
                } else {
                    $("#resultsList" + canvasId).empty();
                    $("#resultsBox" + canvasId).slideUp(200, function() {
                        $("#resultsBox" + canvasId).css({
                            "display": "none"
                        });
                    });
                }

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
            var scaleSvg = d3.select(scaleId).append("svg")
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
            d.clickedParentHighlight = false;
            d.correspondingHighlight = false;
            d.mouseoverHighlight = false;
        });



        applyEventListeners(baseTree.data);

        jQuery.extend(baseTree.data, {
            treeWidth: settings.treeWidth,
            treeHeight: settings.treeHeight
        });


        if (settings.fitTree === "scale") {
            var renderHeight = height - padding * 2;
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
            var maxLength = getMaxLength(baseTree.data.root);
            var newWidth = (width / longest) * maxLength - padding * 2;
            baseTree.data.treeWidth = newWidth;
            baseTree.data.treeHeight = newHeight;
            console.log(baseTree)
        }
        update(baseTree.root, baseTree.data);
        getFisheye();


        //handle all the fisheye zoom stuff
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

                link.attr("d", function(d) {
                    return "M" + d.source.y + "," + d.source.fisheye.x + "L" + d.source.y + "," + d.target.fisheye.x + "L" + d.target.y + "," + d.target.fisheye.x;
                });

                linkbg.attr("d", function(d) {
                    return "M" + d.source.y + "," + d.source.fisheye.x + "L" + d.source.y + "," + d.target.fisheye.x + "L" + d.target.y + "," + d.target.fisheye.x;
                });
            }
        });

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
                }

            } else if (prev == scale) {
                var padding = 100;
                var wcanvas = $("#" + canvasId + " svg").width();
                var hcanvas = $("#" + canvasId + " svg").height();
                var displayedWidth = w;
                var h = d3.select("#" + canvasId + " svg g").node().getBBox().height;
                var w = d3.select("#" + canvasId + " svg g").node().getBBox().width;
                var translation = d3.event.translate;
                var tbound = -(h - hcanvas) - (padding * scale);
                var bbound = padding;
                var lbound = -(w - wcanvas) - (padding * scale);
                var rbound = padding;
                applyScaleText(scaleText, scale, root);
                // limit translation to thresholds
                if (h < (hcanvas - (padding * 2))) {
                    bbound = tbound - padding;
                    tbound = padding;
                }
                if (w < (wcanvas - (padding * 2))) {
                    rbound = lbound - padding;
                    lbound = padding;
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
            var padding = 100;
            var wcanvas = $("#" + canvasId + " svg").width();
            var hcanvas = $("#" + canvasId + " svg").height();
            var displayedWidth = w * scale;
            var scale = d3.event.scale;
            var h = d3.select("#" + canvasId + " svg g").node().getBBox().height * scale;
            var w = d3.select("#" + canvasId + " svg g").node().getBBox().width * scale;
            var translation = d3.event.translate;
            var tbound = -(h - hcanvas) - (padding * scale);
            var bbound = padding;
            var lbound = -(w - wcanvas) - (padding * scale);
            var rbound = padding;
            applyScaleText(scaleText, scale, root);
            // limit translation to thresholds
            if (h < (hcanvas - (padding * 2))) {
                bbound = tbound - padding;
                tbound = padding;
            }
            if (w < (wcanvas - (padding * 2))) {
                rbound = lbound - padding;
                lbound = padding;
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
    };

    /*
        Returns number of visible leaves in the tree
    */
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

    /*
        externally callable
        update the collapsed nodes according to the new render depth
    */
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
                getVisibleBCNs(renderedTrees[0].root, renderedTrees[1].root, false);
                update(renderedTrees[0].root, renderedTrees[0].data);
                update(renderedTrees[1].root, renderedTrees[1].data);
                settings.loadedCallback();
            }, 2);
        } else {
            update(renderedTrees[0].root, renderedTrees[0].data);
        }
    }

    /*
        Expand all collapsed nodes on the path to given leaf node
        Also add highlight to nodes if this is a search
    */
    function expandPathToLeaf(leaf, unhighlight) {
        if (unhighlight === undefined) {
            unhighlight = false;
        }
        if (leaf.parent) {
            if (!unhighlight) {
                if (leaf.parent._children) {
                    leaf.parent.children = leaf.parent._children;
                    leaf.parent._children = null;
                }
                leaf.searchHighlight = true;
            } else {
                leaf.searchHighlight = false;
            }
            expandPathToLeaf(leaf.parent, unhighlight);
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
                if (recalculate || !d.elementBCN) {
                    BCN(d, t);
                }

            } else {
                if (recalculate || !d.elementBCN) {
                    BCN(d, t);
                }

            }
        }
        getAllBCNs(tree1, tree2);
        getAllBCNs(tree2, tree1);
    }

    /*
        Calculates some stuff needed for calculating BCNs later on
    */
    function preprocessTrees(index1, index2) {
        var tree1 = trees[index1].root;
        var tree2 = trees[index2].root;


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
        });
        postorderTraverse(tree2, function(d) {
            d.deepLeafList = createDeepLeafList(d);
        });
        getVisibleBCNs(tree1, tree2);
        //}
    }

    /*
        get a spanning tree containing leaves given 
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

            } else {
                deepLeafList.push(d.name);

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

    /*
        external function for initialising a tree comparison visualisation
    */
    function compareTrees(name1, canvas1, name2, canvas2, scale1, scale2) {
        renderedTrees = [];
        var index1 = findTreeIndex(name1);
        var index2 = findTreeIndex(name2);
        settings.loadingCallback();
        setTimeout(function() {
            uncollapseAll(trees[index1].root);
            uncollapseAll(trees[index2].root);
            stripPreprocessing(trees[index1].root);
            stripPreprocessing(trees[index2].root);
            getDepths(trees[index1].root);
            getDepths(trees[index2].root);
            if (settings.autoCollapse !== null) {
                limitDepth(trees[index1].root, settings.autoCollapse);
                limitDepth(trees[index2].root, settings.autoCollapse);
            }
            preprocessTrees(index1, index2);
            trees[index1].data.clickEvent = getClickEventListener(trees[index1], true, trees[index2]);
            trees[index2].data.clickEvent = getClickEventListener(trees[index2], true, trees[index1]);
            renderTree(name1, canvas1, scale1, name2);
            renderTree(name2, canvas2, scale2, name1);
            settings.loadedCallback();
        }, 2);

    }

    /*
        external function for initialising a single tree visualisation
    */
    function viewTree(name, canvasId, scaleId) {
        renderedTrees = [];
        var index = findTreeIndex(name);
        settings.loadingCallback();
        setTimeout(function() {
            uncollapseAll(trees[index].root);
            stripPreprocessing(trees[index].root);
            getDepths(trees[index].root);
            if (settings.autoCollapse !== null) {
                limitDepth(trees[index].root, settings.autoCollapse);
            }
            trees[index].data.clickEvent = getClickEventListener(trees[index], false, {});
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
            }
        } else {
            if (d._children) {
                d.children = d._children;
                d._children = null;
            }
        }
        var children = getChildren(d);
        for (var i = 0; i < children.length; i++) {
            limitDepth(children[i], depth);
        }
    }

    /*
        uncollapse all collapsed nodes
    */
    function uncollapseAll(root) {
        postorderTraverse(root, function(d) {
            if (d._children) {
                d.children.
                d.children = d._children;
                d._children = null;
            }
        });

    }

    /*
        Strip everything from the last time the tree was rendered
        prevents rendering bugs on second render
    */
    function stripPreprocessing(root) {
        postorderTraverse(root, function(d) {
            d.bcnhighlight = null;
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
        get relevant event listener for clicking on a node depending on what mode is selected
    */
    function getClickEventListener(tree, isCompared, comparedTree) {

        function nodeClick(d) {
            var svg = tree.data.svg;
            if (d.tooltipActive) {
                d.tooltipActive = false;
                postorderTraverse(d, function(e) {
                    e.mouseoverHighlight = false;
                });
                update(d, tree.data);
                removeTooltips(svg);
                return;
            }
            d.tooltipActive = true;


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
                var load = false;
                if (isCompared && d._children) {
                    load = true;
                    settings.loadingCallback();
                }
                setTimeout(function() {
                    if (d.children) {
                        d._children = d.children;
                        d.children = null;
                    } else {
                        d.children = d._children;
                        d._children = null;
                        if (isCompared) {
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

            function collapseAll(d) {
                var load = false;
                if (isCompared && d._children) {
                    load = true;
                    settings.loadingCallback();
                }
                setTimeout(function() {
                    if (d._children) {// used when collapsed for uncollapsing
                        postorderTraverse(d, function(e) {
                            if (e._children) {
                                e.children = e._children;
                                e._children = null;
                            }
                            if (isCompared) {
                                BCN(e, comparedTree.root);
                            }
                        });
                    } else if (d.children) { //used when uncollapsed for collapsing
                        postorderTraverse(d, function(e) {
                            if (e.children) {
                                e._children = e.children;
                                e.children = null;
                            }
                        });
                    }
                    if (load) {
                        settings.loadedCallback();
                    }
                    update(d, tree.data);
                    console.log(tree.data)
                }, 2)

            }


            function highlight(d) {
                var bcnColors = d3.scale.category20();
                if (isCompared) {
                    function colorLink(n, hl) {
                        if (n.children) {
                            for (var i = 0; i < n.children.length; i++) {
                                colorLink(n.children[i], hl);
                            }
                        }
                        if (hl) {
                            n.clickedParentHighlight = true;
                        } else {
                            n.clickedParentHighlight = false;
                        }
                    }

                    if (!_.contains(highlightedNodes, d)) {
                        if (highlightedNodes.length < maxHighlightedNodes) {
                            d.clickedHighlight = bcnColors(highlightedNodes.length);
                            d[currentBCN].bcnhighlight = bcnColors(highlightedNodes.length);
                            highlightedNodes.push(d);
                            var leaves = d.leaves;
                            var otherTree = comparedTree.root;
                            var otherTreeData = comparedTree.data;
                            var otherTreeLeaves = otherTreeData.leaves;
                            for (var i = 0; i < leaves.length; i++) {
                                leaves[i].correspondingLeaf.correspondingHighlight = true;
                            }
                            expandPathToNode(d[currentBCN]);
                            settings.loadingCallback();
                            setTimeout(function() {
                                getVisibleBCNs(otherTree, tree.root, false);
                                settings.loadedCallback();
                                colorLink(d, true);
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
                        colorLink(d, false);
                        update(d, tree.data);
                        update(otherTreeData.root, otherTreeData);
                    }

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

            d3.selectAll(".tooltipElem").remove();// ensures that not multiple reactangles are open when clicking on another node

            d3.select(this).append("path")
                .attr("class", "tooltipElem")
                .attr("d", function(d) {
                    return "M" + 0 + "," + 0 + "L" + (-triWidth) + "," + (-triHeight) + "L" + (triWidth) + "," + (-triHeight);
                })
                .style("fill", "gray");

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
            var textInc = 20; // changed from 20
            d3.select(this).append("text")
                .attr("class", "tooltipElem tooltipElemText")
                .attr("y", (-rectHeight - triHeight + tpad + textDone))
                .attr("x", ((-rectWidth / 2) + rpad))
                .style("fill", "white")
                .style("font-weight", "bold")
                .text(function(d) {
                    if (d._children) { // if object d has only one child
                        textDone += textInc;
                        return "uncollapse >";
                    } else if (d.children) {
                        textDone += textInc;
                        return "collapse >";
                    } /*else if (d.children || d._children) {
                        textDone += textInc;
                        return "rotate";
                    }*/
                })
                .on("click", function(d) {
                    postorderTraverse(d, function(e) {
                        e.mouseoverHighlight = false;
                    });
                    collapse(d);
                    removeTooltips(svg);

                });

            d3.select(this).append("text")
                        .attr("class", "tooltipElem tooltipElemText")
                        .attr("y", (-rectHeight - triHeight + tpad + textDone))
                        .attr("x", ((-rectWidth / 2) + rpad))
                        .style("fill", "white")
                        .style("font-weight", "bold")
                        .text(function(d) {
                            if (d._children) {
                                textDone += textInc;
                                return "uncollapse all >";
                            } else if (d.children) {
                                textDone += textInc;
                                return "collapse all >";
                            }
                })
                .on("click", function(d) {
                    postorderTraverse(d, function(e) {
                        e.mouseoverHighlight = false;
                    });
                    collapseAll(d);
                    removeTooltips(svg);
                });

            // This is to rotate two branches at a node
            d3.select(this).append("text")
                .attr("class", "tooltipElem tooltipElemText")
                .attr("y", (-rectHeight - triHeight + tpad + textDone))
                .attr("x", ((-rectWidth / 2) + rpad))
                .style("fill", "white")
                .style("font-weight", "bold")
                .text(function(d) {
                    if (d.children) {
                        textDone += textInc;
                        return "rotate";
                    }
                })
                .on("click", function(d) {
                    postorderTraverse(d, function(e) {
                        e.mouseoverHighlight = false;
                    });
                    //TODO: add function to rotate branches!!!
                    rotate(d);
                    removeTooltips(svg);
                });

            d3.select(this).append("text")
                .attr("class", "tooltipElem tooltipElemText")
                .attr("y", (-rectHeight - triHeight + tpad + textDone))
                .attr("x", ((-rectWidth / 2) + rpad))
                .style("fill", "white")
                .style("font-weight", "bold")
                .text(function(d) {
                    if (d.elementBCN) {
                        textDone += textInc;
                        if (d.clickedParentHighlight) {
                            return "unhighlight >";
                        } else {
                            return "highlight >";
                        }
                    }
                })
                .on("click", function(d) {
                    postorderTraverse(d, function(e) {
                        e.mouseoverHighlight = false;
                    });
                    highlight(d);
                    removeTooltips(svg);
                });

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

        //function to allow to click on branches http://bl.ocks.org/robschmuecker/0f29a2c867dcb1b44d18
        //function linkClick(d){...}
        //return linkClick;

    }

    //get the best corresponding node in tree for node v
    function BCN(v, tree) {

        var elementBCNNode = null;
        var maxElementS = 0;
        var leaves = v.leaves;
        var spanningTree = getSpanningTree(tree, leaves);
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



    }

    //return all the externalised functions
    return {
        init: init,
        viewTree: viewTree,
        renderColorScale: renderColorScale,
        addTree: addTree,
        removeTree: removeTree,
        getTrees: getTrees,
        compareTrees: compareTrees,
        changeSettings: changeSettings,
        changeAutoCollapseDepth: changeAutoCollapseDepth
    }
})();
