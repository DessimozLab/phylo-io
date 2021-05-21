import * as d3 from 'd3';
import Interface from './interface.js'

d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
        this.parentNode.appendChild(this);
    });
};

var uid_viewer = 0 // unique id generator is bound to a single Viewer()
const collapse_ratio_vertical = 0.6 // how much a triangle is vertically narrow

// D3 viewer that render any model tree
export default class Viewer {

    constructor(container) {

        // General
        this.container_object = container // related Container()
        this.uid = uid_viewer ++; // unique viewer() id
        this.data; // current model.data used, no Model() here to prevent breaking MVC
        this.model; // current model.data used

        // D3
        this.d3 = d3 // d3.js instance that contain information about zoom, etc..
        this.hierarchy; // converted model data into d3 comptabile data format
        this.d3_cluster; // d3 layout to compute 2D position for d3 hierarchy object
        this.d3_cluster_data; // d3 layout fed with d3 hierarchy data
        this.zoom;
        this.id_gen = 0; // unique id generator for d3 id
        this.max_length;
        this.scale_branch_length; // scale between branch length and x pos

        // DOM
        this.svg;
        this.svg_d3;
        this.G;
        this.G_d3;
        this.container = document.getElementById(this.container_object.div_id);
        this.container_d3 = d3.select(this.container);

        // Settings
        this.settings = {
            'duration' : 0,
            'style': {
                'margin' : {top: 16, right: 16, bottom: 16, left: 96},

            },
            'stack':{
                'labels' : ["Retained", "Duplicated", "Gained", "Lost", "Duplications", "Gains", "Losses"],
                'colors' : ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#ff7f0e", "#2ca02c", "#d62728"],
                'colorMap' : {},
            }

        }
        this.width = parseFloat(window.getComputedStyle(this.container).width) - this.settings.style.margin.left - this.settings.style.margin.right;
        this.height = parseFloat(window.getComputedStyle(this.container).height) - this.settings.style.margin.top - this.settings.style.margin.bottom;

        // ZOOM
        this.zoom = d3.zoom().on("zoom", (d, i) =>  { this.zoomed(d,i)} )

        // SVG
        this.svg = this.container_d3.append("svg")
            .attr("id", "svg" + this.uid)
            .attr("width", this.width + this.settings.style.margin.left + this.settings.style.margin.right )
            .attr("height", this.height + this.settings.style.margin.top + this.settings.style.margin.bottom)
            .call(this.zoom)
            .on("dblclick.zoom", null)
            .call(this.zoom.transform, d3.zoomIdentity.translate(this.settings.style.margin.left,  (this.height/2 +  this.settings.style.margin.top) ))

        this.svg_d3 = d3.select(this.svg)

        // G element for zoom/transform
        this.G = this.svg.append("g")
            .attr("id", "master_g" + this.uid)
            .attr("transform", "translate("+ this.settings.style.margin.left + "," + (this.height/2 +  this.settings.style.margin.top) + ")")
        this.G_d3 = d3.select(this.G);

        // D3 TREE LAYOUT
        this.d3_cluster = d3.cluster()
            .separation((a,b) =>  {return this.separate(a,b)})

        // MISC.
        this.settings.stack.colorMap = this.compute_color_map_stack()

        // INTERFACE
        this.interface = new Interface(this, this.container_object)
    }

    // DATA
    set_data(model){
        this.data = model.data;
        this.model = model;

        if (this.model.settings.has_histogram_data && this.model.settings.show_histogram) { // todo size according to stack size
            this.model.settings.tree.node_vertical_size = 100;
            this.model.settings.tree.node_horizontal_size = 80;
        }
        else {
            this.model.settings.tree.node_vertical_size = 30;
            this.model.settings.tree.node_horizontal_size = 40;
        }

        this.d3_cluster.nodeSize([this.model.settings.tree.node_vertical_size,this.model.settings.tree.node_horizontal_size])
        this.build_d3_data();
    }

    build_d3_data(){

        // Build d3 hierarchy
        this.hierarchy = d3.hierarchy(this.data, d => d.children );
        this.hierarchy.x0 = this.height / 2;
        this.hierarchy.y0 = 0;

        // Transfer "collapse" information from model data to d3 data
        this.hierarchy.each(d => {

            d.ID = null;

            if (d.data.collapse) {
                d._children = d.children;
                d.children = null;
            }
            else {
                d._children = null;
            }
        })

        // Build d3 layout
        this.d3_cluster_data = this.d3_cluster(this.hierarchy);

        // compute the branch length from the root till each nodes (d.branch_size)
        this.max_length = 0
        this.hierarchy.eachBefore(d => {
            if (d.parent) {
                d.branch_size = d.parent.branch_size + d.data.branch_length
                if (d.branch_size > this.max_length) {
                    this.max_length = d.branch_size
                }
            } else {
                d.branch_size = 0
            }
        })

        // store required data for stack on node
        if (this.model.settings.has_histogram_data){
            this.hierarchy.eachBefore((d, i, node) => {

                if( d.data.evolutionaryEvents) {

                    let stackData = []
                    stackData['genes'] = this.barStack(d, 'genes');
                    stackData['events'] = this.barStack(d, 'events');

                    d.stackData = stackData
                }
                else {
                    //console.log("No data for stack in ", d)
                }
            })
            }

        this.build_scale_branch_length() // todo dont build scale on collapse

        this.interface.render();


    }

