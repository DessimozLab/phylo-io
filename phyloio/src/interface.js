
// D3 viewer Interface that render UI elements(buttons, slider, menu)
export default class Interface {

    constructor(v,c){

        this.scale_pixel_length = 90;

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


    }

    add_bottom_left_container() {
        return this.container_d3.append("div")
            .attr("class","corner_placeholder bottom left")
    }

    add_bottom_right_container(){
        return this.container_d3.append("div").attr("class","corner_placeholder bottom right")
    }

    add_top_left_container(){
        return this.container_d3.append("div").attr("class","corner_placeholder top left")
    }

    add_top_right_container(){
        return this.container_d3.append("div").attr("class","corner_placeholder top right")
    }

    add_toggle(){
        this.bottom_left.append('button')
            .on('click', d => {return this.container_object.shift_model(-1)})
            .attr('class', ' square_button')
            .append("div")
            .on('click', d => {return this.container_object.shift_model(-1)})
            .attr("class","label")
            .append('i')
            .style('color', 'white')
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
            .style('color', 'white')
            .attr('class', ' fas fa-chevron-right ')



    }

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
            .attr('text-anchor', 'middle')
            .attr("dy", ".35em")
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


}