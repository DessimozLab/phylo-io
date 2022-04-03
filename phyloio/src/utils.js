import * as fs from 'file-saver';

function traverse(o,func_pre, func_post) {

    if (func_pre){
        func_pre.apply(this,[o,o["children"]])
    }

    if(o["children"]){

        for (var c in o["children"] ) {

            var child = o["children"][c]

            child = traverse(child, func_pre, func_post)

            if (func_post) {
                func_post.apply(this,[child,o])
            }


        }


    }

    return o

}

function build_table(hierarchy){ // build table for RF

    traverse(hierarchy, function(node,children){
        delete node.left_
        delete node.right_
        delete node.weight_
    }, null)

    var n = hierarchy.leaves().length
    var X = Array.from(new Array(n), _ => Array(3).fill(0));
    var S2I = {} //Array(n).fill(0)
    var I2S = Array(n).fill(0)
    var n_edges = 0

    var nz = []
    traverse(hierarchy, null, function(node,children){nz.push(node)})
    nz = nz.entries()

    var n1 = nz.next()
    var n2 = nz.next()
    var i = 0

    while (true) {
        var node = n1.value[1]
        var node2 = n2.value[1]
        var p = node.parent
        var ii;

        // Do work
        if (!(node.hasOwnProperty('children'))) {
            I2S[i] = node.data.name
            S2I[I2S[i]] = i
            node.weight_ = 0
            node.left_ = i
            node.right_ = i
            i += 1
        }

        // propagate up
        if (typeof p != "undefined"){
            p.left_ = p.hasOwnProperty('left_') ? Math.min(p.left_, node.left_) : node.left_
            p.right_ = p.hasOwnProperty('right_') ? Math.max(p.right_, node.right_) : node.right_
            if (p.hasOwnProperty('weight_')){ p.weight_ = p.weight_ + node.weight_ + 1} else {p.weight_ = node.weight_  +=1}
        }

        if (node.hasOwnProperty('children')) {

            if( node2.hasOwnProperty('weight_') && node2.weight_ > 0 ){ii = node.left_} else { ii = node.right_}

            X[ii][0] = node.left_
            X[ii][1] = node.right_
            if (node.data.hasOwnProperty('branch_length')){
                X[ii][2] = node.data.branch_length
            }
            else {
                X[ii][2] = 1
            }


            n_edges += 1

        }

        n1 = n2
        n2 = nz.next()

        if (n2.done){
            // process seed node, w=0
            ii = node.right_
            X[ii][0] = node.left_
            X[ii][1] = node.right_
            X[ii][2] = node.data.branch_length
            n_edges += 1
            break
        }






    }

    return {'table': X, 'n_edges': n_edges, 'I2S': I2S, 'S2I': S2I}


}

function reverse_order(child,parent){

    child.children.push(parent)
    parent.parent =child

    const b = parent.children.indexOf(child);
    if (b > -1) {
        parent.children.splice(b, 1);
    }
}

function reroot_hierarchy(hierarchy, leaf_name){



    let leaf = hierarchy.leaves().find(element => element.data.name == leaf_name );

    //  INVERT PATH TO ROOT
    var ancestors  = leaf.ancestors()
    leaf.children = []
    leaf.root = true

    var index
    for (index = 0; index < ancestors.length; index++) {

        let child = (index === 0) ? leaf : ancestors[index-1]
        let parent = ancestors[index]

        reverse_order(child,parent)
    }

    //DESTROY ROOT
    var old_root_children = ancestors[ancestors.length-1].children

    var c = ancestors[ancestors.length-2].children.indexOf(ancestors[ancestors.length-1]);
    if (c > -1) {
        ancestors[ancestors.length-2].children.splice(c, 1);
    }
    for (var j = 0; j < old_root_children.length; j++) {

        let parent = old_root_children[j]
        let child = ancestors[ancestors.length-2]

        child.children.push(parent)
        parent.parent =child
    }

    return leaf
}