    build_scale_branch_length(){

        var max_y = 0;
        this.d3_cluster_data.descendants().forEach(d => {
            if (d.y > max_y) {
                max_y = d.y
            }
        })

        this.scale_branch_length = d3.scaleLinear().domain([0, this.max_length]).range([this.d3_cluster_data.y, max_y])
    }

    // RENDERING
    render(source){

        // Get the nodes and edges
        this.nodes = this.d3_cluster_data.descendants();
        this.links = this.d3_cluster_data.descendants().slice(1);

        // And render them
        this.render_nodes(source)
        this.render_edges(source)

    }

    render_nodes(source){


        var self_render = this;

        // update x pos with branch length
        this.nodes.forEach(d => d.y = this.scale_branch_length(d.branch_size))

        // Update the nodes...
        var node = this.G.selectAll('g.node')
            .data(this.nodes, d => { return d.ID  || (d.ID = ++this.id_gen); });

        // Enter any new modes at the parent's previous position.
        var nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr("id", d => {return  this.uid + "_" + d.ID})
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', (d, i) =>  { this.click_nodes(d,i)})

        // Add Circle for the nodes
        nodeEnter.append('circle')
            .attr('class', 'node')
            .attr('r', 1e-6)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        // Add labels for the nodes
        nodeEnter.append('text')
            .attr("dy", ".35em")
            .attr("x", function(d) {
                return d.children || d._children ? -13 : 13;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start"; // todo better deal with internal name
            })
            .text(function(d) { return d.data.name; });

        // create null triangle
        nodeEnter.append("path")
            .attr("class", "triangle")
            .style("fill", "#666")
            .attr("d", function (d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            })

        if (this.model.settings.has_histogram_data && this.model.settings.show_histogram) {
            // create null stack
            nodeEnter.append("g")
                .attr("class", "stackGroup")
        }

        var nodeUpdate = nodeEnter.merge(node);

        // Transition to the proper position for the node
        nodeUpdate.transition()
            .duration(this.settings.duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });


