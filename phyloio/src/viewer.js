import * as d3 from 'd3';
import Interface from './interface.js'
import { tip as d3tip } from "d3-v6-tip";

d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
        this.parentNode.appendChild(this);
    });
};

var uid_viewer = 0 // unique id generator is bound to a single Viewer()
const collapse_ratio_vertical = 0.2 // how much a triangle is vertically narrow

// D3 viewer that render any model tree
export default class Viewer {

    constructor(container) {

        // General
        this.container_object = container // related Container()
        this.uid = uid_viewer ++; // unique viewer() id
        this.data; // current model.data used
        this.model; // current model

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
        this.container_d3.style('font-family', 'monospace !important' )

        this.interface;

        // Settings
        this.settings = {
            'duration' : 500,
            'style': {
                'margin' : {top: 16, right: 16, bottom: 16, left: 96},

            },
            'stack':{
                'labels' : ["Retained", "Duplicated", "Gained", "Lost", "Duplications", "Gains", "Losses"],
                'colors' : ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#ff7f0e", "#2ca02c", "#d62728"],
                'colorMap' : {},
            }

        }

        this.width = parseFloat(window.getComputedStyle(this.container).width)  -  this.settings.style.margin.left - 2*this.settings.style.margin.right;
        this.height = parseFloat(window.getComputedStyle(this.container).height) - 2*this.settings.style.margin.top - this.settings.style.margin.bottom;

        var colorScaleDomain = [1, 0.8, 0.6, 0.4, 0.2, 0];
        var colorScaleRange = ['rgb(37,52,148)', 'rgb(44,127,184)', 'rgb(65,182,196)', 'rgb(127,205,187)', 'rgb(199,233,180)', 'rgb(255,255,204)'];

        this.colorScale = d3.scaleLinear()
            .domain(colorScaleDomain)
            .range(colorScaleRange);


        // ZOOM
        this.zoom = d3.zoom().on("zoom", (d, i) =>  { return this.zoomed(d,i)} )

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


    }

    // DATA
    set_data(model, refresh_interface = true){


        this.data = model.data;
        this.model = model;

        if (this.model.settings.has_histogram_data && this.model.settings.show_histogram) { // todo size according to stack size
            this.model.settings.tree.node_vertical_size = 30;
            this.model.settings.tree.node_horizontal_size = 150;
        }
        else {
            this.model.settings.tree.node_vertical_size = 30;
            this.model.settings.tree.node_horizontal_size = 40;
        }

        this.d3_cluster.nodeSize([this.model.settings.tree.node_vertical_size,this.model.settings.tree.node_horizontal_size])

        this.build_d3_data();


        if (refresh_interface){
            this.interface = new Interface(this, this.container_object)
        }


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

        this.build_d3_cluster()



    }

    build_d3_cluster(){

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

        this.compute_stack_data()

        this.build_scale_branch_length() // todo dont build scale on collapse

        //this.interface = new Interface(this, this.container_object)



    }

    compute_stack_data(){
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

        d3.selectAll("#menu-node").remove()

        // Get the nodes and edges
        this.nodes = this.d3_cluster_data.descendants();
        this.nodes = this.nodes.sort((a,b) => {return a.x - b.x})

        this.links = this.d3_cluster_data.descendants().slice(1);


        // And render them
        this.render_nodes(source)
        this.render_edges(source)


    }

