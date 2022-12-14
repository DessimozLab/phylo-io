const {  prepare_and_run_distance } = require('./utils.js')

self.onmessage = (event) => {

    postMessage(prepare_and_run_distance(event.data.mod1,event.data.mod2 ));

    self.close();
};