function addLogo(svg) {
    // TODO load with ajax
    var logo_xml = '<svg id="exportLogo" x="0" y="0"><g id="g4169"> <path d="m 29.606259,23.679171 1.905511,0 c 0.193778,0.617882 0.290669,1.188505 0.290672,1.711869 0.466506,-0.545171 1.022728,-0.99222 1.668668,-1.341146 0.653108,-0.348904 1.295455,-0.523362 1.927043,-0.523373 0.976073,1.1e-5 1.86603,0.261698 2.669869,0.78506 0.810999,0.523383 1.442581,1.221215 1.894747,2.093495 0.459321,0.865028 0.688986,1.802739 0.688998,2.813134 -1.2e-5,1.010407 -0.229677,1.951752 -0.688998,2.824038 -0.452166,0.865023 -1.083748,1.559219 -1.894747,2.082592 -0.803839,0.516105 -1.693796,0.774156 -2.669869,0.774157 -0.638765,-1e-6 -1.284701,-0.163554 -1.937809,-0.490663 -0.653117,-0.334377 -1.20575,-0.770521 -1.657902,-1.308434 l 0,6.542172 -1.711731,0 0,-12.713622 c -2e-6,-0.552441 -0.04665,-1.170313 -0.139953,-1.853616 -0.08613,-0.683283 -0.20096,-1.148504 -0.344499,-1.395663 m 2.196183,5.539039 c -3e-6,1.133981 0.355261,2.093499 1.065795,2.878557 0.717702,0.777793 1.561006,1.166688 2.529916,1.166687 0.954543,10e-7 1.79067,-0.392528 2.508385,-1.177592 0.717697,-0.785056 1.07655,-1.740939 1.076561,-2.867652 -1.1e-5,-1.1267 -0.358864,-2.082583 -1.076561,-2.867652 -0.717715,-0.79232 -1.553842,-1.188485 -2.508385,-1.188495 -0.96891,10e-6 -1.812214,0.396175 -2.529916,1.188495 -0.710534,0.785069 -1.065798,1.740952 -1.065795,2.867652" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4145" /> <path d="m 43.224746,34.75725 0,-16.279106 1.711731,0 0,7.152775 c 0.437798,-0.610593 0.94378,-1.112159 1.517951,-1.504699 0.581337,-0.399789 1.151913,-0.599688 1.71173,-0.599699 0.602867,1.1e-5 1.141147,0.123585 1.614841,0.370723 0.473678,0.23989 0.854062,0.570633 1.141153,0.99223 0.287074,0.421615 0.502386,0.897739 0.645937,1.428373 0.143531,0.523382 0.215302,1.083101 0.215312,1.679158 l 0,6.760245 -1.6902,0 0,-6.760245 c -8e-6,-0.33437 -0.0323,-0.65421 -0.09689,-0.959518 -0.05742,-0.305294 -0.154315,-0.603326 -0.290672,-0.894097 -0.136371,-0.298024 -0.337329,-0.534268 -0.602873,-0.708736 -0.265559,-0.181718 -0.584938,-0.272581 -0.958139,-0.272591 -0.473692,10e-6 -0.96891,0.243524 -1.485653,0.730544 -0.509576,0.487036 -0.925846,1.05039 -1.24881,1.69006 -0.315795,0.632417 -0.47369,1.177598 -0.473687,1.635543 l 0,5.53904 -1.711731,0" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4147" /> <path d="m 53.581256,23.679171 1.776325,0 3.423461,8.472114 3.337338,-8.472114 1.797856,0 -6.4163,16.388142 -1.819387,0 2.22848,-5.658979 -4.327773,-10.729163" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4149" /> <path d="m 67.415055,34.75725 -1.71173,0 0,-16.279106 1.71173,0 0,16.279106" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4151" /> <path d="m 80.882824,26.361462 c 0.523914,0.872297 0.785877,1.824546 0.785889,2.856748 -1.2e-5,1.032215 -0.261975,1.984463 -0.785889,2.856749 -0.523937,0.872291 -1.234467,1.562854 -2.131589,2.071689 -0.897143,0.501566 -1.873223,0.752348 -2.928244,0.752349 -1.062213,-1e-6 -2.04547,-0.250783 -2.949776,-0.752349 -0.897136,-0.508835 -1.607665,-1.199398 -2.131589,-2.071689 -0.523928,-0.872286 -0.78589,-1.824534 -0.785889,-2.856749 -10e-7,-1.032202 0.261961,-1.984451 0.785889,-2.856748 0.523924,-0.87955 1.234453,-1.570111 2.131589,-2.071688 0.904306,-0.508825 1.887563,-0.763242 2.949776,-0.763253 1.055021,1.1e-5 2.031101,0.254428 2.928244,0.763253 0.897122,0.501577 1.607652,1.192138 2.131589,2.071688 m -9.20459,2.856748 c -3e-6,1.126713 0.405501,2.082596 1.216513,2.867652 0.811004,0.785064 1.794261,1.177593 2.949775,1.177592 1.1555,10e-7 2.142346,-0.392528 2.960541,-1.177592 0.818175,-0.792325 1.227268,-1.748208 1.227279,-2.867652 -1.1e-5,-1.112162 -0.409104,-2.060776 -1.227279,-2.845844 -0.818195,-0.792321 -1.805041,-1.188485 -2.960541,-1.188495 -1.155514,10e-6 -2.138771,0.396174 -2.949775,1.188495 -0.811012,0.785068 -1.216516,1.733682 -1.216513,2.845844" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee Bold" id="path4153" /> <path d="m 84.532366,34.0049 c -2e-6,-0.247148 0.08612,-0.457951 0.258374,-0.63241 0.172247,-0.181725 0.380382,-0.272588 0.624405,-0.27259 0.244018,2e-6 0.452152,0.09087 0.624405,0.27259 0.179424,0.174459 0.269137,0.385262 0.269141,0.63241 -4e-6,0.239881 -0.08972,0.454318 -0.269141,0.643314 -0.17943,0.181727 -0.387564,0.27259 -0.624405,0.27259 -0.236846,0 -0.444981,-0.09087 -0.624405,-0.27259 -0.172252,-0.188996 -0.258376,-0.403433 -0.258374,-0.643314" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee" id="path4155" /> <path d="m 89.527608,21.08411 c -10e-7,-0.239866 0.08253,-0.447035 0.247608,-0.621507 0.172248,-0.174444 0.380383,-0.261673 0.624406,-0.261687 0.23684,1.4e-5 0.437798,0.08724 0.602874,0.261687 0.172246,0.174472 0.258371,0.381641 0.258374,0.621507 -3e-6,0.247162 -0.08254,0.457964 -0.247609,0.632409 -0.165075,0.167203 -0.369621,0.250796 -0.613639,0.250783 -0.244023,1.3e-5 -0.452158,-0.08358 -0.624406,-0.250783 -0.165074,-0.174445 -0.247609,-0.385247 -0.247608,-0.632409 m 1.356465,13.67314 -0.968904,0 0,-11.056271 0.968904,0 0,11.056271" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee" id="path4157" /> <path d="m 99.593447,23.526521 c 0.753583,1.1e-5 1.474873,0.149027 2.163883,0.447048 0.68899,0.298043 1.28468,0.701476 1.78709,1.210302 0.50238,0.508844 0.90072,1.115812 1.19499,1.820905 0.29424,0.705108 0.44137,1.442918 0.44139,2.213434 -2e-5,0.777797 -0.14715,1.519242 -0.44139,2.224339 -0.29427,0.705104 -0.69261,1.312071 -1.19499,1.820905 -0.50241,0.501568 -1.0981,0.905001 -1.78709,1.210301 -0.68901,0.298033 -1.4103,0.447049 -2.163883,0.447049 -1.543077,0 -2.860068,-0.556084 -3.950979,-1.668254 -1.090916,-1.112166 -1.636373,-2.456945 -1.636372,-4.03434 -10e-7,-1.032202 0.247608,-1.984451 0.742827,-2.856748 0.502393,-0.87955 1.180625,-1.570111 2.0347,-2.071688 0.861243,-0.508825 1.797849,-0.763242 2.809824,-0.763253 m -4.629212,5.691689 c -2e-6,1.301171 0.452153,2.416973 1.356467,3.347412 0.911483,0.923175 2.009573,1.38476 3.294277,1.384759 1.284681,10e-7 2.379191,-0.461584 3.283511,-1.384759 0.91147,-0.930439 1.36721,-2.046241 1.36722,-3.347412 -1e-5,-1.293889 -0.45575,-2.402423 -1.36722,-3.325603 -0.90432,-0.923164 -1.99883,-1.38475 -3.283511,-1.38476 -1.284704,10e-6 -2.382794,0.461596 -3.294277,1.38476 -0.904314,0.92318 -1.356469,2.031714 -1.356467,3.325603" style="font-size:22.18883514px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#000000;fill-opacity:1;stroke:none;font-family:Sawasdee;-inkscape-font-specification:Sawasdee" id="path4159" /> </g> <g id="g4014" transform="translate(12.84,20.592727)"> <g transform="translate(0,-0.065)" id="g3992"> <polygon style="fill:#939598" id="polygon461" points="5.7,0.23 11.86,0.23 11.86,1.65 7.12,1.65 7.12,6.04 11.86,6.04 11.86,7.46 11.86,7.46 5.7,7.46 " class="cls-2" /> <polygon style="fill:#939598" id="polygon463" points="0,7.08 3.51,7.08 3.51,8.49 1.43,8.49 1.45,15.84 12.68,15.84 12.68,17.26 12.68,17.26 0.04,17.26 " class="cls-2" /> <polygon style="fill:#939598" id="polygon465" points="10.49,11.02 10.49,12.44 10.49,12.44 2.84,12.44 2.84,7.79 4.26,7.79 4.26,11.02 " class="cls-2" transform="translate(0,-0.15225398)" /> <polygon style="fill:#bcbec0" id="polygon467" points="4.26,4.55 4.26,7.79 4.26,7.79 2.84,7.79 2.84,3.13 6.41,3.13 6.41,4.55 " class="cls-3" transform="matrix(1,0,0,0.85463687,0,0.4549866)" /> <rect style="fill:#939598;fill-opacity:1" id="rect3926-3" width="1.4240631" height="1.7319686" x="2.8396611" y="7.0799503" /> <rect style="fill:#939598;fill-opacity:1" id="rect3926-6" width="1.3864813" height="1.6934805" x="5.7012329" y="2.9206221" /> </g> <g id="g4005"> <g id="g3984"> <polygon class="cls-2" points="94.93,12.33 94.93,10.91 99.87,10.91 99.87,6.46 94.93,6.46 94.93,5.04 101.29,5.04 101.29,12.33 101.29,12.33 " id="polygon453" style="fill:#939598" /> <polygon class="cls-2" points="94.72,17.36 94.72,15.94 104.87,15.94 104.9,5.41 102.74,5.41 102.74,3.99 106.32,3.99 106.29,17.36 106.29,17.36 " id="polygon455" style="fill:#939598" /> <polygon class="cls-2" points="95.51,1.42 95.51,0 103.45,0 103.45,4.7 103.45,4.7 102.03,4.7 102.03,1.42 " id="polygon457" style="fill:#939598" /> <polygon class="cls-3" points="102.03,7.97 102.03,4.7 103.45,4.7 103.45,9.39 103.45,9.39 100.65,9.39 100.65,7.97 " id="polygon459" style="fill:#bcbec0" /> <rect y="3.9876499" x="102.02941" height="1.4238259" width="1.4579451" id="rect3926" style="fill:#939598;fill-opacity:1" /> <rect y="7.884686" x="99.887817" height="1.6934805" width="1.397205" id="rect3926-7" style="fill:#939598;fill-opacity:1" /> </g> </g> </g> </g> </svg>';

    svg.append("g").html(logo_xml);

}

