define(function(require,exports,module){
    var writes = {
        write : document.write,
        writeln : document.writeln
    },
    STREAMTEST = "doc-stream-test",
    INNERHTML = "innerHTML",
    WRITE = "write";

    function Writer(stream){
        this.stream = stream;
        this.buffer = "";
        this.doc = stream.doc;
        this.setWriteMode();
    }

    Writer.prototype = {

        init : function(html){
            this.write(html);
            this.complete();
        },

        setWriteMode: function(html){
            var that= this,
                doc = this.doc;

            doc.write(STREAMTEST);
            
            if(doc.body.innerHTML === STREAMTEST){
                this.mode = WRITE;
                this.write = function(str){
                    doc.write(str);
                };
                this.writeln = function(str){
                    doc.writeln(str);
                };
            } else {
                this.mode = INNERHTML;
                this.write = function(str){
                    that.buffer += str; 
                };
                this.writeln = function(str){
                    that.buffer += str + '\n';
                };                
            }
            doc.body.innerHTML = "";
        },
        override : function(){
            document.write  = this.write;
            document.writeln= this.writeln;
        },

        restore : function(){
            document.write  = writes.write;
            document.writeln= writes.writeln;
        },
        complete : function(){
            if(this.mode === INNERHTML){
                this.doc.body.innerHTML = this.buffer;
                this.buffer = "";
            }
        }
    }

    return Writer;
});
