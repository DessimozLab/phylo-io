import * as d3 from 'd3';

var uid_viewer = 0 // unique id generator is bound to a single Viewer()


// D3 viewer that render any model tree
export default class Viewer {

    constructor(container) {

        // General
        this.container_object = container // related Container()
        this.uid = uid_viewer ++; // unique viewer() id
        this.data; // current model.data used, no Model() here to prevent breaking MVC

        // D3
        this.d3 = d3 // d3.js instance that contain information about zoom, etc..
        this.hierarchy; // converted model data into d3 comptabile data format
        this.d3_cluster; // d3 layout to compute 2D position for d3 hierarchy object
        this.zoom;
        this.id_gen = 0; // unique id generator for d3 id

        // DOM
        this.svg;
        this.svg_d3;
        this.G;
        this.G_d3;
        this.container = document.getElementById(this.container_object.div_id);
        this.container_d3 = d3.select(this.container);

        this.settings = {
            'duration' : 0,
            'tree': {
                'node_vertical_size' : 30,
                'node_horizontal_size' : 40,
            },
            'style': {

            },

        }


        this.use_branch_lenght = true;
        this.margin = {top: 16, right: 16, bottom: 16, left: 96};
        this.width = parseFloat(window.getComputedStyle(this.container).width) - this.margin.left - this.margin.right;
        this.height = parseFloat(window.getComputedStyle(this.container).height) - this.margin.top - this.margin.bottom;
        this.max_length;
        this.scale_branch_length;
        this.stack;

        this.zoom = d3.zoom().on("zoom", (d, i) =>  { this.zoomed(d,i)} )

        // create svg
        this.svg = this.container_d3.append("svg")
            .attr("id", "svg" + this.uid)
            .attr("width", this.width + this.margin.left + this.margin.right )
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .call(this.zoom)
            .on("dblclick.zoom", null)
            .call(this.zoom.transform, d3.zoomIdentity.translate(this.margin.left,  (this.height/2 +  this.margin.top) ))

        this.svg_d3 = d3.select(this.svg)

        this.G = this.svg.append("g")
            .attr("id", "master_g" + this.uid)
            .attr("transform", "translate("+ this.margin.left + "," + (this.height/2 +  this.margin.top) + ")")

        this.G_d3 = d3.select(this.G);

        // D3 TREE
        this.d3_cluster = d3.cluster()
            .nodeSize([this.settings.tree.node_vertical_size,this.settings.tree.node_horizontal_size])
            .separation((a,b) =>  {return this.separate(a,b)})


    }

    set_data(model){
        this.data = model.data;
        this.build_d3_data();
    }