function getSVGString( svgNode ) {
    svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
    var cssStyleText = getCSSStyles(svgNode);
    cssStyleText += "* {font-family:Helvetica}"
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

function svgString2Image( svgString, width, height, format, callback ) {
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

function screen_shot({ svg1, svg2, format } = {}){

    addLogo(svg1);
    var name1 = svg1.attr("id");
    var svgString1 = getSVGString(svg1.node());

    var t = "<svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\">\n" +
        "\n" +
        "  <g transform=\"translate(0,0)\">\n" +
        svgString1 +
        "  </g>\n"

    if(svg2){

        addLogo(svg2);
        var name2 = svg2.attr("id");
        var svgString2 = getSVGString(svg2.node());

        var w = svg2.node().getBoundingClientRect().width
        var h = svg2.node().getBoundingClientRect().height

        t += '<line x1="' + (w + 5) +'" y1="0" x2="' + (w + 5) +'" y2="' + h+'" stroke="black" />'

        t += "  <g transform=\"translate(" + (w + 10)  +",0)\">\n" +
            svgString2 +
            "  </g>\n"

    }

    t += "</svg> "

    if(format === 'svg') {

        var blob = new Blob([t], {"type": "image/svg+xml;base64,"+ btoa(t)});
        fs.saveAs(blob, name1+".svg");
        svg1.select("#exportLogo").remove();
        if(svg2){svg2.select("#exportLogo").remove();}

    }

    else if (format === 'png'){



        var wi = svg1.node().getBoundingClientRect().width
        var he = svg1.node().getBoundingClientRect().height

        if(svg2){
            wi = wi*2;
        }

        svgString2Image(t,  wi, he, 'png', save);

        svg1.select("#exportLogo").remove();
        if(svg2){svg2.select("#exportLogo").remove();}

        function save(dataBlob, filesize) {
            var filename = (name) ? name+"." : "";
            fs.saveAs(dataBlob, filename+'phylo.io.png'); // FileSaver.js function
        }

    }
}

//Adapted from Extended Newick format parser in JavaScript.
//Copyright (c) Miguel Pignatelli 2014 based on Jason Davies
function parse_nhx(s) {
    var ancestors = [];
    var tree = {'data_nhx' : {}};
    // var tokens = s.split(/\s*(;|\(|\)|,|:)\s*/);
    //[&&NHX:D=N:G=ENSG00000139618:T=9606]
    var tokens = s.split( /\s*(;|\(|\)|\[|\]|,|:|=)\s*/ );
    for (var i=0; i<tokens.length; i++) {
        var token = tokens[i];
        switch (token) {
            case '(': // new children
                var subtree = {'data_nhx' : {}};
                tree.children = [subtree];
                ancestors.push(tree);
                tree = subtree;
                break;
            case ',': // another branch
                var subtree = {'data_nhx' : {}};
                ancestors[ancestors.length-1].children.push(subtree);
                tree = subtree;
                break;
            case ')': // optional name next
                tree = ancestors.pop();
                break;
            case ':': // optional length next
                break;
            default:
                var x = tokens[i-1];
                // var x2 = tokens[i-2];
                if (x == ')' || x == '(' || x == ',') {
                    tree.name = token;
                }
                else if (x == ':') {
                    var test_type = typeof token;
                    if(!isNaN(token)){
                        tree.branch_length = parseFloat(token);
                    }
                    // tree.length = parseFloat(token);
                }
                else if (x == '='){
                    tree['data_nhx'][tokens[i-2]] = token
                }
                else {
                    var test;
                }
        }
    }
    return tree;
};

function save_file_as(filename, data) {
    const blob = new Blob([data], {type: 'text/csv'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
}

export {build_table, reroot_hierarchy, screen_shot, parse_nhx, save_file_as};
