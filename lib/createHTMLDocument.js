define(function(require,exports,module){
    var docFactory = document.implementation;

    return function(html){
        return docFactory.createHTMLDocument("doc-write-stream");
    }
});
