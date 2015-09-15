define(function(require,exports,module){
    var createHTMLDocument = require( "./createHTMLDocument" ),
        toArray = Array.prototype.slice,
        writes = {
            write : document.write,
            writeln : document.writeln
        };
    var SCRIPT = "script";

    var streams = [];

    function isScriptComplete(script){
        return script.streamComplete===true;
    }

    function StreamDocument(el,html){
        var that = this;
        if( !(this instanceof StreamDocument) ){
            return new StreamDocument(el,html);
        }

        this.el = el;
        this.html = html;
        this.doc = createHTMLDocument(html);
        this.parentDoc = document;
        this.head = document.head || document.getElementsByTagName('head')[0];
        this.currentScript = null;
        this.scripts = [];
        this.index=0;
        this.buffer="";
        this.safeWrites = {
            write   : function(str){
                // this.buffer = this.buffer + str;
                that.doc.write(str);
            },
            writeln : function(str){
                // this.buffer = this.buffer + str + '\n';
                that.doc.writeln(str);
            }
        };
    }   

    StreamDocument.prototype = {
        /**
         * Initiate stream 
         */
        start : function(){
            var that = this;
            // this.doc.open();
            this.doc.write(this.html);
            // this.doc.body.innerHTML=this.html;
            streams.push(this);

            if(streams.length > 1){
                // console.info("queue darc",this.doc);
                this.queued = true;                              
                return;
            }
            // setTimeout(function(){
                // console.info("start darc",that.doc);
                that.resume();
            // },0);
        },
        /**
         * Overwrite parent documents .write and .writeln methods
         * to point to the doc sandbox
         */
        resume : function(){
            this.parentDoc.write = this.safeWrites.write;
            this.parentDoc.writeln = this.safeWrites.writeln;
            this.moveToTarget(this.doc.body,this.el);
            this.runScripts();
        },
        /**
         * Add a script container object to the queue of scripts
         * @param  {node}   script original script element from sandbox
         * @param  {node}   target cloned node stored in this.el heirarchy
         */
        queueScript : function(script){
            if(!script.streamComplete){
                this.scripts.push(script);
            }
        },
        /**
         * Execute the next script in the queue
         * or finalize the stream process 
         * @see  this.completeStream
         */
        runScripts : function(){
            if(this.scripts.length){
                this.request();
                return;
            }   
            this.completeStream();
        },

        /**
         * Process the results of a completed script execution
         * @return {[type]}      [description]
         */
        response : function(script){
            var that = this,
                current = this.currentScript;
            // console.warn('script response ',current);
            current.streamComplete=true;
            // this.doc.body.innerHTML = this.buffer;
            // this.buffer="";
            // setTimeout(function(){
                that.moveToTarget(this.doc.body,script);
                that.runScripts();
            // },0)
        },

        /**
         * Run the next script in the queue
         * and replace the placeholder clone with a runnable replacement
         */
        request : function(){
            var that = this,
                current = this.currentScript = this.scripts.shift(),
                script = this.parentDoc.createElement(SCRIPT);

            if(!current){
                return this.runScripts();
            }

            script.onload=script.onerror=function(e){
                // console.warn(SCIPT + ' ' + e.type,this.src);
                that.response(this);
            };

            script.type = current.type;
            if(current.src){
                script.src = current.src;
            }else{
                script.innerHTML = current.innerHTML;
                script.onload({type: 'synthesized'})
            }
            current.parentNode.replaceChild(script,current);

        },

        /**
         * Move elements from their location in the sandbox
         * to their proper place in heirarchy under this.el.
         * @param  {node}   source node to be deep copied frmo the sandbox
         * @param  {node}   target destination node under this.el
         */
        moveToTarget : function(source,target){
            var elements = toArray.call(source.childNodes,0),
                len = elements.length,
                element,
                i = 0;

            var frag = this.parentDoc.createDocumentFragment(),
                imported;

            for(; i < len; i++){
                element=elements[i];
                imported = this.parentDoc.adoptNode(element,true);
                frag.appendChild(imported);
            };
            this.scanElements(frag);

            if(target){
                if(target.nodeName.toLowerCase() === SCRIPT && target.parentNode){
                    if(target.nextSibling){
                        target.parentNode.insertBefore(element,target.nextSibling);
                    }else{
                        target.parentNode.appendChild(frag);
                    }
                }
                target.appendChild(frag);
            }
        },

        scanElements : function(source){
            var elements = toArray.call(source.childNodes,0),
                len = elements.length,
                element,
                i = 0;

            for(; i < len; i++){
                element=elements[i];

                if(element.nodeName.toLowerCase()===SCRIPT && element.streamComplete!==true){
                    this.queueScript(element);
                }else if(element.childNodes.length){
                    this.scanElements(element);
                }
            }
        },
        /**
         * Reset the parent doc's write/writeln methods
         * and start the next queued operation
         */
        completeStream : function(){
            this.parentDoc.write = writes.write;
            this.parentDoc.writeln = writes.writeln;
            streams.shift();
            if(streams.length){
                streams[0].resume();
            }            
        }

    }
    return StreamDocument;
});
