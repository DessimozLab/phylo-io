
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
    add_search(){
        this.search_input =  this.tr_buttons.append('input')
            .attr('class', ' square_button search_input')


        this.tr_buttons.append('button')
            .attr('class', ' square_button search_button')
            .style('margin', '2px')
            .append("div")
            .attr("class","label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-search ')
    }

    // EXPORT
    add_export() {

        // add the button
        this.tr_buttons.append('button')
            .attr('class', ' square_button')
            .style('margin', '2px')
            .on("click", d => {
                if (this.menu_export.style('display') === 'none'){
                     this.menu_settings.style("display", 'none')
                    return this.menu_export.style("display", 'block')
                }
                return this.menu_export.style("display", 'none')
            })
            .append("div")
            .attr("class", "label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-save ')

        // add the sub menu container
        this.menu_export = this.tr_menus.append('div')
            .attr('class', 'menu_export')

        // Adds
        this.menu_export.append('div').append("p")
            .attr("class", 'scale_text')
            .text("Export as: ")

        this.export_as = this.menu_export.append('div')
            .style('display', 'flex')

        this.export_as.append('button')
            .attr('class', ' square_button')
            .style('margin', '2px')
            .style('flex-grow', '1')
            .append("text")
            .text("PNG")

        this.export_as.append('button')
            .attr('class', ' square_button')
            .style('margin', '2px')
            .style('flex-grow', '1')
            .append("text")
            .text("SVG")

        this.export_as.append('button')
            .attr('class', ' square_button')
            .style('margin', '2px')
            .style('flex-grow', '1')
            .append("text")
            .text("NWK")

        this.export_as.append('button')
            .attr('class', ' square_button')
            .style('margin', '2px')
            .style('flex-grow', '1')
            .append("text")
            .text("JSON")


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
        this.tr_buttons.append('button')
            .attr('class', ' square_button')
            .style('margin', '2px')
            .on("click", d => {
                if (this.menu_settings.style('display') === 'none') {
                    this.menu_export.style("display", 'none')
                    return this.menu_settings.style("display", 'block')
                }
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
            .style('height', '60px')

        // ADD THE ACCORDION SYSTEM

        this.menu_general_b = this.menu_settings.append('button').attr('class', 'accordion').text("Tree")
        this.menu_general_p =  this.menu_settings.append('div').attr('class', 'panel').append("div").style("padding", "14px")

        this.menu_tree_b = this.menu_settings.append('button').attr('class', 'accordion').text("Branch & Labels")
        this.menu_tree_p =  this.menu_settings.append('div').attr('class', 'panel').append("div").style("padding", "14px")

        if (this.viewer.model.settings.has_histogram_data && this.viewer.model.settings.show_histogram ) {
        this.menu_stack_b = this.menu_settings.append('button').attr('class', 'accordion').text("Stack")
        this.menu_stack_p =  this.menu_settings.append('div').attr('class', 'panel').append("div").style("padding", "14px")
        }

        this.menu_advanced_b = this.menu_settings.append('button').attr('class', 'accordion').text("Advanced")
        this.menu_advanced_p =  this.menu_settings.append('div').attr('class', 'panel').append("div").style("padding", "14px")

        // ADD LOGIC TO ACCORDION
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
        this.slider_v = this.add_slider_UI(this.menu_general_p, "Tree height", 10, 100, this.viewer.model.settings.tree.node_vertical_size, 1, "slider_node_vertical_size_",
            (e ) =>{this.viewer.modify_node_size('vertical', e.target.value - this.viewer.model.settings.tree.node_vertical_size)})

        this.slider_h = this.add_slider_UI(this.menu_general_p, "Tree width", 10, 100, this.viewer.model.settings.tree.node_horizontal_size, 1, "slider_node_horyzontal_size_",
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

        // JOKE
        this.add_swicth_UI(this.menu_advanced_p, this.viewer.model.settings.dessimode,() => {return this.viewer.model.settings.dessimode ? "Disable Dessimode" : "Activate Dessimode"},   this.viewer.toggle_dessimode.bind(this.viewer))


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

}