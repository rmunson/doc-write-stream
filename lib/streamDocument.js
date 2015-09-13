define(function(require,exports,module){
    var createHTMLDocument = require( "./createHTMLDocument" ),
        toArray = Array.prototype.slice;

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
        this.writes = {
            write : document.write,
            writeln : document.writeln
        };
        this.safeWrites = {
            write   : function(str){
                that.doc.write(str);
            },
            writeln : function(str){
                that.doc.writeln(str);
            }
        };

        var xhr = this.xhr = new XMLHttpRequest();

        xhr.onreadystatechange=function(){
            if (xhr.readyState === 4) {
                // clearTimeout(xhr.timeout);
                console.log(xhr.responseText, xhr.responseXML, xhr.status===200||xhr.status===304);
                that.response(xhr.responseText);
            }
        };        
    }   

    StreamDocument.prototype = {
        start : function(){
            
            // this.doc.body.innerHTML=this.html;
            this.doc.write(this.html);
            console.info("darc",this.doc);
            this.runScripts();
        },
        runScripts : function(){
            var that = this
            this.findScripts();            
            this.nextScript();
        },
        findScripts : function(){
            var scripts = this.scripts,
                found = toArray.call(this.doc.querySelectorAll('script'),0);

            scripts.push.apply(scripts,found.filter(function(scr){
                var addToList = scr.docStream!==true;
                scr.docStream=true;
                scr.setAttribute('data-doc-stream',true);
                return addToList;
            }));
            console.info("scrarpts",scripts);            
        },

        // nextScript : function(){
        //     var el = this.parentDoc.createElement('script'),
        //         scr = this.scripts[this.index]
        //         that= this;
                
        //     if(!scr){
        //         return;
        //     }
        //     el.onload = el.onerror = function(){
        //         that.index++;
        //         // el.parentNode.removeChild(el);
        //         that.nextScript();
        //     };
        //     if(scr.src){
        //         el.src = scr.src;
        //         this.head.appendChild(el);
        //     }else{
        //         el.innerHTML = scr.innerHTML;
        //         this.head.appendChild(el);
        //         el.onload();
        //     }
        // },
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
            scr.type="text/doc-stream-script"
        },
        executeScript : function(text){
            var that= this,
                func;
                
            func = new Function('window','document',text);
            try{
                func.call(window,window,this.parentDoc);
            } catch(err){
                console.error('blerp',err);
            }
            // el.parentNode.removeChild(el);
        },

        response : function(text){
            this.index++;
            if(text){
                this.currentScript.src=null;
                this.currentScript.innerHTML=text;
                this.executeScript(text);
            }
            this.findScripts();
            this.nextScript();
        },

        request : function(url){
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
                that.parentDoc.write = that.writes.write;
                that.parentDoc.writeln = that.writes.writeln;
                that.response();
            };
            this.parentDoc.write = this.safeWrites.write;
            this.parentDoc.writeln = this.safeWrites.writeln;
            script.type = current.type;
            script.src = current.src;
            this.head.appendChild(script);
        },

        moveToTarget : function(){
            var frag = this.doc.createDocumentFragment(),
                elements = this.doc.body.children,
                len = elements.length,
                i = 0,
                imported;
            console.info('copy nodex',elements);
            for(; i < len; i++){
                imported = this.parentDoc.importNode(elements[i],true);
                this.el.appendChild(imported);
            }
            
        }
    }
    return StreamDocument;
});
