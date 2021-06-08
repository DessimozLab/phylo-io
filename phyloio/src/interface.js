import * as fs from 'file-saver';

// D3 viewer Interface that render UI elements(buttons, slider, menu)
export default class Interface {

    constructor(v,c){

        this.scale_pixel_length = 120;

        this.container_object = c
        this.viewer = v
        this.container_d3 = v.container_d3

        // this make able the corner placement for all UI elements inside
        this.container_d3.style('position', 'relative')

        // remove previous placeholder & UI
        this.container_d3.selectAll("corner_placeholder").remove()
        this.remove_scale()
        this.container_d3.selectAll(".menu_settings").remove()

        // Create corner placeholder for UI elements
        this.bottom_left = this.add_bottom_left_container()
        this.bottom_right = this.add_bottom_right_container()
        this.top_left = this.add_top_left_container()
        this.top_right = this.add_top_right_container()

        // BOTTOM LEFT
        if (this.container_object.models.length > 1) {
            this.add_toggle()
        }
        if (this.viewer.model.settings.use_branch_lenght) {
            this.scale_text = this.add_scale()
        }

        // BOTTOM RIGHT
        this.add_zoom()

        // TOP RIGHT
        this.add_search()
        this.add_export()
        //this.add_undo()
        this.add_settings()

    }

    // PLACEHOLDER
    add_bottom_left_container() {
        return this.container_d3.append("div")
            .attr("class","corner_placeholder bottom left")
    }
    add_bottom_right_container(){
        return this.container_d3.append("div")
            .attr("class","corner_placeholder bottom right")
            .style("flex-direction",  "column")
    }
    add_top_left_container(){
        return this.container_d3.append("div")
            .attr("class","corner_placeholder top left")
    }
    add_top_right_container(){
        var div =  this.container_d3.append("div").attr("class","corner_placeholder top right").style("display",'block')

        this.tr_buttons = div.append("div").attr("class","tr-button")

        this.tr_menus = div.append("div").attr("class","tr-menus")

        return div
    }