    render_nodes(source){


        var tip = d3tip()
            .attr('class', 'd3-tip')
            .html((EVENT,d)=> {

                var html = "<b>Click to (un)collapse </b> <hr>"

                if (typeof d.data.evolutionaryEvents != "undefined" ){


                    html += 'duplicated genes: '  + d.data.evolutionaryEvents.duplicated + '<br>'
                    html += 'duplications: '  + d.data.evolutionaryEvents.duplications + '<br>'
                    html += 'gained genes: '  + d.data.evolutionaryEvents.gained + '<br>'
                    html += 'lost/loss: '  + d.data.evolutionaryEvents.lost + '<br>'
                    html += 'retained genes: '  + d.data.evolutionaryEvents.retained + '<br>'

                }



                return html });


        var self_render = this;

        var on_screen_text_size = this.compute_node_font_size()
        var subsampling_index = -1
        var subsampling_module = 1 + Math.floor((on_screen_text_size)/this.model.settings.tree.node_vertical_size)
        var real_node_radius = this.compute_node_radius()



        // update x pos with branch length
        this.nodes.forEach(d => {
            if (this.model.settings.has_branch_lenght && this.model.settings.use_branch_lenght) {
                d.y = this.scale_branch_length(d.branch_size)
            }
            else{d.y = this.scale_branch_length(d.depth)}

            if (!((d.children || d._children) && !this.model.settings.display_internal_label)) {
                subsampling_index += 1;
                d.subsampled = (subsampling_index % subsampling_module === 0) ;
            }


        })

        // Update the nodes...
        var node = this.G.selectAll('g.node')
            .data(this.nodes, d => { return d.ID  || (d.ID = ++this.id_gen); })

        // Enter any new modes at the parent's previous position.
        var nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr("id", d => {return  this.uid + "_" + d.ID})
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', (d, i) =>  {

                if (i.parent != null) {this.click_nodes(d,i)}

            })


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
            .style('font-size', d => {
                return d.subsampled ? on_screen_text_size : '0px' ;
                })
            .attr("font-weight", (d) =>  {
                return d.children || d._children ? 900 : 400
            })
            .attr("y", (d) => {
                if (d.parent == null){return 0}
                else if (d.children || d._children){
                    if (d.children && this.isOdd(d.children.length)){
                        return 13
                    }
                    if (d._children && this.isOdd(d._children.length)){
                        return 13 // todo internal name offsetted if collapse
                    }
                    return 0
                }
                return 0
            })
            .attr("x", function(d) {
                return d.parent == null ? -13 : 13;
            })
            .attr("text-anchor", function(d) {
                //return "start";

                return d.parent == null ? "end" : "start"; // todo better deal with internal name
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

        this.nodeUpdate = nodeEnter.merge(node);

        // Transition to the proper position for the node
        this.nodeUpdate.transition()
            .duration(this.settings.duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });


        // Update the node attributes and style

        this.nodeUpdate.select('circle.node')
            .attr('r', d => d._children || (!this.model.rooted && d.data.root ) ?  1e-6 : real_node_radius )
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#666";
            })
            .attr('cursor', 'pointer');

        subsampling_index = -1
        this.nodeUpdate.select('text')
            .style('font-size', d => {
                return d.subsampled ? on_screen_text_size : '0px' ;
            })

        // Remove any exiting nodes
        var nodeExit = node.exit().transition()
            .duration(this.settings.duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .call(tip.hide)
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
        this.nodeUpdate.each((d,i,nodes) => {

            if (d._children) {

                d3.select(nodes[i]).select("path").transition().duration(self_render.settings.duration)
                    .attr("d",  (d) => {

                        const average = arr => arr.reduce( ( p, c ) => p + c.data.distance_to_root, 0 ) / arr.length;

                        var y = average(self_render.getChildLeaves(d)) -d.data.distance_to_root



                        var y_length = self_render.scale_branch_length(average(self_render.getChildLeaves(d))-d.data.distance_to_root)
                        var x_length =  self_render.model.settings.tree.node_vertical_size * Math.sqrt(self_render.getChildLeaves(d).length) * collapse_ratio_vertical


                       d.data.triangle_height = x_length
                        d3.select(nodes[i])
                            .select("text")
                            .attr("x", y_length + 13).attr("y", 0)
                            .style('font-size', d => {
                                return d.subsampled ? on_screen_text_size : '0px' ;
                        })

                        return "M" + 0 + "," + 0 + "L" + y_length + "," + (-x_length) + "L" + y_length + "," + (x_length) + "L" + 0 + "," + 0;
                    })

            }
            if (d.children) {
                d3.select(nodes[i]).select("path").transition().duration(self_render.settings.duration)
                    .attr("d", function (d) {
                        d.data.triangle_height = 0
                        return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
                    });
            }
        })



/*
        this.nodeUpdate
            .on('mouseover', (event,d)=>{
                if(d.children || d._children) tip.show(event,d);
            })
            .on('mouseout', tip.hide)


        this.nodeUpdate.call(tip)


 */

        // Add Stack

        if (this.model.settings.has_histogram_data && this.model.settings.show_histogram){
            this.nodeUpdate.filter(function(d){
                return d.stackData && d.data.depth > 0
            }).each((d, i, nodes) => {this.render_stack(nodes[i],d)}
            );

            this.addMainLegend()
        }

        // Store the old positions for transition.
        this.nodes.forEach(function(d){
            d.x0 = d.x;
            d.y0 = d.y;
        });

    }

    render_edges(source){

        var self_render = this;

        var real_edges_width = this.compute_edge_width()

        // Update the links...
        var link = this.G.selectAll('path.link')
            .data(this.links,  d => { return d.ID  || (d.ID = ++this.id_gen); });

        // Enter any new links at the parent's previous position.
        var linkEnter = link.enter().insert('path', "g")
            .attr("class", "link")
            .style("cursor","pointer")
            .style("fill","none")
            .style('stroke-width',  this.model.settings.tree.line_width)
            .attr('d', d => this.square_edges(
                {x: source.x0, y: source.y0},{x: source.x0, y: source.y0}))

        var linkUpdate = linkEnter.merge(link);

        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(this.settings.duration)
            .style('stroke', (d) => {
                //console.log(d.data.elementS)
                return d.data.elementS ? this.colorScale(d.data.elementS) : "#555"})
            .style('stroke-width',  real_edges_width)
            .attr('d', d => this.square_edges(d, d.parent))

        linkUpdate.on('click', (d,i) =>  { this.click_edges(d,i)})

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

        if (this.interface && this.model.settings.use_branch_lenght) {
            this.interface.update_scale_value(transform.k);
        }

        if (typeof this.G != "undefined" ){

            var on_screen_text_size = this.compute_node_font_size()
            var subsampling_index = -1
            var subsampling_module = 1 + Math.floor((on_screen_text_size)/this.model.settings.tree.node_vertical_size)




            // update x pos with branch length
            this.nodes.forEach(d => {

                if (!((d.children || d._children) && !this.model.settings.display_internal_label)) {
                    subsampling_index += 1;
                    d.subsampled = (subsampling_index % subsampling_module === 0) ;
                }


            })

            var real_edges_width = this.compute_edge_width()
            this.G.selectAll('path.link').style('stroke-width',  real_edges_width)

            var real_node_radius = this.compute_node_radius()
            this.G.selectAll('g.node').selectAll('circle').attr('r', (d) => {return (d.data.collapse || d.data.root) ? 1e-6 :  real_node_radius } )

            this.G.selectAll('g.node')
                .selectAll('text')
                .style('font-size', d => {

                    return d.subsampled ? on_screen_text_size : '0px' ;


            })
        }
    }

    square_edges(s, d) {

        return   "M" + s.y + "," + s.x + "L" + d.y + "," + s.x + "L" + d.y + "," + d.x;
    }

    click_nodes(event, node) {


        var menu = [
            {
                title: node.data.collapse ? 'Expand' : 'Collapse' ,
                action: () =>  {this.container_object.trigger_("collapse", node.data, node)}
            },
            {
                title: 'Collapse All' ,
                action: () =>  {this.container_object.trigger_("collapseAll", node.data, node)}
            },
            {
                title: 'Expand All' ,
                action: () =>  {this.container_object.trigger_("expandAll", node.data, node)}
            },
            {
                title: 'swap subtrees' ,
                action: () =>  {this.container_object.trigger_("swap", node.data, node)}
            },
            {
                title: 'Close' ,
                action: () =>  {
                    d3.select("#menu-node").remove()
                }
            }
        ]

        this.create_menu_click(menu, node.y,node.x,event,node)

    }

    click_edges(event,edge) {

        var t = this.d3.zoomTransform(this.svg.node())

        let div_i = this.container_object.div_id;

        let py = document.getElementById(div_i).offsetTop
        let px = document.getElementById(div_i).offsetLeft

        var xy = t.invert([event.pageX-px,event.pageY-py]);

        var menu = [{
            title: 'Reroot' ,
            action: () =>  {
                this.container_object.trigger_("reroot", event.path[0].__data__)
            }
        },
            {
                title: 'Trim branch' ,
                action: () =>  {
                    this.container_object.trigger_("trim", event.path[0].__data__)
                }
            },{
            title: 'Close' ,
            action: () =>  {
                d3.select("#menu-node").remove()
            }
        }]

        this.create_menu_click(menu, xy[0],xy[1], event, edge)
    }

    create_menu_click(menu, x ,y, event, e){

        d3.select("#menu-node").remove()

        /* build context menu */
        var m = this.G.append("g")
        m.style('display', 'none');
        m.attr('id', 'menu-node');


        var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k

        var fs = 20/k // scaled font size
        var vps = 8/k // scaled vertical margin
        var hps = 10/k // scaled horizontal margin
        var rs = 8/k // scaled radius size

        var r = m.append('rect')
            .attr('height', menu.length * (fs+vps))
            .style('fill', "#eee")
            .attr('rx', rs)
            .attr('ry', rs)

        var gg = m.selectAll('menu_item')
            .data(menu)
            .enter()
            .append('g')

            gg.attr('cursor', 'pointer')
            .attr('transform', function(d, i) {
                return 'translate(' + hps + ',' + ((i + 1) * fs+vps) + ')';
            })
            .on('mouseover', function(d){
                d3.select(this).style('fill', 'steelblue');
            })
            .on('mouseout', function(d){
                d3.select(this).style('fill', 'black');
            })
            .on('click', function(d,i){
                i.action(d);
            })

        var t = gg.append('text')
            .attr('cursor', 'pointer')
            .attr("font-weight", (d) =>  {
                return d.title === "Close" ? 900 : 400
            })
            .style('font-size', d => {
                return  fs;
            })
            .text(function(d) {
                return d.title;
            })

        var w = 0;

        t.each(function(d){
            var l = this.getComputedTextLength();
            if (l > w) w = l;
        })

        r.attr('width', w + 2*hps);

        m.attr('transform', 'translate(' + x  + ',' + y  + ')');
        m.style('display', 'block');
        m.datum(event);
    }

    apply_collapse_from_data_to_d3(data, d){
        if (data.collapse && d.children != null ) {
            d._children = d.children;
            d.children = null;
        }
        else if (data.collapse == false && d._children != null) {
            d.children = d._children;
            d._children = null;

        }

    }

    apply_collapseAll_from_data_to_d3(data, root_node){

        var  node = root_node  , nodes = [node], children, i, index = -1;

        while (node = nodes.pop()) {


            this.apply_collapse_from_data_to_d3(node.data, node)


            if (children = node.children) {
                for (i = children.length - 1; i >= 0; --i) {
                    nodes.push(children[i]);
                }
            }

            if (children = node._children) {
                for (i = children.length - 1; i >= 0; --i) {
                    nodes.push(children[i]);
                }
            }

        }

    }

    apply_expandAll_from_data_to_d3(data, root_node){

        var  node = root_node  , nodes = [node], children, i, index = -1;

        while (node = nodes.pop()) {

            this.apply_collapse_from_data_to_d3(node.data, node)

            if (children = node.children) {
                for (i = children.length - 1; i >= 0; --i) {
                    nodes.push(children[i]);
                }
            }

            if (children = node._children) {
                for (i = children.length - 1; i >= 0; --i) {
                    nodes.push(children[i]);
                }
            }

        }

    }

    apply_swap_from_data_to_d3(data, d){

        var e = d.children.pop()
        d.children.unshift(e)

    }

    set_zoom(k,x,y) {
        d3.select('#svg' + this.uid )
            .transition()
            .duration(this.settings.duration)
            .call(this.zoom.transform, d3.zoomIdentity.translate(x,y).scale(k) );
    }

    fit_to_viewer_height(){

        var get_height = function(that,d,c){

            return that.model.settings.tree.node_vertical_size * Math.sqrt(that.getChildLeaves(d).length) * collapse_ratio_vertical
        }


        var vh = this.height
        var th = this.G.node().getBBox().height
        var m = vh - th

        if (m >= 0){
            console.log('need to zoom to fit')
            return
        }

        m = -m

        this.model.traverse(this.hierarchy, (d,c) => {


            var ht  = d.data.leaves.length * this.model.settings.tree.node_vertical_size

            if (ht < m) {


                this.model.collapse(d.data, true)
                this.apply_collapse_from_data_to_d3(d.data, d)

                m -= ht
                m += get_height(this, d, c) * this.model.settings.tree.node_vertical_size
            }

        })

        this.build_d3_cluster()
        this.render(this.hierarchy)


    }

    // TUNNING todo should be in COntroller
    modify_node_size(axis, variation){

        if (axis === 'vertical') {
            this.model.settings.tree.node_vertical_size += variation
            this.interface.update_slider(this.interface.slider_v, this.model.settings.tree.node_vertical_size)
        }
        else if (axis === 'horizontal') {
            this.model.settings.tree.node_horizontal_size += variation
            this.interface.update_slider(this.interface.slider_h, this.model.settings.tree.node_horizontal_size)
        }

        this.d3_cluster.nodeSize([ this.model.settings.tree.node_vertical_size,this.model.settings.tree.node_horizontal_size])
        this.build_d3_cluster()
        this.render(this.hierarchy)


        if (this.interface && this.model.settings.use_branch_lenght) {
           var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k
            this.interface.update_scale_value(k);
        }

    }

    toggle_use_length(){
        this.model.settings.use_branch_lenght = !this.model.settings.use_branch_lenght

        if (!this.model.settings.use_branch_lenght){this.interface.remove_scale()}
        else{this.interface.add_scale()}

        this.build_d3_data()
        this.render(this.hierarchy)
    }

    toggle_internal_label(){

        this.model.settings.display_internal_label = !this.model.settings.display_internal_label
        this.render(this.hierarchy)
    }

    // stack

    toggle_show_stack_number(){
        if (this.model.settings.stack.showHistogramValues){
            this.model.settings.stack.showHistogramValues = false
        }
        else{
            this.model.settings.stack.showHistogramValues = true
        }


        this.build_d3_data()
        this.render(this.hierarchy)
    }

    toggle_height_max_ratio(){
        if (this.model.settings.stack.maxStackHeight === 'max'){
            this.model.settings.stack.maxStackHeight = 'ratio'
        }
        else{
            this.model.settings.stack.maxStackHeight = 'max'
        }


        this.build_d3_data()
        this.render(this.hierarchy)

    }

    update_stack_height(val){
        this.model.settings.stack.stackHeight = val
        this.build_d3_data()
        this.render(this.hierarchy)
    }

    update_stack_width(val){
        this.model.settings.stack.stackWidth = val
        this.build_d3_data()
        this.render(this.hierarchy)
    }

    update_stack_font(val){
        this.model.settings.stack.legendTxtSize = val
        this.build_d3_data()
        this.render(this.hierarchy)
    }

    update_stack_type(val){
        this.model.settings.stack.type = val
        this.build_d3_data()
        this.render(this.hierarchy)
    }

    update_node_radius(val){
        this.model.settings.tree.node_radius = val
        this.render(this.hierarchy)
    }

    update_line_width(val){
        this.model.settings.tree.line_width = val
        this.render(this.hierarchy)
    }

    update_collapse_level(val){
        this.model.settings.collapse_level = val
        this.container_object.collapse_depth(this.model.settings.collapse_level, this.model.data)
        this.set_data(this.model)
        this.render(this.hierarchy)

    }

    update_font_size(val){
        this.model.settings.tree.font_size = val
        this.render(this.hierarchy)
    }

    toggle_dessimode(){
        this.model.settings.dessimode = !this.model.settings.dessimode

        if (this.model.settings.dessimode) {

            var r= Math.floor(Math.random() * 101);

            if (r > 50) {alert("[Common] If I may just give a little feedback... [ following 1200 lines truncated]")}
            else if (r > 10) {alert("[Rare] If I may just give a little feedback... [ following 1200 lines truncated]")}
            else{alert("[Lengendary] Have you heard about banana ?")}





        }
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

        //this.svg.transition().call(this.zoom.translateTo, source.y0,source.x0)
        this.svg.transition().call(this.zoom.transform, d3.zoomIdentity.translate(this.width/2-source.y0,this.height/2-source.x0).scale(1) )



    }

    zoom_in(){
        this.svg.transition().call(this.zoom.scaleBy, 2)
    }

    zoom_out(){
        this.svg.transition().call(this.zoom.scaleBy, 0.5)
    }

    zoom_by(val){
        this.svg.transition().call(this.zoom.scaleBy, val)
    }

    // STACK
    render_stack(d,e){



        var ms = this.model.settings.stack
        var data = e.stackData[ms.type];
        var stackGroup  = this.d3.select(d);





        var xDistanceFromNode =  parseInt(ms.xInitialRightMargin) + parseInt(ms.stackWidth)
        var txtDistanceFromBar = parseInt(ms.stackWidth) + parseInt(ms.margin)

        if (ms.showHistogramValues) {

            var legends = stackGroup.selectAll(".legendtxt")
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
                        return parseInt(ms.legendTxtSize)+2;
                    }

                    // if bar height smaller than text size, put text on bottom
                    if(d[0].y < parseInt(ms.legendTxtSize) && d[0].y0 > 0) {
                        return -(d[0].y0 - d[0].y);
                    }

                    // center legend text vertically with some extra padding
                    return -(d[0].y0 - ((d[0].y + parseInt(ms.legendTxtSize))/2));
                }).attr("font-size", parseInt(ms.legendTxtSize)).attr("stroke", "black")

        }
        if (ms.showHistogramValues) { // todo shulld be showHistogramSummaryValue

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
                }).attr("font-size", parseInt(ms.legendTxtSize)).attr("stroke", "black")

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
                return 0 - d[0].y0 - 0.5;
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
                var normalizer = m.maxStackHeight / (d.duplications + d.gained + Math.abs(d.lost));
            } else {
                var normalizer = ms.stackHeight / (d.duplications + d.gained + Math.abs(d.lost));
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
        var StackSizeDuplication = (d.duplications) ? stackScale(d.duplications, normalizer) : 0;
        var StackSizeGained = (d.gained) ? stackScale(d.gained, normalizer) : 0;
        var StackSizeLost = (d.lost) ? stackScale(d.lost, normalizer) : 0;
        var posStackSize = StackSizeGained + StackSizeDuplicated + StackSizeretained;

        if(type === 'genes' || !type){

            realSize = Math.abs(d.retained) > 0 ? Math.abs(d.retained) : 0;
            var posBase = posBase + StackSizeretained;
            data[stackIndex][seriesIndex] = new seriesElement('Retained', realSize, StackSizeretained, posBase, posStackSize)
            stackIndex++;

            realSize = Math.abs(d.duplicated);
            var posBase = posBase + StackSizeDuplicated
            data[stackIndex][seriesIndex] = new seriesElement('Duplicated', realSize, StackSizeDuplicated, posBase, posStackSize)
            stackIndex++;
        } else {

            realSize = Math.abs(d.duplications);
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

    addMainLegend() {

        d3.select('#histogram-legend').remove();

        var width = 230;
        var height = 80;
        var svgHeight = height + 25;
        var legendRectSize = 20;
        var margin = 25;
        var legendTxtSize = 13;
        // center text in the middle of the legend colored rectangle, rounding it to smaller Y-value
        var legendTxtYPadding = Math.round(((legendRectSize - legendTxtSize) / 2) - 1);
        if(this.model.settings.stack.type == "genes"){
            var dataLabels = ["Gained", "Duplicated", "Retained", "Lost" ]
        } else {
            var dataLabels = ["Gains", "Duplications", "Losses" ]
        }

        // to position legends correctly
        var rects = dataLabels.length - 1;

        var dy = (this.height - height - 25)


        var legendSvg = d3.select("#svg" + this.uid).append("svg")//.append("g").attr("transform", "translate(25," + dy  + ")")
            .attr("id", "histogram-legend")
            .attr("x", margin)
            .attr("y", margin)
            .attr("width", width + "px")
            .attr("height", svgHeight + "px")

            .append("g")


        legendSvg.append("line")
            .attr("x1", 0)
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
            .attr('fill', (d, i, node) => {
                return this.settings.stack.colorMap[d];
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
                return i * legendRectSize + legendTxtSize + legendTxtYPadding;
            })
            .attr('text-anchor', 'start')
            .attr('alignment-baseline', 'middle')
            .attr("font-size", legendTxtSize).attr("stroke", "black");


        legendSvg
            .append('text')
            .attr("class", "legendGeneTotal")
            .text("Total # of "+this.model.settings.stack.type)
            .attr('x', 0)
            .attr('y', rects * legendRectSize - 5)
            .attr('text-anchor', 'start')
            .attr("font-size", legendTxtSize).attr("stroke", "black");

        d3.selectAll(".legendGeneTotal").moveToFront();

    }

    isOdd(num) { return num % 2;}

    compute_node_font_size(){

        var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k
        var fs =  this.model.settings.tree.font_size/k ;

        return fs

        /*
        if (d._children && fs > d.data.triangle_height){
            fs = d.data.triangle_height
        }

        var max_leave = this.model.settings.tree.node_vertical_size*k

        if (!d.children && !d._children && fs > max_leave){
            fs = max_leave
        }

        return fs+ "px"


         */
    }

    compute_node_radius(){
        var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k
        var nr =  this.model.settings.tree.node_radius/k ;
        return (nr > this.model.settings.tree.node_vertical_size/2) ? this.model.settings.tree.node_vertical_size/2 : nr
    }

    compute_edge_width(){
        var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k
        var ew = this.model.settings.tree.line_width/k;
        return (ew > this.model.settings.tree.node_vertical_size/2) ? this.model.settings.tree.node_vertical_size/2 : ew
    }

};


