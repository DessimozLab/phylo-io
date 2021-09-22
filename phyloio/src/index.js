/*

Phylo.IO is build following the MVC architecture:
- Container class (or Controller): the class that connects a single viewer (div) and the
loaded model through user interactions.
- Viewer class: the d3 viewer that can render any model object.
- Model class: the data for a single tree with associated computed information (
zoom, transform, annotated information, etc..)

The PhyloIO manage the app that can have any number of Container (associated to an unique DOM div) that each
contains a Viewer instance. Each Viewer (and by consequent Container) can have multiple models (trees)

 */

import './style.css';
import './interface.css';
import './fontawesome/css/all.css'


import API from './api.js'


Object.values = Object.values || function(o){return Object.keys(o).map(function(k){return o[k]})};


const init = function(){
  return new API()
}

export { init }

