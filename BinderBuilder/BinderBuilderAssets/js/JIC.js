/*!
 * JIC JavaScript Library v1.0
 * https://github.com/brunobar79/J-I-C/
 *
 * Copyright 2012, Bruno Barbieri
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Date: Sat Mar 24 15:11:03 2012 -0200
 */



/**
 * Create the jic object.
 * @constructor
 */

var jic = {
        /**
         * Receives an Image Object (can be JPG OR PNG) and returns a new Image Object compressed
         * @param {Image} source_img_obj The source Image Object
         * @param {Integer} quality The output quality of Image Object
         * @return {Image} result_image_obj The compressed Image Object
         */

        compress: function(source_img_obj, quality, output_format){
             var mime_type = "image/jpeg";
             if(output_format!=undefined && output_format=="png"){
                mime_type = "image/png";
             }
             

             var cvs = document.createElement('canvas');
             cvs.width = source_img_obj.naturalWidth;
             cvs.height = source_img_obj.naturalHeight;
             var ctx = cvs.getContext("2d").drawImage(source_img_obj, 0, 0);
             var newImageData = cvs.toDataURL(mime_type, quality/100);
             var result_image_obj = new Image();
             result_image_obj.src = newImageData;
			 
             return result_image_obj;
        },

        /**
         * Receives an Image Object and upload it to the server via ajax
         * @param {Image} compressed_img_obj The Compressed Image Object
         * @param {String} The server side url to send the POST request
         * @param {String} file_input_name The name of the input that the server will receive with the file
         * @param {String} filename The name of the file that will be sent to the server
         * @param {function} the callback to trigger when the upload is finished.
		 * @param {String} title to name the doc on the server
		 * @param {String} meetingid
         */

        upload: function(compressed_img_obj, upload_url, file_input_name, filename, callback, title, meetingid){
			var max = 500;
		
            var cvs = document.createElement('canvas');
			var OGDimensions = {
				"width":compressed_img_obj.naturalWidth,
				"height":compressed_img_obj.naturalHeight
			};
			var NewDimensions = {
				"width":0,
				"height":0
			};
			
			//is resize necessary
			if (OGDimensions.width > max || OGDimensions.height > max) {
				if (OGDimensions.width > OGDimensions.height) {
					NewDimensions.width = max;
					NewDimensions.height = (max/OGDimensions.width) * OGDimensions.height;
				}
				else {
					NewDimensions.height = max;
					NewDimensions.width = (max/OGDimensions.height) * OGDimensions.width;
				}
			}
			
            cvs.width = NewDimensions.width;
            cvs.height = NewDimensions.height;

            var ctx = cvs.getContext("2d").drawImage(compressed_img_obj, 0, 0, NewDimensions.width, NewDimensions.height);
			
            //ADD sendAsBinary compatibility to older browsers
            if (XMLHttpRequest.prototype.sendAsBinary === undefined) {
                XMLHttpRequest.prototype.sendAsBinary = function(string) {
                    var bytes = Array.prototype.map.call(string, function(c) {
                        return c.charCodeAt(0) & 0xff;
                    });
                    this.send(new Uint8Array(bytes).buffer);
                };
            }

            var type = "image/jpeg";
            if(filename.substr(-4)==".png"){
                type = "image/png";
            }

            var data = cvs.toDataURL(type);
            
			//console.log(data);
			
			data = data.replace('data:' + type + ';base64,', '');
			
			console.log(data);
			var fieldsToAdd = 	 "<FieldInformation Type='File' />"
								+"<FieldInformation Type='Text' DisplayName='Title' InternalName='Title' Value='"+title+"' />"
								+"<FieldInformation Type='Text' DisplayName='Meeting Timestamp ID' InternalName='Meeting_x0020_Timestamp_x0020_ID' Value='"+meetingid+"' />";
			
			var thisSite = $().SPServices.SPGetCurrentSite();
			
			$().SPServices({
				operation: "CopyIntoItems",
				processData: false,
				async: false,
				SourceUrl: thisSite + "/Picture%20Gallery/" + filename,
				Stream: data,
				DestinationUrls: [thisSite + "/Picture%20Gallery/" + filename,],
				Fields: fieldsToAdd,
				completefunc: function (xData, Status) {
					try{
						parent.tinyMCE.activeEditor.insertContent('<img src="https://intra.sse.gov.on.ca/sites/cac-uat/CAB/Apps/eCabinet/Picture%20Gallery/' + filename + '" alt="'+title+'" />');
						parent.tinyMCE.activeEditor.windowManager.close(window);
					}catch(e){
						//if not as a tinymce plugin
					}
				}
			});
        }
};