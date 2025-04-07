import * as d3 from 'd3';


export default class Color_mapper {

    constructor() {

        this.cpt = 1

        this.scheme = d3.scaleSequential(d3.interpolateRainbow)
        this.scheme_name = 'Viridis'

        this.scale = this.scheme
            .domain([0, this.cpt/2, this.cpt])

        this.domain_mapping = {}

    }

    get_color(val){
        return this.scale(this.domain_mapping[val])
    }

    add_value_to_map(val){
        if (!(val in this.domain_mapping)) {
            this.domain_mapping[val] = this.cpt
            this.cpt++
        }
    }

    update_scheme(val, name){
        this.scheme = val
        this.scheme_name = name
    }

    update(){
        this.scale = d3.scaleSequential(this.scheme).domain([0, this.cpt/2, this.cpt])

    }

}