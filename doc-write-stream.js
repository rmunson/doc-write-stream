define(function(require,exports,module){
    var streamDocument = require('./lib/streamDocument');

    var STRING = "string";
    return function(target,html){
        var el = target,
            stream;
        if(typeof target === 'string'){
            el = document.querySelector(target);
        }

        stream = streamDocument(el,html);
        stream.start();
        return stream;
    }
});
