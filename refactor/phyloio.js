
var parser = require("biojs-io-newick");
var uid = 0 // unique id generator

function PhyloIO() {

    var self = this; // Back up for "this" when "this" is override like in click/event callback functions

    this.constructor = function(){
        this.containers = {} // {container id -> Container() }
        this.settings = {};
        this.compareMode = false; // If true, compute topology comparaison/distance between containers trees.

            return this
    }

    // API
    this.create_container = function(container_id){
        var c = new Container(container_id);
        this.containers[container_id] = c;
        return c;
    }
    this.add_tree_to_container = function(container, data, params){

        var params = params || undefined;
        var tree = new Model(data, params);
        container.add_model(tree)

    }
    this.start = function(){
        for (const [uid, container] of Object.entries(this.containers)) {
            container.start()
        }
    }

    // KEYBOARD
    document.onkeypress = function (e) {
        // Only apply keyboard shortcut to the first (left) and second (right) created containers
        e = e || window.event;

        var left = Object.entries(self.containers)[0][1]
        var right = Object.entries(self.containers)[1][1]

        shortcuts = {
            // LEFT
            "r": function(){left.viewer.centerNode(left.viewer.get_random_node())},
            "a": function(){left.viewer.modify_node_size( 'horizontal',-5)},
            "d": function(){left.viewer.modify_node_size( 'horizontal',5)},
            "w": function(){left.viewer.modify_node_size( 'vertical',-5)},
            "s": function(){left.viewer.modify_node_size( 'vertical',5)},
            "q": function(){left.previous_model()},
            "e": function(){left.next_model()},
            // RIGHT
            "u": function(){right.previous_model()},
            "o": function(){right.next_model()},
            "p": function(){right.viewer.centerNode(right.viewer.get_random_node())},
            "j": function(){right.viewer.modify_node_size( 'horizontal',-5)},
            "l": function(){right.viewer.modify_node_size( 'horizontal',5)},
            "i": function(){right.viewer.modify_node_size( 'vertical',-5)},
            "k": function(){right.viewer.modify_node_size( 'vertical',5)},
        }

        if (shortcuts.hasOwnProperty(e.key)){
            shortcuts[e.key]()
        }

    };

    return this.constructor()
}

function Container(container_id){

    this.constructor = function(){

        this.uid = uid++;
        this.div_id = container_id;
        this.settings = {};
        this.models = [];
        this.current_model = 0; // current model index of this.models
        this.viewer = new Viewer(this);

        return this

    }

    // API
    this.configure_container = function(params){ // todo: control if params exists
        for(var key in params) {
            var value = params[key];
            this.settings[keys] = value;
        }
    }
    this.start = function(){
        this.viewer.set_data(this.models[this.current_model]);
        this.viewer.render(this.viewer.hierarchy);
    }
    this.previous_model = function(){
        if (this.current_model > 0){

            this.models[this.current_model].store_zoomTransform(d3.zoomTransform(this.viewer.svg.node()))

            this.current_model -= 1;
            this.viewer.set_data(this.models[this.current_model])
            this.viewer.render(this.viewer.hierarchy)

            var z = this.models[this.current_model].data.zoom

            if (z) {this.viewer.set_zoom(z.k,z.x,z.y)}
        }
    }
    this.next_model = function(){
        if (this.current_model < this.models.length -1 ){

            this.models[this.current_model].store_zoomTransform(d3.zoomTransform(this.viewer.svg.node()))

            this.current_model += 1;
            this.viewer.set_data(this.models[this.current_model]);
            this.viewer.render(this.viewer.hierarchy);


            var z = this.models[this.current_model].data.zoom

            if (z) {this.viewer.set_zoom(z.k,z.x,z.y)}
        }
    }

    // INTERFACE WITH MODEL
    this.trigger_collapse = function(data){
        this.models[this.current_model].collapse(data)
        this.viewer.build_d3_data()
        this.viewer.render(this.viewer.hierarchy)
    }
    this.trigger_reroot = function(data){
        this.models[this.current_model].reroot(data)
        this.viewer.set_data(this.models[this.current_model])
        this.viewer.render(this.viewer.hierarchy)
    }

    // PRIVATE
    this.add_model = function(model){
        this.models.push(model);
    }

    return this.constructor();
}