    // TOGGLE
    add_toggle(){
        this.bottom_left.append('button')
            .on('click', d => {return this.container_object.shift_model(-1)})
            .attr('class', ' square_button')
            .append("div")
            .attr("class","label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-chevron-left ')


        this.bottom_left.append('button')
            .attr('class', ' square_button screen_toggle')
            .append("div")
            .attr("class","label")
            .text(d => {return this.container_object.current_model +1  + " / "  + this.container_object.models.length})

        this.bottom_left.append('button')
            .attr('class', ' square_button')
            .on('click', d => { return this.container_object.shift_model(1)})
            .append("div")
            .attr("class","label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-chevron-right ')



    }

    // ZOOM
    add_zoom(){

        this.bottom_right.append('button')
            .on('click', d => {return this.viewer.zoom_in()})
            .attr('class', ' square_button')
            .style('margin', '2px')
            .append("div")
            .attr("class","label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-search-plus ')

        this.bottom_right.append('button')
            .on('click', d => {return this.viewer.zoom_out()})
            .attr('class', ' square_button')
            .style('margin', '2px')
            .append("div")
            .attr("class","label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-search-minus ')
    }

    // SCALE
    add_scale(){

        var scaleLineLateralPadding = 10
        var scaleLineBottomPadding = 40


        var gg = this.viewer.svg_d3.node().append('g')
            .attr("class", 'scale')
            .attr("transform", "translate(0," + (this.viewer.height - scaleLineBottomPadding)  + ")")

        gg.append("path")
            .attr("d", (d) => {return "M" + scaleLineLateralPadding + ",20L" + (this.scale_pixel_length)  + ",20"})
            .attr("class", 'scale_line')


        var scale_text = gg.append("text")
            .attr("class", 'scale_text')
            .attr("x", this.scale_pixel_length/2)
            .attr("y", 10)
            .attr("fill", "#555")
            .attr('text-anchor', 'middle')
            .attr("dy", ".2em")
            .text(d => {return this.compute_scale()})

        return scale_text



    }
    remove_scale(){this.container_d3.select(".scale").remove()}
    update_scale_value(zoom_scale){
        this.scale_text.text(this.compute_scale(zoom_scale))

    }
    compute_scale(zoom_scale){
        var zoom_scale = zoom_scale || 1;
        return (this.viewer.scale_branch_length.invert(this.scale_pixel_length)/zoom_scale).toFixed(4);
    }

    // SEARCH

    autocomplete(inp, arr) {


        /*the autocomplete function takes two arguments,
        the text field element and an array of possible autocompleted values:*/
        var currentFocus;
        /*execute a function when someone writes in the text field:*/

        inp.addEventListener("input", function(e) {



            var a, b, i, val = this.value;
            /*close any already open lists of autocompleted values*/
            closeAllLists();
            if (!val) { return false;}
            currentFocus = -1;
            /*create a DIV element that will contain the items (values):*/
            a = document.createElement("DIV");
            a.setAttribute("id", this.id + "autocomplete-list");
            a.setAttribute("class", "autocomplete-items");
            /*append the DIV element as a child of the autocomplete container:*/
            this.parentNode.appendChild(a);
            /*for each item in the array...*/
            for (i = 0; i < arr.length; i++) {
                /*check if the item starts with the same letters as the text field value:*/
                if (arr[i].substr(0, val.length).toUpperCase() === val.toUpperCase()) { // todo true regexp
                    /*create a DIV element for each matching element:*/
                    b = document.createElement("DIV");
                    /*make the matching letters bold:*/
                    b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
                    b.innerHTML += arr[i].substr(val.length);
                    /*insert a input field that will hold the current array item's value:*/
                    b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                    /*execute a function when someone clicks on the item value (DIV element):*/
                    b.addEventListener("click", function(e) {
                        /*insert the value for the autocomplete text field:*/
                        inp.value = this.getElementsByTagName("input")[0].value;
                        /*close the list of autocompleted values,
                        (or any other open lists of autocompleted values:*/
                        closeAllLists();
                    });
                    a.appendChild(b);
                }
            }
        });
        /*execute a function presses a key on the keyboard:*/
        inp.addEventListener("keydown", function(e) {
            var x = document.getElementById(this.id + "autocomplete-list");
            if (x) x = x.getElementsByTagName("div");
            if (e.keyCode == 40) {
                /*If the arrow DOWN key is pressed,
                increase the currentFocus variable:*/
                currentFocus++;
                /*and and make the current item more visible:*/
                addActive(x);
            } else if (e.keyCode == 38) { //up
                /*If the arrow UP key is pressed,
                decrease the currentFocus variable:*/
                currentFocus--;
                /*and and make the current item more visible:*/
                addActive(x);
            } else if (e.keyCode == 13) {
                /*If the ENTER key is pressed, prevent the form from being submitted,*/
                e.preventDefault();
                if (currentFocus > -1) {
                    /*and simulate a click on the "active" item:*/
                    if (x) x[currentFocus].click();
                }
            }
        });
        function addActive(x) {
            /*a function to classify an item as "active":*/
            if (!x) return false;
            /*start by removing the "active" class on all items:*/
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            /*add class "autocomplete-active":*/
            x[currentFocus].classList.add("autocomplete-active");
        }
        function removeActive(x) {
            /*a function to remove the "active" class from all autocomplete items:*/
            for (var i = 0; i < x.length; i++) {
                x[i].classList.remove("autocomplete-active");
            }
        }
        function closeAllLists(elmnt) {
            /*close all autocomplete lists in the document,
            except the one passed as an argument:*/
            var x = document.getElementsByClassName("autocomplete-items");
            for (var i = 0; i < x.length; i++) {
                if (elmnt != x[i] && elmnt != inp) {
                    x[i].parentNode.removeChild(x[i]);
                }
            }
        }
        /*execute a function when someone clicks in the document:*/
        document.addEventListener("click", function (e) {
            closeAllLists(e.target);
        });
    }

    add_search(){


        this.container_d3.selectAll("#searchinp" + this.viewer.uid).remove()

        this.search_input =  this.tr_buttons.append('input')
            .attr('class', ' square_button search_input')
            .attr('id', "searchinp" + this.viewer.uid )

        this.autocomplete(document.getElementById("searchinp" + this.viewer.uid ), this.viewer.model.suggestions)
        this.tr_buttons.append('button')
            .attr('class', ' square_button search_button')
            .style('margin', '2px')
            .on("click", d => {
                this.container_object.zoom_to_node(document.getElementById("searchinp" + this.viewer.uid).value)
            })
            .append("div")
            .attr("class","label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-search ')


    }

    // EXPORT
    add_export() {

        // add the button
        var ex_b = this.tr_buttons.append('button')
            .attr('id', 'button_export' + this.container_object.uid)

            ex_b.attr('class', ' square_button')
            .style('margin', '2px')
            .on("click", d => {
                if (this.menu_export.style('display') === 'none'){
                     this.menu_settings.style("display", 'none') // make it more general to all menu/button
                    ex_b.style('background-color', '#CCC');
                     document.getElementById("button_settings" + this.container_object.uid).style.backgroundColor =  'rgba(239, 239, 239, 0.95)';
                    return this.menu_export.style("display", 'block')
                }
                ex_b.style('background-color', 'rgba(239, 239, 239, 0.95)');
                return this.menu_export.style("display", 'none')
            })
            .append("div")
            .attr("class", "label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-save ')


        // add the sub menu container
        this.menu_export = this.tr_menus.append('div')
            .style("background-color", '#aaa')
            .attr('class', 'menu_export')


        // ADD THE ACCORDION SYSTEM

        this.menu_exportfile_b = this.menu_export.append('button').attr('class', 'accordion').text("Export as file")
        this.menu_exportfile_p =  this.menu_export.append('div').attr('class', 'panel').append("div").style("padding", "14px")




        this.export_as = this.menu_exportfile_p.append('div')
            .style('display', 'flex')

        this.export_as.append('button') // todo clean click
            .attr('class', ' square_button')
            .on("click", d => {
                var svg = this.viewer.d3.select("#svg" + this.viewer.uid)
                this.addLogo(svg);


                var name = svg.attr("id");
                var svgString = this.getSVGString(svg.node());
                var exportElement = svg.node();
                var width = exportElement.getBoundingClientRect().width;
                var height = exportElement.getBoundingClientRect().height;
                this.svgString2Image(svgString, 2 * width, 2 * height, 'png', save);

                function save(dataBlob, filesize) {
                    var filename = (name) ? name+"." : "";
                    fs.saveAs(dataBlob, filename+'phylo.io.png'); // FileSaver.js function
                }
                svg.select("#exportLogo").remove();



            })
            .style('margin', '2px')
            .style('flex-grow', '1')
            .append("text")
            .text("PNG")


        this.export_as.append('button')
            .attr('class', ' square_button')
            .on("click", d => { // todo clean
                var svg = this.viewer.d3.select("#svg" + this.viewer.uid)
                this.addLogo(svg);
                var name = svg.attr("id");
                var svgString = this.getSVGString(svg.node());
                var blob = new Blob([svgString], {"type": "image/svg+xml;base64,"+ btoa(svgString)});
                fs.saveAs(blob, name+".svg");
                svg.select("#exportLogo").remove();
            })
            .style('margin', '2px')
            .style('flex-grow', '1')
            .append("text")
            .text("SVG")

    }

    // UNDO
    add_undo(){
        this.tr_buttons.append('button')
            .attr('class', ' square_button')
            .style('margin', '2px')
            .append("div")
            .attr("class","label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-undo ')
    }

    // SETTINGS
    add_settings() {

        // add the buttons
        var set_b = this.tr_buttons.append('button')
        set_b.attr('class', ' square_button')
        set_b.attr('id', 'button_settings' + this.container_object.uid)
            .style('margin', '2px')
            .on("click", d => {
                if (this.menu_settings.style('display') === 'none') { //make it as funtion
                    this.menu_export.style("display", 'none')
                    set_b.style('background-color', '#CCC');
                    document.getElementById("button_export" + this.container_object.uid).style.backgroundColor = 'rgba(239, 239, 239, 0.95)';
                    return this.menu_settings.style("display", 'block')
                }
                set_b.style('background-color', 'rgba(239, 239, 239, 0.95)');
                return this.menu_settings.style("display", 'none')
            })
            .append("div")
            .attr("class", "label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-sliders-h ')

        // add the menu
        this.menu_settings = this.tr_menus.append('div')
            .style("background-color", '#aaa')
            .attr('class', 'menu_settings')


        // ADD THE ACCORDION SYSTEM todo close other when open one

        this.menu_general_b = this.menu_settings.append('button').attr('class', 'accordion').text("Tree")
        this.menu_general_p =  this.menu_settings.append('div').attr('class', 'panel').append("div").style("padding", "14px")

        this.menu_tree_b = this.menu_settings.append('button').attr('class', 'accordion').text("Branch & Labels")
        this.menu_tree_p =  this.menu_settings.append('div').attr('class', 'panel').append("div").style("padding", "14px")

        if (this.viewer.model.settings.has_histogram_data && this.viewer.model.settings.show_histogram ) {
        this.menu_stack_b = this.menu_settings.append('button').attr('class', 'accordion').text("Stack")
        this.menu_stack_p =  this.menu_settings.append('div').attr('class', 'panel').append("div").style("padding", "14px")



            this.slider_sts = this.add_slider_UI(this.menu_stack_p, "Stack height", 40, 300, this.viewer.model.settings.stack.stackHeight, 5, "slider_stack_height_",
                (e ) =>{this.viewer.update_stack_height(e.target.value)})

            this.slider_sts = this.add_slider_UI(this.menu_stack_p, "Stack width", 10, 150, this.viewer.model.settings.stack.stackWidth, 5, "slider_stack_width_",
                (e ) =>{this.viewer.update_stack_width(e.target.value)})

            this.slider_sts = this.add_slider_UI(this.menu_stack_p, "Label size", 6, 40, this.viewer.model.settings.stack.legendTxtSize, 1, "slider_stack_text_size_",
                (e ) =>{this.viewer.update_stack_font(e.target.value)})

            this.menu_stack_p.append("p").text('Labels')


            this.stack_type = this.menu_stack_p.append('div')
                .style('display', 'flex')
                .style('margin-top', "14px")



            this.stack_type.append('button') // todo clean click
                .attr('class', ' square_button')
                .attr('id', 'stack_type_events')
                .style('background-color', d => {return this.viewer.model.settings.stack.type === 'events' ? 'rgb(204, 204, 204)': null })
                .on("click", d => {
                    this.viewer.update_stack_type('events')
                    this.viewer. d3.select("#stack_type_events").style('background-color','rgb(204, 204, 204)')
                    this.viewer.d3.select("#stack_type_genes").style('background-color', null)
                })
                .style('margin', '2px')
                .style('flex-grow', '1')
                .append("text")
                .text("Events")


            this.stack_type.append('button')
                .attr('class', ' square_button')
                .attr('id', 'stack_type_genes')
                .style('background-color', d => {return this.viewer.model.settings.stack.type === 'genes' ? 'rgb(204, 204, 204)': null })
                .on("click", d => {
                    this.viewer.update_stack_type('genes')
                    this.viewer.d3.select("#stack_type_genes").style('background-color','rgb(204, 204, 204)')
                    this.viewer.d3.select("#stack_type_events").style('background-color', null)
                })
                .style('margin', '2px')
                .style('flex-grow', '1')
                .append("text")
                .text("Genes")

            this.add_swicth_UI(this.menu_stack_p, (this.viewer.model.settings.stack.maxStackHeight === 'ratio'),"Fix stack height",   this.viewer.toggle_height_max_ratio.bind(this.viewer))



        }

        //this.menu_advanced_b = this.menu_settings.append('button').attr('class', 'accordion').text("Advanced")
        //this.menu_advanced_p =  this.menu_settings.append('div').attr('class', 'panel').append("div").style("padding", "14px")

        // ADD LOGIC TO ACCORDION todo add it general or to this div only
        var acc = document.getElementById(this.container_object.div_id).getElementsByClassName("accordion");
        var i;

        for (i = 0; i < acc.length; i++) {
            acc[i].addEventListener("click", function() {
                this.classList.toggle("active");
                var panel = this.nextElementSibling;
                if (panel.style.maxHeight) {
                    panel.style.maxHeight = null;
                } else {
                    panel.style.maxHeight = panel.scrollHeight + "px";
                }
            });
        }

        // ADD TOGGLE BRANCH LENGTH
        if(this.viewer.model.settings.has_branch_lenght){
            this.add_swicth_UI(this.menu_general_p, this.viewer.model.settings.use_branch_lenght,"Use branch lenght",   this.viewer.toggle_use_length.bind(this.viewer))
        }

        // ADD SLIDER RESIZE X/Y
        this.slider_v = this.add_slider_UI(this.menu_general_p, "Tree height", 10, 400, this.viewer.model.settings.tree.node_vertical_size, 1, "slider_node_vertical_size_",
            (e ) =>{this.viewer.modify_node_size('vertical', e.target.value - this.viewer.model.settings.tree.node_vertical_size)})

        this.slider_h = this.add_slider_UI(this.menu_general_p, "Tree width", 10, 400, this.viewer.model.settings.tree.node_horizontal_size, 1, "slider_node_horyzontal_size_",
            (e ) =>{this.viewer.modify_node_size('horizontal', e.target.value - this.viewer.model.settings.tree.node_horizontal_size)})

        // ADD SLIDER NODE/LINE/TEXT
        this.slider_n = this.add_slider_UI(this.menu_tree_p, "Node size", 1, 10, this.viewer.model.settings.tree.node_radius, 1, "slider_node_radius_",
            (e ) =>{this.viewer.update_node_radius(e.target.value)})

        this.slider_l = this.add_slider_UI(this.menu_tree_p, "Edge width", 1, 8, this.viewer.model.settings.tree.line_width, 1, "slider_line_width_",
            (e ) =>{this.viewer.update_line_width(e.target.value)})

        this.slider_t = this.add_slider_UI(this.menu_tree_p, "Label size", 4, 40, this.viewer.model.settings.tree.font_size, 1, "slider_text_size_",
            (e ) =>{this.viewer.update_font_size(e.target.value)})

        // COLLAPSE

        this.slider_c = this.add_slider_UI(this.menu_general_p,
            this.viewer.model.settings.tree.collapse_level == 0 ? "Autocollapse: Off" : "Autocollapse:" + this.viewer.model.settings.tree.collapse_level,
            0, this.viewer.model.settings.tree.max_depth , this.viewer.model.settings.tree.collapse_level, 0,"slider_collapse_level_",)
        document.getElementById("slider_collapse_level_" + this.container_object.uid).onchange = (e) => {


            this.viewer.update_collapse_level(e.target.value)
            var lab = e.target.value == 0 ? "Autocollapse: Off" : "Autocollapse:" + this.viewer.model.settings.tree.collapse_level;

            document.getElementById("slider_collapse_level_" + this.container_object.uid)
                .parentElement.previousSibling.innerHTML = lab;

            }

    }

    add_swicth_UI(parent, checked, label, f){

        var lab = parent.append('label').style("display", 'inline-block')
            .attr("class","switch")

        lab.append('input').attr('type', 'checkbox' ).property('checked', checked);
        lab.append('span').attr("class","slider_t round")
            .on('click', (d) => { f()} )

        parent.append('p').text(label).style("display", 'inline-block').style("margin-left", '12px')

    }

    add_slider_UI(parent, label, min, max, current, step, id, f){

        var f = f || function(){};

        parent.append("p").text(label)

        var d = parent.append('div')
            .attr("class","slidecontainer")

        var input =  d.append('input').attr("class","slider")
            .attr('type', 'range' )
            .attr('min', min )
            .attr('max', max )
            .attr('value', current )
            //.attr('step', step )
            .attr('id', id + this.container_object.uid )
            .on('click', (e) => { f(e)} )

        return input



    }

    update_slider(slide ,value){
        slide.attr('value', value);
    }

    //OLD PHYLO COPY PASTE todo clean
    // Below are the functions that handle actual exporting:
    // getSVGString ( svgNode ) and svgString2Image( svgString, width, height, format, callback )
    getSVGString( svgNode ) {
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

    svgString2Image( svgString, width, height, format, callback ) {
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

    addLogo(svg) {
        // TODO load with ajax
        var logo_xml = '<svg id="exportLogo" x="0" y="0"><g id="g4169"> <path d="m 29.606259,23.679171 1.905511,0 c 0.193778,0.617882 0.290669,1.188505 0.290672,1.711869 0.466506,-0.545171 1.022728,-0.99222 1.668668,-1.341146 0.653108,-0.348904 1.295455,-0.523362 1.927043,-0.523373 0.976073,1.1e-5 1.86603,0.261698 2.669869,0.78506 0.810999,0.523383 1.442581,1.221215 1.894747,2.093495 0.459321,0.865028 0.688986,1.802739 0.688998,2.813134 -1.2e-5,1.010407 -0.229677,1.951752 -0.688998,2.824038 -0.452166,0.865023 -1.083748,1.559219 -1.894747,2.082592 -0.803839,0.516105 -1.693796,0.774156 -2.669869,0.774157 -0.638765,-1e-6 -1.284701,-0.163554 -1.937809,-0.490663 -0.653117,-0.334377 -1.20575,-0.770521 -1.657902,-1.308434 l 0,6.542172 -1.711731,0 0,-12.713622 c -2e-6,-0.552441 -0.04665,-1.170313 -0.139953,-1.853616 -0.08613,-0.683283 -0.20096,-1.148504 -0.344499,-1.395663 m 2.196183,5.539039 c -3e-6,1.133981 0.355261,2.093499 1.065795,2.878557 0.717702,0.777793 1.561006,1.166688 2.529916,1.166687 0.954543,10e-7 1.79067,-0.392528 2.508385,-1.177592 0.717697,-0.785056 1.07655,-1.740939 1.076561,-2.867652 -1.1e-5,-1.1267 -0.358864,-2.082583 -1.076561,-2.867652 -0.717715,-0.79232 -1.553842,-1.188485 -2.508385,-1.188495 -0.96891,10e-6 -1.812214,0.396175 -2.529916,1.188495 -0.710534,0.785069 -1.065798,1.740952 -1.065795,2.867652" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4145" /> <path d="m 43.224746,34.75725 0,-16.279106 1.711731,0 0,7.152775 c 0.437798,-0.610593 0.94378,-1.112159 1.517951,-1.504699 0.581337,-0.399789 1.151913,-0.599688 1.71173,-0.599699 0.602867,1.1e-5 1.141147,0.123585 1.614841,0.370723 0.473678,0.23989 0.854062,0.570633 1.141153,0.99223 0.287074,0.421615 0.502386,0.897739 0.645937,1.428373 0.143531,0.523382 0.215302,1.083101 0.215312,1.679158 l 0,6.760245 -1.6902,0 0,-6.760245 c -8e-6,-0.33437 -0.0323,-0.65421 -0.09689,-0.959518 -0.05742,-0.305294 -0.154315,-0.603326 -0.290672,-0.894097 -0.136371,-0.298024 -0.337329,-0.534268 -0.602873,-0.708736 -0.265559,-0.181718 -0.584938,-0.272581 -0.958139,-0.272591 -0.473692,10e-6 -0.96891,0.243524 -1.485653,0.730544 -0.509576,0.487036 -0.925846,1.05039 -1.24881,1.69006 -0.315795,0.632417 -0.47369,1.177598 -0.473687,1.635543 l 0,5.53904 -1.711731,0" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4147" /> <path d="m 53.581256,23.679171 1.776325,0 3.423461,8.472114 3.337338,-8.472114 1.797856,0 -6.4163,16.388142 -1.819387,0 2.22848,-5.658979 -4.327773,-10.729163" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4149" /> <path d="m 67.415055,34.75725 -1.71173,0 0,-16.279106 1.71173,0 0,16.279106" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4151" /> <path d="m 80.882824,26.361462 c 0.523914,0.872297 0.785877,1.824546 0.785889,2.856748 -1.2e-5,1.032215 -0.261975,1.984463 -0.785889,2.856749 -0.523937,0.872291 -1.234467,1.562854 -2.131589,2.071689 -0.897143,0.501566 -1.873223,0.752348 -2.928244,0.752349 -1.062213,-1e-6 -2.04547,-0.250783 -2.949776,-0.752349 -0.897136,-0.508835 -1.607665,-1.199398 -2.131589,-2.071689 -0.523928,-0.872286 -0.78589,-1.824534 -0.785889,-2.856749 -10e-7,-1.032202 0.261961,-1.984451 0.785889,-2.856748 0.523924,-0.87955 1.234453,-1.570111 2.131589,-2.071688 0.904306,-0.508825 1.887563,-0.763242 2.949776,-0.763253 1.055021,1.1e-5 2.031101,0.254428 2.928244,0.763253 0.897122,0.501577 1.607652,1.192138 2.131589,2.071688 m -9.20459,2.856748 c -3e-6,1.126713 0.405501,2.082596 1.216513,2.867652 0.811004,0.785064 1.794261,1.177593 2.949775,1.177592 1.1555,10e-7 2.142346,-0.392528 2.960541,-1.177592 0.818175,-0.792325 1.227268,-1.748208 1.227279,-2.867652 -1.1e-5,-1.112162 -0.409104,-2.060776 -1.227279,-2.845844 -0.818195,-0.792321 -1.805041,-1.188485 -2.960541,-1.188495 -1.155514,10e-6 -2.138771,0.396174 -2.949775,1.188495 -0.811012,0.785068 -1.216516,1.733682 -1.216513,2.845844" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4153" /> <path d="m 84.532366,34.0049 c -2e-6,-0.247148 0.08612,-0.457951 0.258374,-0.63241 0.172247,-0.181725 0.380382,-0.272588 0.624405,-0.27259 0.244018,2e-6 0.452152,0.09087 0.624405,0.27259 0.179424,0.174459 0.269137,0.385262 0.269141,0.63241 -4e-6,0.239881 -0.08972,0.454318 -0.269141,0.643314 -0.17943,0.181727 -0.387564,0.27259 -0.624405,0.27259 -0.236846,0 -0.444981,-0.09087 -0.624405,-0.27259 -0.172252,-0.188996 -0.258376,-0.403433 -0.258374,-0.643314" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee" id="path4155" /> <path d="m 89.527608,21.08411 c -10e-7,-0.239866 0.08253,-0.447035 0.247608,-0.621507 0.172248,-0.174444 0.380383,-0.261673 0.624406,-0.261687 0.23684,1.4e-5 0.437798,0.08724 0.602874,0.261687 0.172246,0.174472 0.258371,0.381641 0.258374,0.621507 -3e-6,0.247162 -0.08254,0.457964 -0.247609,0.632409 -0.165075,0.167203 -0.369621,0.250796 -0.613639,0.250783 -0.244023,1.3e-5 -0.452158,-0.08358 -0.624406,-0.250783 -0.165074,-0.174445 -0.247609,-0.385247 -0.247608,-0.632409 m 1.356465,13.67314 -0.968904,0 0,-11.056271 0.968904,0 0,11.056271" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee" id="path4157" /> <path d="m 99.593447,23.526521 c 0.753583,1.1e-5 1.474873,0.149027 2.163883,0.447048 0.68899,0.298043 1.28468,0.701476 1.78709,1.210302 0.50238,0.508844 0.90072,1.115812 1.19499,1.820905 0.29424,0.705108 0.44137,1.442918 0.44139,2.213434 -2e-5,0.777797 -0.14715,1.519242 -0.44139,2.224339 -0.29427,0.705104 -0.69261,1.312071 -1.19499,1.820905 -0.50241,0.501568 -1.0981,0.905001 -1.78709,1.210301 -0.68901,0.298033 -1.4103,0.447049 -2.163883,0.447049 -1.543077,0 -2.860068,-0.556084 -3.950979,-1.668254 -1.090916,-1.112166 -1.636373,-2.456945 -1.636372,-4.03434 -10e-7,-1.032202 0.247608,-1.984451 0.742827,-2.856748 0.502393,-0.87955 1.180625,-1.570111 2.0347,-2.071688 0.861243,-0.508825 1.797849,-0.763242 2.809824,-0.763253 m -4.629212,5.691689 c -2e-6,1.301171 0.452153,2.416973 1.356467,3.347412 0.911483,0.923175 2.009573,1.38476 3.294277,1.384759 1.284681,10e-7 2.379191,-0.461584 3.283511,-1.384759 0.91147,-0.930439 1.36721,-2.046241 1.36722,-3.347412 -1e-5,-1.293889 -0.45575,-2.402423 -1.36722,-3.325603 -0.90432,-0.923164 -1.99883,-1.38475 -3.283511,-1.38476 -1.284704,10e-6 -2.382794,0.461596 -3.294277,1.38476 -0.904314,0.92318 -1.356469,2.031714 -1.356467,3.325603" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee" id="path4159" /> </g> <g id="g4014" transform="translate(12.84,20.592727)"> <g transform="translate(0,-0.065)" id="g3992"> <polygon style="fill:#939598" id="polygon461" points="5.7,0.23 11.86,0.23 11.86,1.65 7.12,1.65 7.12,6.04 11.86,6.04 11.86,7.46 11.86,7.46 5.7,7.46 " class="cls-2" /> <polygon style="fill:#939598" id="polygon463" points="0,7.08 3.51,7.08 3.51,8.49 1.43,8.49 1.45,15.84 12.68,15.84 12.68,17.26 12.68,17.26 0.04,17.26 " class="cls-2" /> <polygon style="fill:#939598" id="polygon465" points="10.49,11.02 10.49,12.44 10.49,12.44 2.84,12.44 2.84,7.79 4.26,7.79 4.26,11.02 " class="cls-2" transform="translate(0,-0.15225398)" /> <polygon style="fill:#bcbec0" id="polygon467" points="4.26,4.55 4.26,7.79 4.26,7.79 2.84,7.79 2.84,3.13 6.41,3.13 6.41,4.55 " class="cls-3" transform="matrix(1,0,0,0.85463687,0,0.4549866)" /> <rect style="fill:#939598;fill-opacity:1" id="rect3926-3" width="1.4240631" height="1.7319686" x="2.8396611" y="7.0799503" /> <rect style="fill:#939598;fill-opacity:1" id="rect3926-6" width="1.3864813" height="1.6934805" x="5.7012329" y="2.9206221" /> </g> <g id="g4005"> <g id="g3984"> <polygon class="cls-2" points="94.93,12.33 94.93,10.91 99.87,10.91 99.87,6.46 94.93,6.46 94.93,5.04 101.29,5.04 101.29,12.33 101.29,12.33 " id="polygon453" style="fill:#939598" /> <polygon class="cls-2" points="94.72,17.36 94.72,15.94 104.87,15.94 104.9,5.41 102.74,5.41 102.74,3.99 106.32,3.99 106.29,17.36 106.29,17.36 " id="polygon455" style="fill:#939598" /> <polygon class="cls-2" points="95.51,1.42 95.51,0 103.45,0 103.45,4.7 103.45,4.7 102.03,4.7 102.03,1.42 " id="polygon457" style="fill:#939598" /> <polygon class="cls-3" points="102.03,7.97 102.03,4.7 103.45,4.7 103.45,9.39 103.45,9.39 100.65,9.39 100.65,7.97 " id="polygon459" style="fill:#bcbec0" /> <rect y="3.9876499" x="102.02941" height="1.4238259" width="1.4579451" id="rect3926" style="fill:#939598;fill-opacity:1" /> <rect y="7.884686" x="99.887817" height="1.6934805" width="1.397205" id="rect3926-7" style="fill:#939598;fill-opacity:1" /> </g> </g> </g> </g> </svg>';


        svg.append("g").html(logo_xml);

    }
}