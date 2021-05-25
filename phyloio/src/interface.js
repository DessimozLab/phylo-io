
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
        this.container_d3.select(".scale").remove()

        // Create corner placeholder for UI elements
        this.bottom_left = this.add_bottom_left_container()
        this.bottom_right = this.add_bottom_right_container()
        this.top_left = this.add_top_left_container()
        this.top_right = this.add_top_right_container()

        // BOTTOM LEFT
        this.add_toggle()
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
            .on('click', d => {return this.viewer.centerNode(this.viewer.get_random_node())})
            .attr('class', ' square_button')
            .style('margin', '2px')
            .append("div")
            .attr("class","label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-search-plus ')

        this.bottom_right.append('button')
            .on('click', d => {return this.viewer.centerNode(this.viewer.get_random_node())})
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
        this.menu_export.append('div').append("text")
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
    add_settings(){
        this.tr_buttons.append('button')
            .attr('class', ' square_button')
            .style('margin', '2px')
            .on("click", d => {
            if (this.menu_settings.style('display') === 'none'){
                this.menu_export.style("display", 'none')
                return this.menu_settings.style("display", 'block')
            }
            return this.menu_settings.style("display", 'none')
        })
            .append("div")
            .attr("class","label")
            .append('i')
            .style('color', '#888')
            .attr('class', ' fas fa-sliders-h ')

        this.menu_settings = this.tr_menus.append('div')
            .style("background-color", '#aaa')
            .attr('class', 'menu_settings')
            .style('height', '60px')
    }

}