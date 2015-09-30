define(function(require,exports,module){
    var createHTMLDocument = require( "./createHTMLDocument" ),
        Writer = require( "./Writer" );

    var SCRIPT = "script",
        toArray = Array.prototype.slice,
        streams = [];

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
        // this.head = document.head || document.getElementsByTagName('head')[0];
        this.currentScript = null;
        this.scripts = [];
        this.writer = new Writer(this);
    }   

    StreamDocument.prototype = {
        /**
         * Initiate stream 
         */
        start : function(){
            var that = this;
            // this.doc.open();
            this.writer.init(this.html);
            // this.doc.body.innerHTML=this.html;
            streams.push(this);

            if(streams.length > 1){
                // console.info("queue darc",this.doc);
                this.queued = true;                              
                return;
            }
            // console.info("start darc",that.doc);
            this.resume();
        },
        /**
         * Overwrite parent documents .write and .writeln methods
         * to point to the doc sandbox
         */
        resume : function(){
            var that = this;
            

            // 10 seconds is a long time
            this.timeout=setTimeout(function(){
                that.healthCheck();
            },10*1000);

            this.writer.override();
            this.el.innerHTML = "";
            this.moveToTarget(this.doc.body,this.el);
            this.runScripts();
        },
        /**
         * Bail, something burned
         */
        healthCheck : function(){
            if(!this.completed){
                this.completeStream();
            }
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

            // this.doc.body.innerHTML = this.buffer;
            // this.buffer="";
            this.writer.complete();
            // Set this to run after the move op with a timer
            // so, if the move fails we still have a chance
            setTimeout(function(){
                that.runScripts();
            },0);
            that.moveToTarget(that.doc.body,script);
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
                        target.parentNode.insertBefore(frag,target.nextSibling);
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
            this.writer.restore();
            this.completed = true;
            clearTimeout(this.timeout);
            streams.shift();
            if(streams.length){
                streams[0].resume();
            }            
        }

    }
    return StreamDocument;
});
