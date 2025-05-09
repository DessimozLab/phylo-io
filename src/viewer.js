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
        this.model = false; // current model

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
            'duration' : 300,
            'max_visible_leaves' : 30,
            'style': {
                'offset_top_fit': 140,
                'translate_top_fit': 60,
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

        if (this.model){
            this.model.set_color_scale(undefined,this.container_object.api)
        }

        // ZOOM
        this.force_zoom_rescaling = false
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
        //this.G = this.svg.append("g")
        //    .attr("id", "master_g" + this.uid)
        //    .attr("transform", "translate("+ this.settings.style.margin.left + "," + (this.height/2 +  this.settings.style.margin.top) + ")")
        //this.G_d3 = d3.select(this.G);

        this.build_master_g()

        // D3 TREE LAYOUT
        this.d3_cluster = d3.cluster()
            .separation((a,b) =>  {return this.separate(a,b)})

        // MISC.
        this.settings.stack.colorMap = this.compute_color_map_stack()

        // close setting if click outside on svg


        d3.select("#svg" + this.uid).on("click", (d,i) => {
            this.interface.menu_settings.style("display", 'none');
            this.interface.menu_export.style("display", 'none')
        })


    }

    // DATA
    set_data(model, refresh_interface = true){


        this.data = model.data;
        this.model = model;

        this.d3_cluster.nodeSize([this.model.settings.tree.node_vertical_size,this.model.settings.tree.node_horizontal_size])

        this.build_d3_data();

        if (this.model){
            this.model.set_color_scale(undefined, this.container_object.api)
        }

        if (refresh_interface){
            this.interface = new Interface(this, this.container_object)
        }


    }

    remove_data(){

        this.data = null;
        this.model = null;
        this.destroy_master_g()
        this.build_master_g()

    }

    destroy_master_g(){
        this.svg.select("#master_g" + this.uid).remove()
        this.G = null
        this.G_d3 = null
    }

    build_master_g(){
        this.G = this.svg.append("g")
            .attr("id", "master_g" + this.uid)
            .attr("transform", "translate("+ this.settings.style.margin.left + "," + (this.height/2 +  this.settings.style.margin.top) + ")")
        this.G_d3 = d3.select(this.G);


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
        this.max_depth = 0
        this.hierarchy.eachBefore(d => {
            if (d.parent) {
                d.branch_size = d.parent.branch_size + d.data.branch_length
                if (d.branch_size > this.max_length) {
                    this.max_length = d.branch_size
                }
                if (d.depth > this.max_depth) {
                    this.max_depth = d.depth
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

                if( this.model.settings.stack.has_support &&d.data.evolutionaryEvents_support) {

                    let stackData_support = []
                    stackData_support['genes'] = this.barStack(d, 'genes', true);
                    stackData_support['events'] = this.barStack(d, 'events', true);

                    d.stackData_support = stackData_support
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
        this.scale_branch_depth = d3.scaleLinear().domain([0, this.max_depth]).range([this.d3_cluster_data.y, max_y])
    }

    // RENDERING
    render(source, duration){

        var duration;

        if (typeof duration !== 'undefined') {
            duration = duration;
        }
        else {
            duration = this.settings.duration;
        }

        d3.selectAll("#menu-node").remove()


        this.render_tooltip()

        // Get the nodes and edges
        this.nodes = this.d3_cluster_data.descendants();
        this.nodes = this.nodes.sort((a,b) => {return a.x - b.x})

        this.links = this.d3_cluster_data.descendants().slice(1);


        // And render them
        this.render_nodes(source, duration)
        this.render_edges(source, duration)


        if (this.model.settings.first_time_render) {
            this.model.settings.first_time_render = false

            if (this.container_object.api.settings.phylostratigraphy){


                source.children.forEach(element =>
                    this.container_object.trigger_("collapseAll", element.data, element));

                this.maximise_zoom()
                this.svg.call(this.zoom.scaleBy, 0.5)
                this.container_object.history_actions = []

            }

            else{
                this.fit_to_viewer_height()

            }

        }


    }

    render_tooltip(){

        var idd = "tooltip" + this.uid

        d3.selectAll(".tooltip").remove()

        this.tooltip = this.d3.select('body').append("div")
            .style("opacity", 0)
            .style("position", 'absolute')
            .attr("class", "tooltip")
            .attr("id", idd)
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "1px")
            .style("border-radius", "5px")
            .style("padding", "10px")


    }

    set_tooltip_text(node){

        var html = "";

        if (this.container_object.api.settings.phylostratigraphy){

            if (this.model.settings.stack.has_support && this.model.settings.stack.only_support){
                var datum = node.data.evolutionaryEvents_support
            }
            else {
                var datum = node.data.evolutionaryEvents
            }



            html += `<b># Events</b> <br>`
            html += `Gains: ${datum.gained} <br>`
            html += `Duplications: ${datum.duplications} <br>`
            html += `Losses: ${datum.lost} <br> <br>`

            html += `<b># Genes</b> <br>`
            html += `Gained: ${datum.gained} <br>`
            html += `Duplicated: ${datum.duplicated} <br>`
            html += `Retained: ${datum.retained} <br>`
            html += `Lost: ${datum.lost} <br>`
        }

        else {
            for (var [key, value] of Object.entries(node.data.extended_informations)) {

                if  ((/^-?[\d]*(\.[\d]+)?$/g).test(value)) {

                    if (value % 1 === 0) {
                        html += `${key}: ${value} <br>`
                    }

                    else{
                        //console.log(value)
                        html += `${key}: ${parseFloat(value).toFixed(3)} <br>`
                    }
                }
                else{
                    html += `${key}: ${value} <br>`
                }


            }
        }

        if (this.container_object.api.settings.phylostratigraphy) {
            html += `<br> <b>Click to open detail page</b>  <br>`
        }

        this.tooltip.html(html);
    }

    render_nodes(source, duration){

        var self_render = this;
        var on_screen_text_size = this.compute_node_font_size()
        var subsampling_index = -1
        var subsampling_module = 1 + Math.floor((on_screen_text_size)/this.model.settings.tree.node_vertical_size)
        var real_node_radius = this.compute_node_radius()
        var show_duplications = this.model.settings.display_duplication
        var mirror_factor = this.model.settings.mirror ? -1 : 1
        var deepest_tip = 0;

        // update x pos with branch length
        this.nodes.forEach(d => {
            if (this.model.settings.has_branch_lenght && this.model.settings.use_branch_lenght) {
                d.y = this.scale_branch_length(d.branch_size)
            }
            else{
                d.y = this.scale_branch_depth(d.depth)
            }

            if (!this.model.settings.display_leaves){
                d.subsampled = false;
                return
            }


            if (!this.model.settings.subsample_label){
                d.subsampled = true;
                return
            }

            if (!d.children ) {

                if (d.data.collapse && d.data.triangle_height >= on_screen_text_size){
                    d.subsampled  = true
                    return
                }

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
                return "translate(" + mirror_factor*source.y0 + "," + source.x0 + ")";
            })
            .on("mousedown", function(d,i) {
               d.stopPropagation();
            })
            .on('mouseover', (d, i) => {
                if (this.model.settings.show_tooltips){

                    var target = d.target || d.srcElement;

                    if (this.container_object.api.settings.phylostratigraphy && target.nodeName != 'rect' ) {
                        return
                    }

                    this.tooltip.transition().duration(50)
                        .style('display', 'block')
                        .style('opacity', 0.9)
                        .style('left', (d.pageX + 12) +  'px')
                        .style('top', d.pageY  + 'px');

                        this.set_tooltip_text(i);


                }

            })
            .on('mousemove', d => {
                if (this.model.settings.show_tooltips) {
                    this.tooltip
                        .style('left', (d.pageX + 12) + 'px')
                        .style('top', d.pageY + 'px');
                }
            })
            .on('mouseout', () => {
                if (this.model.settings.show_tooltips) {
                    this.tooltip
                        .style('display', 'none');
                }
            });


        // Add Circle for the nodes
        nodeEnter.filter(function(d){
            return (d.children || d._children)
        })
            .append('circle')
            .attr('class', 'node')
            .attr('r', 1e-6)
            .style("stroke",  "transparent" )
            .style("stroke-width",  "6px" )
            .style("fill", function(d) {
                return d.data.duplication && show_duplications  ? 'red' : d._children ? "lightsteelblue" : "#fff";
            })
        .on('click', (d, i) =>  {
                if (i.children || i._children) {this.click_nodes(d,i)}
            })


        this.node_face_enter(nodeEnter)

        // create null triangle
        nodeEnter.append("path")
            .attr("class", "triangle")
            .style("fill", "#666")
            .attr("d", function (d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            })
            .on('click', (d, i) =>  {
                if (i.children || i._children) {this.click_nodes(d,i)}
            })

        if (this.model.settings.has_histogram_data && this.model.settings.show_histogram) {
            // create null stack
            nodeEnter.append("g")
                .attr("class", "stackGroup")
        }

        this.nodeUpdate = nodeEnter.merge(node);

        // Transition to the proper position for the node
        this.nodeUpdate.transition()
            .duration(duration)
            .attr("transform", (d) =>  {
                return "translate(" + mirror_factor*d.y + "," + d.x + ")";
            });


        // Update the node attributes and style

        this.nodeUpdate.select('circle.node')
            .attr('r', d => d._children || (!this.model.rooted && d.data.root ) ?  1e-6 : real_node_radius )
            .style("fill",   (d) => {
                if ( d.data.duplication && show_duplications){
                    return 'red'
                }

                else if (this.model.settings.style.color_accessor['circle'] !== null) {


                    var acc = this.model.settings.style.color_accessor['circle']
                    var type_acc = this.model.settings.extended_data_type[acc]
                    var g = d.data.extended_informations[acc]

                    if (type_acc == 'cat'){

                        var cs = this.container_object.api.get_color_scale(acc)
                        return cs.get_color(g)

                    }

                    else{
                        return this.model.settings.colorScale['circle'](g)
                    }




                }

                else {
                    return '#666'
                }


            })
            .attr('cursor', 'pointer');

        this.node_face_update(this.nodeUpdate)

        // Remove any exiting nodes
        var nodeExit = node.exit().transition()
            .duration(duration)
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

        this.node_face_exit(nodeExit)

        // Add collapsed triangle
        this.nodeUpdate.each((d,i,nodes) => {

            if (d._children) {

                d3.select(nodes[i]).select("path").transition().duration(duration)
                    .attr("d",  (d) => {

                        const average = arr => arr.reduce( ( p, c ) => p + c.data.distance_to_root, 0 ) / arr.length;

                        var y = average(self_render.getChildLeaves(d)) -d.data.distance_to_root

                        var y_length = self_render.scale_branch_length(average(self_render.getChildLeaves(d))-d.data.distance_to_root)
                        var x_length =  self_render.model.settings.tree.node_vertical_size * Math.sqrt(self_render.getChildLeaves(d).length) * collapse_ratio_vertical


                       d.data.triangle_height = 2*x_length
                        d.data.triangle_width = y_length

                        this.node_face_update(d3.select(nodes[i]) )




                        return "M" + 0 + "," + 0 + "L" + mirror_factor*y_length + "," + (-x_length) + "L" + mirror_factor*y_length + "," + (x_length) + "L" + 0 + "," + 0;
                    })
                    .style('fill', (d) => this.color_triangle(d))

            }
            if (d.children) {
                d3.select(nodes[i]).select("path").transition().duration(duration)
                    .attr("d", function (d) {
                        d.data.triangle_height = 0
                        return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
                    });
            }
        })

        // align to tip

        if (this.model.settings.align_tip){

            if (this.model.settings.has_branch_lenght && this.model.settings.use_branch_lenght) {

                // update y pos with branch length
                this.nodes.forEach(d => {

                    var distance_root_to_tip = this.scale_branch_length(d.data.distance_to_root) + (d.data.triangle_width ? d.data.triangle_width : 0)

                    if (deepest_tip <distance_root_to_tip ){
                        deepest_tip =  distance_root_to_tip
                    }
                })

                // Transition to the proper position for the node
                this.nodeUpdate.transition()
                    .duration(duration)
                    .attr("transform", (d) =>  {

                        if (d.children ){
                            d.off_set_to_tip = 0
                            return "translate(" + (mirror_factor*d.y) + "," + d.x + ")";
                        }

                        else if (d._children) {
                            d.off_set_to_tip =   deepest_tip - this.scale_branch_length(d.data.distance_to_root) - d.data.triangle_width
                            return "translate(" + (mirror_factor*(d.y + d.off_set_to_tip)) + "," + d.x + ")";
                        }

                        else {
                            d.off_set_to_tip =  deepest_tip - this.scale_branch_length(d.data.distance_to_root)
                            return "translate(" + (mirror_factor* (d.y + d.off_set_to_tip)) + "," + d.x + ")";
                        }




                    });
            }
            else{

                // update y pos with branch length
                this.nodes.forEach(d => {

                    var distance_root_to_tip = this.scale_branch_depth(d.data.depth) + (d.data.triangle_width ? d.data.triangle_width : 0)

                    if (deepest_tip <distance_root_to_tip ){
                        deepest_tip =  distance_root_to_tip
                    }
                })

                // Transition to the proper position for the node
                this.nodeUpdate.transition()
                    .duration(duration)
                    .attr("transform", (d) =>  {

                        if (d.children ){
                            d.off_set_to_tip = 0
                            return "translate(" + (mirror_factor*d.y) + "," + d.x + ")";
                        }

                        else if (d._children) {
                            d.off_set_to_tip =   deepest_tip - this.scale_branch_depth(d.data.depth) - d.data.triangle_width
                            return "translate(" + (mirror_factor*(d.y + d.off_set_to_tip)) + "," + d.x + ")";
                        }

                        else {
                            d.off_set_to_tip =  deepest_tip - this.scale_branch_depth(d.data.depth)
                            return "translate(" + (mirror_factor* (d.y + d.off_set_to_tip)) + "," + d.x + ")";
                        }




                    });
            }




        }


        // Add Stack
        if (this.model.settings.has_histogram_data && this.model.settings.show_histogram){

            this.nodeUpdate.filter(function(d){
                return d.stackData && d.data.depth > 0
            }).each((d, i, nodes) => {this.render_stack(nodes[i],d)});

        }


        // Store the old positions for transition.
        this.nodes.forEach(function(d){
            d.x0 = d.x;
            d.y0 = mirror_factor * d.y;
        });






    }

    color_triangle(node_){

        var mean = array => array.reduce((a, b) => a + b) / array.length;

        function mostFrequentElement(array) {
            var frequencyMap = {};
            var maxCount = 0;
            var mostFrequentElement;

            for (var i = 0; i < array.length; i++) {
                var element = array[i];
                if (frequencyMap[element] === undefined) {
                    frequencyMap[element] = 1;
                } else {
                    frequencyMap[element]++;
                }

                if (frequencyMap[element] > maxCount) {
                    maxCount = frequencyMap[element];
                    mostFrequentElement = element;
                }
            }

            return mostFrequentElement;
        }

        function removeFalsyValues(array) {
            return array.filter(Boolean);
        }

        switch (this.model.settings.selected_triangle_coloring) {
            case 'Leaves':
                var acc_l = this.model.settings.style.color_accessor['leaf']

                if (acc_l){

                    var metrics = []

                    this.model.traverse_hierarchy(node_, function(node,children){
                        if (node.children == null && node._children == null){
                            metrics.push(node.data.extended_informations[acc_l])
                        }
                    })

                    metrics = removeFalsyValues(metrics)

                    var type_l = this.model.settings.extended_data_type[acc_l]

                    switch (type_l){
                        case 'color':
                            return mostFrequentElement(metrics)
                        case 'cat':
                            return this.model.settings.colorScale['leaf'].get_color(mostFrequentElement(metrics))
                        case 'num':
                            return this.model.settings.colorScale['leaf'](mean(metrics.map(Number.parseFloat)))
                    }

                }

                break;

            case 'Branches':
                var acc_l = this.model.settings.style.color_accessor['node']

                if (acc_l){

                    var metrics = []

                    this.model.traverse_hierarchy(node_, function(node,children){
                        if (children){
                            metrics.push(node.data.extended_informations[acc_l])
                        }
                    })

                    metrics = removeFalsyValues(metrics)

                    var type_l = this.model.settings.extended_data_type[acc_l]

                    switch (type_l){
                        case 'color':
                            return mostFrequentElement(metrics)
                        case 'cat':
                            return this.model.settings.colorScale['node'].get_color(mostFrequentElement(metrics))
                        case 'num':
                            return this.model.settings.colorScale['node'](mean(metrics.map(Number.parseFloat)))
                    }

                }

                break
        }

        return '#666'
    }

    render_edges(source, duration){

        var self_render = this;
        var mirror_factor = this.model.settings.mirror ? -1 : 1
        var real_edges_width = this.compute_edge_width()

        // Update the links...
        var link = this.G.selectAll('path.link')
            .data(this.links,  d => { return d.ID  || (d.ID = ++this.id_gen); });

        // Enter any new links at the parent's previous position.
        var linkEnter = link.enter().insert('path', "g")
            .attr("class", "link")
            .style("cursor","pointer")
            .style("fill","none")
            .style('stroke-width',  real_edges_width + 'px'   )
            .attr('d', d => this.square_edges(
                {x: source.x0, y: source.y0},{x: source.x0, y: source.y0}))

        var linkUpdate = linkEnter.merge(link);

        var compared_model = this.get_compared_model()


        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(duration)
            .style('stroke', (d) => {return this.color_edge(d, compared_model);})
            .style('stroke-width',  real_edges_width + 'px'  )
            .attr('d', d => this.square_edges(d, d.parent))

        linkUpdate.on('click', (d,i) =>  {
            if (this.container_object.api.settings.phylostratigraphy){return}
            this.click_edges(d,i)})

        // Remove any exiting links
        var linkExit = link.exit().transition()
            .duration(duration)
            .attr('d', d => this.square_edges({x: source.x, y: source.y}, {x: source.x, y: source.y}))
            .remove();

    }

    get_compared_model(){

        var compared_model = false

        if (this.container_object.api.settings.compareMode && this.container_object.api.bound_container.includes(this.container_object)){

            var con1 = this.container_object.api.bound_container[0]
            var con2 =  this.container_object.api.bound_container[1]

            var other_container = con1 == this.container_object ? con2 : con1

            if (other_container.models.length > 0 && other_container.viewer.model && this.model.settings.similarity.includes(other_container.viewer.model.uid) ){

                compared_model = other_container.viewer.model.uid
            }

        }

        return compared_model

    }

    color_edge(edge, compared_model){

        if (edge.data.search_path){ return '#FF0000'}

        else if (this.model.settings.style.color_accessor['node'] === "Topology" && compared_model !== false && edge.data.elementS[compared_model]  ) {

            return this.model.settings.colorScale['node'](edge.data.elementS[compared_model])
        }

        else if (this.model.settings.style.color_accessor['node'] === 'color'){

            var h = edge.data.extended_informations[this.model.settings.style.color_accessor['node']];
            if (typeof h == "undefined" ) {return "#555"}
            else {return h}

        }

        else if (this.model.settings.style.color_accessor['node'] !== null){

            var acc = this.model.settings.style.color_accessor['node']

            var v = edge.data.extended_informations[acc];

            if (typeof v == "undefined" ) {return "#555"}
            else {
                if (this.model.settings.extended_data_type[acc] == 'cat') {
                    return this.model.settings.colorScale['node'].get_color(v)
                }
                else {
                    return this.model.settings.colorScale['node'](v)
                }
            }

        }

        else {
            return "#555"
        }

    }



    separate(a, b) {

        var spacer = 1;

        spacer += a._children ? Math.sqrt(this.getChildLeaves(a).length) * collapse_ratio_vertical  : 0
        spacer += b._children ? Math.sqrt(this.getChildLeaves(b).length) * collapse_ratio_vertical : 0

        return spacer;
    }

    zoomed({transform}) {

        var zooming = this.model.zoom ? transform.k != this.model.zoom.k : false;


        d3.select("#master_g" + this.uid).attr("transform", transform);

        if (this.interface && this.model.settings.use_branch_lenght) {
            this.interface.update_scale_value(transform.k);
        }

        if (typeof this.G != "undefined" && this.model != false ){

            if ((zooming && !this.model.big_tree) || this.force_zoom_rescaling) {

                var on_screen_text_size = this.compute_node_font_size()
                var subsampling_index = -1
                var subsampling_module = 1 + Math.floor((on_screen_text_size)/this.model.settings.tree.node_vertical_size)

                // update x pos with branch length
                this.nodes.forEach(d => {


                    if (!this.model.settings.display_leaves ){
                        d.subsampled = false;
                        return
                    }

                    if (!this.model.settings.subsample_label){
                        d.subsampled = true;
                        return
                    }



                    if (!d.children ) {

                        if (d.data.collapse && d.data.triangle_height >= on_screen_text_size){
                            d.subsampled  = true
                            return
                        }

                        subsampling_index += 1;
                        d.subsampled = (subsampling_index % subsampling_module === 0) ;
                    }


                })


                var real_node_radius = this.compute_node_radius()
                this.G.selectAll('g.node').selectAll('circle').attr('r', (d) => {

                    return d.data.collapse || (!this.model.rooted && d.data.root) ? 1e-6 :  real_node_radius }
                )

                this.node_face_update(this.G.selectAll('g.node'))

                var real_edges_width = this.compute_edge_width()
                this.G.selectAll('path.link').style('stroke-width',  real_edges_width + 'px')

            }



            this.model.store_zoomTransform(transform)




            // if lock zoom activate
            if (this.container_object.api.settings.compareMode && this.container_object.api.settings.sync_zoom && !this.container_object.api.settings.syncing_zoom){

                this.container_object.api.settings.syncing_zoom = true

                var other_container = this.container_object.api.bound_container[0] === this.container_object ? this.container_object.api.bound_container[1] : this.container_object.api.bound_container[0]

                if (other_container.models.length > 0 && other_container.viewer.model != false){

                    var m1 = this.get_height_hierarchy().middle*transform.k
                    var m2 = other_container.viewer.get_height_hierarchy().middle*transform.k

                    other_container.viewer.set_zoom(transform.k,transform.x,transform.y -m2 + m1 )

                }
                this.container_object.api.settings.syncing_zoom = false



            }




        }


    }

    square_edges(s, d) {

        var mirror_factor = this.model.settings.mirror ? -1 : 1


        if (!this.model.settings.align_tip || isNaN(s.off_set_to_tip) ){
            return   "M" + mirror_factor*s.y + "," + s.x + "L" + mirror_factor*d.y + "," + s.x + "L" + mirror_factor*d.y + "," + d.x;

        }
        else {
            return "M" + (mirror_factor * (s.y +  s.off_set_to_tip)) + "," + s.x + "L" + mirror_factor * d.y + "," + s.x + "L" + mirror_factor * d.y  + "," + d.x;
        }
    }

    click_nodes(event, node) {

        var menu = []

        // phylostratigraphy mode
        if (this.container_object.api.settings.phylostratigraphy && event.target.tagName === 'rect'){

            this.container_object.api.settings.callback_stack_redirection(node.data.taxid,node.parent.data.taxid);
            return

        }

         // Default mode
        else {
            if  (node.parent != null){

                var menu = [
                    {
                        title: node.data.collapse ? 'Expand' : 'Collapse node' ,
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
                        title: 'Swap subtrees' ,
                        action: () =>  {this.container_object.trigger_("swap", node.data, node)}
                    },
                    {
                        title: node.data.force_label_show == null || node.data.force_label_show ? 'Hide label'  : 'Show label' ,
                        action: () =>  {this.container_object.trigger_("force_show_label", node.data, node)}
                    }
                ]
            }
            else { // root
                var menu = [
                    {
                        title: 'Expand All' ,
                        action: () =>  {this.container_object.trigger_("expandAll", node.data, node)}
                    },
                    {
                        title: 'Swap subtrees' ,
                        action: () =>  {this.container_object.trigger_("swap", node.data, node)}
                    },

                ]
            }

            if (this.container_object.api.settings.phylostratigraphy){

                menu.push({
                    title: 'Open genome page' ,
                    action:  () =>  {this.container_object.api.settings.callback_ancestral_genome_redirection(node.data.taxid)}
                })

            }


        }


        menu.push({
            title: 'Close' ,
            action: () =>  {
                d3.select("#menu-node").remove()
            }
        })

        var t = this.d3.zoomTransform(this.svg.node())

        let div_i = this.container_object.div_id;

        let py = document.getElementById(div_i).offsetTop
        let px = document.getElementById(div_i).offsetLeft

        var xy = t.invert([event.pageX-px,event.pageY-py]);

        if(this.model.settings.mirror){
            var x=  -xy[0]
            var y = xy[1]
        }
        else{
            var x=  xy[0]
            var y = xy[1]
        }

        this.create_menu_click(menu, x,y,event,node)

    }

    click_edges(event,edge) {

        var t = this.d3.zoomTransform(this.svg.node())

        let div_i = this.container_object.div_id;

        let py = document.getElementById(div_i).offsetTop
        let px = document.getElementById(div_i).offsetLeft

        var xy = t.invert([event.pageX-px,event.pageY-py]);

        // because Chrome returns a MouseEvent for d3.event while Firefox returns a click. \o/
        var node_from_event = event.path ? event.path[0].__data__ : event.target.__data__



        var menu = [{
            title: 'Reroot' ,
            action: () =>  {
                this.container_object.trigger_("reroot", node_from_event.data)
            }
        }, {
                title: 'Trim subtree' ,
                action: () =>  {
                    this.container_object.trigger_("trim", node_from_event)
                }
            },{
            title: 'Open as new tree' ,
            action: () =>  {
                this.container_object.create_model_from_hierarchy_node(node_from_event);
                this.container_object.shift_model(this.container_object.models.length - 1 - this.container_object.current_model);
                this.fit_to_viewer_height()

            }
        },
            {
            title: 'Close' ,
            action: () =>  {
                d3.select("#menu-node").remove()
            }
        }]

        if(this.model.settings.mirror){
            var x=  -xy[0]
            var y = xy[1]
        }
        else{
            var x=  xy[0]
            var y = xy[1]
        }

        this.create_menu_click(menu,x,y, event, edge)
    }

    create_menu_click(menu, x ,y, event, e){

        if (this.model.settings.mirror){
            x=-x;
        }

        d3.select("#menu-node").remove()

        /* build context menu */
        var m = this.G.append("g")
        m.style('display', 'none');
        m.attr('id', 'menu-node');


        var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k

        var fs = 14/k // scaled font size
        var vps = 12/k // scaled vertical margin
        var hps = 10/k // scaled horizontal margin
        var rs = 8/k // scaled radius size

        var r = m.append('rect')
            .attr('height', menu.length * (fs+vps) + vps + 'px')
            .style('fill', "#eee")
            .attr('rx', rs)
            .attr('ry', rs)

        var gg = m.selectAll('menu_item')
            .data(menu)
            .enter()
            .append('g')
            gg.attr('cursor', 'pointer')
            .attr('transform', function(d, i) {
                return 'translate(' + hps + ',' + ((i + 1) * (fs+vps)) + ')';
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

        var close = null

        var t = gg.append('text')
            .attr('cursor', 'pointer')
            .attr("font-weight", (d) =>  {
                return d.title === "Close" ? 900 : 400
            })
            .style('font-size', d => {
                return  fs + 'px';
            })
            .text(function(d) {
                return d.title;
            })


        r.attr('width', 20 );
        m.attr('transform', 'translate(' + x  + ',' + y  + ')');
        m.style('display', 'block');
        m.datum(event);



        setTimeout(function(){

            var w = 0;
            var w_close = 0

            t.each(function(d){

                var l = d3.select(this).node().getComputedTextLength();
                if (l > w) w = l;

                if (d.title == "Close"){
                    w_close = l;
                }

            })

            var w_menu = w + 2*hps
            r.attr('width', w_menu );

            t.each(function(d){
                if (d.title == "Close"){
                    d3.select(this).attr('transform', 'translate(' + (w - w_close)/2  + ',' + 0  + ')');
                }
            })


        }, 50)





    }

    apply_show_label_from_data_to_d3(data, d){
        d.force_label_show = data.force_label_show
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

    apply_unswap_from_data_to_d3(data, d){

        var e = d.children.shift()
        d.children.push(e)

    }

    set_zoom(k,x,y) {

        d3.select('#svg' + this.uid )
            .call(this.zoom.transform, d3.zoomIdentity.translate(x,y).scale(k) );
    }

    get_height_hierarchy(){


        var max_x = 0;
        var min_x = 9999999999;

        this.hierarchy.each(d => {

            if(d.x > max_x){max_x= d.x}
            if(d.x < min_x){min_x= d.x}
        }
        );


        return {
            'h':max_x - min_x,
            'max_x':max_x ,
            'min_x': min_x,
            'middle': max_x -(max_x - min_x)/2
        }

    }

    get_number_visible_tree_tips_at_depth(depth){

        var tips = 0;

        this.model.traverse(this.model.data, function(node,children){

            if (node.depth > depth) {return}

            if (children == null || node.collapse == true) {
                tips+=1
            }
            } )

        return tips

    }

    maximise_zoom(){

        var old_zoom = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node())
        this.container_object.add_action('Stretch tree',  this, this.render_with_settings, [old_zoom.k, old_zoom.x,old_zoom.y,this.model.settings.tree.node_horizontal_size, []] )
        // Adjust Zoom-y to fit height
        var r = this.get_height_hierarchy()
        var vh = this.height - this.settings.style.offset_top_fit
        var th = (Math.abs(r.min_x)+Math.abs(r.max_x))
        var h_scale = vh/th // ratio



        if (this.model.settings.mirror){
            var x_tr = this.width - this.hierarchy.x +  this.settings.style.translate_top_fit
        }
        else{
            var x_tr = - this.hierarchy.x +  this.settings.style.translate_top_fit
        }

        var off_rooting = (Math.abs(r.min_x)-Math.abs(r.max_x))/2
        var y_tr =  -this.hierarchy.y + this.height/2 + off_rooting*h_scale
        this.set_zoom(h_scale, x_tr, y_tr)


        var w = 0

        this.hierarchy.leaves().forEach((e) => {
            let posy = e.y
            if (e.data.collapse){
                posy += e.data.triangle_width
            }
            w = posy > w ? posy : w
        })

        var ns = this.model.settings.tree.node_horizontal_size
        var w_scale = (this.width - 80)/(w*h_scale)

        this.container_object.modify_node_size('horizontal', (ns * w_scale) - ns )

        var real_edges_width = this.compute_edge_width()
        this.G.selectAll('path.link').style('stroke-width',  real_edges_width + 'px')

    }

    fit_to_viewer_height(){

        var collapsed = this.model.get_all_collapse(this.model.data)
        var old_zoom = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node())
        this.container_object.add_action('Compact tree',  this, this.render_with_settings, [old_zoom.k, old_zoom.x,old_zoom.y,this.model.settings.tree.node_horizontal_size, collapsed] )

        // Increment Collapsed Depth until "Visible leaf" > "Max visible leaves"
        var depth;
        for (depth = 1; depth < this.model.settings.tree.max_depth; depth++) {

            var X = this.get_number_visible_tree_tips_at_depth(depth)
            if (X > this.settings.max_visible_leaves) {
                break
            }
        }

        this.update_collapse_level(depth, true)


        var r = this.get_height_hierarchy()
        var estimated_height = r.h

        // Adjust Zoom-y to fit height
        var vh = this.height - this.settings.style.offset_top_fit // MARGIN
        var th = (Math.abs(r.min_x)+Math.abs(r.max_x))
        //var th = estimated_height // this.G.node().getBBox().height
        var h_scale = vh/th


        if (this.model.settings.mirror){
            var x_tr = this.width - this.hierarchy.x +  this.settings.style.translate_top_fit
        }
        else{
            var x_tr = - this.hierarchy.x +  this.settings.style.translate_top_fit
        }

        var off_rooting = (Math.abs(r.min_x)-Math.abs(r.max_x))/2
        var y_tr =  -this.hierarchy.y + this.height/2 + off_rooting*h_scale
        //var y_tr =  (this.height/2) - this.hierarchy.y - (r.min_x + (r.max_x - r.min_x)/2)/2

        this.set_zoom(h_scale, x_tr, y_tr)


        var w = 0


        this.hierarchy.leaves().forEach((e) => {

            let posy = e.y

            if (e.data.collapse){
                posy += e.data.triangle_width
            }

            w = posy > w ? posy : w
        })


        var ns = this.model.settings.tree.node_horizontal_size
        var w_scale = (this.width - 80)/(w*h_scale)

        this.container_object.modify_node_size('horizontal', (ns * w_scale) - ns )

        var real_edges_width = this.compute_edge_width()
        this.G.selectAll('path.link').style('stroke-width',  real_edges_width + 'px')





    }

    render_with_settings(scale, x,y,node_size, collapsed){

        if (collapsed.length > 0){
            this.model.apply_collapse_to_list(collapsed)
            this.set_data(this.model)
            this.render(this.hierarchy)
        }

        this.set_zoom(scale, x, y)

        var delta_node_size = -(this.model.settings.tree.node_horizontal_size - node_size)

        if (delta_node_size!=0){
            this.container.modify_node_size('horizontal',  -(this.model.settings.tree.node_horizontal_size - node_size)    )
        }

        var real_edges_width = this.compute_edge_width()
        this.G.selectAll('path.link').style('stroke-width',  real_edges_width + 'px')

    }

    // TUNNING todo should be in Controller
    /*
    modify_node_size(axis, variation){

        if (axis === 'vertical') {
            if ((this.model.settings.tree.node_vertical_size + variation) <= 0){return}
            this.model.settings.tree.node_vertical_size += variation
            //this.interface.update_slider(this.interface.slider_v, this.model.settings.tree.node_vertical_size)
        }
        else if (axis === 'horizontal') {
            if ((this.model.settings.tree.node_horizontal_size + variation) <= 0){return}
            this.model.settings.tree.node_horizontal_size += variation
            //this.interface.update_slider(this.interface.slider_h, this.model.settings.tree.node_horizontal_size)
        }

        this.d3_cluster.nodeSize([ this.model.settings.tree.node_vertical_size,this.model.settings.tree.node_horizontal_size])
        this.build_d3_cluster()
        this.render(this.hierarchy)


        if (this.interface && this.model.settings.use_branch_lenght) {
           var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k
            this.interface.update_scale_value(k);
        }

    }

     */

    toggle_use_length(){
        this.model.settings.use_branch_lenght = !this.model.settings.use_branch_lenght

        if (!this.model.settings.use_branch_lenght){this.interface.remove_scale()}
        else{this.interface.add_scale()}

        this.build_d3_data()
        this.render(this.hierarchy)

        this.maximise_zoom()
    }

    toggle_align_tip(){
        this.model.settings.align_tip = !this.model.settings.align_tip

        this.render(this.hierarchy)
    }

    toggle_mirror(){
        this.model.settings.mirror = !this.model.settings.mirror

        this.build_d3_data()
        this.render(this.hierarchy)

        var zoom = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node())
            this.set_zoom(zoom.k,this.width-zoom.x,zoom.y)


    }

    toggle_internal_label(){

        this.model.settings.display_internal_label = !this.model.settings.display_internal_label
        this.render(this.hierarchy)
    }

    toggle_duplication(){
        this.model.settings.display_duplication = !this.model.settings.display_duplication
        this.render(this.hierarchy)

    }

    toggle_leaves(){
        this.model.settings.display_leaves = !this.model.settings.display_leaves
        this.render(this.hierarchy)

    }

    toggle_node_labels(){
        this.model.settings.display_nodes_labels = !this.model.settings.display_nodes_labels
        this.render(this.hierarchy)

    }



    toggle_tooltips(){
        this.model.settings.show_tooltips = !this.model.settings.show_tooltips
        this.render(this.hierarchy)

    }

    toggle_subsample(){
        this.model.settings.subsample_label = !this.model.settings.subsample_label
        var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k

        if(this.model.settings.subsample_label){
            this.model.settings.tree.font_size = this.model.settings.tree.font_size*k
        }
        else{
            this.model.settings.tree.font_size = this.model.settings.tree.font_size/k
        }

        this.render(this.hierarchy)

        //this.interface.update_slider(this.interface.slider_t, this.model.settings.tree.font_size)

    }

    toggle_multiple_search(){
        this.model.settings.multiple_search = !this.model.settings.multiple_search
    }

    toggle_sync_coloring(){
        this.model.settings.sync_coloring = !this.model.settings.sync_coloring;

        var acc = this.model.settings.style.color_accessor['node']
        this.model.settings.style.color_accessor['leaf'] = acc

        if (this.model.settings.style.color_extent_min['node'][acc] !=100000){
            this.model.settings.style.color_extent_max['leaf'][acc] = this.model.settings.style.color_extent_max['node'][acc]
            this.model.settings.style.color_extent_min['leaf'][acc] = this.model.settings.style.color_extent_min['node'][acc]
        }

        else {
            this.model.settings.style.color_extent_max['node'][acc] = this.model.settings.style.color_extent_max['leaf'][acc]
            this.model.settings.style.color_extent_min['node'][acc] = this.model.settings.style.color_extent_min['leaf'][acc]

        }

        this.container_object.interface = new Interface(this, this.container_object)
        this.interface.open_color_settings()


    }

    toggle_use_meta_for_leaf(){
        this.model.settings.use_meta_for_leaf = !this.model.settings.use_meta_for_leaf
    }

    toggle_use_meta_for_node(){
        this.model.settings.use_meta_for_node = !this.model.settings.use_meta_for_node
    }


    // stack

    toggle_only_support(){

        this.model.settings.stack.only_support = !this.model.settings.stack.only_support

        this.build_d3_data()
        this.render(this.hierarchy)
    }

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


    update_collapse_level(val, refresh_interface){

        var refresh_interface = (typeof refresh_interface !== 'undefined') ? refresh_interface : true;


        this.model.settings.collapse_level = val
        this.container_object.collapse_depth(this.model.settings.collapse_level, this.model.data)
        //this.set_data(this.model, refresh_interface)
        this.build_d3_cluster()
        this.render(this.hierarchy)

        if (refresh_interface){
            this.interface = new Interface(this, this.container_object)
        }
        else{
            var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k
            if (this.interface && this.model.settings.use_branch_lenght){
                this.interface.update_scale_value(k);
            }

        }



    }



    toggle_dessimode(){
        this.model.settings.dessimode = !this.model.settings.dessimode

        if (this.model.settings.dessimode) {

            var r= Math.floor(Math.random() * 101);

            if (r > 50) {alert("[Common] If I may just give a little feedback... [ following 1200 lines truncated]")}
            else if (r > 10) {alert("[Rare] If I may just give a little feedback... [ following 6800 lines truncated]")}
            else{alert("[Lengendary] Have you heard about banana and human genome similarity,?")}


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

        var data = (ms.has_support && ms.only_support ) ? e.stackData_support[ms.type] : e.stackData[ms.type];


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
                    if (ms.has_support && ms.only_support){
                        var summary_number = ms.type === "genes" ? d.data.nr_hogs_support : d.numberEvents_; // todo add nr_proteins and  numberEvents
                    }
                    else{
                        var summary_number = ms.type === "genes" ? d.data.nr_hogs : d.numberEvents; // todo add nr_proteins and  numberEvents
                    }

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

        var max_genome = (ms.has_support && ms.only_support) ? this.model.largestGenome_support : this.model.largestGenome
        var max_event = (ms.has_support && ms.only_support) ? this.model.largestGenome_support : this.model.largestGenome


        if(type === 'genes' || !type){

            if(ms.maxStackHeight === "max" && max_genome > 0){
                var normalizer = ms.stackHeight / max_genome;
            } else if(Number.isInteger(ms.maxStackHeight)){
                var normalizer = ms.maxStackHeight / (d.retained + d.duplicated + d.gained + Math.abs(d.lost));
            } else {
                var normalizer = ms.stackHeight / (d.retained + d.duplicated + d.gained + Math.abs(d.lost));
            }

        } else {

            if(ms.maxStackHeight === "max" && max_event > 0){
                var normalizer = ms.stackHeight / max_event;
            } else if(Number.isInteger(ms.maxStackHeight)){
                var normalizer = m.maxStackHeight / (d.duplications + d.gained + Math.abs(d.lost));
            } else {
                var normalizer = ms.stackHeight / (d.duplications + d.gained + Math.abs(d.lost));
            }

        }

        return normalizer;

    }

    barStack(seriesDataAll, type, only_support = false) {

        var data;

        if(type === 'genes' || !type) {
            data = [[{}], [{}], [{}], [{}]];
        } else {
            data = [[{}], [{}], [{}]];
        }

        var size = 0;
        if (only_support){
            var d = seriesDataAll.data.evolutionaryEvents_support;
        }
        else{
            var d = seriesDataAll.data.evolutionaryEvents;
        }

        var posBase = 0; // positive base
        var stackIndex = 0;
        var seriesIndex = 0;

        var normalizer = this.getStackNormalizer(d, type);

        /* in case there's no eveolutionary events */
        normalizer = !isFinite(normalizer) ? 1 : normalizer;

        if (typeof d.gained == 'undefined'){
            d.gained = 0
        }

        if (typeof d.gained == 'undefined'){
            d.gained = 0
        }

        if (typeof d.retained == 'undefined'){
            d.retained = 0
        }

        if (typeof d.duplicated == 'undefined'){
            d.duplicated = 0
        }

        if (typeof d.duplications == 'undefined'){
            d.duplications = 0
        }

        if (typeof d.lost == 'undefined'){
            d.lost = 0
        }






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

    isOdd(num) { return num % 2;}

    compute_node_font_size(internal=false){

        var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k

        if (!this.model.settings.subsample_label && !internal){
           k=1
        }

        if (internal){
            var fs =  this.model.settings.style.font_size_internal/k ;
        }
        else {
            var fs =  this.model.settings.tree.font_size/k ;
        }

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

    get_label_extended_information(node, type){


        if (type == 'Topology'){

            var topo = node.data.elementS[this.get_compared_model()]

            return topo ? topo.toFixed(2) : ''

        }

        return (type == 'Name') ? node.data.name :  node.data.extended_informations[type]
    }

    node_face_enter(nodeEnter){

        var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k

        var on_screen_text_size = this.compute_node_font_size()
        var show_node_face = this.model.settings.display_nodes_labels !== false
        var show_lt = show_node_face ?  this.model.settings.display_internal_label_left_top !== false: false
        var show_lb = show_node_face ? this.model.settings.display_internal_label_left_bottom !== false : false
        var mirror_factor = this.model.settings.mirror ? true : false;


        var show_ltl = this.model.settings.display_leaf_label_left_top !== false
        var show_lbl = this.model.settings.display_leaf_label_left_bottom !== false



        // Add labels for the nodes
        nodeEnter.append('text')
            .attr("class", "right")
            .attr("dy", ".35em")
            .style('cursor', 'pointer')
            .style('font-size', d => {

                var collapse_text = false
                if (d.data.collapse){
                    collapse_text = d.data.triangle_height >= on_screen_text_size + 'px' ? true : false
                }

                return d.subsampled || collapse_text   ? on_screen_text_size : '0px' ;
            })
            .attr("font-weight", (d) =>  {
                return  400
                //return d.children || d._children ? 900 : 400
            })
            .attr('fill', (d) => {
                return "#212529";
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
                var scale = (d.children || d._children) ? 1 : k
                return d.parent == null || mirror_factor ? -13/scale : 13/scale;
            })
            .attr("text-anchor", function(d) {
                return d.parent == null || mirror_factor ? "end" : "start"; // todo better deal with internal name
            })
            .text(function(d) { return d.data.name; })
            .on('click', (d,i) => {
             if (i.children == null && i._children == null){

                 this.interface.add_modal_edit_label(i, 'Default');
                 $('#exampleModal_edit').modal('show');

             }

         });


        // INTERNAL LABELS

        nodeEnter.filter(function(d) { return (d.children || d._children); })
            .append('text')
            .attr("class", "left_top")
            .attr("dy", ".35em")
            //.attr("alignment-baseline", "ideographic" )
            .style('font-size', d => {
                return show_lt ? this.model.settings.style.font_size_internal + 'px' : '0px' ;
            })
            .attr("font-weight", (d) =>  {
                return 400
            })
            .attr("y", (d) => {
                return -13
            })
            .attr("x", function(d) {
                return mirror_factor ? 8 : -8;
            })
            .attr("text-anchor", function(d) {

                return mirror_factor ? "start" : "end"
            })
            .text( (d) => {
                return "";
            })

        nodeEnter.filter(function(d) { return (d.children || d._children); })
            .append('text')
            .attr("class", "left_bottom")
            .attr("dy", ".35em")
            //.attr("alignment-baseline", "hanging" )
            .style('font-size', d => {
                return show_lb ? this.model.settings.style.font_size_internal + 'px': '0px' ;
            })
            .attr("font-weight", (d) => {
                return 400
            })
            .attr("y", (d) => {
                return 13
            })
            .attr("x", function (d) {
                return mirror_factor ? 8 : -8;
            })
            .attr("text-anchor", function (d) {

                return mirror_factor ? "start" : "end"
            })
            .text( (d) => {
                return "";
            })



        // LEAVES LABELS

        nodeEnter.filter(function(d) { return !(d.children || d._children); })
            .append('text')
            .attr("class", "left_top_leaf")
            .attr("dy", ".35em")
            .style('font-size', d => {
                return show_ltl ? this.model.settings.style.font_size_internal + 'px' : '0px' ;
            })
            .attr("font-weight", (d) =>  {
                return 400
            })
            .attr("y", (d) => {
                return -13
            })
            .attr("x", function(d) {
                return mirror_factor ? 8 : -8;
            })
            .attr("text-anchor", function(d) {

                return mirror_factor ? "start" : "end"
            })
            .text( (d) => {
                return "";
            })

        nodeEnter.filter(function(d) { return !(d.children || d._children); })
            .append('text')
            .attr("class", "left_bottom_leaf")
            .attr("dy", ".35em")
            //.attr("alignment-baseline", "hanging" )
            .style('font-size', d => {
                return show_lbl ? this.model.settings.style.font_size_internal + 'px': '0px' ;
            })
            .attr("font-weight", (d) => {
                return 400
            })
            .attr("y", (d) => {
                return 13
            })
            .attr("x", function (d) {
                return mirror_factor ? 8 : -8;
            })
            .attr("text-anchor", function (d) {

                return mirror_factor ? "start" : "end"
            })
            .text( (d) => {
                return "";
            })
    }

    node_face_update(nodes){

        var on_screen_text_size = this.compute_node_font_size()
        var on_screen_text_size_int = this.compute_node_font_size(true)
        var k = this.d3.zoomTransform(d3.select("#master_g" + this.uid).node()).k


        var show_node_face = this.model.settings.display_nodes_labels !== false
        var show_r = show_node_face ? this.model.settings.display_internal_label !== false : false
        var show_lt = show_node_face ?  this.model.settings.display_internal_label_left_top !== false: false
        var show_lb = show_node_face ? this.model.settings.display_internal_label_left_bottom !== false : false

        var mirror_factor = this.model.settings.mirror;


        var show_rl = this.model.settings.display_leaf_label !== false
        var show_ltl = this.model.settings.display_leaf_label_left_top !== false
        var show_lbl = this.model.settings.display_leaf_label_left_bottom !== false


        nodes.select('text.right')
            .text((d) => {
                if (d.children || d._children){

                    if (d.data.collapse){

                        if (this.container_object.api.settings.phylostratigraphy){
                            return d.data.name
                        }

                        let l = d.data.leaves

                        if (l.length <= 0){
                            d.data.leaves = this.model.get_leaves(d.data)
                        }

                        return '[' + l[0].name + ' ... ' +  l[l.length-1].name + ']'
                    }


                    if (d.data.force_label_show == false){
                        return '';
                    }
                    
                    return show_r || d.data.force_label_show ? this.get_label_extended_information(d, this.model.settings.display_internal_label) : '';
                }

                if (show_rl && this.model.settings.display_leaf_label !== 'Default'){
                    return this.get_label_extended_information(d, this.model.settings.display_leaf_label)
                }
                return d.data.name;
            })
            .attr("x", function(d) {
                let y_offset = (typeof d.data.triangle_width !== 'undefined') ? d.data.triangle_width : 0;

                var scale = k //(d.children || d._children) ? 1 : k

                if (mirror_factor){
                    return  -(y_offset + 13/scale);
                }

                return d.parent == null ? -13/scale : y_offset + 13/scale;
            })
            .attr("y", 0)
            .attr('fill', (d) => {

                if (!(d.children || d._children)){


                    var acc = this.model.settings.style.color_accessor['leaf']
                    var type_acc = this.model.settings.extended_data_type[acc]


                    if (type_acc === 'color'){

                        var g = d.data.extended_informations[acc];

                        if (typeof g !== "undefined" ) {
                            return g
                        }


                    }

                    else if (acc !== null){

                        var v = d.data.extended_informations[acc];

                        if (typeof v !== "undefined" ) {

                            if (type_acc == 'cat'){

                                var cs = this.container_object.api.get_color_scale(acc)
                                return cs.get_color(v)

                            }

                            else{
                                return this.model.settings.colorScale['leaf'](v)
                            }


                        }


                    }

                }

                let c =  d.data.search_node ? "#FF0000"  : "#212529";

                if (d.data.collapse){
                    return this.color_triangle(d)
                }



                return c
            })
            .style('font-size', d => {if (d.children){
                if (d.data.force_label_show == false){
                    return '0px';
                }
                    return show_r || d.data.force_label_show ? on_screen_text_size_int + 'px' : '0px';
                } return d.subsampled   ? on_screen_text_size + 'px' : '0px' ;}
            )
            .on('click', (d,i) => {
                if (i.children == null && i._children == null){

                    this.interface.add_modal_edit_label(i, this.model.settings.display_leaf_label);
                    $('#exampleModal_edit').modal('show');

                }

                else {
                    this.interface.add_modal_edit_label(i, this.model.settings.display_internal_label);
                    $('#exampleModal_edit').modal('show');
                }

            });




        // INTERNAL LABELS

        nodes.select('text.left_top')
            .style('font-size', d => {
                if (d.data.force_label_show == false){
                    return '0px';
                }
                return show_lt || d.data.force_label_show ? on_screen_text_size_int+ 'px' : '0px';
            })
            .text( (d) => {
                if (d.data.force_label_show == false){
                    return '';
                }
                return show_lt || d.data.force_label_show ? this.get_label_extended_information(d, this.model.settings.display_internal_label_left_top) : '';
            })
            .attr("y", (d) => {
                return -13 /k
            })
            .attr("x", function (d) {
                return mirror_factor ? 8/k : -8/k;
            })
            .on('click', (d,i) => {


                    this.interface.add_modal_edit_label(i, this.model.settings.display_internal_label_left_top);
                    $('#exampleModal_edit').modal('show');


            });

        nodes.select('text.left_bottom')
            .style('font-size', d => {
                if (d.data.force_label_show == false){
                    return '0px';
                }
                return show_lb || d.data.force_label_show ? on_screen_text_size_int + 'px' : '0px';
            })
            .text( (d) => {
                if (d.data.force_label_show == false){
                    return '';
                }
                return show_lb || d.data.force_label_show ? this.get_label_extended_information(d, this.model.settings.display_internal_label_left_bottom): '';
            })
            .attr("y", (d) => {
                return 13 /k
            })
            .attr("x", function (d) {
                return mirror_factor ? 8/k : -8/k;
            })
            .on('click', (d,i) => {


                    this.interface.add_modal_edit_label(i, this.model.settings.display_internal_label_left_bottom);
                    $('#exampleModal_edit').modal('show');



            });

        // LEAVES LABELS

        nodes.select('text.left_top_leaf')
            .style('font-size', d => {
                return show_ltl ? on_screen_text_size_int+ 'px' : '0px';
            })
            .text( (d) => {
                return show_ltl ? this.get_label_extended_information(d, this.model.settings.display_leaf_label_left_top) : '';
            })
            .attr("y", (d) => {
                return -13 /k
            })
            .attr("x", function (d) {
                return mirror_factor ? 8/k : -8/k;
            })
            .on('click', (d,i) => {

                    this.interface.add_modal_edit_label(i, this.model.settings.display_leaf_label_left_top);
                    $('#exampleModal_edit').modal('show');



            });

        nodes.select('text.left_bottom_leaf')
            .style('font-size', d => {
                return show_lbl ? on_screen_text_size_int + 'px' : '0px';
            })
            .text( (d) => {
                return show_lbl ? this.get_label_extended_information(d, this.model.settings.display_leaf_label_left_bottom): '';
            })
            .attr("y", (d) => {
                return 13 /k
            })
            .attr("x", function (d) {
                return mirror_factor ? 8/k : -8/k;
            })
            .on('click', (d,i) => {


                    this.interface.add_modal_edit_label(i, this.model.settings.display_leaf_label_left_bottom);
                    $('#exampleModal_edit').modal('show');



            });
    }

    node_face_exit(nodeExit){

        // On exit reduce the opacity of text labels
        nodeExit.select('text')
            .style('fill-opacity', 1e-6);
    }

};


