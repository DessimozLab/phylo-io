
// D3 viewer Interface that render UI elements(buttons, slider, menu)
export default class Interface {

    constructor(v,c){

        this.container_object = c
        this.viewer = v
        this.container_d3 = v.container_d3

        // this make able the corner placement for all UI elements inside
        this.container_d3.style('position', 'relative')

        this.render()


    }
    // todo decide if render + update or only one
    render(){

        // remove previous placeholder
        this.container_d3.selectAll("corner_placeholder").remove()

        // Create corner placeholder for UI elements
        this.bottom_left = this.add_bottom_left_container()
        this.bottom_right = this.add_bottom_right_container()
        this.top_left = this.add_top_left_container()
        this.top_right = this.add_top_right_container()

        this.add_toggle()

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
            .attr('class', ' square_button')
            .append("div")
            .on('click', d => {return this.container_object.shift_model(-1)})
            .attr("class","label")
            .append('i')
            .style('color', 'white')
            .attr('class', ' fas fa-arrow-left')


        this.bottom_left.append('button')
            .attr('class', ' square_button screen_toggle')
            //.attr("id",'osef')
            .append("div")
            .attr("class","label")
            .text(d => {return this.container_object.current_model +1  + " / "  + this.container_object.models.length})

        this.bottom_left.append('button')
            .attr('class', ' square_button')
            .append("div")
            .on('click', d => { return this.container_object.shift_model(1)})
            .attr("class","label")
            .append('i')
            .style('color', 'white')
            .attr('class', ' fas fa-arrow-right')



    }


}