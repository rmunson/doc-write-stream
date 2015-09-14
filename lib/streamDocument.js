define(function(require,exports,module){
    var createHTMLDocument = require( "./createHTMLDocument" ),
        toArray = Array.prototype.slice,
        writes = {
            write : document.write,
            writeln : document.writeln
        };

    var streams = [];

    function StreamDocument(el,html){
        var that = this;
        if( !(this instanceof StreamDocument) ){
            return new StreamDocument(el,html);
        }

        this.el = el;
        this.html = html;
        this.doc = createHTMLDocument(html);
        this.parentDoc = document;
        this.head = document.getElementsByTagName('head')[0];
        this.scripts = [];
        this.currentScript = null;
        this.index=0;
        this.safeWrites = {
            write   : function(str){
                that.doc.write(str);
            },
            writeln : function(str){
                that.doc.writeln(str);
            }
        };


        // var xhr = this.xhr = new XMLHttpRequest();

        // xhr.onreadystatechange=function(){
        //     if (xhr.readyState === 4) {
        //         // clearTimeout(xhr.timeout);
        //         console.log(xhr.responseText, xhr.responseXML, xhr.status===200||xhr.status===304);
        //         that.response(xhr.responseText);
        //     }
        // };        
    }   

    StreamDocument.prototype = {
        start : function(){

            // this.doc.body.innerHTML=this.html;
            this.doc.write(this.html);
            console.info("darc",this.doc);

            streams.push(this);

            if(streams.length > 1){
                this.queued = true;                                
                return;
            }
            this.runScripts();
        },

        runScripts : function(){
            this.moveToTarget();         
        },

        findScripts : function(){
            var scripts = this.scripts,
                found = toArray.call(this.doc.querySelectorAll('script'),0);

            scripts.push.apply(scripts,found.filter(function(script){
                var addToList = script.docStream!==true;
                script.docStream=true;
                script.setAttribute('data-doc-stream',true);
                return addToList;
            }));
            console.info("scrarpts",scripts);            
        },

        nextScript : function(){
            var scr = this.currentScript = this.scripts[this.index],
                that= this;
            console.info("next scrarpt",scr);            
                
            if(!scr){
                this.moveToTarget();
                return;
            }
            if(scr.src){
                this.request(scr.src);
            } else {
                this.response(scr.innerHTML)
            }
        },

        response : function(text){
            this.currentScript.streamComplete=true;
            this.moveToTarget();
        },

        request : function(){
            var that = this,
                current = this.currentScript,
                script = this.parentDoc.createElement('script');

            // Make sure we can re-use this
            // this.xhr.readyState=0;
            // this.xhr.open('GET', url, true);
            // this.xhr.send(null);            
            script.onload=script.onerror=function(){
                if(script.parentNode){
                    script.parentNode.removeChild(script);
                }
                
                that.response();
            };
            // this.parentDoc.write = this.safeWrites.write;
            // this.parentDoc.writeln = this.safeWrites.writeln;
            script.type = current.type;
            script.src = current.src;
            try{
                this.head.appendChild(script);
            } catch (err){

            }
        },

        moveToTarget : function(){
            var elements = this.doc.body.children,
                len = elements.length,
                scriptFound=false,
                imported,
                element,
                i = 0,
                type;

            console.info('copy nodes',this.el,elements);
            console.dir(this.parentDoc);
            // this.doc.open();
            this.parentDoc.write = this.safeWrites.write;
            this.parentDoc.writeln = this.safeWrites.writeln;

            for(; i < len; i++){
                element=elements[i];
                type=elements[i].nodeName.toLowerCase();
                if(type==="script" && elements[i].streamComplete!==true){
                        scriptFound=true;
                    this.currentScript = elements[i];
                    this.request()
                }
                imported = this.parentDoc.adoptNode(elements[i],true);
                this.el.appendChild(imported);                
                if(scriptFound){
                    return;
                }
            }
            this.parentDoc.write = writes.write;
            this.parentDoc.writeln = writes.writeln;
            streams.shift();
            if(streams.length){
                streams[0].runScripts();
            }
        }
    }
    return StreamDocument;
});