    render(source){

        var self_render = this;

        // Assigns the x and y position for the nodes
        var data_d3  = this.d3_cluster(this.hierarchy);

        // Compute the new tree layout.
        this.nodes = data_d3.descendants();
        this.links = data_d3.descendants().slice(1);

        // ****************** Nodes section ***************************

        this.nodes.forEach(d => d.y = this.scale_branch_length(d.branch_size))

        // Update the nodes...
        var node = this.G.selectAll('g.node')
            .data(this.nodes, function(d) {return d.id || (d.id = ++this.id_gen); });

        // Enter any new modes at the parent's previous position.
        var nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', (d, i, nodes) =>  { self_render.click(d,i,nodes)})

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
            .attr("d", function (d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            });

        if (this.stack) {

            nodeEnter.append("rect").filter(d => this._getChildLeaves(d).length > 3)
                .attr("x", -20)
                .attr("y", -30)
                .attr("width", 10)
                .attr("height", 40)
                .attr("fill", "red")

        }


        // UPDATE
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
                return d._children ? "lightsteelblue" : "#fff";
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


        nodeUpdate.each(function (d) {

            if (d._children) {

                d3.select(this).select("path").transition().duration(self_render.settings.duration) // (d.searchHighlight) ? 0 : duration)
                    .attr("d", function (d) {
                        var y_length =  self_render.settings.tree.node_horizontal_size * Math.sqrt(self_render._getChildLeaves(d).length)
                        var x_length =  self_render.settings.tree.node_vertical_size * Math.sqrt(self_render._getChildLeaves(d).length)
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

        // ****************** links section ***************************

        // Update the links...
        var link = this.G.selectAll('path.link')
            .data(this.links, function(d) { return d.id; })



        // Enter any new links at the parent's previous position.
        var linkEnter = link.enter().insert('path', "g")
            .attr("class", "link")
            .attr('d', function(d){
                var o = {x: source.x0, y: source.y0}
                return self_render._diagonal(o, o)
            })


        linkEnter.on("click", d =>
        {
            self_render.container_object.trigger_("reroot", d.path[0].__data__)
        })


        // UPDATE
        var linkUpdate = linkEnter.merge(link);

        var similarity = d3.scaleLinear()
            .domain([1, 0.8, 0.6, 0.4, 0.2, 0]) // unit: topology similarity
            .range( ['rgb(37,52,148)', 'rgb(44,127,184)', 'rgb(65,182,196)', 'rgb(127,205,187)', 'rgb(199,233,180)', 'rgb(255,255,204)']) // unit: color

        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(this.settings.duration)
            .style('stroke', d => d.elementS ? similarity(d.elementS) : "#ccc" )
            .attr('d', function(d){ return self_render._diagonal(d, d.parent) })


        // Remove any exiting links
        var linkExit = link.exit().transition()
            .duration(this.settings.duration)
            .attr('d', function(d) {
                var o = {x: source.x, y: source.y}
                return self_render._diagonal(o, o)
            })
            .remove();

        // Store the old positions for transition.
        this.nodes.forEach(function(d){
            d.x0 = d.x;
            d.y0 = d.y;
        });

    }

    build_d3_data(){

        this.hierarchy = d3.hierarchy(this.data, d => d.children );
        this.hierarchy.x0 = this.height / 2;
        this.hierarchy.y0 = 0;

        this.hierarchy.each(d => {

            if (d.data.collapse) {
                d._children = d.children;
                d.children = null;
            }
            else {
                d._children = null;


            }

        })

        if (this.use_branch_lenght) {

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

            // Create a scale between branch size domain and y pos range
            var x = this.d3_cluster(this.hierarchy);
            var max_y = 0;
            x.descendants().forEach(d => {
                if (d.y > max_y) {
                    max_y = d.y
                }
            })
            this.scale_branch_length = d3.scaleLinear().domain([0, this.max_length]).range([x.y, max_y])

        }

    }

    separate(a, b) { // todo

        var spacer = 1;

        spacer += a._children ? Math.sqrt(this._getChildLeaves(a).length) * 1  : 0
        spacer += b._children ? Math.sqrt(this._getChildLeaves(b).length) * 1 : 0

        return spacer;
    }


    // MEXICO

    _getChildLeaves(d) {
        if (d.children || d._children) {
            var leaves = [];
            var children = this._getChildren(d);
            for (var i = 0; i < children.length; i++) {
                leaves = leaves.concat(this._getChildLeaves(children[i]));
            }
            return leaves;
        } else {
            return [d];
        }
    }

    _getChildren(d) {
        return d._children ? d._children : (d.children ? d.children : []);
    }

    _mean(array){
        return array.reduce((a, b) => a + b) / array.length
    }

    _diagonal(s, d) {

        //var path = `M ${s.y} ${s.x} C ${(s.y + d.y) / 2} ${s.x}, ${(s.y + d.y) / 2} ${d.x}, ${d.y} ${d.x}`

        var path =   "M" + s.y + "," + s.x + "L" + d.y + "," + s.x + "L" + d.y + "," + d.x;

        return path
    }

    _createDeepLeafList(_tree) {
        /**
         Description:
         Creates list of leaves of each node in subtree rooted at v

         Note:
         Difference between deep leaf list and leaves in:
         (A:0.1,B:0.2,(C:0.3,D:0.4):0.5);
         - Root has leaves: A, B, C and D (terminal leaves)
         - Root has deep leaves: A, B, C, D and CD (terminal leaves + intermediate leaves)
         */
        this._postorderTraverse(_tree, function(d){
            var deepLeafList = [];

            for (var i=0; i < d._leaves.length; i++){


                deepLeafList.push(d._leaves[i].data.name)
            }
            d.deepLeafList = deepLeafList;


        });
    }

    _postorderTraverse(d, f, do_children) {
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
        if (do_children === undefined) { //check whether variable is defined, e.g. string, integer ...
            do_children = true;
        }
        var children = [];
        if (do_children) {
            children = self_viewer._getChildren(d);
        } else {
            if (d.children) {
                children = d.children
            }
        }
        if (children.length > 0) {
            for (var i = 0; i < children.length; i++) {
                this._postorderTraverse(children[i], f, do_children);
            }
            f(d);
            return;

        } else {
            f(d);
            return;
        }
    }

    modify_node_hozirontal_size(variation){

        this.settings.tree.node_horizontal_size += variation
        this.d3_cluster.nodeSize([ this.settings.tree.node_vertical_size,this.settings.tree.node_horizontal_size])
        this.build_d3_data()
        this.render(this.hierarchy)

    }

    modify_node_vertical_size(variation){

        this.settings.tree.node_vertical_size += variation
        this.d3_cluster.nodeSize([this.settings.tree.node_vertical_size,this.settings.tree.node_horizontal_size])
        this.build_d3_data()
        this.render(this.hierarchy)

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
    set_zoom(k,x,y) {

        d3.select('#svg' + this.uid ).transition().duration(this.duration).call(this.zoom.transform, d3.zoomIdentity.translate(x,y).scale(k) );

    }

    click(event, node , nodes) {
        this.container_object.trigger_("collapse", node.data)
    }
    zoomed({transform}) {
        d3.select("#master_g" + this.uid).attr("transform", transform);
    }

};


