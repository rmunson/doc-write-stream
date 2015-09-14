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
        this.safeWrites = {
            write   : function(str){
                that.doc.write(str);
            },
            writeln : function(str){
                that.doc.writeln(str);
            }
        };
    }   

    StreamDocument.prototype = {
        /**
         * Initiate stream 
         */
        start : function(){
            this.doc.write(this.html);

            streams.push(this);

            if(streams.length > 1){
                // console.info("queue darc",this.doc);
                this.queued = true;                              
                return;
            }
            // console.info("start darc",this.doc);
            this.resume();
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
        queueScript : function(script,target){
            if(!script.streamComplete){
                this.scripts.push({
                    source : script,
                    target : target
                });
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
        response : function(){
            var current = this.currentScript;
            // console.warn('script response ',current);
            current.source.streamComplete=true;
            this.moveToTarget(this.doc.body,current.target)
            this.runScripts();
        },

        /**
         * Run the next script in the queue
         * and replace the placeholder clone with a runnable replacement
         */
        request : function(){
            var that = this,
                current = this.currentScript = this.scripts.shift(),
                target = current.target,
                script = this.parentDoc.createElement(SCRIPT);
            if(!current){
                return this.runScripts();
            }
            script.onload=script.onerror=function(e){
                // console.warn(SCIPT + ' ' + e.type,this.src);
                that.response();
            };

            script.type = current.source.type;
            if(current.source.src){
                script.src = current.source.src;
                this.head.appendChild(script);
            }else{
                script.innerHTML = current.source.innerHTML;
                script.onload({type: 'synthesized'})
            }
            current.target=script;
            target.parentNode.replaceChild(script,target);

        },

        /**
         * Move elements from their location in the sandbox
         * to their proper place in heirarchy under this.el.
         * @param  {node}   source node to be deep copied frmo the sandbox
         * @param  {node}   target destination node under this.el
         */
        moveToTarget : function(source,target){
            var frag = this.parentDoc.createDocumentFragment(),
                elements = toArray.call(source.childNodes,0),
                len = elements.length,
                imported,
                element,
                i = 0,
                type;

            // console.info('copy nodes',source,target,elements);
            for(; i < len; i++){
                element=elements[i];
                type=element.nodeName.toLowerCase();
                imported = this.parentDoc.adoptNode(element,false);

                if(type===SCRIPT && element.streamComplete!==true){
                    this.queueScript(element,imported);
                }else if(element.childNodes.length){
                    this.moveToTarget(element,imported);
                }
                frag.appendChild(imported);
            }
            if(target){
                if(target.nodeName.toLowerCase() === SCRIPT && target.parentNode){
                    if(target.nextSibling){
                        target.parentNode.insertBefore(frag,target.nextSibling);
                    }else{
                        target.parentNode.appendChild(frag);
                    }
                    return;
                }
                target.appendChild(frag);
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