function Viewer(container){

    var self = this;
    var i = 0;
    var duration = 0;

    this.constructor = function(){

        // GENERAL
        this.container_object = container
        this.uid = uid++;
        this.data; // current model used no model here just raw data
        this.hierarchy;
        this.d3_cluster;

        this.zoom;
        this.svg;
        this.svg_d3;
        this.G;
        this.G_d3;
        this.container = document.getElementById(this.container_object.div_id);
        this.container_d3 = d3.select(this.container);

        // TREE VARIABLES
        this.node_vertical_size = 30;
        this.node_horizontal_size = 40;
        this.use_branch_lenght = true;
        this.margin = {top: 16, right: 16, bottom: 16, left: 96};
        this.width = parseFloat(window.getComputedStyle(this.container).width) - this.margin.left - this.margin.right;
        this.height = parseFloat(window.getComputedStyle(this.container).height) - this.margin.top - this.margin.bottom;
        this.max_length;
        this.scale_branch_length;
        this.stack;


        this._init()
        }

    // PUBLIC METHODS
    this.update_data =  function(model){
        this.data = model.data;
        this.build_d3_data();
    }
    this.update = function(source){ //rename render

        var self = this

        // Assigns the x and y position for the nodes
        var data_d3  = this.d3_cluster(this.hierarchy);

        // Compute the new tree layout.
        this.nodes = data_d3.descendants();
        this.links = data_d3.descendants().slice(1);

        // ****************** Nodes section ***************************

        this.nodes.forEach(d => d.y = this.scale_branch_length(d.branch_size))

        // Update the nodes...
        var node = this.G.selectAll('g.node')
            .data(this.nodes, function(d) {return d.id || (d.id = ++i); });

        // Enter any new modes at the parent's previous position.
        var nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', this.click_nodes)

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

            nodeEnter.append("rect").filter(d => this.getChildLeaves(d).length > 3)
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
            .duration(duration)
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
            .duration(duration)
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

                d3.select(this).select("path").transition().duration(duration) // (d.searchHighlight) ? 0 : duration)
                    .attr("d", function (d) {
                        var y_length = self.node_horizontal_size * Math.sqrt(self._getChildLeaves(d).length)
                        var x_length = self.node_vertical_size * Math.sqrt(self._getChildLeaves(d).length)
                        return "M" + 0 + "," + 0 + "L" + y_length + "," + (-x_length) + "L" + y_length + "," + (x_length) + "L" + 0 + "," + 0;
                    })

            }

            if (d.children) {
                d3.select(this).select("path").transition().duration(duration)
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
                return self._diagonal(o, o)
            })


        linkEnter.on("click", d =>
        {
            self.container_object.trigger_reroot(d.path[0].__data__)
        })


        // UPDATE
        var linkUpdate = linkEnter.merge(link);









        similarity = d3.scaleLinear()
            .domain([1, 0.8, 0.6, 0.4, 0.2, 0]) // unit: topology similarity
            .range( ['rgb(37,52,148)', 'rgb(44,127,184)', 'rgb(65,182,196)', 'rgb(127,205,187)', 'rgb(199,233,180)', 'rgb(255,255,204)']) // unit: color

        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(duration)
            .style('stroke', d => d.elementS ? similarity(d.elementS) : "#ccc" )
            .attr('d', function(d){ return self._diagonal(d, d.parent) })


        // Remove any exiting links
        var linkExit = link.exit().transition()
            .duration(duration)
            .attr('d', function(d) {
                var o = {x: source.x, y: source.y}
                return self._diagonal(o, o)
            })
            .remove();

        // Store the old positions for transition.
        this.nodes.forEach(function(d){
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }
    this.modify_node_hozirontal_size = function(variation){

        this.node_horizontal_size += variation
        this.d3_cluster.nodeSize([this.node_vertical_size,this.node_horizontal_size])
        this.build_d3_data()
        this.render(this.hierarchy)

    }
    this.modify_node_vertical_size = function(variation){

        this.node_vertical_size += variation
        this.d3_cluster.nodeSize([this.node_vertical_size,this.node_horizontal_size])
        this.build_d3_data()
        this.render(this.hierarchy)

    }
    this.get_random_node = function(){
        var ns = []
        this.hierarchy.each(d => ns.push(d));
        return ns[Math.floor(Math.random() * ns.length)];

    }

    // PRIVATE METHODS
    this._init = function(){

        this.zoom = d3.zoom().on("zoom", this.zoomed) // creates zoom behavior

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
            .nodeSize([this.node_vertical_size,this.node_horizontal_size])
            .separation(this._separate)

        //this.update(this.root);
    }
    this._zoomed = function({transform}) {
        d3.select("#master_g" + self.uid).attr("transform", transform);
    }
    this._build_d3_data = function(){

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
    this.centerNode = function(source) {

        var x = -source.y0 + this.width / 2;
        var y = -source.x0 + this.height / 2;

        d3.select('#svg' + this.uid )
            .transition()
            .duration(this.duration)
            .call(this.zoom.transform, d3.zoomIdentity.translate(x,y).scale(1) );

    }
    this.set_zoom = function (k,x,y) {

        d3.select('#svg' + this.uid ).transition().duration(this.duration).call(this.zoom.transform, d3.zoomIdentity.translate(x,y).scale(k) );

    }

    // PRIVATE METHODS
    this._zoomed = function({transform}) {
        d3.select("#master_g" + self.uid).attr("transform", transform);
    }
    this._separate =  function(a, b) { // todo

        var spacer = 1;


        spacer += a._children ? Math.sqrt(self._getChildLeaves(a).length) * 1  : 0
        spacer += b._children ? Math.sqrt(self._getChildLeaves(b).length) * 1 : 0

        return spacer;
    }
    this._getChildLeaves =  function(d) {
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
    this._getChildren =  function(d) {
        return d._children ? d._children : (d.children ? d.children : []);
    }
    this._mean = function(array){
        return array.reduce((a, b) => a + b) / array.length
    }
    this._diagonal = function(s, d) {

        //var path = `M ${s.y} ${s.x} C ${(s.y + d.y) / 2} ${s.x}, ${(s.y + d.y) / 2} ${d.x}, ${d.y} ${d.x}`

        var path =   "M" + s.y + "," + s.x + "L" + d.y + "," + s.x + "L" + d.y + "," + d.x;

        return path
    }
    this._click = function(event, d) {
        self.container_object.trigger_collapse(d.data)
    }
    this._createDeepLeafList = function(_tree) {
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
    this._postorderTraverse = function(d, f, do_children) {
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
            children = self._getChildren(d);
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
    this._getChildLeaves = function(d) {

        /*
    returns list of leaf nodes that are children of d
    */
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

    this.constructor()

    return this;
}

function Model(data, params){

    this.constructor = function(){

        var params = params || {'data_type': 'newick', "use_branch_lenght": true, 'stack': false}; // todo if only one param is set should work;

        this.uid = uid++;
        this.data_type = params.data_type;
        this.input_data = data;
        this.data = this.factory(this._parse());
        this.data.root = true;

        return this

    }

    // API
    this.collapse = function(data){
        data.collapse ? data.collapse = false : data.collapse = true;
    }
    this.reroot = function(data){

        // extract meta data (zoom)
        var meta = this.data.zoom;

        // create new root r
        var root = {"children": [], "name": "", "branch_length": 0, "new": true}

        var parent = data.data.parent
        var child = data.data

        root.children.push(child)
        parent.children.push(root)

        this.set_parent(child, root )
        this.set_parent(root, parent )

        // remove current node from parent children
        const index = parent.children.indexOf(child);
        if (index > -1) {
            parent.children.splice(index, 1);
        }

        var parent = parent
        var child = root

        var stack = []

        while (parent.root != true) {

            stack.push([parent,child])

            child = parent
            parent = parent.parent

        }

        stack.push([parent,child])

        var f = function(p,c){

            c.children.push(p)
            p.parent =c



            const b = p.children.indexOf(c);
            if (b > -1) {
                p.children.splice(b, 1);
            }

        }

        for (var e in stack){
            var p = stack[e][0]
            var c = stack[e][1]

            f(p,c)

        }

        // Remove root

        var c = parent.children[0]
        var r = parent
        var p = parent.parent

        const ce = parent.parent.children.indexOf(r);
        if (ce > -1) {
            parent.parent.children.splice(ce, 1);
        }

        c.parent = p
        p.children.push(c)
        r = null

        root.zoom = meta
        this.data = root;
        this.data.root = true;

    }
    this.store_zoomTransform = function(zoom){

        this.data.zoom = {
            "k":zoom.k,
            "x":zoom.x,
            "y":zoom.y,
        };
    }
    this.traverse = function(o,func_pre, func_post) {

        if (func_pre){
            func_pre.apply(this,[o,o["children"]])
        }

        if(o["children"]){

            for (var c in o["children"] ) {

                var child = o["children"][c]

                child= this.traverse(child, func_pre, func_post)

                if (func_post) {
                    func_post.apply(this,[child,o])
                }


            }


        }

        return o

    }
    this.set_parent = function (node,parent){
        node.parent = parent
    }
    this.factory = function(json){
        return this.traverse(json, null , this.set_parent);
    }

    // PRIVATE
    this._parse = function(){

        if (this.data_type == "newick") {
            return parser.parse_newick(this.input_data);
        }


    }


    return this.constructor();
}

