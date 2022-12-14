
// Only apply keyboard shortcut to the first (left) and second (right) created containers
export default class keyboardManager {

    constructor(phylo) {

        this.left;
        this.right;


        var cs = Object.entries(phylo.containers);

        if (cs.length != -1) { this.left = cs[0][1] }
        if(cs.length > 1) { this.right = cs[1][1]}


        var self_km = this

        document.onkeypress = function (e) {
             e = e || window.event;

            const formElements = ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'DIV'];

            if (formElements.includes(e.target.tagName)) {return}

            var shortcuts = {
                // LEFT
                "r": function(){self_km.left.viewer.fit_to_viewer_height()},
                "f": function(){self_km.left.viewer.maximise_zoom()},
                "a": function(){self_km.left.modify_node_size_percent(20,  'horizontal')},
                "d": function(){self_km.left.modify_node_size_percent( 20,'horizontal')},
                "w": function(){self_km.left.modify_node_size_percent( 20,'vertical')},
                "s": function(){self_km.left.modify_node_size_percent( 20,'vertical')},
                "q": function(){self_km.left.shift_model(-1)},
                "e": function(){self_km.left.shift_model(1)},

                // RIGHT
                "u": function(){self_km.right.shift_model(-1)},
                "o": function(){self_km.right.shift_model(1)},
                "j": function(){self_km.right.modify_node_size_percent( 20,'horizontal')},
                "l": function(){self_km.right.modify_node_size_percent( 20,'horizontal')},
                "i": function(){self_km.right.modify_node_size_percent( 20,'vertical')},
                "k": function(){self_km.right.modify_node_size_percent( 20,'vertical')},
                "z": function(){self_km.right.viewer.fit_to_viewer_height()},
                "h": function(){self_km.right.viewer.maximise_zoom()},

                "t": function(){
                    phylo.settings.compute_distance = true;
                    phylo.send_worker_distance()},

                "g": function(){
                    if (phylo.phylo_embedded){document.getElementById("menu_compare_mode").click();}
                    }


            }

            if (shortcuts.hasOwnProperty(e.key)){
                shortcuts[e.key]()
            }

        };

    }

};