        // Update the node attributes and style
        nodeUpdate.select('circle.node')
            .attr('r', d => d._children ?  1e-6 : 3 )
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#666";
            })
            .attr('cursor', 'pointer');

        // Remove any exiting nodes
        var nodeExit = node.exit().transition()
            .duration(this.settings.duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        // nullify the triangle
        nodeExit.select("path")
            .attr("d", function (d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            });

        if (this.model.settings.has_histogram_data && this.model.settings.show_histogram) {
            // create null stack
            nodeEnter.selectAll("g .stackGroup").remove()
        }


        // On exit reduce the node circles size to 0
        nodeExit.select('circle')
            .attr('r', 1e-6);

        // On exit reduce the opacity of text labels
        nodeExit.select('text')
            .style('fill-opacity', 1e-6);


        // Add collapsed triangle
        nodeUpdate.each(function (d) {

            if (d._children) {

                d3.select(this).select("path").transition().duration(self_render.settings.duration)
                    .attr("d", function (d) {

                        const average = arr => arr.reduce( ( p, c ) => p + c.data.distance_to_root, 0 ) / arr.length;

                        var y = average(self_render.getChildLeaves(d)) -d.data.distance_to_root

                        var y_length = self_render.scale_branch_length(average(self_render.getChildLeaves(d))-d.data.distance_to_root)
                        var x_length =  self_render.model.settings.tree.node_vertical_size * Math.sqrt(self_render.getChildLeaves(d).length) * collapse_ratio_vertical
                        return "M" + 0 + "," + 0 + "L" + y_length + "," + (-x_length) + "L" + y_length + "," + (x_length) + "L" + 0 + "," + 0;
                    })

            }
            if (d.children) {
                d3.select(this).select("path").transition().duration(self_render.settings.duration)
                    .attr("d", function (d) {
                        return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
                    });
            }
        })

        // Add Stack
        if (this.model.settings.has_histogram_data && this.model.settings.show_histogram){
            nodeUpdate.filter(function(d){
                return d.stackData
            }).each((d, i, nodes) => {this.render_stack(nodes[i],d)}
            );
        }

        // Store the old positions for transition.
        this.nodes.forEach(function(d){
            d.x0 = d.x;
            d.y0 = d.y;
        });

    }

    render_edges(source){

        var self_render = this;

        // Update the links...
        var link = this.G.selectAll('path.link')
            .data(this.links, function(d) { return d.id; })

        // Enter any new links at the parent's previous position.
        var linkEnter = link.enter().insert('path', "g")
            .attr("class", "link")
            .attr('d', d => this.square_edges(
                {x: source.x0, y: source.y0},{x: source.x0, y: source.y0}))
        linkEnter.on('click', (d) =>  { this.click_edges(d)})

        var linkUpdate = linkEnter.merge(link);

        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(this.settings.duration)
            .style('stroke', d => d.elementS ? similarity(d.elementS) : "#ccc" )
            .attr('d', d => this.square_edges(d, d.parent))

        // Remove any exiting links
        var linkExit = link.exit().transition()
            .duration(this.settings.duration)
            .attr('d', d => this.square_edges({x: source.x, y: source.y}, {x: source.x, y: source.y}))
            .remove();
    }

    separate(a, b) {

        var spacer = 1;

        spacer += a._children ? Math.sqrt(this.getChildLeaves(a).length) * collapse_ratio_vertical  : 0
        spacer += b._children ? Math.sqrt(this.getChildLeaves(b).length) * collapse_ratio_vertical : 0

        return spacer;
    }

    zoomed({transform}) {
        d3.select("#master_g" + this.uid).attr("transform", transform);
    }

    square_edges(s, d) {

        return   "M" + s.y + "," + s.x + "L" + d.y + "," + s.x + "L" + d.y + "," + d.x;
    }

    click_nodes(event, node) {
        this.container_object.trigger_("collapse", node.data)
    }

    click_edges(edge) {
        this.container_object.trigger_("reroot", event.path[0].__data__)
    }

    set_zoom(k,x,y) {
        d3.select('#svg' + this.uid )
            .transition()
            .duration(this.settings.duration)
            .call(this.zoom.transform, d3.zoomIdentity.translate(x,y).scale(k) );
    }


    // TUNNING
    modify_node_size(axis, variation){

        if (axis === 'vertical') {
            this.model.settings.tree.node_vertical_size += variation
        }
        else if (axis === 'horizontal') {
            this.model.settings.tree.node_horizontal_size += variation
        }

        this.d3_cluster.nodeSize([ this.model.settings.tree.node_vertical_size,this.model.settings.tree.node_horizontal_size])
        this.build_d3_data()
        this.render(this.hierarchy)

    }

    // HELPER
    getChildren(d) {
        return d._children ? d._children : (d.children ? d.children : []);
    }

    getChildLeaves(d) {

        if (d.children || d._children) {
            var leaves = [];
            var children = this.getChildren(d);
            for (var i = 0; i < children.length; i++) {
                leaves = leaves.concat(this.getChildLeaves(children[i]));
            }
            return leaves;
        } else {
            return [d];
        }
    }

    get_random_node(){
        var ns = []
        this.hierarchy.each(d => ns.push(d));
        return ns[Math.floor(Math.random() * ns.length)];
    }

    // UTILS
    centerNode(source) {

        var x = -source.y0 + this.width / 2;
        var y = -source.x0 + this.height / 2;

        d3.select('#svg' + this.uid )
            .transition()
            .duration(this.settings.duration)
            .call(this.zoom.transform, d3.zoomIdentity.translate(x,y).scale(1) );

    }

    // STACK
    render_stack(d,e){
        
        var ms = this.model.settings.stack
        var data = e.stackData[ms.type];
        var stackGroup  = this.d3.select(d);

        var xDistanceFromNode = ms.stackWidth + ms.xInitialRightMargin;
        var txtDistanceFromBar = ms.stackWidth + ms.margin

        if (ms.showHistogramValues) {
            
            var legends = stackGroup.selectAll("text")
                .data(data)
                .enter()
                .append("text")
                .classed("legendtxt", true)
                .text(function (d) {
                    return d[0].realsize !== 0 ? d[0].realsize : "";
                }).attr("x", function () {
                    return (0 - xDistanceFromNode) + txtDistanceFromBar;
                }).attr("y", function (d) {
                    // TODO adjust based on feedback
                    if(d[0].y0 < 0){
                        // legend below zero line
                        return ms.legendTxtSize+2;
                    }

                    // if bar height smaller than text size, put text on bottom
                    if(d[0].y < ms.legendTxtSize && d[0].y0 > 0) {
                        return -(d[0].y0 - d[0].y);
                    }

                    // center legend text vertically with some extra padding
                    return -(d[0].y0 - ((d[0].y + ms.legendTxtSize)/2));
                }).attr("font-size", ms.legendTxtSize).attr("stroke", "black")

        }
        if (ms.showHistogramSummaryValue) {

            var summaryLegend = stackGroup.selectAll(".stackGroup")
                .data(function (d) {
                    return [d];
                })
                .enter()
                .append("text")
                .classed("legendsummarytxt", true)
                .text(function (d) {
                    var summary_number = ms.type === "genes" ? d.data.nr_hogs : d.numberEvents; // todo add nr_proteins and  numberEvents
                    return summary_number > 0 && typeof summary_number == 'number' ? summary_number : "";
                }).attr("x", function () {
                    return 0 - (xDistanceFromNode + 30)
                }).attr("y", function (d) {
                    return 0 - ms.margin;
                }).attr("font-size", ms.legendTxtSize).attr("stroke", "black")

        }

        var stackSlices = stackGroup.selectAll("rect")
            .data(data)
            .enter()
            .append("rect");

        var slices = stackSlices
            .style("fill", (d,i,node) => { return this.settings.stack.colorMap[d[0].sizelbl]
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
            .attr("width", ms.stackWidth)

        d3.selectAll(".stackGroup").moveToFront();

    }

    compute_color_map_stack(){

        var l = this.settings.stack.labels
        var c = this.settings.stack.colors

        var colMap =  c.reduce(function(colMap, col, index) {

            colMap[l[index]] = col;
            return colMap;
        }, {})

        return colMap

    }

    getStackNormalizer(d, type){

        var ms = this.model.settings.stack

        if(type === 'genes' || !type){

            if(ms.maxStackHeight === "max" && this.model.largestGenome > 0){
                var normalizer = ms.stackHeight / this.model.largestGenome;
            } else if(Number.isInteger(ms.maxStackHeight)){
                var normalizer = ms.maxStackHeight / (d.retained + d.duplicated + d.gained + Math.abs(d.lost));
            } else {
                var normalizer = ms.stackHeight / (d.retained + d.duplicated + d.gained + Math.abs(d.lost));
            }

        } else {

            if(ms.maxStackHeight === "max" && this.model.largestEvents > 0){
                var normalizer = ms.stackHeight / this.model.largestEvents;
            } else if(Number.isInteger(ms.maxStackHeight)){
                var normalizer = m.maxStackHeight / (d.duplication + d.gained + Math.abs(d.lost));
            } else {
                var normalizer = ms.stackHeight / (d.duplication + d.gained + Math.abs(d.lost));
            }

        }

        return normalizer;

    }

    barStack(seriesDataAll, type) {

        var data;

        if(type === 'genes' || !type) {
            data = [[{}], [{}], [{}], [{}]];
        } else {
            data = [[{}], [{}], [{}]];
        }

        var size = 0;
        var d = seriesDataAll.data.evolutionaryEvents;
        var posBase = 0; // positive base
        var stackIndex = 0;
        var seriesIndex = 0;

        var normalizer = this.getStackNormalizer(d, type);

        /* in case there's no eveolutionary events */
        normalizer = !isFinite(normalizer) ? 1 : normalizer;


        var realSize;
        var StackSizeretained = (d.retained) ? stackScale(d.retained, normalizer) : 0;
        var StackSizeDuplicated = (d.duplicated) ? stackScale(d.duplicated, normalizer) : 0;
        var StackSizeDuplication = (d.duplication) ? stackScale(d.duplication, normalizer) : 0;
        var StackSizeGained = (d.gained) ? stackScale(d.gained, normalizer) : 0;
        var StackSizeLost = (d.lost) ? stackScale(d.lost, normalizer) : 0;
        var posStackSize = StackSizeGained + StackSizeDuplicated + StackSizeretained;

        if(type == 'genes' || !type){

            realSize = Math.abs(d.retained) > 0 ? Math.abs(d.retained) : 0;
            var posBase = posBase + StackSizeretained;
            data[stackIndex][seriesIndex] = new seriesElement('Retained', realSize, StackSizeretained, posBase, posStackSize)
            stackIndex++;

            realSize = Math.abs(d.duplicated);
            var posBase = posBase + StackSizeDuplicated
            data[stackIndex][seriesIndex] = new seriesElement('Duplicated', realSize, StackSizeDuplicated, posBase, posStackSize)
            stackIndex++;
        } else {

            realSize = Math.abs(d.duplication);
            var posBase = posBase + StackSizeDuplication
            data[stackIndex][seriesIndex] = new seriesElement('Duplications', realSize, StackSizeDuplication, posBase, posStackSize)
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



};


