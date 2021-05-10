import * as d3 from 'd3';

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
            'tree': {
                'node_vertical_size' : 30,
                'node_horizontal_size' : 40,
            },
            'style': {

                'margin' : {top: 16, right: 16, bottom: 16, left: 96},

            },

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
            .nodeSize([this.settings.tree.node_vertical_size,this.settings.tree.node_horizontal_size])
            .separation((a,b) =>  {return this.separate(a,b)})
    }

    set_data(model){
        this.data = model.data;
        this.model = model;
        this.build_d3_data();
    }

    render(source){

        var self_render = this;

        // Get the nodes and edges
        this.nodes = this.d3_cluster_data.descendants();
        this.links = this.d3_cluster_data.descendants().slice(1);


        // NODES --------------------------------------------------------------------------------

        // update x pos with branch length
        this.nodes.forEach(d => d.y = this.scale_branch_length(d.branch_size))

        // Update the nodes...
        var node = this.G.selectAll('g.node')
            .data(this.nodes, d => { return d.id  || (d.id = ++this.id_gen); });

        // Enter any new modes at the parent's previous position.
        var nodeEnter = node.enter().append('g')
            .attr('class', 'node')
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
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) { return d.data.name; });

        nodeEnter.append("path")
            .attr("class", "triangle")
            .style("fill", "#666")
            .attr("d", function (d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            })
            //.on('click', (d, i) =>  { self_render.click_nodes(d,i)})


        var nodeUpdate = nodeEnter.merge(node);

        // Transition to the proper position for the node
        nodeUpdate.transition()
            .duration(this.settings.duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });


        // Update the node attributes and style
        nodeUpdate.select('circle.node')
            .attr('r', d => d._children ?  1e-6 : 5 )
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

        nodeExit.select("path")
            .attr("d", function (d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            });

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
                        var x_length =  self_render.settings.tree.node_vertical_size * Math.sqrt(self_render.getChildLeaves(d).length) * collapse_ratio_vertical
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

        // EDGES --------------------------------------------------------------------------------

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

        // Store the old positions for transition.
        this.nodes.forEach(function(d){
            d.x0 = d.x;
            d.y0 = d.y;
        });

    }

    build_d3_data(){

        // Build d3 hierarchy
        this.hierarchy = d3.hierarchy(this.data, d => d.children );
        this.hierarchy.x0 = this.height / 2;
        this.hierarchy.y0 = 0;

        // Transfer "collapse" information from model data to d3 data
        this.hierarchy.each(d => {
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

        this.build_scale_branch_length() // dont build scale on collapse


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

    modify_node_size(axis, variation){

        if (axis === 'vertical') {
            this.settings.tree.node_vertical_size += variation
        }
        else if (axis === 'horizontal') {
            this.settings.tree.node_horizontal_size += variation
        }

        this.d3_cluster.nodeSize([ this.settings.tree.node_vertical_size,this.settings.tree.node_horizontal_size])
        this.build_d3_data()
        this.render(this.hierarchy)

    }

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

    centerNode(source) {

        var x = -source.y0 + this.width / 2;
        var y = -source.x0 + this.height / 2;

        d3.select('#svg' + this.uid )
            .transition()
            .duration(this.this.settings.duration)
            .call(this.zoom.transform, d3.zoomIdentity.translate(x,y).scale(1) );

    }

    click_nodes(event, node) {
        console.log(node.data)
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

    build_scale_branch_length(){

        var max_y = 0;
        this.d3_cluster_data.descendants().forEach(d => {
            if (d.y > max_y) {
                max_y = d.y
            }
        })

        this.scale_branch_length = d3.scaleLinear().domain([0, this.max_length]).range([this.d3_cluster_data.y, max_y])
        }

};


