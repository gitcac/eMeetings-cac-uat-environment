/** 
  * BinderBuilder
  * Built By Husain Fazal & Regan Weston
  * Enterprise Applications Branch
  * July-September 2014  
  *  
*/

var meetingAtHand;														//Contains "Meeting" Object
var meetingTabs = new Array();											//Contains "Tab" Objects related to meetingAtHand
var urlid = parseInt(getParameterByName("id"));							//The ID in the URL (If applicable)
var agendaItemsUniqueIdentifier = 0;									//Iterator to create a uniqueIdentifier for agendaItems/tabs
var submissionsUniqueIdentifier = 0;									//Iterator to create a uniqueIdentifier for submissions
var usersArray = [];													//Holds an array of users pulled from the server
var organizationsArray = [];											//Holds an array of Ministries pulled from the server
var categoriesArray = [];												//Holds an array of Categories pulled from the server
var typesArray = [];													//Holds an array of Types pulled from the server
var documentcollectionstatusesArray = [];								//Holds an array of Document Collection Statues from the server
var uploadLocations = [];												//Holds an array of Upload locations pulled from the server
var arrayOfGalleryImages = [];											//Holds an array of the Images in the SP gallery
var exisitingTab = false;												//Holds status of whether or not a meeting has a tab already (if not, adds a blank one)
var thisSite = $().SPServices.SPGetCurrentSite();						//Holds the current site URL
var filesInSubmission = [];												//Holds a list of file objects to upload
var docsUploaded = 0;													//Iterator to track the number of documents uploaded
var submissionImageSelected = "default.jpg";							//Image to be used for the submission (in /Submission Tiles/)
var submissionImageToUpload = null;										//If an image needs to be uploaded, this holds the binary for it
var JSONManifest = "MeetingManifest.json.safe";							//The file in the JSONFiles/ folder that will hold the manifest
var branchname = "";													//This is unfortunately required for our development.
var tileContentType = {													//The Tile Content Type information
						"Name":"Submission Document Set",
						"ID"  :"0x0120D5200010A2E25046528A49ABA4A500C7F94E10006E18C853DA144A40A795ACE1154F93B0"
					  };
var documentContentType = {												//The Document Content Type information
						"Name":"Submission Document",
						"ID"  :"0x01010082EC6697B11A3D4A937B2B149FAB08B200CD0A59DD92751B4CA2A073D41D7CBAD6"
					  };
var docstack = 0;														//"Stack" of documents to upload
var sortableStorage;													//Used to store a var when moving a tile
var sortableList;														//Used to store a var when moving a tile
var CurrentUser;														//Identifies current user
var tileToFocusOn;														//Tile to return focus to, post edit or preview
var tileImages = "";													//Holds string of Tile Images for editSubmission
var sortableDocumentStorage;											//Holds the ID of the OG list a doc was in as well as it's OG position
var documentArray = [];													//Contains all documents info for that tile
var debug;

//Main Entry Point
$(function() {
	//There is a number, check with the server for validity
	//If it does exist, store its data in meetingAtHand		
	if (!isNaN(urlid)){
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Cabinet Meeting",
			CAMLQuery: "<Query><Where><Eq><FieldRef Name='ID'/><Value Type='Counter'>"+urlid+"</Value></Eq></Where></Query>",
			CAMLViewFields: "<ViewFields Properties='True' />",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					meetingAtHand = $(this);
				});
			}
		});
	}
	
	//new meeting
	if (!meetingAtHand){
		$("#tabs-form-box").hide();
		$("#meeting-update-button").hide();
		$("#page-intro").html("To start creating your new Binder, enter the meeting details that this Binder will be created for, and then hit save. Please note that all of the fields are required.");
		$("#meeting-memo").html('<textarea class="tinymce submissionMemo" id="submissionMemo"></textarea>');
	}
	//existing meeting
	else{
		$("#meeting-update-button").hide();
		$("#meeting-save-button").hide();
		$("#page-intro").html("Continue creating this Binder by entering Band information and corresponding Tiles. Remember to save any changes you make before leaving this page.");
		//header
		document.title = meetingAtHand.attr("ows_Title") + " | BinderBuilder";
		$("#meeting-name").html(meetingAtHand.attr("ows_Title"));
		$("#meeting-identifier").html(meetingAtHand.attr("ows_Meeting_x0020_Status"));
		//meeting form
		$("#formSubject").val(meetingAtHand.attr("ows_Title"));
		$("#formLocation").val(meetingAtHand.attr("ows_Location"));
		if (meetingAtHand.attr("ows_Notes") != null && meetingAtHand.attr("ows_Notes") != ""){
			$("#formNotes").val(meetingAtHand.attr("ows_Notes"));
		}
		$("#formDate").val(pullDate(meetingAtHand.attr("ows_Meeting_x0020_Date")));
		$("#formStartTime").val(pullTime(meetingAtHand.attr("ows_Meeting_x0020_Start_x0020_Time")));
		$("#formEndTime").val(pullTime(meetingAtHand.attr("ows_Meeting_x0020_End_x0020_Time")));
		$("#meeting-memo").html('<textarea class="tinymce submissionMemo" id="submissionMemo">'+(meetingAtHand && meetingAtHand.attr("ows_Meeting_x0020_Memo") && meetingAtHand.attr("ows_Meeting_x0020_Memo") != "<p>undefined</p>" ? meetingAtHand.attr("ows_Meeting_x0020_Memo") : "" )+'</textarea>');
		
		//now get existing agenda items
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Agenda Item",
			CAMLQuery: "<Query><Where><Eq><FieldRef Name='Meeting' LookupId='TRUE' /><Value Type='Lookup'>" + meetingAtHand.attr("ows_ID") + "</Value></Eq></Where><OrderBy><FieldRef Name='Presentation_x0020_Order' Ascending='True' /></OrderBy></Query>",
			CAMLViewFields: "<ViewFields Properties='True' />",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					addNewAgendaItem($(this));
					exisitingTab = true;
				});
			}
		});
	}
	
	tinymce.init({
			selector: ".submissionMemo",
			plugins: [
			"advlist autolink lists link image charmap print preview anchor",
			"searchreplace visualblocks code fullscreen",
			"insertdatetime media paste table"
			],
			style_formats: [
				{title: 'Heading', block: 'h3', styles: {}},
				{title: 'Sub-Heading', block: 'h4', styles: {}},
				{title: 'Float Left', block: 'span', styles: {float: 'left', padding: '0.5em'}},
				{title: 'Float Right', block: 'span', styles: {float: 'right', padding: '0.5em'}}
			],
			content_css: "BinderBuilderAssets/css/tinymcestyles.css",
			toolbar: "undo | styleselect removeformat | bold italic | alignleft aligncenter alignright | bullist numlist | link table | uploadnew image",
			menubar: false,
			statusbar: false,
			remove_script_host : false,
			convert_urls : false,
			height:"200px",
			image_list: null,
			meetingid : (meetingAtHand ? meetingAtHand.attr("ows_Meeting_x0020_Timestamp_x0020_ID") : 0),
			setup: function(editor) {
				editor.addButton('uploadnew', {
					text: 'Upload Image',
					icon: false,
					onclick: function() {
						tinyMCE.activeEditor.windowManager.open({
						   url   : 'ImageUploader.html',
						   width : 500,
						   height: 500,
						   title : "Upload a New Image"
						});
					}
				}),
				editor.on('change', function(e) {
					if (meetingAtHand){
						$("#meeting-update-button").show();
					}
				});
			}
		});
	
	//Prepare The Agenda Items List
	$( "#agenda-items-list" ).sortable({
		items: '> li:not(.pin)',
		cursor: 'move',
		start: function(event, ui){
			sortableStorage = ui.item.index();
			tinymce.remove("#formAgendaDescription"+parseInt(ui.item.attr('id').substr(4)));
			tinymce.init({
				selector: "#formAgendaDescription"+parseInt(ui.item.attr('id').substr(4)),
				plugins: [
				"advlist autolink lists link image charmap print preview anchor",
				"searchreplace visualblocks code fullscreen",
				"insertdatetime media paste table"
				],
				content_css: "BinderBuilderAssets/css/tinymcestyles.css",
				toolbar: "undo redo | bold italic underline | link",
				menubar: false,
				statusbar: false,
				remove_script_host : false,
				convert_urls : false,
				height:"170",
				setup : function(editor) {
					editor.on('change', function(e) {
						newChanges(parseInt(ui.item.attr('id').substr(4)));
					});
				}
			});
		},
		stop:  function(event, ui){
			tinymce.remove("#formAgendaDescription"+parseInt(ui.item.attr('id').substr(4)));
			tinymce.init({
				selector: "#formAgendaDescription"+parseInt(ui.item.attr('id').substr(4)),
				plugins: [
				"advlist autolink lists link image charmap print preview anchor",
				"searchreplace visualblocks code fullscreen",
				"insertdatetime media paste table"
				],
				content_css: "BinderBuilderAssets/css/tinymcestyles.css",
				toolbar: "undo redo | bold italic underline | link",
				menubar: false,
				statusbar: false,
				remove_script_host : false,
				convert_urls : false,
				height:"170",
				setup : function(editor) {
					editor.on('change', function(e) {
						newChanges(parseInt(ui.item.attr('id').substr(4)));
					});
				}
			});
		},
		update: function(event, ui){
			//called when a change has been made
			try{
				initializeBandReorder(parseInt(ui.item.attr('id').substr(4)), sortableStorage, ui.item.index());
			}catch(e){}
		},
		create:function(){
			var list=this;
			resize=function(){
				jQuery(list).css("min-height","0");
				jQuery(list).height(jQuery(list).height());
			};
			jQuery(list).css('min-height', jQuery(list).height());
		}
	});
	
	//however if there are any tabs, go get all the relevant submissions
	if (exisitingTab != null) {
		for (var i = 0; i < meetingTabs.length; i++){
			$().SPServices({
				operation: "GetListItems",
				async: false,
				listName: "Agenda Submission Documents",
				CAMLQuery: "<Query><Where><And><Eq><FieldRef Name='ContentType' /><Value Type='Computed'>Submission Document Set</Value></Eq><Eq><FieldRef Name='Agenda_x0020_Item_x0020_ID' LookupId='TRUE' /><Value Type='Lookup'>" + meetingTabs[i].actualID + "</Value></Eq></And></Where><OrderBy><FieldRef Name='Submission_x0020_Order' Ascending='True' /></OrderBy></Query>",
				CAMLViewFields: "<ViewFields Properties='True' />",
				completefunc: function (xData, Status) {
					$(xData.responseXML).SPFilterNode("z:row").each(function() {
						addNewSubmissionTile(i, $(this));
					});
				}
			});
		}
	}

	//Prepare Saved Dialogue
	$( "#dialog-saved" ).dialog({
		autoOpen: false,
		modal:true,
		width: 400,
		height: 100,
		buttons: {
			OK: function() {
				$(this).dialog("close");
			}
		},
		close: function(ev, ui) { $("#modalProtection").hide(); },
	});
	//Prepare Saved New Meeting Dialogue
	$( "#dialog-saved-new-meeting" ).dialog({
		autoOpen: false,
		modal:true,
		width: 400,
		height: 200,
		buttons: {
			OK: function() {
				$(this).dialog("close");
			}
		},
		close: function(ev, ui) { $("#modalProtection").hide(); },
	});
	
	buildListenersForThisMeeting();
	
	//HOUSEKEEPING
	//To accommodate the generation of files needing an absolute path, this gets the branch you're in (if any) for that path
	branchname = (location.href.substr(location.href.indexOf("SitePages/")+10)).substr(0,(location.href.substr(location.href.indexOf("SitePages/")+10)).indexOf("BinderBuilder"));
	//Populate the photo gallery images
	getPhotoGalleryImages(true);
	//kill drag drop default or regan will kill me
	window.addEventListener("dragover",function(e){
		e = e || event;
		e.preventDefault();
	},false);
	window.addEventListener("drop",function(e){
		e = e || event;
		e.preventDefault();
	},false);
	//and get the current user 
	CurrentUser = $().SPServices.SPGetCurrentUser({
		fieldNames: ["FirstName", "LastName", "JobTitle"],
		debug: false
	});
	//remove datepicker from keyboard tabbing for AODA compliance
	$(".ui-input-datebox>a").attr("tabindex","-1");
	//remove datepicker readonly status for AODA compliance
	$(".ui-input-datebox>input").removeAttr("readonly");	
	//set a listener for the panel
	$( "#submission-info-panel" ).panel({
		beforeopen: function( event, ui ) {
			$("body").css("overflow-y","hidden");
		},
		beforeclose: function( event, ui ) {
			$("body").css("overflow-y","auto");
		}
	});
	//get lists so editsubmission isnt slow
	getTypes(null,null);
	getCategories(null,null);
	getTileImages(null);
	getMinistries(null,null);
	getUsers(null);
	getDocumentCollectionStatuses(null,null);
	getUploadLocations();
	$("body").css("visibility", "visible");
});
/*	Function: 		pullDate(x)
	Description: 	Takes a Sharepoint DateTime (x) and passes back the date in form MM/DD/YYYY.
					Parses off 0 from date or month if applicable */
function pullDate(x){
	//2014/06/24 to 6/24/2014
	return parseInt(x.substring(5,7)) + "/" + parseInt(x.substring(8,10)) + "/" + x.substring(0,4);
}
/*	Function: 		pullTime(x)
	Description: 	Takes a Sharepoint DateTime (x) and passes back the time in form HH:MM (A/P)M.
					DOES NOT Parse off 0 from Hour/Minute if applicable */
function pullTime(x){
	var hours;
	var tod;
	
	x = x.substring(11,x.length-3);
	hours = parseInt(x.substring(0,2));

	//midnight
	if (hours == 0){
		hours = 12;
		x = (hours + x.substring(2,x.length));
		tod = " AM";
	}
	//am
	else if (hours < 12){
		tod = " AM";
	}
	//noon
	else if (hours == 12){
		tod = " PM";
	}
	//pm
	else {
		tod = " PM";
		hours = hours - 12;
		x = ((hours < 10) ? ("0" + hours) : hours) + x.substring(2,x.length);
	}
	
	return x + tod;
}
/*	Function:		setThisDateObjectsTimeToThisTime(date, time)
	Description:	Since time zones are weird as hell, pass in a date object and another date object with a time string and they will be returned combined */
function setThisDateObjectsTimeToThisTime(date, time){
	date.setHours(time.substring(6,7) == "P" ? parseInt(time.substring(0,2)) + 12 : parseInt(time.substring(0,2)));
	date.setMinutes(parseInt(time.substring(3,5)));

	console.log(date);
	
	return date;
}
/*	Function: 		viewSubmissionInPanel(tabIdentifier, submissionIdentifier)
	Description: 	Views the submission in a panel akin to MeetingFlix			*/
function viewSubmissionInPanel(tabIdentifier, submissionIdentifier){
	var relevanttab;
	var relevantsubmission;
	var obj;
	var minister;
	var publicDocuments = [];
	var privateDocuments = [];
	var arrayOfSupportingDocuments = [];
	var arrayOfDecisionDocuments = [];
	var arrayOfPrivateDocuments = [];
	var dcs = null;
	
	//Call get ministries so that it ensures the singleton call has been done
	getMinistries(null, null);
	
	/* Usable attributes in obj as of September 3rd 2014
	====================
	"@ID"
	"@Name"
	"@Presenter"
	"@Attendees"
	"@Minutes"
	"@EstimatedStartTime"
	"@EstimatedEndTime"
	"@ShortDescription"
	"@Description"
	"@Type"
	"@Category"
	"@Order"
	"@LeadOrganizations" [{"@Name", "@Abbreviation"}]
	"@AffectedOrganizations"
	"@UsersWithACOI"
	"@UsersExcludedDueToInCamera"
	"@Image"
	"@SupportingDocuments": [{"@ID", "@Name", "@Link", "@PrivacyStatus"}]
	"@DecisionItemDocuments": [{"@ID", "@Name", "@Link", "@PrivacyStatus"}]
	"@PrivateDocuments": [{"@ID", "@Name", "@Link", "@PrivacyStatus"}]
	"@DocumentCollectionStatus"
	"@TileNumber"
	"@Withdrawn"
	*/	
	
	//(try) get submission object (try for a fallback in case its been manipulated)
	try{
		relevanttab = $.grep(meetingTabs, function(e){ return e.uiID == tabIdentifier; });
		relevanttab = relevanttab[0];
		relevantsubmission = $.grep(relevanttab.arrayOfSubmissions, function(e){ return e.uiID == submissionIdentifier; });
		relevantsubmission = relevantsubmission[0];
		
		//get minister object first
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Ministry",
			CAMLQuery: "<Query><Where><Eq><FieldRef Name='ID'/><Value Type='Counter'>"+relevantsubmission.object.attr("ows_Lead_x0020_Ministry").substr(0, relevantsubmission.object.attr("ows_Lead_x0020_Ministry").indexOf(";"))+"</Value></Eq></Where></Query>",
			CAMLViewFields: "<ViewFields Properties='True' />",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					//get minister object first
					$().SPServices({
						operation: "GetListItems",
						async: false,
						listName: "Users",
						CAMLQuery: "<Query><Where><Eq><FieldRef Name='ID'/><Value Type='Counter'>"+$(this).attr("ows_Minister").substr(0, $(this).attr("ows_Minister").indexOf(";"))+"</Value></Eq></Where></Query>",
						CAMLViewFields: "<ViewFields Properties='True' />",
						completefunc: function (xData, Status) {
							$(xData.responseXML).SPFilterNode("z:row").each(function() {
								minister = $(this);
							});
						}
					});
				});
			}
		});
		
		var x = relevantsubmission.object.attr("ows_Affected_x0020_Ministries");
		x = x.replace(/;#[0-9]+;#/g, ", ");
		x = x.substr(x.indexOf("#")+1,x.length);
		
		var arrayOfLeadMinistries = [];
		var tempArrayOfLeadMinistries = relevantsubmission.object.attr("ows_Lead_x0020_Ministry").substr(relevantsubmission.object.attr("ows_Lead_x0020_Ministry").indexOf("#")+1).split(/;#[0-9]+;#/g);							
		
		for (var i = 0; i < tempArrayOfLeadMinistries.length; i++){
			arrayOfLeadMinistries.push({
				"@Name" 		: tempArrayOfLeadMinistries[i],
				"@Abbreviation"	: $.grep(organizationsArray, function(e){ return e.name == tempArrayOfLeadMinistries[i] })[0].abbreviation
			});
		}
		
		try{
			dcs = relevantsubmission.object.attr("ows_Document_x0020_Collection_x0020_Status").replace(/;#[0-9]+;#/g, ", ");
			dcs = dcs.substr(dcs.indexOf("#")+1);
		}catch(e){}
		
		//Get all visible "Public Documents"
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Agenda Submission Documents",
			CAMLQuery: "<Query><Where><Eq><FieldRef Name='MeetingFlix_x0020_Visibility' /><Value Type='Boolean'>1</Value></Eq></Where></Query>",
			CAMLViewFields: "<ViewFields Properties='True' />",
			CAMLQueryOptions: "<QueryOptions><ViewAttributes Scope='Recursive' /></QueryOptions>",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {			
					publicDocuments.push($(this));
				});
			}
		});
				
		//Get all visible "Private Documents"
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Private Submission Documents",
			CAMLQuery: "<Query><Where><Eq><FieldRef Name='MeetingFlix_x0020_Visibility' /><Value Type='Boolean'>1</Value></Eq></Where></Query>",
			CAMLViewFields: "<ViewFields Properties='True' />",
			CAMLQueryOptions: "<QueryOptions><ViewAttributes Scope='Recursive' /></QueryOptions>",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {									
					privateDocuments.push($(this));
				});
			}
		});
		
		//Public Docs 
		var publicdocs = $.grep(publicDocuments, function(e){ return e.attr("ows_Submission_x0020_Timestamp_x0020_ID") == relevantsubmission.object.attr("ows_Submission_x0020_Timestamp_x0020_ID"); });
		for (var k = 0; k < publicdocs.length; k++){
			if (publicdocs[k].attr("ows_Decision_x0020_Item") == 1){
				arrayOfDecisionDocuments.push({
					"@Name": publicdocs[k].attr("ows_Title"),
					"@ID": publicdocs[k].attr("ows_ID"),
					"@Link": "/" + publicdocs[k].attr("ows_FileRef").substr(publicdocs[k].attr("ows_FileRef").indexOf("#")+1),
					"@PrivacyStatus": "No",
					"@Order": publicdocs[k].attr("ows_Document_x0020_Order"),
					"@Filetype": publicdocs[k].attr("ows_File_x0020_Type"),
					"@Size": ((parseInt(publicdocs[k].attr("ows_File_x0020_Size").substr(publicdocs[k].attr("ows_File_x0020_Size").indexOf("#")+1)) / 1024)/1024).toFixed(2) + " MB"
				});
			}
			else{
				arrayOfSupportingDocuments.push({
					"@Name": publicdocs[k].attr("ows_Title"),
					"@ID": publicdocs[k].attr("ows_ID"),
					"@Link": "/" + publicdocs[k].attr("ows_FileRef").substr(publicdocs[k].attr("ows_FileRef").indexOf("#")+1),
					"@PrivacyStatus": "No",
					"@Order": publicdocs[k].attr("ows_Document_x0020_Order"),
					"@Filetype": publicdocs[k].attr("ows_File_x0020_Type"),
					"@Size": ((parseInt(publicdocs[k].attr("ows_File_x0020_Size").substr(publicdocs[k].attr("ows_File_x0020_Size").indexOf("#")+1)) / 1024)/1024).toFixed(2) + " MB"
				});
			}
		}
		
		//Private Docs 
		var privatedocs = $.grep(privateDocuments, function(e){ return e.attr("ows_Submission_x0020_Timestamp_x0020_ID") == relevantsubmission.object.attr("ows_Submission_x0020_Timestamp_x0020_ID"); });
		for (var k = 0; k < privatedocs.length; k++){
			arrayOfPrivateDocuments.push({
				"@Name": privatedocs[k].attr("ows_Title"),
				"@ID": privatedocs[k].attr("ows_ID"),
				"@Link": "/" + privatedocs[k].attr("ows_FileRef").substr(privatedocs[k].attr("ows_FileRef").indexOf("#")+1),
				"@PrivacyStatus": "Yes",
				"@Order": publicdocs[k].attr("ows_Document_x0020_Order"),
				"@Filetype": publicdocs[k].attr("ows_File_x0020_Type"),
				"@Size": ((parseInt(publicdocs[k].attr("ows_File_x0020_Size").substr(publicdocs[k].attr("ows_File_x0020_Size").indexOf("#")+1)) / 1024)/1024).toFixed(2) + " MB"
			});
		}
		
		obj = {
			"@ID": relevantsubmission.object.attr("ows_ID"),
			"@Name": relevantsubmission.object.attr("ows_Title"),
			"@Presenter": relevantsubmission.object.attr("ows_Presenter"),
			"@Attendees": relevantsubmission.object.attr("ows_Submission_x0020_Attendees"),
			"@Minutes": parseInt(relevantsubmission.object.attr("ows_Time_x0020_In_x0020_Minutes")).toFixed(0),
			"@EstimatedStartTime":null,
			"@EstimatedEndTime":null,
			"@ShortDescription": relevantsubmission.object.attr("ows_Submission_x0020_Brief_x0020_Description") ? relevantsubmission.object.attr("ows_Submission_x0020_Brief_x0020_Description") : null,
			"@Description": relevantsubmission.object.attr("ows_Submission_x0020_Description"),
			"@Type": relevantsubmission.object.attr("ows_Submission_x0020_Type").substr(relevantsubmission.object.attr("ows_Submission_x0020_Type").indexOf("#")+1),
			"@Category": relevantsubmission.object.attr("ows_Submission_x0020_Type").substr(relevantsubmission.object.attr("ows_Submission_x0020_Type").indexOf("#")+1),
			"@Order": parseInt(relevantsubmission.object.attr("ows_Submission_x0020_Order")).toFixed(0),
			"@LeadOrganizations": arrayOfLeadMinistries,
			"@AffectedOrganizations": x,
			"@UsersWithACOI": null,
			"@UsersExcludedDueToInCamera": null,
			"@Image": relevantsubmission.object.attr("ows_Submission_x0020_Picture").substr(0, relevantsubmission.object.attr("ows_Submission_x0020_Picture").indexOf(",")),
			"@SupportingDocuments": (arrayOfSupportingDocuments!=null?arrayOfSupportingDocuments.sort(function(a,b) { return a["@Order"] - b["@Order"] } ):null),
			"@DecisionItemDocuments": (arrayOfDecisionDocuments!=null?arrayOfDecisionDocuments.sort(function(a,b) { return a["@Order"] - b["@Order"] } ):null),
			"@PrivateDocuments": (arrayOfPrivateDocuments!=null?arrayOfPrivateDocuments.sort(function(a,b) { return a["@Order"] - b["@Order"] } ):null),
			"@DocumentCollectionStatus":dcs,
			"@TileNumber":null,
			"@Withdrawn":(relevantsubmission.object.attr("ows_Withdrawn") == 1 ? "Yes" : null)
		};
		
		console.log(obj);
		
		buildRightPanel(obj, '#submission-info-panel-inner', '#submission-info-panel');
	}
	catch(e){
		relevantsubmission = null;
		//cant do anything
	}
}
/*	Function: 		editSubmission(tabIdentifier, submissionIdentifier)
	Description: 	Will do stuff			*/
function editSubmission(tabIdentifier, submissionIdentifier){
	var formToAdd = "";
	var relevanttab;
	var relevantsubmission;
    
	$("body").addClass("modalopen");
    $("#modalProtection").show();
	$("#popupSubmission").show();

	if(submissionIdentifier){
		//existing submission
		$("#popupSubmissionHeader").html("<h3>Edit this Existing Tile (Page <span id='submissionPageNumber'>1</span>/4)</h3>");
		
		//(try) get submission object (try for a fallback in case its been manipulated)
		try{
			relevanttab = $.grep(meetingTabs, function(e){ return e.uiID == tabIdentifier; });
			relevanttab = relevanttab[0];
			relevantsubmission = $.grep(relevanttab.arrayOfSubmissions, function(e){ return e.uiID == submissionIdentifier; });
			relevantsubmission = relevantsubmission[0];
		}
		catch(e){
			relevantsubmission = null;
		}
	}
	else{
		$("#popupSubmissionHeader").html("<h3>Create a New Tile (Page <span id='submissionPageNumber'>1</span>/4)</h3>");
	}
	
	formToAdd = '	<div class="submission-field">\
						<div id="submissionPage1" class="modalpage" tabindex="-1">\
							<div style="width:100%">\
								<div style="display:inline-block;width:41%">\
									<label for="submissionName'+submissionIdentifier+'">Title<abbr class="required-asterisk" title="Required">*</abbr></label>\
									<input data-mini="true" type="text" placeholder="Title" name="submissionName'+submissionIdentifier+'" id="submissionName'+submissionIdentifier+'" value="'+(relevantsubmission ? relevantsubmission.object.attr("ows_Title") : "" )+'" />\
								</div>\
								<div style="display:inline-block;width:17%;margin-left:2%;">\
									<label for="submissionMinutes'+submissionIdentifier+'">Time In Minutes<abbr class="required-asterisk" title="Required">*</abbr></label>\
									<input type="number" min="1" data-mini="true" type="text" class="minutes" placeholder="Minutes" name="submissionMinutes'+submissionIdentifier+'" id="submissionMinutes'+submissionIdentifier+'" value="'+ (relevantsubmission ? parseInt(relevantsubmission.object.attr("ows_Time_x0020_In_x0020_Minutes")).toFixed(0) : "" )+'" />\
								</div>\
								<div style="display:inline-block;width:17%;margin-left:2%;">\
									<label for="submissionIdentifier'+submissionIdentifier+'">Identifier</label>\
									<input data-mini="true" type="text" placeholder="Identifier" name="submissionIdentifier'+submissionIdentifier+'" id="submissionIdentifier'+submissionIdentifier+'" value="'+ (relevantsubmission && relevantsubmission.object.attr("ows_External_x0020_Identifier") != null ? relevantsubmission.object.attr("ows_External_x0020_Identifier") : "" )+'" />\
								</div>\
								<div style="display:inline-block;width:17%;margin-left:2%;">\
									<label style="margin-bottom: -2px;" for="submissionWithdrawal'+submissionIdentifier+'">Status</label>\
									<input type="checkbox" data-role="flipswitch" name="submissionWithdrawal'+submissionIdentifier+'" id="submissionWithdrawal'+submissionIdentifier+'" data-on-text="Active" data-off-text="Withdrawn" data-wrapper-class="custom-size-flipswitch" data-mini="false" ' + (relevantsubmission && relevantsubmission.object.attr("ows_Withdrawn") != null && relevantsubmission.object.attr("ows_Withdrawn") == "1" ? '' : 'checked="checked"') + '" />\
								</div>\
							</div>\
							<div class="left-side">\
								<div style="width:100%">\
									<div style="display:inline-block;width:47%;vertical-align:top;">\
										<label for="submissionType'+submissionIdentifier+'" style="margin-top:1em">Type<abbr class="required-asterisk" title="Required">*</abbr></label>\
										<div style="display:inline-block;vertical-align:top;width:100%">\
											<select class="submissionType" id="submissionType'+submissionIdentifier+'" data-mini="true">\
												' + getTypes((relevantsubmission ? relevantsubmission.object.attr("ows_Submission_x0020_Type") : null ), null) + '\
											</select>\
										</div>\
									</div>\
									<div style="display:inline-block;width:46%;margin-left:3%;">\
										<label for="submissionCategory'+submissionIdentifier+'" style="margin-top:1em">Category</label>\
										<div style="display:inline-block;width:88%;margin-left:2%;vertical-align:top">\
											<select class="submissionCategory" id="submissionCategory'+submissionIdentifier+'" data-mini="true">\
												' + getCategories((relevantsubmission ? relevantsubmission.object.attr("ows_Submission_x0020_Category") : null ), null) + '\
											</select>\
										</div>\
										<div style="display:inline-block;width:5%;margin-left:2%;">\
											<a href="javascript:void(0)" class="add-new-category ui-link ui-btn ui-icon-plus ui-btn-icon-right ui-shadow ui-corner-all ui-mini" data-role="button" data-mini="true" role="none" style="width:32px;height:32px;padding:0;"></a>\
										</div>\
									</div>\
								</div>\
								<div style="width:100%">\
									<label for="submissionPresenter'+submissionIdentifier+'" style="margin-top: 1em;">Presenter(s)</label>\
									<input data-mini="true" type="text" placeholder="Presenter" name="submissionPresenter'+submissionIdentifier+'" id="submissionPresenter'+submissionIdentifier+'" value="'+(relevantsubmission && relevantsubmission.object.attr("ows_Presenter") != null && relevantsubmission.object.attr("ows_Presenter") != "" ? relevantsubmission.object.attr("ows_Presenter") : "" )+'" />\
								</div>\
								<div style="width:100%">\
									<label for="submissionAttendees'+submissionIdentifier+'" style="margin-top:1em">Attendees</label>\
									<textarea data-mini="true" placeholder="Attendees" class="submissionAttendees" id="submissionAttendees'+submissionIdentifier+'">'+(relevantsubmission && relevantsubmission.object.attr("ows_Submission_x0020_Attendees") ? relevantsubmission.object.attr("ows_Submission_x0020_Attendees") : "" )+'</textarea>\
								</div>\
							</div>\
							<div class="right-side">\
								<div class="holder" id="holder">\
									<div id="holder_helper" class="submission-image imageNormal">\
										<h4 id="holder_helper_title" style="position:absolute;bottom:0;">Drop your Tile Image here, or Select an Image Below</h4>\
									</div>\
									<div id="picture-picker" style="">\
										' + getTileImages(false) + '\
									</div>\
								</div>\
							</div>\
							<a href="javascript:void(0)" class="goto-page-2 agenda-item-save-update-button ui-link ui-btn ui-icon-arrow-r ui-btn-icon-right ui-shadow ui-corner-all ui-mini" data-role="button" data-mini="true" role="none" style="margin-top:3em;float:right;width:40%;">Next Page</a>\
						</div>\
						<div id="submissionPage2" class="modalpage" tabindex="-1">\
						<div style="width:100%">\
							<div style="display:inline-block;width:48%">\
									<label for="submissionLeadMinistry'+submissionIdentifier+'" style="margin-top:1em">Lead Organization(s)<abbr class="required-asterisk" title="Required">*</abbr></label>\
									<div id="submissionLeadMinistries'+submissionIdentifier+'" class="multiselect">\
										' + getMinistries((relevantsubmission ? relevantsubmission.object.attr("ows_Lead_x0020_Ministry") : null ), true) + '\
									</div>\
								</div>\
								<div style="display:inline-block;width:48%;margin-left:3%;">\
									<label for="submissionAffectedMinistries'+submissionIdentifier+'" style="margin-top:1em">Affected Organization(s)</label>\
									<div id="submissionAffectedMinistries'+submissionIdentifier+'" class="multiselect">\
										' + getMinistries((relevantsubmission ? relevantsubmission.object.attr("ows_Affected_x0020_Ministries") : null ), true) + '\
									</div>\
								</div>\
							</div>\
							<div style="width:100%">\
								<div style="display:inline-block;width:48%;">\
									<label for="submissionConflictingMinisters'+submissionIdentifier+'" style="margin-top:1em">Users with a Conflict of Interest</label>\
									<div id="submissionConflictingMinisters'+submissionIdentifier+'" class="multiselect">\
										' + getUsers((relevantsubmission ? relevantsubmission.object.attr("ows_Conflicting_x0020_Ministers1") : null )) + '\
									</div>\
								</div>\
								<div style="display:inline-block;width:48%;margin-left:3%;">\
									<label for="submissionInCameraExclusions'+submissionIdentifier+'" style="margin-top:1em">In-Camera Exclusions</label>\
									<div id="submissionInCameraExclusions'+submissionIdentifier+'" class="multiselect">\
										' + getUsers((relevantsubmission ? relevantsubmission.object.attr("ows_InCamera_x0020_Exclusions") : null )) + '\
									</div>\
								</div>\
							</div>\
							<a href="javascript:void(0)" class="goto-page-1 agenda-item-save-update-button ui-link ui-btn ui-icon-arrow-l ui-btn-icon-left ui-shadow ui-corner-all ui-mini" data-role="button" data-mini="true" role="none" style="margin:3em 0em;float:left;width:40%;">Previous Page</a>\
							<a href="javascript:void(0)" class="goto-page-3 agenda-item-save-update-button ui-link ui-btn ui-icon-arrow-r ui-btn-icon-right ui-shadow ui-corner-all ui-mini" data-role="button" data-mini="true" role="none" style="margin:3em 0em;float:right;width:40%;">Next Page</a>\
						</div>\
						<div id="submissionPage3" class="modalpage" tabindex="-1">\
							<div style="width:100%">\
								<label for="submissionBriefDescription'+submissionIdentifier+'">Brief Description</label>\
								<input data-mini="true" type="text" placeholder="Brief Description" name="submissionBriefDescription'+submissionIdentifier+'" id="submissionBriefDescription'+submissionIdentifier+'" value="'+(relevantsubmission && relevantsubmission.object.attr("ows_Submission_x0020_Brief_x0020_Description") != null ? relevantsubmission.object.attr("ows_Submission_x0020_Brief_x0020_Description") : "" )+'" />\
							</div>\
							<label for="submissionDescription'+submissionIdentifier+'" style="margin-top:1em">Detailed Description</label>\
							<textarea class="tinymce submissionDescription" id="submissionDescription'+submissionIdentifier+'">'+(relevantsubmission && relevantsubmission.object.attr("ows_Submission_x0020_Description") && relevantsubmission.object.attr("ows_Submission_x0020_Description") != "<p>undefined</p>" ? relevantsubmission.object.attr("ows_Submission_x0020_Description") : "" )+'</textarea>\
							<a href="javascript:void(0)" class="goto-page-2 agenda-item-save-update-button ui-link ui-btn ui-icon-arrow-l ui-btn-icon-left ui-shadow ui-corner-all ui-mini" data-role="button" data-mini="true" role="none" style="margin:3em 0em;float:left;width:40%;">Previous Page</a>\
							<a href="javascript:void(0)" class="goto-page-4 agenda-item-save-update-button ui-link ui-btn ui-icon-arrow-r ui-btn-icon-right ui-shadow ui-corner-all ui-mini" data-role="button" data-mini="true" role="none" style="margin:3em 0em;float:right;width:40%;">Final Page</a>\
						</div>\
						<div id="submissionPage4" class="modalpage" tabindex="-1">\
							<div style="width:100%">\
								<label for="submissionDocumentCollectionStatus'+submissionIdentifier+'">Document Collection Status</label>\
								<select class="submissionDocumentCollectionStatus" id="submissionDocumentCollectionStatus'+submissionIdentifier+'" data-mini="true">\
									' + getDocumentCollectionStatuses((relevantsubmission ? relevantsubmission.object.attr("ows_Document_x0020_Collection_x0020_Status") : null ), null) + '\
								</select>\
							</div>\
							<div id="document-holder" class="documentContainer">\
								<div id="decision-items" class="documentNormal">\
									<h4>Decision Items</h4>\
									<h5 id="document-holder-prompt">Drop Decision Documents for this Tile Here</h5>\
									<div class="documentListContainer">\
										<ul id="decision-items-list" class="listOfDocuments">\
										</ul>\
									</div>\
								</div>\
								<div id="non-decision-items" class="documentNormal">\
									<h4>Supporting Documents</h4>\
									<h5 id="document-holder-prompt">Drop Supporting Documents for this Tile Here</h5>\
									<div class="documentListContainer">\
										<ul id="non-decision-items-list" class="listOfDocuments">\
										</ul>\
									</div>\
								</div>\
							</div>\
							<a href="javascript:void(0)" class="goto-page-3 agenda-item-save-update-button ui-link ui-btn ui-icon-arrow-l ui-btn-icon-left ui-shadow ui-corner-all ui-mini" data-role="button" data-mini="true" role="none" style="margin-top:3em;float:left;width:40%;">Previous Page</a>\
							<a href="javascript:void(0)" id="save-submission" class="agenda-item-save-update-button ui-link ui-btn ui-icon-check ui-btn-icon-right ui-shadow ui-corner-all ui-mini" data-role="button" data-icon="check" data-mini="true" role="none" style="margin-top:3em;float:right;width:40%;">Upload Documents/Complete</a>\
						</div>\
					</div>';
	
	$("#popupSubmissionContent").html(formToAdd);
	
	//Handle Docs list
	$( ".listOfDocuments" ).sortable({
		items: '> li:not(.pin)',
		scroll: true,
		connectWith: ".listOfDocuments",
		cursor: 'move',
		helper: 'clone',
		appendTo: 'body',
		zIndex: 10000,
		start: function(event, ui){
			sortableDocumentStorage = {
				"OGIndex": ui.item.index(),
				"OGListID": $(this).attr('id'),
			};
		},
		update: function(event, ui){
			var relevantdocument = $.grep(documentArray, function(e){ return e.tempdocstack == parseInt(ui.item.attr('id').substring(8)); });
			relevantdocument = relevantdocument[0];
			//called when a change has been made
			if (sortableDocumentStorage.OGListID != $(this).attr('id')){
				try{										
					initializeDocumentMoveAndReorder(relevantdocument, sortableDocumentStorage, {"NewIndex": ui.item.index(),"NewListID": $(this).attr('id')});
				}catch(e){}
			}
			else{
				try{
					initializeDocumentReorder(relevantdocument, sortableDocumentStorage, {"NewIndex": ui.item.index(),"NewListID": $(this).attr('id')});
				}catch(e){}
			}
		},
	});
	
	if(submissionIdentifier){
		//Get documents (asynchronously)
		//public documents
		$().SPServices({
			operation: "GetListItems",
			async: true,
			listName: "Agenda Submission Documents",
			CAMLQuery: "<Query><OrderBy><FieldRef Name='Document_x0020_Order' Ascending='True' /></OrderBy></Query>",
			CAMLViewFields: "<ViewFields Properties='True' />",
			CAMLQueryOptions: "<QueryOptions><Folder>" + thisSite + "/Agenda Submission Documents/" + relevantsubmission.object.attr("ows_FileLeafRef").substr(relevantsubmission.object.attr("ows_FileLeafRef").indexOf("#")+1) + "</Folder></QueryOptions>",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					console.log($(this));
					documentArray.push({
						"id":$(this).attr("ows_ID"),
						"filename": $(this).attr("ows_FileLeafRef").substr($(this).attr("ows_FileLeafRef").indexOf("#")+1),
						"title": $(this).attr("ows_Title"),
						"path": "/" + $(this).attr("ows_FileRef").substr($(this).attr("ows_FileRef").indexOf("#")+1),
						"size": ((parseInt($(this).attr("ows_File_x0020_Size").substr($(this).attr("ows_File_x0020_Size").indexOf("#")+1)) / 1024)/1024).toFixed(2) + " MB",
						"privateLocation":null,
						"on":$(this).attr("ows_Created"),
						"by":$(this).attr("ows_Author"),
						"visible":$(this).attr("ows_MeetingFlix_x0020_Visibility"),
						"comments":$(this).attr("ows_Document_x0020_Comments"),
						"ogfilename":$(this).attr("ows_Original_x0020_Filename"),
						"decisionitem":($(this).attr("ows_Decision_x0020_Item") == "1" ? true : false),
						"order":$(this).attr("ows_Document_x0020_Order")
					});
				});
				//private documents
				$().SPServices({
					operation: "GetListItems",
					async: true,
					listName: "Private Submission Documents",
					CAMLQuery: "<Query><Where><Eq><FieldRef Name='Submission_x0020_Timestamp_x0020_ID' /><Value Type='Text'>" + relevantsubmission.object.attr("ows_Submission_x0020_Timestamp_x0020_ID") + "</Value></Eq></Where><OrderBy><FieldRef Name='Document_x0020_Order' Ascending='True' /></OrderBy></Query>",
					CAMLViewFields: "<ViewFields Properties='True' />",
					CAMLQueryOptions: "<QueryOptions><ViewAttributes Scope='Recursive' /><Folder>" + thisSite + "/Private Submission Documents" + "</Folder></QueryOptions>",
					completefunc: function (xData, Status) {
						$(xData.responseXML).SPFilterNode("z:row").each(function() {
							var x = $(this).attr("ows_FileRef").split('/');
							documentArray.push({
								"id":$(this).attr("ows_ID"),
								"filename": $(this).attr("ows_FileLeafRef").substr($(this).attr("ows_FileLeafRef").indexOf("#")+1),
								"title": $(this).attr("ows_Title"),
								"path": "/" + $(this).attr("ows_FileRef").substr($(this).attr("ows_FileRef").indexOf("#")+1),
								"size": ((parseInt($(this).attr("ows_File_x0020_Size").substr($(this).attr("ows_File_x0020_Size").indexOf("#")+1)) / 1024)/1024).toFixed(2) + " MB",
								"privateLocation":x[x.length-2],
								"on":$(this).attr("ows_Created"),
								"by":$(this).attr("ows_Author"),
								"visible":$(this).attr("ows_MeetingFlix_x0020_Visibility"),
								"comments":$(this).attr("ows_Document_x0020_Comments"),
								"ogfilename":$(this).attr("ows_Original_x0020_Filename"),
								"decisionitem":($(this).attr("ows_Decision_x0020_Item") == "1" ? true : false),
								"order":$(this).attr("ows_Document_x0020_Order")
							});
						});
						if (documentArray.length > 0){
							documentArray.sort(function(a,b) {return a.order - b.order});
							for (var i = 0; i < documentArray.length; i++){
								addDocumentToSortableList(documentArray[i], i);
							}
						}
						$(".documentDetails").hide();
						$('.documentInList>.documentName').on('click',function(){
							var details = $('#'+$(this).parent().attr('id')+'>.documentDetails');
							var movecontrols = $('#'+$(this).parent().attr('id')+'>.documentDetails>.movecontrols');
							details.is(':hidden') ? ($('.movecontrols').hide(), $('.listOfDocuments > li > .documentDetails').slideUp(), details.slideDown(function(){movecontrols.show()})) : (movecontrols.hide(), details.slideUp());
						});
					}
				});
			}
		});
	}

	//Ensure only numbers are entered in the minutes field, courtesy of stackoverflow: http://stackoverflow.com/questions/995183/how-to-allow-only-numeric-0-9-in-html-inputbox-using-jquery
	$(".minutes").keydown(function (e) {
        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 ||
            (e.keyCode == 65 && e.ctrlKey === true) || 
            (e.keyCode >= 35 && e.keyCode <= 39)) {
                 return;
        }
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });
	
	documentDropper();
	imageDropper();
	
	if (relevantsubmission){
		try{
			$("#holder_helper").css("background-image", "url('" + relevantsubmission.object.attr("ows_Submission_x0020_Picture").substr(0, relevantsubmission.object.attr("ows_Submission_x0020_Picture").indexOf(",")) + "')");
			submissionImageSelected = relevantsubmission.object.attr("ows_Submission_x0020_Picture").substr(0, relevantsubmission.object.attr("ows_Submission_x0020_Picture").indexOf(","))
		}catch(e){}
		$("#holder_helper").css("background-size", "70%");
		$("#holder_helper").css("background-repeat", "no-repeat");
		$("#holder_helper").css("background-position", "center top");
	}
	else {
		$("#holder_helper").css("background-image", "url('" + thisSite + "/Submission%20Tiles/" + submissionImageSelected + "')");
	}
	
	submissionImageToUpload = null;
	submissionChangePage(1);
	
	prepareJQMStylesForDynamicContent("popupSubmissionContent");
	
	tinymce.init({
		selector: "textarea.tinymce",
		plugins: [
		"advlist autolink lists link image charmap print preview anchor",
		"searchreplace visualblocks code fullscreen",
		"insertdatetime media paste table"
		],
		style_formats: [
			{title: 'Heading', block: 'h3', styles: {}},
			{title: 'Sub-Heading', block: 'h4', styles: {}},
			{title: 'Float Left', block: 'span', styles: {float: 'left', padding: '0.5em'}},
			{title: 'Float Right', block: 'span', styles: {float: 'right', padding: '0.5em'}}
		],
		content_css: "BinderBuilderAssets/css/tinymcestyles.css",
		toolbar: "undo redo | styleselect removeformat | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist | link table | uploadnew image",
		menubar: false,
		statusbar: false,
		remove_script_host : false,
		convert_urls : false,
		height:"370px",
		image_list: null,
		meetingid : meetingAtHand.attr("ows_Meeting_x0020_Timestamp_x0020_ID"),
		setup: function(editor) {
			editor.addButton('uploadnew', {
				text: 'Upload New Image',
				icon: false,
				onclick: function() {
					tinyMCE.activeEditor.windowManager.open({
					   url   : 'ImageUploader.html',
					   width : 500,
					   height: 500,
					   title : "Upload a New Image"
					});
				}
			});
		}
	});
	
	tinymce.execCommand('mceAddControl', false, 'submissionDescription'+submissionIdentifier);
	$(".multiselect").multiselect();
	
	//Pagination and Save Button Listeners
	$( ".goto-page-1" ).click(function() {
		submissionChangePage(1);
	});
	$( ".goto-page-2" ).click(function() {
		submissionChangePage(2);
	});
	$( ".goto-page-3" ).click(function() {
		submissionChangePage(3);
	});
	$( ".goto-page-4" ).click(function() {
		submissionChangePage(4);
	});
	$( "#save-submission" ).click(function() {
		validateTile(submissionIdentifier, tabIdentifier, submissionIdentifier);
	});
	$( ".tile-img-anchor" ).click(function() {
		var x = $(this).children()[0];
		submissionImageSelected = x.src.substr(x.src.lastIndexOf("/")+1);
		submissionImageToUpload = null;
		$("#holder_helper").css("background-image", "url('" + x.src + "')");
	});
	$( ".add-new-category").click(function(){
		var x = prompt("Enter a name for the new Category", "");
		if (x && x !=""){
			newCategory(x);
		}
		$('#submissionCategory'+submissionIdentifier).html(getCategories((relevantsubmission ? relevantsubmission.object.attr("ows_Submission_x0020_Category") : null ), true));
	});

	//Set focus
	$("#submissionName"+submissionIdentifier).focus();
}
/*	Function: 		submissionChangePage(page)
	Description: 	Prepares the submission form for the specified page (hides fields)			*/
function submissionChangePage(page){
	switch(page) {
		case 1:
			$("#submissionPageNumber").html("1");
			$("#submissionPage1").show();
			$("#submissionPage2").hide();
			$("#submissionPage3").hide();
			$("#submissionPage4").hide();
			$("#submissionPage1").focus();
			break;
		case 2:
			$("#submissionPageNumber").html("2");
			$("#submissionPage1").hide();
			$("#submissionPage2").show();
			$("#submissionPage3").hide();
			$("#submissionPage4").hide();
			$("#submissionPage2").focus();
			break;
		case 3:
			$("#submissionPageNumber").html("3");
			$("#submissionPage1").hide();
			$("#submissionPage2").hide();
			$("#submissionPage3").show();
			$("#submissionPage4").hide();
			$("#submissionPage3").focus();
			break;
		case 4:
			$("#submissionPageNumber").html("4");
			$("#submissionPage1").hide();
			$("#submissionPage2").hide();
			$("#submissionPage3").hide();
			$("#submissionPage4").show();
			$("#submissionPage4").focus();
			break;
		default:
			//fallback
			break;
	}
}
/*	Function: 		saveSubmission(tabIdentifier, submissionIdentifier)
	Description: 	Closes the submission popup and saves if save is true			*/
function saveSubmission(tabIdentifier, submissionIdentifier){
	//save stuff here
	var relevanttab;
	var relevantsubmission;
	var titleOfSubmission = $('#submissionName'+submissionIdentifier).val();
	var briefDescriptionOfSubmission = $('#submissionBriefDescription'+submissionIdentifier).val();
	var presenterOfSubmission = $('#submissionPresenter'+submissionIdentifier).val();
	var attendeesOfSubmission = $('#submissionAttendees'+submissionIdentifier).val();
	var externalIdentifier = $('#submissionIdentifier'+submissionIdentifier).val();
	var minsForSubmission = 1;
	var typeOfSubmission  = $('#submissionType'+submissionIdentifier).find(":selected").val() + ";#" + $('#submissionType'+submissionIdentifier).find(":selected").text();
	var documentstatusOfSubmission  = $('#submissionDocumentCollectionStatus'+submissionIdentifier).find(":selected").val() + ";#" + $('#submissionDocumentCollectionStatus'+submissionIdentifier).find(":selected").text();
	var categoryOfSubmission  =  ($('#submissionCategory'+submissionIdentifier).find(":selected").val() != "0" ? $('#submissionCategory'+submissionIdentifier).find(":selected").val() + ";#" + $('#submissionCategory'+submissionIdentifier).find(":selected").text() : "");
	var leadMinistryOfSubmission  = $('#submissionLeadMinistry'+submissionIdentifier).find(":selected").val() + ";#" + $('#submissionLeadMinistry'+submissionIdentifier).find(":selected").text();
	var arrayOfLeadMinistries = document.getElementById("submissionLeadMinistries"+submissionIdentifier).children;
	var stringOfLeadMinistries = "";
	var arrayOfAffectedMinistries = document.getElementById("submissionAffectedMinistries"+submissionIdentifier).children;
	var stringOfAffectedMinistries = "";
	var arrayOfConflictingMinisters = document.getElementById("submissionConflictingMinisters"+submissionIdentifier).children;
	var stringOfConflictingMinisters = "";
	var arrayOfInCameraExclusions = document.getElementById("submissionInCameraExclusions"+submissionIdentifier).children;
	var stringOfInCameraExclusions = "";
	var submissionid = new Date();	//epoch time used for meetingid
	var imgpath = thisSite + "/Submission%20Tiles/" + submissionImageSelected.substr(submissionImageSelected.lastIndexOf("/")+1);
	var visibility = $("#submissionWithdrawal"+submissionIdentifier).is(':checked');
	
	try{
		minsForSubmission = parseInt($('#submissionMinutes'+submissionIdentifier).val());
	}catch(e){}
	
	//make a string for selected lead ministries
	for (var i = 0; i < arrayOfLeadMinistries.length; i++) {
		if (hasClass(arrayOfLeadMinistries[i], "multiselect-on")){
			if (stringOfLeadMinistries != ""){
				stringOfLeadMinistries += ";#"
			}
			stringOfLeadMinistries += arrayOfLeadMinistries[i].lastChild.getAttribute("value") + ";#" + arrayOfLeadMinistries[i].firstChild.innerHTML;
		}
	}
	
	//make a string for selected affected ministries
	for (var i = 0; i < arrayOfAffectedMinistries.length; i++) {
		if (hasClass(arrayOfAffectedMinistries[i], "multiselect-on")){
			if (stringOfAffectedMinistries != ""){
				stringOfAffectedMinistries += ";#"
			}
			stringOfAffectedMinistries += arrayOfAffectedMinistries[i].lastChild.getAttribute("value") + ";#" + arrayOfAffectedMinistries[i].firstChild.innerHTML;
		}
	}
	
	//make a string for selected conflicting ministers
	for (var i = 0; i < arrayOfConflictingMinisters.length; i++) {
		if (hasClass(arrayOfConflictingMinisters[i], "multiselect-on")){
			if (stringOfConflictingMinisters != ""){
				stringOfConflictingMinisters += ";#"
			}
			stringOfConflictingMinisters += arrayOfConflictingMinisters[i].lastChild.getAttribute("value");
		}
	}
	
	//make a string for selected in camera excluded ministers
	for (var i = 0; i < arrayOfInCameraExclusions.length; i++) {
		if (hasClass(arrayOfInCameraExclusions[i], "multiselect-on")){
			if (stringOfInCameraExclusions != ""){
				stringOfInCameraExclusions += ";#"
			}
			stringOfInCameraExclusions += arrayOfInCameraExclusions[i].lastChild.getAttribute("value");
		}
	}
	
	//upload image if necessary
	if (submissionImageToUpload){
		$().SPServices({
			operation: "CopyIntoItems",
			processData: false,
			async: false,
			SourceUrl: imgpath,
			Stream: submissionImageToUpload.substr(submissionImageToUpload.indexOf(",")+1),
			DestinationUrls: [imgpath],
			Fields: "<FieldInformation Type='File' />",
			completefunc: function (xData, Status) {
				getTileImages(true);
			}
		});
	}
	
	relevanttab = $.grep(meetingTabs, function(e){ return e.uiID == tabIdentifier; });
	relevanttab = relevanttab[0];
	relevantsubmission = $.grep(relevanttab.arrayOfSubmissions, function(e){ return e.uiID == submissionIdentifier; });
	relevantsubmission = relevantsubmission[0];
	
	//Update
	if (submissionIdentifier != 0){
		$().SPServices({
			operation: "UpdateListItems",
			async: false,
			batchCmd: "Update",
			listName: "Agenda Submission Documents",
			valuepairs: [
							["Title", titleOfSubmission.replace(/[&\/\\#,+()$~%"`:;*?<>{}|^!@$']/g,'')],
							["Time_x0020_In_x0020_Minutes", minsForSubmission],
							["Presenter", presenterOfSubmission],
							["External_x0020_Identifier", (externalIdentifier && externalIdentifier!="" ? externalIdentifier : "")],
							["BaseName", titleOfSubmission.replace(/[&\/\\#,+()$~%"`:;*?<>{}|^!@$']/g,'')],
							["Submission_x0020_Title", titleOfSubmission.replace(/[&\/\\#,+()$~%"`:;*?<>{}|^!@$']/g,'')],
							["Submission_x0020_Type", typeOfSubmission],
							["Submission_x0020_Category", categoryOfSubmission],
							["Document_x0020_Collection_x0020_Status", documentstatusOfSubmission],
							["Lead_x0020_Ministry", stringOfLeadMinistries],
							["Affected_x0020_Ministries", stringOfAffectedMinistries],
							["Conflicting_x0020_Ministers1", stringOfConflictingMinisters],
							["InCamera_x0020_Exclusions", stringOfInCameraExclusions],
							["Submission_x0020_Picture", imgpath+","],
							["Submission_x0020_Description", STSHtmlEncode(tinymce.get('submissionDescription'+submissionIdentifier).getContent())],
							["Submission_x0020_Brief_x0020_Description", briefDescriptionOfSubmission],
							["Withdrawn", (visibility?'0':'1')],
							["Submission_x0020_Attendees", attendeesOfSubmission]
						],
			ID: relevantsubmission.actualID,
			completefunc: function(xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					console.log(xData);
					relevantsubmission.object = $(this);
					relevantsubmission.Title = $(this).attr("ows_Title");
					refreshTile(relevantsubmission);
					//upload docs if applicable
					if (filesInSubmission.length > 0){
						for (var i=0; i < filesInSubmission.length; i++){
							console.log($(this).attr("ows_FileLeafRef") + " *** " + filesInSubmission[i] + " *** " + uploadLocations[$("#privacy-"+(filesInSubmission[i].docstack)).val()].address + " *** " + $(this).attr("ows_Submission_x0020_Timestamp_x0020_ID") + " *** " + $(this).attr("ows_ID") + ";#", $("#doc-title-"+(filesInSubmission[i].docstack)).val() + " *** " + $("#doc-comment-"+(filesInSubmission[i].docstack)).val() + " *** " + $("#display-on-meetingflix-"+(filesInSubmission[i].docstack)).is(':checked'));
							try{ //if it hasnt been deleted prior to uploading....
								uploadDocuments($(this).attr("ows_FileLeafRef"), filesInSubmission[i], uploadLocations[$("#privacy-"+(filesInSubmission[i].docstack)).val()].address, $(this).attr("ows_Submission_x0020_Timestamp_x0020_ID"), $(this).attr("ows_ID") + ";#", $("#doc-title-"+(filesInSubmission[i].docstack)).val(), $("#doc-comment-"+(filesInSubmission[i].docstack)).val(), $("#display-on-meetingflix-"+(filesInSubmission[i].docstack)).is(':checked'), filesInSubmission[i].decisionitem, filesInSubmission[i].order);
							}catch(e){console.log(e);}
						}
					}
					else{
						closeSubmission();
						$("#dialog-saved").dialog("open");
						$("#modalProtection").show();
					}
				});
			}
		});
	}
	//New Save
	else{
		$().SPServices({
			operation: "UpdateListItems",
			async: false,
			batchCmd: "New",
			listName: "Agenda Submission Documents",
			valuepairs:	[
							["Title", titleOfSubmission.replace(/[&\/\\#,+()$~%"`:;*?<>{}|^!@$']/g,'')],
							["Time_x0020_In_x0020_Minutes", minsForSubmission],
							["Presenter", presenterOfSubmission],
							["External_x0020_Identifier", (externalIdentifier && externalIdentifier!="" ? externalIdentifier : "")],
							["BaseName", titleOfSubmission.replace(/[&\/\\#,+()$~%"`:;*?<>{}|^!@$']/g,'')],
							["Submission_x0020_Title", titleOfSubmission.replace(/[&\/\\#,+()$~%"`:;*?<>{}|^!@$']/g,'')],
							["ContentType", tileContentType.Name],
							["ContentTypeId", tileContentType.ID],
							["Agenda_x0020_Item_x0020_ID", relevanttab.actualID + ";#" + relevanttab.Title],
							["Agenda_x0020_Item_x0020_Timestamp_x0020_ID", relevanttab.timestampID],
							["Submission_x0020_Timestamp_x0020_ID", submissionid.getTime()],
							["Submission_x0020_Order", meetingTabs[relevanttab.uiID-1].arrayOfSubmissions.length + 1],
							["Submission_x0020_Picture", imgpath+","],
							["Submission_x0020_Type", typeOfSubmission],
							["Submission_x0020_Category", categoryOfSubmission],
							["Document_x0020_Collection_x0020_Status", documentstatusOfSubmission],
							["Lead_x0020_Ministry", stringOfLeadMinistries],
							["Affected_x0020_Ministries", stringOfAffectedMinistries],
							["Conflicting_x0020_Ministers1", stringOfConflictingMinisters],
							["InCamera_x0020_Exclusions", stringOfInCameraExclusions],
							["Submission_x0020_Picture", imgpath+","],
							["Submission_x0020_Description", STSHtmlEncode(tinymce.get('submissionDescription'+submissionIdentifier).getContent())],
							["Submission_x0020_Brief_x0020_Description", briefDescriptionOfSubmission],
							["Withdrawn", (visibility?'0':'1')],
							["Submission_x0020_Attendees", attendeesOfSubmission]
						],
			completefunc: function(xData, Status) {
				console.log(xData);
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					console.log($(this));
					addNewSubmissionTile(relevanttab.uiID-1, $(this));	//-1 for index value					
					//upload docs if applicable
					if (filesInSubmission.length > 0){
						for (var i=0; i < filesInSubmission.length; i++){
							try{ //if it hasnt been deleted prior to uploading....
								uploadDocuments($(this).attr("ows_FileLeafRef"), filesInSubmission[i], uploadLocations[$("#privacy-"+(filesInSubmission[i].docstack)).val()].address, $(this).attr("ows_Submission_x0020_Timestamp_x0020_ID"), $(this).attr("ows_ID") + ";#", $("#doc-title-"+(filesInSubmission[i].docstack)).val(), $("#doc-comment-"+(filesInSubmission[i].docstack)).val(), $("#display-on-meetingflix-"+(filesInSubmission[i].docstack)).is(':checked'), filesInSubmission[i].decisionitem, filesInSubmission[i].order);
							}catch(e){console.log(e);}
						}
					}
					else{
						closeSubmission();
						$("#dialog-saved").dialog("open");
						$("#modalProtection").show();
					}
				});
			}
		});
	}
}	
/*	Function: 		closeSubmission()
	Description: 	Closes the submission popup (data is lost if not saved at this call)		*/
function closeSubmission(){
	//Kill TinyMCE Instances so that they can be reused later
	tinymce.remove(".submissionDescription");
	submissionImageSelected = "default.jpg";
	$("body").removeClass("modalopen");
	$("#popupSubmission").hide();
	$("#modalProtection").hide();
	docstack = 0;
	$("#submission-tile-edit-"+tileToFocusOn).focus();
	documentArray = [];
}
/*	Function: 		closePreview()
	Description: 	Called after the Preview Panel is closed to get back focus		*/
function closePreview(){
	$("#submission-tile-preview-"+tileToFocusOn).focus();
}
/*	Function: 		submissionClosed(x)
	Description: 	Called once the Submission Dialogue box is closed			*/
function submissionClosed(x){
	$("#dialog").dialog("open");
	$("#modalProtection").hide();
}
/*	Function: 		addNewAgendaItem(x)
	Description: 	Adds a new tab to the list of tabs. If x is not null, it is built to the specs of the existing agenda item. 			*/
function addNewAgendaItem(x){
	var uniqueid;
	
	agendaItemsUniqueIdentifier++;

	uniqueid = agendaItemsUniqueIdentifier;
	
	$("#agenda-items-list").append(
			'<li class="ui-state-default ' + (x && x.attr("ows_Non_x002d_Agenda_x0020_Items") == "1" ? 'non-agenda-items' : '') + '" id="item'+ agendaItemsUniqueIdentifier +'">\
				<div class="text-input" style="text-align:left;">\
					<div id="tab-save-' + agendaItemsUniqueIdentifier + '" class="agendaitem-tab ' + (x && x.attr("ows_Non_x002d_Agenda_x0020_Items") == "1" ? 'nonagendaitem-tab' : '') + '" style="">\
						<h2 id="tab-bar-title-'+agendaItemsUniqueIdentifier+'" class="tab-bar-title" style="font-size: 1em;">'+(x ? x.attr("ows_Title") : "")+'</h2>\
						<a href="javascript:void(0)" title="Move Band Up" id="movetabup'+agendaItemsUniqueIdentifier+'" class="movetabup"></a>\
						<a href="javascript:void(0)" title="Move Band Down" id="movetabdown'+agendaItemsUniqueIdentifier+'" class="movetabdown"></a>\
						' + (!x || x.attr("ows_Non_x002d_Agenda_x0020_Items") == "0" ? '<a href="javascript:void(0)" title="Delete this Band" id="agenda-item-delete-'+agendaItemsUniqueIdentifier+'" class="deleteAgendaItem">X</a>' : '') + '\
					</div>\
					<label for="formAgendaName'+agendaItemsUniqueIdentifier+'" class="offscreen">Name<abbr class="required-asterisk" title="Required">*</abbr></label><input class="formAgendaName" data-mini="true" type="text" placeholder="Tab Name" name="formAgendaName'+agendaItemsUniqueIdentifier+'" id="formAgendaName'+agendaItemsUniqueIdentifier+'" value="' + (x ? x.attr("ows_Title") : "") + '" maxlength="60" />\
					<div class="agenda-item-left">\
						<label for="formAgendaDescription'+agendaItemsUniqueIdentifier+'" class="offscreen">Description<abbr class="required-asterisk" title="Required">*</abbr></label>\
						<div style="margin-top:-10px">\
							<textarea class="formAgendaDescription" data-autogrow="false" data-mini="true" cols="40" rows="1" placeholder="Tab Description" name="formAgendaDescription'+agendaItemsUniqueIdentifier+'" id="formAgendaDescription'+agendaItemsUniqueIdentifier+'" class="ui-input-text ui-body-c ui-corner-all ui-shadow-inset">'+(x && x.attr("ows_Item_x0020_Description") && x.attr("ows_Item_x0020_Description") != "<p>undefined</p>" ? x.attr("ows_Item_x0020_Description") : "" )+'</textarea>\
						</div>\
					</div>\
					<div class="agenda-item-right">\
						<div id="submission-list-container-'+agendaItemsUniqueIdentifier+'">\
							<ul id="submissions-list-' + agendaItemsUniqueIdentifier + '" class="submissions-list">\
							</ul>\
							<a href="javsacript:void(0)" id="create-new-submission-for-'+agendaItemsUniqueIdentifier+'" class="newsubmission">\
								<span class="newItem">+</span>\
								<span class="newItem-subtitle">Create a New Tile</span>\
							</a>\
						</div>\
						<div class="agenda-item-submissions-notification" id="agenda-item-submissions-notification-'+agendaItemsUniqueIdentifier+'" style="display:none"></div>\
					</div>\
					<a href="javascript:void(0)" id="agenda-item-update-button-'+agendaItemsUniqueIdentifier+'" class="agenda-item-save-update-button ui-link ui-btn ui-icon-check ui-btn-icon-left ui-shadow ui-corner-all ui-mini" data-role="button" data-icon="check" data-mini="true" role="none" style="display:none;margin-top:1em">Save Changes</a>\
				</div>\
			</li>');
	
	//New Tab specific settings
	if (!x){
		//make unmovable
		$("#item"+agendaItemsUniqueIdentifier).addClass("pin");
		$("#movetabup"+agendaItemsUniqueIdentifier).hide();
		$("#movetabdown"+agendaItemsUniqueIdentifier).hide();
		
		//title
		$("#tab-bar-title-"+agendaItemsUniqueIdentifier).html("Save This Band to Create a Corresponding Submission");
		$("#agenda-item-save-text-"+agendaItemsUniqueIdentifier).css("display", "none");
		$("#agenda-item-submissions-notification-"+agendaItemsUniqueIdentifier).css("display", "block");
		$("#agenda-item-submissions-notification-"+agendaItemsUniqueIdentifier).addClass("agenda-item-submissions-notification");
		$('#create-new-submission-for-'+agendaItemsUniqueIdentifier).attr("href","javascript:void(0)");
	}
	//Existing Tab specific settings
	else{
		$("#tab-bar-title-"+agendaItemsUniqueIdentifier).html(parseInt(x.attr("ows_Presentation_x0020_Order")).toFixed(0) + ". " + x.attr("ows_Title"));
		$( "#submissions-list-" + agendaItemsUniqueIdentifier ).sortable({
			scroll: false,
			connectWith: ".submissions-list",
			cursor: 'move',
			helper: 'clone',
			appendTo: 'body',
			zIndex: 10000,
			start: function(event, ui){
				sortableStorage = ui.item.index();
				sortableList = $(this).attr('id');
			},
			update: function(event, ui){
				//called when a change has been made
				if (sortableList != $(this).attr('id')){
					try{
						initializeTileMoveAndReorder(parseInt(ui.item.attr('id').substr(16)), {"list": sortableList, "index": sortableStorage}, {"list": $(this).attr('id'), "index": ui.item.index()});
					}catch(e){}
				}
				else{
					try{
						initializeTileReorder(parseInt(ui.item.attr('id').substr(16)), sortableStorage, ui.item.index());
					}catch(e){}
				}
			},
		});
	}
	
	//make description a tinyMCE
	tinymce.init({
		selector: "#formAgendaDescription"+uniqueid,
		plugins: [
		"advlist autolink lists link image charmap print preview anchor",
		"searchreplace visualblocks code fullscreen",
		"insertdatetime media paste table"
		],
		content_css: "BinderBuilderAssets/css/tinymcestyles.css",
		toolbar: "undo redo | bold italic underline | link",
		menubar: false,
		statusbar: false,
		remove_script_host : false,
		convert_urls : false,
		height:"170",
		setup : function(editor) {
			editor.on('change', function(e) {
				newChanges(uniqueid);
			});
		}
	});
	
	tinymce.execCommand('mceAddControl', false, 'formAgendaDescription'+uniqueid);
	
	prepareJQMStylesForDynamicContent("agenda-items-list");
	
	//Build Listeners for field changes, save & delete
	buildListenersForThisAgendaItem(agendaItemsUniqueIdentifier);

	//Push into meetingTabs
	meetingTabs.push({
						"uiID": agendaItemsUniqueIdentifier,
						"actualID": (x ? parseInt(x.attr("ows_ID")) : 0),
						"timestampID": (x ? x.attr("ows_Agenda_x0020_Item_x0020_Timestam") : ""),
						"order": (x ? parseInt(x.attr("ows_Presentation_x0020_Order")) : meetingTabs.length+1),
						"Title": (x ? x.attr("ows_Title") : ""),
						"arrayOfSubmissions":[]
					});
}
/*	Function: 		buildListenersForThisAgendaItem(agendaItemsUniqueIdentifier)
	Description: 	Builds new listeners for this agenda item's	fields	*/
function buildListenersForThisAgendaItem(agendaItemsUniqueIdentifier){
	$(document.body).on('change','#formAgendaName'+agendaItemsUniqueIdentifier,function(){
		newChanges(agendaItemsUniqueIdentifier);
	});
	//changes to agendadescription now in tinymce function
	// Create Save Listener
	$(document.body).on('click','#agenda-item-update-button-'+agendaItemsUniqueIdentifier,function(){
		saveAgendaItem(agendaItemsUniqueIdentifier);
	});
	// Create Delete Listener
	$(document.body).on('click','#agenda-item-delete-'+agendaItemsUniqueIdentifier,function(){
		deleteThisBand(agendaItemsUniqueIdentifier);
		$("#tabs-form-box").focus();
	});
	//Create A New Submission Listener
	$(document.body).on('click','#create-new-submission-for-'+agendaItemsUniqueIdentifier,function(){
		editSubmission(agendaItemsUniqueIdentifier, 0);
	});
	//Close Submission Listener
	$(document.body).on('click','#closeSubmission',function(){
		closeSubmission();
	});
	//Move up Listener
	$(document.body).on('click','#movetabup'+agendaItemsUniqueIdentifier,function(){
		var curpos = parseInt($("#item"+agendaItemsUniqueIdentifier).index());
		
		if (curpos != 0){
			$("#item"+agendaItemsUniqueIdentifier).insertBefore("#agenda-items-list>li:nth-child(" + (curpos) + ")");
			tinymce.remove("#formAgendaDescription"+agendaItemsUniqueIdentifier);
			initializeBandReorder(agendaItemsUniqueIdentifier, curpos, (curpos-1));
			tinymce.init({
				selector: "#formAgendaDescription"+agendaItemsUniqueIdentifier,
				plugins: [
				"advlist autolink lists link image charmap print preview anchor",
				"searchreplace visualblocks code fullscreen",
				"insertdatetime media paste table"
				],
				content_css: "BinderBuilderAssets/css/tinymcestyles.css",
				toolbar: "undo redo | bold italic underline | link",
				menubar: false,
				statusbar: false,
				remove_script_host : false,
				convert_urls : false,
				height:"170",
				setup : function(editor) {
					editor.on('change', function(e) {
						newChanges(agendaItemsUniqueIdentifier);
					});
				}
			});
		}
		
		$("#movetabup"+agendaItemsUniqueIdentifier).focus();
	});
	//Move down Listener
	$(document.body).on('click','#movetabdown'+agendaItemsUniqueIdentifier,function(){
		var curpos = parseInt($("#item"+agendaItemsUniqueIdentifier).index());
		//check fi the next one down has an actualID
		
		if (!(curpos == (($("#agenda-items-list").children().length)-1))){
			var idOfTab = "#" + $("#agenda-items-list").children("li").eq(curpos+1).attr("id");
			var relevanttab = $.grep(meetingTabs, function(e){ return e.uiID == parseInt($(idOfTab).attr("id").substr(4)); });
			relevanttab = relevanttab[0];
			if (relevanttab.actualID != null && relevanttab.actualID != 0){
				$("#item"+agendaItemsUniqueIdentifier).insertAfter("#agenda-items-list>li:nth-child(" + (curpos+2) + ")");
				tinymce.remove("#formAgendaDescription"+agendaItemsUniqueIdentifier);
				initializeBandReorder(agendaItemsUniqueIdentifier, curpos, (curpos+1));
				tinymce.init({
					selector: "#formAgendaDescription"+agendaItemsUniqueIdentifier,
					plugins: [
					"advlist autolink lists link image charmap print preview anchor",
					"searchreplace visualblocks code fullscreen",
					"insertdatetime media paste table"
					],
					content_css: "BinderBuilderAssets/css/tinymcestyles.css",
					toolbar: "undo redo | bold italic underline | link",
					menubar: false,
					statusbar: false,
					remove_script_host : false,
					convert_urls : false,
					height:"170",
					setup : function(editor) {
						editor.on('change', function(e) {
							newChanges(agendaItemsUniqueIdentifier);
						});
					}
				});
			}
		}
		
		$("#movetabdown"+agendaItemsUniqueIdentifier).focus();
	});
}
/*	Function: 		buildListenersForThisMeeting()
	Description: 	Builds new listeners for this meeting's	fields	*/	
function buildListenersForThisMeeting(){
	// Listeners for the Meeting Form
	$(document.body).on('change','#formSubject',function(){
		if (meetingAtHand){
			$("#meeting-update-button").show();
		}
	});
	$(document.body).on('change','#formLocation',function(){
		if (meetingAtHand){
			$("#meeting-update-button").show();
		}
	});
	$(document.body).on('change','#formDate',function(){
		if (meetingAtHand){
			$("#meeting-update-button").show();
		}
	});
	$(document.body).on('change','#formStartTime',function(){
		if (meetingAtHand){
			$("#meeting-update-button").show();
		}
	});
	$(document.body).on('change','#formEndTime',function(){
		if (meetingAtHand){
			$("#meeting-update-button").show();
		}
	});
	$(document.body).on('change','#formNotes',function(){
		if (meetingAtHand){
			$("#meeting-update-button").show();
		}
	});
	$( "#right-button" ).click(function() {
		sendToMeetingFlix();
	});
	$( "#meeting-update-button" ).click(function() {
		updateMeeting();
	});
	$( "#meeting-save-button" ).click(function() {
		saveMeeting();
	});
	$(document.body).on('click','#closeSendToCabFlix',function(){
		$("body").removeClass("modalopen");
		$("#popupSendToCabFlix").hide();
		$("#modalProtection").hide();
	});
}
/*	Function: 		deleteThisBand(x)
	Description: 	Deletes this tab both in the UI and on the Server		*/
function deleteThisBand(x){
	//find the item in the array
	var result = $.grep(meetingTabs, function(e){ return e.uiID == x; });
	result = result[0];
	
	if(confirm("Are you sure you want to delete this Band? Any containing submissions will also be deleted.")){
		//Has been previously saved to the server
		if(result.actualID != 0){
			for (var i = 0; i < result.arrayOfSubmissions.length; i++){
				deleteThisTile(result.uiID, result.arrayOfSubmissions[i].uiID, true);
			}
			$().SPServices({
				operation: "UpdateListItems",
				async: false,
				listName: 'Agenda Item',
				batchCmd: "Delete",
				ID: result.actualID,
				completefunc: function (xData, Status) {
					//fix the order
					initializeBandReorder(result.uiID, result.order, null);
					$('#item'+x).empty();				
					$('#item'+x).remove();
				}
			});
		}
		//Has not been saved to server (just remove the UI)
		$('#item'+x).empty();				
		$('#item'+x).remove();
		// remove from meetingtabs
		for (var j = 0; j < meetingTabs.length; j++){
			if (meetingTabs[j].uiID == x){
				meetingTabs.splice(j,1);
			}
		}
	}
}
/*	Function: 		deleteThisTile(tabIdentifier, submissionIdentifier, skipConfirm)
	Description: 	Deletes this tile both in the UI and on the Server		*/
function deleteThisTile(tabIdentifier, submissionIdentifier, skipConfirm){			
	//find the item in the array
	var relevanttab;
	var relevantsubmission;
	
	relevanttab = $.grep(meetingTabs, function(e){ return e.uiID == tabIdentifier; });
	relevanttab = relevanttab[0];
	relevantsubmission = $.grep(relevanttab.arrayOfSubmissions, function(e){ return e.uiID == submissionIdentifier; });
	relevantsubmission = relevantsubmission[0];
	
	if(skipConfirm || confirm("Are you sure you want to delete this Submission? Any containing documents will also be deleted.")){
		var batchCmd = "<Batch OnError='Continue'><Method ID='1' Cmd='Delete'><Field Name='ID'>" + relevantsubmission.actualID + "</Field><Field Name='FileRef'>/" + relevantsubmission.fileref.substr(relevantsubmission.fileref.indexOf('#')+1, relevantsubmission.fileref.length) + "</Field></Method></Batch>";
	
		console.log(batchCmd);
	
		$().SPServices({
			operation: "UpdateListItems",
			async: false,
			listName: 'Agenda Submission Documents',
			updates: batchCmd,
			completefunc: function (xData, Status) {
				//fix the order
				if (skipConfirm != true){	//if confirmation was skipped, is a band deletion. no need to reorder
					initializeTileReorder(relevantsubmission.uiID, relevantsubmission.order, null);
				}
				$('#submission-tile-'+submissionIdentifier).empty();				
				$('#submission-tile-'+submissionIdentifier).remove();			
				// remove from meetingtabs
				for (var j = 0; j < relevanttab.arrayOfSubmissions.length; j++){
					if (relevanttab.arrayOfSubmissions[j].uiID == submissionIdentifier){
						relevanttab.arrayOfSubmissions.splice(j,1);
					}
				}				
			}
		});
	}
}
/*	Function: 		getUsers()
	Description: 	Retrieves the list of Ministers from the Server, returned in a select markup. If x is not null, x is selected. 		*/
function getUsers(x){
	var users = "";
	
	//singleton method, checks to see if users has not already been retrieved
	if (usersArray.length == 0){
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Users",
			CAMLViewFields: "<ViewFields Properties='True' />",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					usersArray.push({"id":$(this).attr("ows_ID"), "adname":$(this).attr("ows_Title"), "name":$(this).attr("ows_Full_x0020_Name"), "position":$(this).attr("ows_Position")});
				});
			}
		});
	}
	
	for (var i = 0; i < usersArray.length; i++){
		if (x && x.indexOf(usersArray[i].id + ";#" + usersArray[i].adname) > -1){
			users = '<label><input data-mini="true" type="checkbox" name="option[]" value="' + usersArray[i].id + ";#" + usersArray[i].adname + '" checked />' + usersArray[i].name + '</label>' + users;
		}
		else{
			users += '<label><input data-mini="true" type="checkbox" name="option[]" value="' + usersArray[i].id + ";#" + usersArray[i].adname + '" />' + usersArray[i].name + '</label>';
		}
	}
	
	return users;
}
/*	Function: 		getUploadLocations()
	Description: 	Retrieves from the server all the possible locations a user can upload a document to (i.e. private folders). 		*/
function getUploadLocations(x){
	var uploadlocationsstring = "";
	
	//singleton method, checks to see if upload locations has not already been retrieved
	if (uploadLocations.length == 0){
		uploadLocations.push({
			"id":"0",
			"address":"Agenda Submission Documents",
			"name":"All Ministers/Ministries"
		});
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Private Submission Documents",
			CAMLViewFields: "<ViewFields Properties='True' />",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					uploadLocations.push({
						"id":$(this).attr("ows_ID"),
						"address":"Private Submission Documents/" + $(this).attr("ows_FileLeafRef").substr($(this).attr("ows_FileLeafRef").indexOf("#")+1),
						"name":$(this).attr("ows_FileLeafRef").substr($(this).attr("ows_FileLeafRef").indexOf("#")+1)
					});
				});
			}
		});
	}
	
	for (var i = 0; i < uploadLocations.length; i++){
		if (x && x == uploadLocations[i].name){
			uploadlocationsstring += '<option value="'+i+'" selected="selected">'+uploadLocations[i].name+'</option>';
		}
		else{
			uploadlocationsstring += '<option value="'+i+'">'+uploadLocations[i].name+'</option>';
		}
	}
	
	return uploadlocationsstring;
}
/*	Function: 		getCategories()
	Description: 	Retrieves the list of Submission Categories from the Server, returned in a select markup. If x is not null, x is selected.		*/
function getCategories(x, refresh){
	var categories = "";

	//singleton method, checks to see if categories has not already been retrieved
	if (categoriesArray.length == 0 || refresh){
		categoriesArray = [];
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Submission Category",
			CAMLViewFields: "<ViewFields Properties='True' />",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					categoriesArray.push({"id":$(this).attr("ows_ID"), "title":$(this).attr("ows_Title")});
				});
			}
		});
	}
	categories += '<option value="0">None</option>';
	for (var i = 0; i < categoriesArray.length; i++){
		if (x && x == categoriesArray[i].id + ";#" + categoriesArray[i].title){
			categories += '<option value="' + categoriesArray[i].id + '" selected="selected">' + categoriesArray[i].title + '</option>';
		}
		else{
			categories += '<option value="' + categoriesArray[i].id + '" >' + categoriesArray[i].title + '</option>';
		}
	}
	
	return categories;
}
/*	Function: 		getTypes()
	Description: 	Retrieves the list of Submission Types from the Server, returned in a select markup. If x is not null, x is selected.		*/
function getTypes(x, refresh){
	var types = "";

	//singleton method, checks to see if submission types has not already been retrieved
	if (typesArray.length == 0 || refresh){
		typesArray = [];
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Submission Type",
			CAMLViewFields: "<ViewFields Properties='True' />",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					typesArray.push({"id":$(this).attr("ows_ID"), "title":$(this).attr("ows_Title")});
				});
			}
		});
	}
	//types += '<option value="0">None</option>';
	for (var i = 0; i < typesArray.length; i++){
		if (x && x == typesArray[i].id + ";#" + typesArray[i].title){
			types += '<option value="' + typesArray[i].id + '" selected="selected">' + typesArray[i].title + '</option>';
		}
		else{
			types += '<option value="' + typesArray[i].id + '" >' + typesArray[i].title + '</option>';
		}
	}
	
	return types;
}
/*	Function: 		getDocumentCollectionStatuses()
	Description: 	Retrieves the list of document collection statuses from the Server, returned in a select markup. If x is not null, x is selected.		*/
function getDocumentCollectionStatuses(x, refresh){
	var statuses = "";

	//singleton method, checks to see if statuses has not already been retrieved
	if (documentcollectionstatusesArray.length == 0 || refresh){
		documentcollectionstatusesArray = [];
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Document Collection Status",
			CAMLViewFields: "<ViewFields Properties='True' />",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					documentcollectionstatusesArray.push({"id":$(this).attr("ows_ID"), "title":$(this).attr("ows_Title")});
				});
			}
		});
	}
	//statuses += '<option value="0">None</option>';
	for (var i = 0; i < documentcollectionstatusesArray.length; i++){
		if (x && x == documentcollectionstatusesArray[i].id + ";#" + documentcollectionstatusesArray[i].title){
			statuses += '<option value="' + documentcollectionstatusesArray[i].id + '" selected="selected">' + documentcollectionstatusesArray[i].title + '</option>';
		}
		else{
			statuses += '<option value="' + documentcollectionstatusesArray[i].id + '" >' + documentcollectionstatusesArray[i].title + '</option>';
		}
	}
	
	return statuses;
}
/*	Function: 		getTileImages()
	Description: 	Retrieves the tile images to pick from.		*/
function getTileImages(refresh){
	if (refresh == true || tileImages == ""){
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Submission Tiles",
			CAMLViewFields: "<ViewFields Properties='True' />",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					tileImages += "<a class='tile-img-anchor' href='javascript:void(0)'><img class='tile-picker-img' src='/"+ $(this).attr("ows_FileRef").substr($(this).attr("ows_FileRef").indexOf('#')+1, $(this).attr("ows_FileRef").length)+"' alt='"+$(this).attr("ows_Title")+"' /></a>";
				});
			}
		});
	}
	
	return tileImages;
}
/*	Function: 		getMinistries(x, y)
	Description: 	Retrieves the list of Ministries from the Server, returned in a select markup. If x is not null, x is selected. If y is true, return in multiselect format		*/
function getMinistries(x, y){
	var ministries = "";

	//singleton method, checks to see if ministries has not already been retrieved
	if (organizationsArray.length == 0){
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Ministry",
			CAMLViewFields: "<ViewFields Properties='True' />",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					organizationsArray.push({"id":$(this).attr("ows_ID"), "name":$(this).attr("ows_Title"), "abbreviation":$(this).attr("ows_Abbreviation")});
				});
			}
		});
	}
	
	if (y){
		for (var i = 0; i < organizationsArray.length; i++){
			if (x && x.indexOf(organizationsArray[i].id + ";#" + organizationsArray[i].name) > -1){
				ministries = '<label><input data-mini="true" type="checkbox" name="option[]" value="' + organizationsArray[i].id + '" checked />' + organizationsArray[i].name + '</label>' + ministries;
			}
			else{
				ministries += '<label><input data-mini="true" type="checkbox" name="option[]" value="' + organizationsArray[i].id + '" />' + organizationsArray[i].name + '</label>';
			}
		}
	}
	else {
		ministries += '<option value="0">None</option>';
		for (var i = 0; i < organizationsArray.length; i++){
			if (x && x == organizationsArray[i].id + ";#" + organizationsArray[i].name){
				ministries += '<option value="' + organizationsArray[i].id + '" selected="selected">' + organizationsArray[i].name + '</option>';
			}
			else{
				ministries += '<option value="' + organizationsArray[i].id + '" >' + organizationsArray[i].name + '</option>';
			}
		}
	}
	
	return ministries
}
/*	Function: 		getParameterByName(name)
	Description: 	Retrieves a URL Parameter based on the provided name (name) */
function getParameterByName(name) {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(location.search);
	return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
/*	Function: 		validateMeetingForm()
	Description: 	Validates the meeting form*/
function validateMeetingForm(){
	var missingData = false;
	var fieldAtHand = "";
	
	//validation
	fieldAtHand = $("#formSubject").val();
	if (fieldAtHand == ""){
		$("#formSubject").addClass("missingData");
		missingData = true;
	}
	else{
		$("#formSubject").removeClass("missingData");
	}
	fieldAtHand = $("#formLocation").val();
	if (fieldAtHand == ""){
		$("#formLocation").addClass("missingData");
		missingData = true;
	}
	else{
		$("#formLocation").removeClass("missingData");
	}
	fieldAtHand = $("#formDate").val();
	if (fieldAtHand == "" || !(fieldAtHand.match(/^[1-2]?[0-9]\/[1-3]?[0-9]\/[0-9]{4}$/))){
		//that really hurt my brain to write
		$("#formDate").parent().parent().addClass("missingData");
		missingData = true;
	}
	else{
		$("#formDate").parent().parent().removeClass("missingData");
	}
	fieldAtHand = $("#formStartTime").val();
	if (fieldAtHand == "" || !(fieldAtHand.match(/^[0-1][0-9]:[0-5][0-9] [AP]M$/))){
		$("#formStartTime").parent().parent().addClass("missingData");
		missingData = true;
	}
	else{
		$("#formStartTime").parent().parent().removeClass("missingData");
	}
	fieldAtHand = $("#formEndTime").val();
	if (fieldAtHand == "" || !(fieldAtHand.match(/^[0-1][0-9]:[0-5][0-9] [AP]M$/))){
		$("#formEndTime").parent().parent().addClass("missingData");
		missingData = true;
	}
	else{
		$("#formEndTime").parent().parent().removeClass("missingData");
	}
	
	return missingData;
}
/*	Function: 		updateMeeting()
	Description: 	Saves the updated meeting data back to the server */
function updateMeeting(){
	var missingdata = validateMeetingForm();

	if (!missingdata){
		var stime = $("#formStartTime").val();
		var etime = $("#formEndTime").val();
		var startTime = new Date($("#formDate").val());
		var endTime = new Date($("#formDate").val());
		var meetingid = new Date();	//epoch time used for meetingid so that connections persist and will remain unique even if system moves/achieves happen and so on.
		
		startTime = setThisDateObjectsTimeToThisTime(startTime, stime);
		endTime = setThisDateObjectsTimeToThisTime(endTime, etime);
	
		$().SPServices({
			operation: "UpdateListItems",
			async: false,
			batchCmd: "Update",
			listName: "Cabinet Meeting",
			valuepairs: [["Title", $("#formSubject").val()],
						 ["Meeting_x0020_Date", new Date($("#formDate").val()).dateToISO8601String()],
						 ["Location", $("#formLocation").val()],
						 ["Notes", $("#formNotes").val()],
						 ["Meeting_x0020_Memo", STSHtmlEncode(tinymce.get('submissionMemo').getContent())],
						 ["Meeting_x0020_Start_x0020_Time", startTime.dateToISO8601String()],
						 ["Meeting_x0020_End_x0020_Time", endTime.dateToISO8601String()]],
			ID: urlid,
			completefunc: function(xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					meetingAtHand = $(this);
					$("#meeting-update-button").hide();
					$("#dialog-saved").dialog("open");
					$("#modalProtection").show();
				});
			}
		});
	}
}
/*	Function: 		saveMeeting()
	Description: 	Saves this new meeting data back to the server, reloads the page based on the returned id */
function saveMeeting(){
	var missingdata = validateMeetingForm();

	if (missingdata == false){
		var stime = $("#formStartTime").val();
		var etime = $("#formEndTime").val();
		var startTime = new Date($("#formDate").val());
		var endTime = new Date($("#formDate").val());
		var meetingid = new Date();	//epoch time used for meetingid so that connections persist and will remain unique even if system moves/achieves happen and so on.
		
		startTime = setThisDateObjectsTimeToThisTime(startTime, stime);
		endTime = setThisDateObjectsTimeToThisTime(endTime, etime);
	
		$().SPServices({
			operation: "UpdateListItems",
			async: false,
			batchCmd: "New",
			listName: "Cabinet Meeting",
			valuepairs: [["Title", $("#formSubject").val()],
						 ["Meeting_x0020_Status", "New"],
						 ["Meeting_x0020_Date", new Date($("#formDate").val()).dateToISO8601String()],
						 ["Location", $("#formLocation").val()],
						 ["Notes", $("#formNotes").val()],
						 ["SentToMeetingFlix", 0],
						 ["Meeting_x0020_Memo", STSHtmlEncode(tinymce.get('submissionMemo').getContent())],
						 ["Meeting_x0020_Start_x0020_Time", startTime.dateToISO8601String()],
						 ["Meeting_x0020_End_x0020_Time", endTime.dateToISO8601String()],
						 ["Meeting_x0020_Timestamp_x0020_ID", meetingid.getTime()]],
			completefunc: function(xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					meetingAtHand = $(this);
					
					var agendaitemid = new Date();
					
					//Make a non-agenda items band
					$().SPServices({
						operation: "UpdateListItems",
						async: false,
						batchCmd: "New",
						listName: "Agenda Item",
						valuepairs: [["Title", "Non-Agenda Items"],
									 ["Item_x0020_Description", "Items that are not part of the agenda can be found here."],
									 ["Presentation_x0020_Order", 1],
									 ["Meeting", meetingAtHand.attr("ows_ID")+";#"+meetingAtHand.attr("ows_Title")],
									 ["Meeting_x0020_Timestamp_x0020_ID", meetingAtHand.attr("ows_Meeting_x0020_Timestamp_x0020_ID")],
									 ["Agenda_x0020_Item_x0020_Timestam", agendaitemid.getTime()],
									 ["Non_x002d_Agenda_x0020_Items", 1]],
						completefunc: function(xData, Status) {
							$(xData.responseXML).SPFilterNode("z:row").each(function() {
								//blank one
								addNewAgendaItem($(this));
								addNewAgendaItem(null);
							});
						}
					});
					
					$("#newly-created-meeting").show();
					$("#meeting-save-button").hide();
					$("#dialog-saved-new-meeting").dialog("open");
					$("#modalProtection").show();
					$("#page-intro").html("Continue creating this Binder by entering Tab information and corresponding submissions. Remember to save any changes you make before leaving this page.");
					$("#tabs-form-box").show();
					document.title = meetingAtHand.attr("ows_Title") + " | BinderBuilder";
					$("#meeting-name").html(meetingAtHand.attr("ows_Title"));
					$("#meeting-identifier").html(meetingAtHand.attr("ows_Meeting_x0020_Status"));
				});
			}
		});
	}
}
/*	Function: 		newChanges(x)
	Description: 	If a field has changed in tab x, update tab to indicate as much */
function newChanges(x){
	$("#agenda-item-update-button-"+x).css("display", "block");
	$("#agenda-item-save-text-"+x).css("display", "none");
}
/*	Function: 		validateAgendaItemForm(x)
	Description: 	Validates the agenda item form*/
function validateAgendaItemForm(x){
	var missingData = false;
	
	//validation
	if ($("#formAgendaName"+x).val() == ""){
		$("#formAgendaName"+x).addClass("missingData");
		missingData = true;
	}
	else{
		$("#formAgendaName"+x).removeClass("missingData");
	}
	if (tinymce.get('formAgendaDescription'+x).getContent() == ""){
		$("#formAgendaDescription"+x).addClass("missingData");
		missingData = true;
	}
	else{
		$("#formAgendaDescription"+x).removeClass("missingData");
	}
	
	return missingData;
}
/*	Function: 		saveAgendaItem(x)
	Description: 	Saves/Updates the agenda item at x */
function saveAgendaItem(x, force){
	var missingData = validateAgendaItemForm(x);

	if (!missingData || force != null){
		//find the item in the array
		var result = $.grep(meetingTabs, function(e){ return e.uiID == x; });
		var actualID = result[0].actualID;
		var agendaitemid = new Date();	//epoch time used for agendaitem so that connections persist and will remain unique even if system moves/achieves happen and so on.
		
		if (actualID != ""){
			//update
			$().SPServices({
				operation: "UpdateListItems",
				async: false,
				batchCmd: "Update",
				listName: "Agenda Item",
				valuepairs: [["Title", $("#formAgendaName"+x).val()],
							 ["Item_x0020_Description", STSHtmlEncode(tinymce.get('formAgendaDescription'+x).getContent())]],
				ID: actualID,
				completefunc: function(xData, Status) {
					$(xData.responseXML).SPFilterNode("z:row").each(function() {
						$("#agenda-item-update-button-"+x).css("display", "none");
						$("#agenda-item-save-text-"+x).css("display", "inline");
						$("#dialog-saved").dialog("open");
						$("#modalProtection").show();
						$("#tab-bar-title-"+x).html(parseInt($(this).attr("ows_Presentation_x0020_Order")).toFixed(0) + ". " + $(this).attr("ows_Title"));
						for (var i = 0; i < meetingTabs.length; i++) {
							if (meetingTabs[i].uiID === x) {
								meetingTabs[i].Title = $(this).attr("ows_Title");
								break;
							}
						}
					});
				}
			});
		}
		else {
			//save
			$().SPServices({
				operation: "UpdateListItems",
				async: false,
				batchCmd: "New",
				listName: "Agenda Item",
				valuepairs: [["Title", $("#formAgendaName"+x).val()],
							 ["Item_x0020_Description", STSHtmlEncode(tinymce.get('formAgendaDescription'+x).getContent())],
							 ["Presentation_x0020_Order", parseInt($("#agenda-items-list>li").length)],
							 ["Meeting", meetingAtHand.attr("ows_ID")+";#"+meetingAtHand.attr("ows_Title")],
							 ["Meeting_x0020_Timestamp_x0020_ID", meetingAtHand.attr("ows_Meeting_x0020_Timestamp_x0020_ID")],
							 ["Agenda_x0020_Item_x0020_Timestam", agendaitemid.getTime()]],
				completefunc: function(xData, Status) {
					$(xData.responseXML).SPFilterNode("z:row").each(function() {
						//make movable
						$("#item"+x).removeClass("pin");
						$("#movetabup"+x).show();
						$("#movetabdown"+x).show();
						
						$("#agenda-item-save-text-"+x).css("display", "inline");
						$("#dialog-saved").dialog("open");
						$("#modalProtection").show();
						$("#agenda-item-submissions-notification-"+x).removeClass("agenda-item-submissions-notification");
						$("#agenda-item-submissions-notification-"+x).css("display", "none");
						$("#tab-bar-title-"+x).html(parseInt($(this).attr("ows_Presentation_x0020_Order")).toFixed(0) + ". " + $(this).attr("ows_Title"));
						$( "#submissions-list-" + x ).sortable({
							connectWith: ".submissions-list",
							cursor: 'move',
							helper: 'clone',
							appendTo: 'body',
							zIndex: 10000
						});
						for (var i = 0; i < meetingTabs.length; i++) {
							if (meetingTabs[i].uiID === x) {
								meetingTabs[i].actualID = parseInt($(this).attr("ows_ID"));
								meetingTabs[i].Title = $(this).attr("ows_Title");
								meetingTabs[i].timestampID = $(this).attr("ows_Agenda_x0020_Item_x0020_Timestam");
								break;
							}
						}
						$("#agenda-item-update-button-"+x).hide();
					});
				}
			});
		}
	}
}
/*	Function: 		addNewSubmissionTile(indexOfMeetingTabArray, submissionRawData)
	Description: 	Adds Submission to Array, Builds Tile/Corresponding Listeners */
function addNewSubmissionTile(indexOfMeetingTabArray, submissionRawData){
	var submissionObject;
	var tileString = "";
	
	submissionsUniqueIdentifier++;
	
	//create visual tile
	tileString = '<li id="submission-tile-' + submissionsUniqueIdentifier + '" class="submission">\
					<a href="javascript:void(0)" id="submission-tile-front-' + submissionsUniqueIdentifier + '" class="tile-front">\
						<div id="submission-tile-title-' + submissionsUniqueIdentifier + '" class="title submission-front-tile">' + submissionRawData.attr("ows_Title") + '</div>\
						<div id="submission-tile-minutes-' + submissionsUniqueIdentifier + '" class="submission-minutes">' +
							(submissionRawData.attr("ows_External_x0020_Identifier") && submissionRawData.attr("ows_External_x0020_Identifier") != "" ? 'ID: ' + submissionRawData.attr("ows_External_x0020_Identifier") + '<br/>' : '') + '<em>' + parseInt(submissionRawData.attr("ows_Time_x0020_In_x0020_Minutes")).toFixed(0) + ' Minutes</em>'+
						'</div>\
					</a>\
					<div id="submission-tile-back-' + submissionsUniqueIdentifier + '" class="tile-back">\
						<a href="javascript:void(0)" id="submission-tile-preview-' + submissionsUniqueIdentifier + '" class="submission-preview">Preview</a>\
						<a href="javascript:void(0)" id="submission-tile-edit-' + submissionsUniqueIdentifier + '" class="submission-edit">Edit</a>\
						<a href="javascript:void(0)" id="submission-tile-delete-' + submissionsUniqueIdentifier + '" class="submission-delete">Delete</a>\
						<a href="javascript:void(0)" id="submission-tile-goto-front-' + submissionsUniqueIdentifier + '" class="submission-goto-front">Hide Menu</a>\
						<a href="javascript:void(0)" id="submission-up-' + submissionsUniqueIdentifier + '" class="submission-up">Up</a>\
						<a href="javascript:void(0)" id="submission-left-' + submissionsUniqueIdentifier + '" class="submission-left">Left</a>\
						<a href="javascript:void(0)" id="submission-right-' + submissionsUniqueIdentifier + '" class="submission-right">Right</a>\
						<a href="javascript:void(0)" id="submission-down-' + submissionsUniqueIdentifier + '" class="submission-down">Down</a>\
					</div>\
				  </li>';
	$("#submissions-list-"+meetingTabs[indexOfMeetingTabArray].uiID).append(tileString);
	try{
		$("#submission-tile-" + submissionsUniqueIdentifier).css('background', 'url("'+ submissionRawData.attr("ows_Submission_x0020_Picture").substr(0,submissionRawData.attr("ows_Submission_x0020_Picture").indexOf(",")) + '") white');
	}catch(e){}
	
	//Refresh drag and drop
	prepareJQMStylesForDynamicContent("submissions-list-"+meetingTabs[indexOfMeetingTabArray].uiID);
	
	// Create View, Preview and Delete Listeners. This is done in an anonymous function to preserve the data of the unique identifiers
	(function(){
		var x = meetingTabs[indexOfMeetingTabArray].uiID;
		var y = submissionsUniqueIdentifier;
		$(document.body).on('click','#submission-tile-edit-' + y,function(){
			editSubmission(x, y);
			tileToFocusOn = y;
		});
		$(document.body).on('click','#submission-tile-preview-' + y,function(){
			viewSubmissionInPanel(x, y);
			tileToFocusOn = y;
		});
		$(document.body).on('click','#submission-tile-delete-' + y,function(){
			deleteThisTile(x, y);
			$("#formAgendaName"+x).focus();
		});
		$(document.body).on('click','#submission-tile-front-' + y,function(){
			$('#submission-tile-front-' + y).hide();
			$('#submission-tile-back-' + y).show();
			$("#submission-tile-preview-" + y).focus();
		});
		$(document.body).on('click','#submission-tile-goto-front-' + y,function(){
			$('#submission-tile-front-' + y).show();
			$('#submission-tile-back-' + y).hide();
			$("#submission-tile-front-" + y).focus();
		});
		$(document.body).on('click','#submission-up-' + y,function(){
			var curpos = parseInt($("#submission-tile-"+y).index());
			var listid = $("#submission-tile-"+y).parent().attr("id");
			var oldBand = $("#"+listid).parents("li");
			
			var oldLocation = {
				"list":listid,
				"index":curpos
			};
			var newLocation = {
				"list":null,
				"index":null
			};
		
			if (oldBand.index() != 0){
				//can move up
				newLocation.list = "submissions-list-" + $("#agenda-items-list>li:nth-child(" + ((oldBand.index()-1)+1) + ")").attr("id").substring(4);
				
				if ($("#"+newLocation.list+">li").length >= (curpos+1)){
					newLocation.index = curpos;
				}
				else{
					newLocation.index = $("#"+newLocation.list+">li").length;
				}				
				//fix ui
				if (newLocation.index == 0){
					$("#submission-tile-"+y).insertBefore("#"+newLocation.list+">li:nth-child(1)");
				}
				else {
					$("#submission-tile-"+y).insertAfter("#"+newLocation.list+">li:nth-child(" + (newLocation.index) + ")");
				}
				
				//save to server
				initializeTileMoveAndReorder(y, oldLocation, newLocation);
			}
			
			$("#submission-up-" + y).focus();
		});
		$(document.body).on('click','#submission-left-' + y,function(){
			var curpos = parseInt($("#submission-tile-"+y).index());
			var listid = $("#submission-tile-"+y).parent().attr("id").substring(17);
		
			if (curpos != 0){
				$("#submission-tile-"+y).insertBefore("#submissions-list-"+listid+">li:nth-child(" + (curpos) + ")");
				initializeTileReorder(y, curpos, (curpos-1));
			}
			
			$("#submission-left-" + y).focus();
		});
		$(document.body).on('click','#submission-right-' + y,function(){
			var curpos = parseInt($("#submission-tile-"+y).index());
			var listid = $("#submission-tile-"+y).parent().attr("id").substring(17);		
			
			if (!(curpos == (($("#submissions-list-"+listid).children().length)-1))){
				$("#submission-tile-"+y).insertAfter("#submissions-list-"+listid+">li:nth-child(" + (curpos+2) + ")");
				initializeTileReorder(agendaItemsUniqueIdentifier, curpos, (curpos+1));
			}
			$("#submission-right-" + y).focus();
		});
		$(document.body).on('click','#submission-down-' + y,function(){
			var curpos = parseInt($("#submission-tile-"+y).index());
			var listid = $("#submission-tile-"+y).parent().attr("id");
			var oldBand = $("#"+listid).parents("li");
			
			var oldLocation = {
				"list":listid,
				"index":curpos
			};
			var newLocation = {
				"list":null,
				"index":null
			};
		
			if (oldBand.index() != parseInt($("#agenda-items-list>li").length)-1){
				//MAKE SURE THE NEXT ONE DOWN HAS BEEN INITIALIZED
				var relevanttab = $.grep(meetingTabs, function(e){ return e.uiID == $("#agenda-items-list>li:nth-child(" + ((oldBand.index()+1)+1) + ")").attr("id").substring(4); });
				console.log(relevanttab);
				if (relevanttab[0] != null && relevanttab[0].actualID != 0){
					//can move down
					newLocation.list = "submissions-list-" + $("#agenda-items-list>li:nth-child(" + ((oldBand.index()+1)+1) + ")").attr("id").substring(4);
					
					if ($("#"+newLocation.list+">li").length >= (curpos+1)){
						newLocation.index = curpos;
					}
					else{
						newLocation.index = $("#"+newLocation.list+">li").length;
					}
					//fix ui
					if (newLocation.index == 0){
						$("#submission-tile-"+y).insertBefore("#"+newLocation.list+">li:nth-child(1)");
					}
					else {
						$("#submission-tile-"+y).insertAfter("#"+newLocation.list+">li:nth-child(" + (newLocation.index) + ")");
					}
					//save to server
					initializeTileMoveAndReorder(y, oldLocation, newLocation);
				}else { console.log("hell no"); }
			}
			
			$("#submission-down-" + y).focus();
		});
	})();
	
	submissionObject = 	{
							"Title": submissionRawData.attr("ows_Title"),
							"uiID": submissionsUniqueIdentifier,
							"actualID": parseInt(submissionRawData.attr("ows_ID")),
							"order": parseInt(submissionRawData.attr("ows_Submission_x0020_Order")),
							"fileref": submissionRawData.attr("ows_FileRef"),
							"object": submissionRawData
						};
	
	meetingTabs[indexOfMeetingTabArray].arrayOfSubmissions.push(submissionObject);
}
/*	Function: 		window.onbeforeunload
	Description: 	When trying to leave the window, prompt user to ensure everything is saved */
window.onbeforeunload = function(){ 
	//return 'By leaving this page, any unsaved changes will be lost.'; 
}
/*	Function: 		getPhotoGalleryImages(refresh)
	Description: 	Retrieves the list of photos in the gallery relevant to this meeting from the Server, returned in a JSON markup. If refresh is true, the server is checked again	*/
function getPhotoGalleryImages(refresh){

	//singleton method, checks to see if ministers has not already been retrieved
	if (arrayOfGalleryImages.length == 0 || refresh){
		arrayOfGalleryImages = [];
	
		$().SPServices({
			operation: "GetListItems",
			async: false,
			listName: "Picture Gallery",
			CAMLViewFields: "<ViewFields Properties='True' />",
			completefunc: function (xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					arrayOfGalleryImages.push(
						{
							"title":$(this).attr("ows_Title"),
							"value":"/"+ $(this).attr("ows_FileRef").substr($(this).attr("ows_FileRef").indexOf('#')+1, $(this).attr("ows_FileRef").length)
						}
					);
				});
			}
		});
	}
	
	return arrayOfGalleryImages;
}
/*	Function: 		multiselect
	Description: 	Builds the customized multiselect cause the HTML one sucks	*/
jQuery.fn.multiselect = function() {
    $(this).each(function() {
        var checkboxes = $(this).find("input:checkbox");
        checkboxes.each(function() {
            var checkbox = $(this);
            // Highlight pre-selected checkboxes
            if (checkbox.prop("checked"))
                checkbox.parent().addClass("multiselect-on");
 
            // Highlight checkboxes that the user selects
            checkbox.click(function() {
                if (checkbox.prop("checked"))
                    checkbox.parent().addClass("multiselect-on");
                else
                    checkbox.parent().removeClass("multiselect-on");
            });
        });
    });
};
/*	Function:		hasClass(element,cls)
	Description:	Returns true if the element has a class named cls	*/
function hasClass(element, cls) {
    return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
}
/*	Function:		STSHtmlEncode(a)
	Description:	SharePoint's built in HTML Encode Method (Stolen from init.js due to lack of context)	*/
function STSHtmlEncode(a) {
    if (null == a || "undefined" == typeof a) return "";
    for (var b = new String(a), c = [], d = 0, e = b.length, d = 0; d < e; d++) {
        var f = b.charAt(d);
        switch (f) {
          case "<":
            c.push("&lt;");
            break;

          case ">":
            c.push("&gt;");
            break;

          case "&":
            c.push("&amp;");
            break;

          case '"':
            c.push("&quot;");
            break;

          case "'":
            c.push("&#39;");
            break;

          default:
            c.push(f);
        }
    }
    return c.join("");
}
/*	Function:		generateJSONFile(location, filename)
	Description:	Generates a CabFlix Readable JSON file. Created as a giant JS Object then pushed to a JSON file at location	*/
function generateJSONFile(location, filename){
	// This function is pretty intensive on the network making 10 calls. 
	// However, this has been optimized as much as possible. There are no duplicate calls.
	// The entire thing is asynchronous
	// Soooo.......
	var tilecounter = 0;
	var meetingobj;
	var existingJSONid = 0;
	var existingManifestID = 0;
	var fieldsToAdd;
	var arrayOfIDs = [];
	var timeEstimator = new Date(meetingAtHand.attr("ows_Meeting_x0020_Start_x0020_Time"));
	
	//Call get ministries so that it ensures the singleton call has been done
	getMinistries(null, null);
	
	
	meetingobj = {
		"Meeting":{
			"@ID": meetingAtHand.attr("ows_ID"),
			"@MeetingDate": sharepointFriendlyDate(new Date(meetingAtHand.attr("ows_Meeting_x0020_Date"))),
			"@MeetingStatus": meetingAtHand.attr("ows_Meeting_x0020_Status"),
			"@StartTime": sharepointFriendlyDate(new Date(meetingAtHand.attr("ows_Meeting_x0020_Start_x0020_Time"))),
			"@EndTime": sharepointFriendlyDate(new Date(meetingAtHand.attr("ows_Meeting_x0020_End_x0020_Time"))),
			"@Subject": meetingAtHand.attr("ows_Title"),
			"@Location": meetingAtHand.attr("ows_Location"),
			"@Notes": "<p>" + meetingAtHand.attr("ows_Notes") + "</p>",
			"@Memo": meetingAtHand.attr("ows_Meeting_x0020_Memo"),
			"@SentToMeetingFlixBy": meetingAtHand.attr("ows_SentToMeetingFlixBy"),
			"@SentToMeetingFlixOn": sharepointFriendlyDate(new Date(meetingAtHand.attr("ows_SentToMeetingFlixOn"))),
			"@Bands": []
		}
	};
	
	//NEW OPTIMIZED CALLS CODE!!!!!
	//Once again, so Regan won't kill me
	//Also, once again, this was painful
	// MEETING JS FILE
	//0. Meeting Object (No Call Made, already in meetingAtHand)
	//1. Get all "Agenda Item"s for this ID (First call)
	//2. Get all "Agenda Submission Documents" (Second Call)
	//3. Get all visible "Public Documents" (Third Call)
	//4. Get all visible "Private Documents" (Fourth Call)
	//5. Get existing JSON Id for file [if exists] (Fifth Call)
	//6. Delete file from step 5 [if exists] (Sixth Call)
	//7. Make the new file (Seventh Call)
	// MEETING MANIFEST JS FILE
	//8. Get all the Meetings that are Sent To MeetingFlix (Eighth Call)
	//9. Get existing JSON Id for file [if exists] (Ninth Call)
	//10. Delete file from step 5 [if exists] (Tenth Call)
	//11. Make the new file (Eleventh Call)
	
	var tiles = [];
	var publicDocuments = [];
	var privateDocuments = [];
	
	//SAVE ALL DATA FOR THE CONSTRUCTION OF THE JSON FILE (STEPS 1-4 - 4 Calls)
	//1. Get all "Agenda Item"s for this ID (First call)
	$().SPServices({
		operation: "GetListItems",
		async: true,
		listName: "Agenda Item",
		CAMLQuery: "<Query><Where><Eq><FieldRef Name='Meeting' LookupId='TRUE' /><Value Type='Lookup'>" + meetingAtHand.attr("ows_ID") + "</Value></Eq></Where><OrderBy><FieldRef Name='Presentation_x0020_Order' Ascending='True' /></OrderBy></Query>",
		CAMLViewFields: "<ViewFields Properties='True' />",
		completefunc: function (xData, Status) {
			$(xData.responseXML).SPFilterNode("z:row").each(function() {
				var Band = {
					"@ID":  $(this).attr("ows_ID"),
					"@Name": $(this).attr("ows_Title"),
					"@Description":  $(this).attr("ows_Item_x0020_Description"),
					"@Order": parseInt($(this).attr("ows_Presentation_x0020_Order")).toFixed(0),
					"@TimestampID": $(this).attr("ows_Agenda_x0020_Item_x0020_Timestam"),
					"@NonAgendaBand": $(this).attr("ows_Non_x002d_Agenda_x0020_Items"),
					"@Tiles": []
				};
				
				//push to meetingobj
				meetingobj.Meeting["@Bands"].push(Band);
			});

			//2. Get all "Agenda Submission Documents" (Second Call)
			$().SPServices({
				operation: "GetListItems",
				async: true,
				listName: "Agenda Submission Documents",
				CAMLQuery: "<Query><Where><Eq><FieldRef Name='ContentType' /><Value Type='Computed'>Submission Document Set</Value></Eq></Where><OrderBy><FieldRef Name='Submission_x0020_Order' Ascending='True' /></OrderBy></Query>",
				CAMLViewFields: "<ViewFields Properties='True' />",
				completefunc: function (xData, Status) {
					$(xData.responseXML).SPFilterNode("z:row").each(function() {
						tiles.push($(this));
					});
						
					//3. Get all visible "Public Documents" (Third Call)
					$().SPServices({
						operation: "GetListItems",
						async: true,
						listName: "Agenda Submission Documents",
						CAMLQuery: "<Query><Where><Eq><FieldRef Name='MeetingFlix_x0020_Visibility' /><Value Type='Boolean'>1</Value></Eq></Where></Query>",
						CAMLViewFields: "<ViewFields Properties='True' />",
						CAMLQueryOptions: "<QueryOptions><ViewAttributes Scope='Recursive' /></QueryOptions>",
						completefunc: function (xData, Status) {
							$(xData.responseXML).SPFilterNode("z:row").each(function() {			
								publicDocuments.push($(this));
							});
							
							//4. Get all visible "Private Documents" (Fourth Call)
							$().SPServices({
								operation: "GetListItems",
								async: true,
								listName: "Private Submission Documents",
								CAMLQuery: "<Query><Where><Eq><FieldRef Name='MeetingFlix_x0020_Visibility' /><Value Type='Boolean'>1</Value></Eq></Where></Query>",
								CAMLViewFields: "<ViewFields Properties='True' />",
								CAMLQueryOptions: "<QueryOptions><ViewAttributes Scope='Recursive' /></QueryOptions>",
								completefunc: function (xData, Status) {
									$(xData.responseXML).SPFilterNode("z:row").each(function() {									
										privateDocuments.push($(this));
									});
			
									//for each band....
									for (var i = 0; i < meetingobj.Meeting["@Bands"].length; i++){
										
										//for each tile within the band...
										var relevanttiles = $.grep(tiles, function(e){ return e.attr("ows_Agenda_x0020_Item_x0020_Timestamp_x0020_ID") == meetingobj.Meeting["@Bands"][i]["@TimestampID"]; });
										for (var j = 0; j < relevanttiles.length; j++){
											var arrayOfLeadMinistries = [];
											var tempArrayOfLeadMinistries = relevanttiles[j].attr("ows_Lead_x0020_Ministry").substr(relevanttiles[j].attr("ows_Lead_x0020_Ministry").indexOf("#")+1).split(/;#[0-9]+;#/g);
											var affectedministries = null;
											var cois = null;
											var ice = null;
											var dcs = null;
											var arrayOfSupportingDocuments = [];
											var arrayOfDecisionDocuments = [];
											var arrayOfPrivateDocuments = [];
											
											for (var k = 0; k < tempArrayOfLeadMinistries.length; k++){
												arrayOfLeadMinistries.push({
													"@Name" 		: tempArrayOfLeadMinistries[k],
													"@Abbreviation"	: $.grep(organizationsArray, function(e){ return e.name == tempArrayOfLeadMinistries[k] })[0].abbreviation
												});
											}
											
											try{
												affectedministries = relevanttiles[j].attr("ows_Affected_x0020_Ministries").replace(/;#[0-9]+;#/g, ", ");
												affectedministries = affectedministries.substr(affectedministries.indexOf("#")+1);
											}catch(e){}
											try{
												cois = relevanttiles[j].attr("ows_Conflicting_x0020_Ministers1").replace(/;#[0-9]+;#/g, ", ");
												cois = cois.substr(cois.indexOf("#")+1);
											}catch(e){}
											try{
												ice = relevanttiles[j].attr("ows_InCamera_x0020_Exclusions").replace(/;#[0-9]+;#/g, ", ");
												ice = ice.substr(ice.indexOf("#")+1);
											}catch(e){}
											try{
												dcs = relevanttiles[j].attr("ows_Document_x0020_Collection_x0020_Status").replace(/;#[0-9]+;#/g, ", ");
												dcs = dcs.substr(dcs.indexOf("#")+1);
											}catch(e){}
											var affectedministries = relevanttiles[j].attr("ows_Affected_x0020_Ministries").replace(/;#[0-9]+;#/g, ", ");
											affectedministries = affectedministries.substr(affectedministries.indexOf("#")+1,affectedministries.length);
											
											//Public Docs 
											var publicdocs = $.grep(publicDocuments, function(e){ return e.attr("ows_Submission_x0020_Timestamp_x0020_ID") == relevanttiles[j].attr("ows_Submission_x0020_Timestamp_x0020_ID"); });
											for (var k = 0; k < publicdocs.length; k++){
												if (publicdocs[k].attr("ows_Decision_x0020_Item") == 1){
													arrayOfDecisionDocuments.push({
														"@Name": publicdocs[k].attr("ows_Title"),
														"@ID": publicdocs[k].attr("ows_ID"),
														"@Link": "/" + publicdocs[k].attr("ows_FileRef").substr(publicdocs[k].attr("ows_FileRef").indexOf("#")+1),
														"@PrivacyStatus": "No",
														"@Order": publicdocs[k].attr("ows_Document_x0020_Order"),
														"@Filetype": publicdocs[k].attr("ows_File_x0020_Type"),
														"@Size": ((parseInt(publicdocs[k].attr("ows_File_x0020_Size").substr(publicdocs[k].attr("ows_File_x0020_Size").indexOf("#")+1)) / 1024)/1024).toFixed(2) + " MB"
													});
												}
												else{
													arrayOfSupportingDocuments.push({
														"@Name": publicdocs[k].attr("ows_Title"),
														"@ID": publicdocs[k].attr("ows_ID"),
														"@Link": "/" + publicdocs[k].attr("ows_FileRef").substr(publicdocs[k].attr("ows_FileRef").indexOf("#")+1),
														"@PrivacyStatus": "No",
														"@Order": publicdocs[k].attr("ows_Document_x0020_Order"),
														"@Filetype": publicdocs[k].attr("ows_File_x0020_Type"),
														"@Size": ((parseInt(publicdocs[k].attr("ows_File_x0020_Size").substr(publicdocs[k].attr("ows_File_x0020_Size").indexOf("#")+1)) / 1024)/1024).toFixed(2) + " MB"
													});
												}
											}
											
											//Private Docs 
											var privatedocs = $.grep(privateDocuments, function(e){ return e.attr("ows_Submission_x0020_Timestamp_x0020_ID") == relevanttiles[j].attr("ows_Submission_x0020_Timestamp_x0020_ID"); });
											for (var k = 0; k < privatedocs.length; k++){
												arrayOfPrivateDocuments.push({
													"@Name": privatedocs[k].attr("ows_Title"),
													"@ID": privatedocs[k].attr("ows_ID"),
													"@Link": "/" + privatedocs[k].attr("ows_FileRef").substr(privatedocs[k].attr("ows_FileRef").indexOf("#")+1),
													"@PrivacyStatus": "Yes",
													"@Order": publicdocs[k].attr("ows_Document_x0020_Order"),
													"@Filetype": publicdocs[k].attr("ows_File_x0020_Type"),
													"@Size": ((parseInt(publicdocs[k].attr("ows_File_x0020_Size").substr(publicdocs[k].attr("ows_File_x0020_Size").indexOf("#")+1)) / 1024)/1024).toFixed(2) + " MB"
												});
											}
											
											var tile = {
												"@ID": relevanttiles[j].attr("ows_ID"),
												"@Name": relevanttiles[j].attr("ows_Title"),
												"@Presenter": relevanttiles[j].attr("ows_Presenter"),
												"@Attendees": relevanttiles[j].attr("ows_Submission_x0020_Attendees"),
												"@Minutes": parseInt(relevanttiles[j].attr("ows_Time_x0020_In_x0020_Minutes")).toFixed(0),
												"@EstimatedStartTime":null,
												"@EstimatedEndTime":null,
												"@ShortDescription": (relevanttiles[j].attr("ows_Submission_x0020_Brief_x0020_Description") ? relevanttiles[j].attr("ows_Submission_x0020_Brief_x0020_Description") : null),
												"@Description": relevanttiles[j].attr("ows_Submission_x0020_Description"),
												"@Type": relevanttiles[j].attr("ows_Submission_x0020_Type").substr(relevanttiles[j].attr("ows_Submission_x0020_Type").indexOf("#")+1),
												"@Category": (relevanttiles[j].attr("ows_Submission_x0020_Category") ? relevanttiles[j].attr("ows_Submission_x0020_Category").substr(relevanttiles[j].attr("ows_Submission_x0020_Category").indexOf("#")+1) : null),
												"@Order": parseInt(relevanttiles[j].attr("ows_Submission_x0020_Order")).toFixed(0),
												"@LeadOrganizations": arrayOfLeadMinistries,
												"@AffectedOrganizations": affectedministries,
												"@UsersWithACOI": cois,
												"@UsersExcludedDueToInCamera": ice,
												"@Image": relevanttiles[j].attr("ows_Submission_x0020_Picture").substr(0, relevanttiles[j].attr("ows_Submission_x0020_Picture").indexOf(',')),
												"@SupportingDocuments": (arrayOfSupportingDocuments!=null?arrayOfSupportingDocuments.sort(function(a,b) { return a["@Order"] - b["@Order"] } ):null),
												"@DecisionItemDocuments": (arrayOfDecisionDocuments!=null?arrayOfDecisionDocuments.sort(function(a,b) { return a["@Order"] - b["@Order"] } ):null),
												"@PrivateDocuments": (arrayOfPrivateDocuments!=null?arrayOfPrivateDocuments.sort(function(a,b) { return a["@Order"] - b["@Order"] } ):null),
												"@DocumentCollectionStatus": dcs,
												"@TileNumber": null,
												"@Withdrawn": (relevanttiles[j].attr("ows_Withdrawn") == 1 ? "Yes" : null)
											};
											
											//if not a non agenda-band....
											if (meetingobj.Meeting["@Bands"][i]["@NonAgendaBand"] == "0"){
												tile["@EstimatedStartTime"] = sharepointFriendlyDate(timeEstimator);
												tilecounter++;
												timeEstimator.setTime(timeEstimator.getTime() + (parseInt(relevanttiles[j].attr("ows_Time_x0020_In_x0020_Minutes")).toFixed(0) * 60000));
												tile["@EstimatedEndTime"] = sharepointFriendlyDate(timeEstimator);
											}
											tile["@TileNumber"] = tilecounter;
											
											
											meetingobj.Meeting["@Bands"][i]["@Tiles"].push(tile);
										}
									}

									writeJSONFiles(meetingobj, location, filename);
								}
							});
						}
					});
				}
			});
		}
	});

}
/*	Function:		writeJSONFiles(meetingobj, location, filename)
	Description:	Writes the two JSON files to the filesystem*/
function writeJSONFiles(meetingobj, location, filename){
	var existingJSONid = null;
	var JSONManifestContents = {
		"Meetings":[]
	};

	//SAVE THE JSON FILE (STEPS 5-7 - 3 Calls)
	//5. Get existing JSON Id for file [if exists] (Fifth Call)
	$().SPServices({
		operation: "GetListItems",
		async: true,
		listName: "Site Pages",
		CAMLQuery: "<Query><Where><Eq><FieldRef Name='FileLeafRef' /><Value Type='Text'>" + filename + "</Value></Eq></Where></Query>",
		CAMLViewFields: "<ViewFields Properties='True' />",
		CAMLQueryOptions: "<QueryOptions><Folder>" + location + "</Folder></QueryOptions>",
		completefunc: function (xData, Status) {
			$(xData.responseXML).SPFilterNode("z:row").each(function() {
				existingJSONid= parseInt($(this).attr("ows_ID"));
			});
			//6. Delete file from step 5 [if exists] (Sixth Call)
			if (existingJSONid != null && existingJSONid != 0){
				$().SPServices({
					operation: "UpdateListItems",
					async: false,
					listName: 'Site Pages',
					updates: "<Batch OnError='Continue'><Method ID='1' Cmd='Delete'><Field Name='ID'>" + existingJSONid + "</Field><Field Name='FileRef'>" + location + filename + "</Field></Method></Batch>",
					completefunc: function (xData, Status) {}
				});
			}
			//7. Make the new file (Seventh Call)
			$().SPServices({
				operation: "CopyIntoItems",
				processData: false,
				async: false,
				SourceUrl: location+filename,
				Stream: base64EncArr(strToUTF8Arr(JSON.stringify(meetingobj))),
				DestinationUrls: [location+filename],
				Fields: "<FieldInformation Type='File' />",
				completefunc: function (xData, Status) {
					//SAVE THE JSON MANIFEST FILE (STEPS 8-11 - 4 Calls)
					//8. Get all the Meetings that are Sent To MeetingFlix (Eighth Call)
					$().SPServices({
						operation: "GetListItems",
						async: true,
						listName: "Cabinet Meeting",
						CAMLQuery: "<Query><Where><And><Eq><FieldRef Name='SentToMeetingFlix' /><Value Type='Boolean'>1</Value></Eq><Neq><FieldRef Name='Meeting_x0020_Status' /><Value Type='Text'>Closed</Value></Neq></And></Where></Query>",
						CAMLViewFields: "<ViewFields Properties='True' />",
						completefunc: function (xData, Status) {
							$(xData.responseXML).SPFilterNode("z:row").each(function() {
								JSONManifestContents.Meetings.push({
									"@ID":$(this).attr("ows_ID"),
									"@Name":$(this).attr("ows_Title"),
									"@MeetingDate":sharepointFriendlyDate(new Date($(this).attr("ows_Meeting_x0020_Date"))),
									"@StartTime":sharepointFriendlyDate(new Date($(this).attr("ows_Meeting_x0020_Start_x0020_Time"))),
									"@EndTime":sharepointFriendlyDate(new Date($(this).attr("ows_Meeting_x0020_End_x0020_Time"))),
									"@Location":$(this).attr("ows_Location"),
									"@Status":$(this).attr("ows_Meeting_x0020_Status"),
									"@SentToMeetingFlixBy":$(this).attr("ows_SentToMeetingFlixBy"),
									"@SentToMeetingFlixOn": sharepointFriendlyDate(new Date($(this).attr("ows_SentToMeetingFlixOn")))
								});
							});
							//9. Get existing JSON Id for file [if exists] (Ninth Call)
							$().SPServices({
								operation: "GetListItems",
								async: true,
								listName: "Site Pages",
								CAMLQuery: "<Query><Where><Eq><FieldRef Name='FileLeafRef' /><Value Type='Text'>" + JSONManifest + "</Value></Eq></Where></Query>",
								CAMLViewFields: "<ViewFields Properties='True' />",
								CAMLQueryOptions: "<QueryOptions><Folder>" + thisSite + location + "</Folder></QueryOptions>",
								completefunc: function (xData, Status) {
									$(xData.responseXML).SPFilterNode("z:row").each(function() {
										var existingManifestID = parseInt($(this).attr("ows_ID"));
										//10. Delete file from step 5 [if exists] (Tenth Call)
										if (existingManifestID != null){
											$().SPServices({
												operation: "UpdateListItems",
												async: false,
												listName: 'Site Pages',
												updates: "<Batch OnError='Continue'><Method ID='1' Cmd='Delete'><Field Name='ID'>" + existingManifestID + "</Field><Field Name='FileRef'>" + location + JSONManifest + "</Field></Method></Batch>",
												completefunc: function (xData, Status) {}
											});
										}
										//11. Make the new file (Eleventh Call)
										$().SPServices({
											operation: "CopyIntoItems",
											processData: false,
											async: true,
											SourceUrl: location+JSONManifest,
											Stream: base64EncArr(strToUTF8Arr(JSON.stringify(JSONManifestContents))),
											DestinationUrls: [location+JSONManifest],
											Fields: "<FieldInformation Type='File' />",
											completefunc: function (xData, Status) {
												//Done all that, notify the user
												$("#popupSendToCabFlixContent").html("The meeting has been published to MeetingFlix, and can be viewed <a href='../MeetingFlix/Meeting.html?id="+meetingAtHand.attr("ows_ID")+"' data-ajax='false'>here</a>");
												//Update the page header
												$("#meeting-identifier").html($("#publish-as").val());
											}
										});
									});
								}
							});
						}
					});
				}
			});
		}
	});
}
/*	Function:		sendToMeetingFlix()
	Description:	Confirms with the user that they wish to send to MeetingFlix, and ask them as what kind of status	*/
function sendToMeetingFlix(){
	var content = 	"<p>\
						By sending this meeting to MeetingFlix, you agree that ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Curabitur sodales ligula in libero. Sed dignissim lacinia nunc.\
					</p>\
					<label class='offscreen' for='publish-as'>Publish As: </label>\
					<select id='publish-as' data-mini='true'>\
						<option value='Draft' selected='selected'>Draft</option>\
						<option value='Released'>Released</option>\
						<option value='Final'>Final</option>\
						<option value='Closed'>Closed</option>\
					</select>\
					<p>\
						Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh.\
					</p>\
					<br/>\
					<progress id='progressbar' max='100'></progress>\
					<div style='width:30%;margin-left:auto;margin-right:0;' id='agreementstuff'>\
						<label>\
							<input type='checkbox' id='agree-to-publish' name='agree-to-publish' data-mini='true'>\
							I agree\
						</label>\
						<a href='javascript:void(0)' id='publish-now' class='ui-disabled' data-role='button' data-mini='true'>Send to MeetingFlix</a>\
					</div>";

	//Open up the modal view
	$("body").addClass("modalopen");
    $("#modalProtection").show();
	$("#popupSendToCabFlixContent").html(content);
	prepareJQMStylesForDynamicContent("popupSendToCabFlixContent");
	
	//Listeners for controls in this modal
	$('#agree-to-publish').change(function () {
		if ($(this).prop("checked")) {
			$("#publish-now").removeClass("ui-disabled");
		}
		else{
			$("#publish-now").addClass("ui-disabled");
		}
	});
	document.getElementById('publish-now').addEventListener('click', function(event) {
		var pairs;
		
		$("#progressbar").show();
		$("#agreementstuff").hide();
		
		if ($("#publish-as").val() == "Closed"){
			pairs = [["SentToMeetingFlix", 0],
					 ["Meeting_x0020_Status", $("#publish-as").val()]];
		}
		else {
			pairs = [["SentToMeetingFlix", 1],
					 ["SentToMeetingFlixBy", CurrentUser.FirstName + " " + CurrentUser.LastName],
					 ["SentToMeetingFlixOn", new Date().dateToISO8601String()],
					 ["Meeting_x0020_Status", $("#publish-as").val()]]
		}
		$().SPServices({
			operation: "UpdateListItems",
			async: true,
			batchCmd: "Update",
			listName: "Cabinet Meeting",
			valuepairs: pairs,
			ID: meetingAtHand.attr("ows_ID"),
			completefunc: function(xData, Status) {
				$(xData.responseXML).SPFilterNode("z:row").each(function() {
					// Generate Manifest and Binder JSON
					generateJSONFile(thisSite + "/SitePages/"+branchname+"SharedAssets/JSONFiles/", "binder." + meetingAtHand.attr("ows_ID") + ".json.safe");
					//and kill this listener
					this.removeEventListener('click',arguments.callee,false);
				});
			}
		});
	});
	
	$("#popupSendToCabFlix").show();
}
/*	Function:		prepareJQMStylesForDynamicContent(id)
	Description:	For id, the JQM styles are reinitialized	*/
function prepareJQMStylesForDynamicContent(id){
	if ( $('#'+id).hasClass('ui-listview')) {
		$('#'+id).listview('refresh');
	}
	else {
		$('#'+id).trigger('create');
	}
}
/*	Function:		sharepointFriendlyDate(d)
	Description:	Returns d in a sharepoint friendly manor	*/
function sharepointFriendlyDate(d){
	Number.prototype.padLeft = function(base,chr){
	   var  len = (String(base || 10).length - String(this).length)+1;
	   return len > 0? new Array(len).join(chr || '0')+this : this;
	}
	var hours;
	var ampm = " AM";
	
	if (d.getHours() == 0){
		hours = 12;
	}
	else if (d.getHours() <= 12){
		hours = d.getHours();
	}
	else if (d.getHours() > 12){
		hours = d.getHours()-12;
		ampm = " PM";
	}

	var dformat = [(d.getMonth()+1).padLeft(),
					d.getDate().padLeft(),
					d.getFullYear()].join('/')+
					' ' +
				  [ hours,
					d.getMinutes().padLeft(),
					d.getSeconds().padLeft()].join(':')+ampm;
	return dformat;
}
/*	Function:		documentDropper()
	Description:	Handles document dropper for the submission thing	*/
function documentDropper(){
	var decision = document.getElementById('decision-items');
	decision.ondragover = function() {
        $("#decision-items").addClass("documentHover");
		$("#decision-items").removeClass("documentNormal");
        return false;
    };
	decision.ondragleave = function() {
        $("#decision-items").addClass("documentNormal");
		$("#decision-items").removeClass("documentHover");
        return false;
    };
    decision.ondragend = function() {
        $("#decision-items").addClass("documentNormal");
		$("#decision-items").removeClass("documentHover");
        return false;
    };
    decision.ondrop = function(e) {
        $("#decision-items").addClass("documentNormal");
		$("#decision-items").removeClass("documentHover");
		
        e.preventDefault();
		$("#table-of-documents").show();
		
		for (var i=0; i < e.dataTransfer.files.length; i++){
			var x = {
				"filename":e.dataTransfer.files[i].name,
				"filesize":((parseInt(e.dataTransfer.files[i].size) / 1024)/1024).toFixed(2) + " MB",
				"fileextension":e.dataTransfer.files[i].name.substr(e.dataTransfer.files[i].name.lastIndexOf(".")+1),
				"file":e.dataTransfer.files[i],
				"docstack":-1,
				"decisionitem":true,
				"order":($("#decision-items-list>li").length + 1)
			};
			
			filesInSubmission.push(x);
			
			var item ={
				"id":null,
				"filename":x.filename,
				"title":null,
				"version":"1.0",
				"path":null,
				"size":x.filesize,
				"privateLocation":null,
				"on":null,
				"by":null,
				"visible":null,
				"comments":null,
				"ogfilename":x.filename,
				"decisionitem":true,
				"order":($("#decision-items-list>li").length + 1),
				"uploadObject":x
			};
			documentArray.push(item);
			
			addDocumentToSortableList(item, filesInSubmission.length);
		}
		prepareJQMStylesForDynamicContent('table-of-documents');
	};
	
	var nondecision = document.getElementById('non-decision-items');
	nondecision.ondragover = function() {
        $("#non-decision-items").addClass("documentHover");
		$("#non-decision-items").removeClass("documentNormal");
        return false;
    };
	nondecision.ondragleave = function() {
        $("#non-decision-items").addClass("documentNormal");
		$("#non-decision-items").removeClass("documentHover");
        return false;
    };
    nondecision.ondragend = function() {
        $("#non-decision-items").addClass("documentNormal");
		$("#non-decision-items").removeClass("documentHover");
        return false;
    };
    nondecision.ondrop = function(e) {
        $("#non-decision-items").addClass("documentNormal");
		$("#non-decision-items").removeClass("documentHover");
		
        e.preventDefault();
		$("#table-of-documents").show();
		
		for (var i=0; i < e.dataTransfer.files.length; i++){
			var x = {
				"filename":e.dataTransfer.files[i].name,
				"filesize":((parseInt(e.dataTransfer.files[i].size) / 1024)/1024).toFixed(2) + " MB",
				"fileextension":e.dataTransfer.files[i].name.substr(e.dataTransfer.files[i].name.lastIndexOf(".")+1),
				"file":e.dataTransfer.files[i],
				"docstack":-1,
				"decisionitem":false,
				"order":($("#non-decision-items-list>li").length + 1)
			};
			
			filesInSubmission.push(x);
			
			var item ={
				"id":null,
				"filename":x.filename,
				"title":null,
				"version":"1.0",
				"path":null,
				"size":x.filesize,
				"privateLocation":null,
				"on":null,
				"by":null,
				"visible":null,
				"comments":null,
				"ogfilename":x.filename,
				"decisionitem":false,
				"order":($("#decision-items-list>li").length + 1),
				"uploadObject":x
			};
			documentArray.push(item);
			
			addDocumentToSortableList(item, filesInSubmission.length);
		}
		prepareJQMStylesForDynamicContent('table-of-documents');
	};
}
/*	Function:		addDocumentToSortableList()
	Description:	Adds a document to the list (UI Only) */
function addDocumentToSortableList(documentInfo, position){
	/*{
		"id",
		"filename",
		"title",
		"version",
		"path",
		"size",
		"privateLocation",
		"on",
		"by",
		"visible",
		"comments",
		"ogfilename",
		"decisionitem",
		"order"
		ADD IN: "tempdocstack"
	}*/
	
	var liItem = '';
	var tempdocstack;
	docstack++;
	tempdocstack = docstack;
	
	documentInfo.tempdocstack = tempdocstack;
	
	liitem='<li class="documentInList'+(documentInfo.on == null ? " pin" : "")+'" id="document'+docstack+'">\
				<a href="javascript:void(0)" class="documentName">\
					'+(documentInfo.privateLocation != null && documentInfo.on != null ? "<img class=\"privateDocument\" src=\"../SharedAssets/img/core/eye-icon.png\" alt=\"Private Document\" />" : "")+'\
					<span class="documentNameTop" title="'+(documentInfo.title != null ? documentInfo.title : "Untitled")+'">' + (documentInfo.title != null ? documentInfo.title : "Untitled <em>(Upload to Reorder)</em>") + '</span><div class="documentFilenameAndSize" title="(' + documentInfo.ogfilename + ' - ' + documentInfo.size +')">(' + documentInfo.ogfilename + ' - ' + documentInfo.size +')</div>\
				</a>\
				<a class="viewDocument" target="_blank" id="viewDocument'+docstack+'" href="'+(documentInfo.path ? documentInfo.path : "javascript:void(0)")+'" data-ajax="false">View</a>\
				<div class="documentDetails">\
					<p style="width:100%;text-align:center;font-size: 0.8em;margin-bottom: 25px;">' + (documentInfo.comments != null && documentInfo.comments != "" ? documentInfo.comments : "") + '</p>\
					<div id="newDocumentContainer'+docstack+'">\
						<div style="width:100%;">\
							<label class="offscreen" for="doc-title-'+docstack+'">Title<abbr class="required-asterisk" title="Required">*</abbr></label>\
							<input type="text" placeholder="Title" id="doc-title-'+docstack+'" data-mini="true" value="'+(documentInfo.ogfilename != null ? documentInfo.ogfilename.substring(0,documentInfo.ogfilename.indexOf(".")) : "")+'"/>\
						</div>\
						<div style="width:100%;">\
							<label class="offscreen" for="privacy-'+docstack+'">MeetingFlix Visibility</label>\
							<select id="privacy-'+docstack+'" data-mini="true">'+getUploadLocations(documentInfo.privateLocation)+'</select>\
						</div>\
						<div style="width:100%;margin-bottom: 25px;">\
							<label class="offscreen" for="doc-comment-'+docstack+'">Comments</label>\
							<input type="text" placeholder="Comments" id="doc-comment-'+docstack+'" data-mini="true" />\
						</div>\
					</div>\
					<label for="display-on-meetingflix-'+docstack+'" class="offscreen">Visible on MeetingFlix:</label>\
					<input type="checkbox" data-role="flipswitch" name="display-on-meetingflix-'+docstack+'" id="display-on-meetingflix-'+docstack+'" data-on-text="Visible" data-off-text="Not Visible" data-wrapper-class="custom-size-flipswitch" data-mini="true" '+(documentInfo.visible!=null && documentInfo.visible==false?"":"checked=\"checked\"")+'/>\
					<a href="javascript:void(0)" id="delete-document-'+docstack+'" class="document-option-button" style="float:right;">Delete</a>\
					<div class="movecontrols">\
						<a href="javascript:void(0)" id="umove'+docstack+'" class="documentMoveButtons" style="bottom: 6em;left: 13em;">Up</a>\
						<a href="javascript:void(0)" id="lmove'+docstack+'" class="documentMoveButtons" style="bottom:4.5em;left: 9em;">Left</a>\
						<a href="javascript:void(0)" id="rmove'+docstack+'" class="documentMoveButtons" style="bottom:4.5em;left: 17em;">Right</a>\
						<a href="javascript:void(0)" id="dmove'+docstack+'" class="documentMoveButtons" style="bottom:3em;left: 13em;">Down</a>\
					</div>\
					<div class="doc-status" id="doc-status-'+docstack+'">\
						' + (documentInfo.on != null ? (documentInfo.privateLocation != null ? "Visible to " + documentInfo.privateLocation : "Visible to all attendees of this tile") : "") + '<br/>\
						' + (documentInfo.on != null ? 'Uploaded on ' + pullDate(documentInfo.on) + ' at ' + pullTime(documentInfo.on) + ' by ' + documentInfo.by.substr(documentInfo.by.indexOf("#")+1) : 'Not Uploaded') + '\
					</div>\
				</div>\
			</li>';

	if (documentInfo.decisionitem){
		$("#decision-items-list").append(liitem);
	}
	else{
		$("#non-decision-items-list").append(liitem);
	}
	
	//Already uploaded
	if (documentInfo.on != null){
		$("#newDocumentContainer"+docstack).hide();
	}
	//New (not uploaded)
	else{
		$("viewDocument"+docstack).hide();
		$('#document'+docstack+'>.documentName').on('click',function(){
			var details = $('#'+$(this).parent().attr('id')+'>.documentDetails');
			var movecontrols = $('#'+$(this).parent().attr('id')+'>.documentDetails>.movecontrols');
			details.is(':hidden') ? ($('.movecontrols').hide(), $('.listOfDocuments > li > .documentDetails').slideUp(), details.slideDown(), movecontrols.show()) : (movecontrols.hide(), details.slideUp());
		});
	}
	prepareJQMStylesForDynamicContent('document'+docstack);
	
	//persist docstack if notuploaded
	if (documentInfo.id==null){
		filesInSubmission[position-1].docstack = docstack;
	}
	
	//Update Visibility Listener
	$(document.body).on('change','#display-on-meetingflix-'+tempdocstack,function(){
		if (documentInfo.id){
			updateDocumentVisibility($("#display-on-meetingflix-"+tempdocstack).is(':checked'), documentInfo.id, !documentInfo.location?"Agenda Submission Documents":"Private Submission Documents");
		}
	});
	//Delete Document Listener
	$(document.body).on('click','#delete-document-'+tempdocstack,function(){
		if (documentInfo.id){
			deleteDocument(documentInfo.path, documentInfo.id, !documentInfo.location?"Agenda Submission Documents":"Private Submission Documents");
		}
		$("#document"+tempdocstack).empty();
		$("#document"+tempdocstack).remove();
		
		//kill the listeners for this <li> here to free up memory (low priority)
	});
	
	//Move Buttons Listeners
	$(document.body).on('click','#umove'+tempdocstack,function(){
		var uiid = parseInt($(this).attr("id").substr(5));
		var relevantdocument = $.grep(documentArray, function(e){ return e.tempdocstack == uiid; });
			relevantdocument = relevantdocument[0];
		sortableDocumentStorage = {
			"OGIndex": $("#document"+uiid).index(),
			"OGListID": $("#document"+uiid).parent().attr("id")
		};
		var newLocation = {
			"NewIndex": sortableDocumentStorage.OGIndex-1,
			"NewListID": sortableDocumentStorage.OGListID
		};
		
		if (($("#" + sortableDocumentStorage.OGListID + "> li").length-1) > 1){
			if (sortableDocumentStorage.OGIndex != 0){
				try{
					//fix ui
					if (sortableDocumentStorage.OGIndex-1 == 0){
						$("#document"+uiid).insertBefore("#"+newLocation.NewListID+">li:nth-child(1)");
					}
					else {
						$("#document"+uiid).insertAfter("#"+newLocation.NewListID+">li:nth-child(" + (newLocation.NewIndex) + ")");
					}
					initializeDocumentReorder(relevantdocument, sortableDocumentStorage, newLocation);
				}catch(e){}
			}
		}
	});
	$(document.body).on('click','#dmove'+tempdocstack,function(){
		console.log("CALL TO DOWN");
		var uiid = parseInt($(this).attr("id").substr(5));
		var relevantdocument = $.grep(documentArray, function(e){ return e.tempdocstack == uiid; });
			relevantdocument = relevantdocument[0];
		sortableDocumentStorage = {
			"OGIndex": $("#document"+uiid).index(),
			"OGListID": $("#document"+uiid).parent().attr("id")
		};
		var newLocation = {
			"NewIndex": sortableDocumentStorage.OGIndex+1,
			"NewListID": sortableDocumentStorage.OGListID
		};
		
		if (($("#" + sortableDocumentStorage.OGListID + "> li").length-1) > 1){
			if (sortableDocumentStorage.OGIndex != ($("#" + sortableDocumentStorage.OGListID + "> li").length-1)){
				try{
					//fix ui
					$("#document"+uiid).insertAfter($("#"+newLocation.NewListID+">li:nth-child(" + (newLocation.NewIndex+1) + ")"));
					initializeDocumentReorder(relevantdocument, sortableDocumentStorage, newLocation);
				}catch(e){}
			}
		}
	});
	$(document.body).on('click','#lmove'+tempdocstack,function(){
		var uiid = parseInt($(this).attr("id").substr(5));
		var relevantdocument = $.grep(documentArray, function(e){ return e.tempdocstack == uiid; });
			relevantdocument = relevantdocument[0];
		sortableDocumentStorage = {
			"OGIndex": $("#document"+uiid).index(),
			"OGListID": $("#document"+uiid).parent().attr("id")
		};
		var newLocation = {
			"NewIndex": sortableDocumentStorage.OGIndex,
			"NewListID": null
		};
		
		if (sortableDocumentStorage.OGListID == "non-decision-items-list"){
			newLocation.NewListID = "decision-items-list";
			if (sortableDocumentStorage.OGIndex > ($("#" + newLocation.NewListID + "> li").length-1)){
				newLocation.NewIndex = ($("#" + newLocation.NewListID + "> li").length);
			}
			try{
				//fix ui
				if (newLocation.NewIndex == 0){
					$("#document"+uiid).insertBefore("#"+newLocation.NewListID+">li:nth-child(1)");
				}
				else {
					$("#document"+uiid).insertAfter("#"+newLocation.NewListID+">li:nth-child(" + (newLocation.NewIndex) + ")");
				}
				initializeDocumentMoveAndReorder(relevantdocument, sortableDocumentStorage, newLocation);
			}catch(e){}
		}
	});
	$(document.body).on('click','#rmove'+tempdocstack,function(){
		var uiid = parseInt($(this).attr("id").substr(5));
		var relevantdocument = $.grep(documentArray, function(e){ return e.tempdocstack == uiid; });
			relevantdocument = relevantdocument[0];
		sortableDocumentStorage = {
			"OGIndex": $("#document"+uiid).index(),
			"OGListID": $("#document"+uiid).parent().attr("id")
		};
		var newLocation = {
			"NewIndex": sortableDocumentStorage.OGIndex,
			"NewListID": null
		};
		
		if (sortableDocumentStorage.OGListID == "decision-items-list"){
			newLocation.NewListID = "non-decision-items-list";
			if (sortableDocumentStorage.OGIndex > ($("#" + newLocation.NewListID + "> li").length-1)){
				newLocation.NewIndex = ($("#" + newLocation.NewListID + "> li").length);
			}
			try{
				//fix ui
				if (newLocation.NewIndex == 0){
					$("#document"+uiid).insertBefore("#"+newLocation.NewListID+">li:nth-child(1)");
				}
				else {
					$("#document"+uiid).insertAfter("#"+newLocation.NewListID+">li:nth-child(" + (newLocation.NewIndex) + ")");
				}
				initializeDocumentMoveAndReorder(relevantdocument, sortableDocumentStorage, newLocation);
			}catch(e){}
		}
	});
}
/*	Function:		imageDropper()
	Description:	Receives images, displays/keeps them */
function imageDropper(){
	var holder = document.getElementById('holder_helper');
	holder.ondragover = function() {
        $("#holder_helper").addClass("imageHover");
		$("#holder_helper").removeClass("imageNormal");
        return false;
    };
	holder.ondragleave = function() {
        $("#holder_helper").addClass("imageNormal");
		$("#holder_helper").removeClass("imageHover");
        return false;
    };
    holder.ondragend = function() {
        $("#holder_helper").addClass("imageNormal");
		$("#holder_helper").removeClass("imageHover");
        return false;
    };
    holder.ondrop = function(x) {
        $("#holder_helper").addClass("imageNormal");
		$("#holder_helper").removeClass("imageHover");
		
        x.preventDefault();
		
		var file = x.dataTransfer.files[0], 
			reader = new FileReader();
		
        reader.onload = function(event) {
			if (file.name.substr(file.name.lastIndexOf(".")+1) == "png" || file.name.substr(file.name.lastIndexOf(".")+1) == "PNG" || file.name.substr(file.name.lastIndexOf(".")+1) == "JPG" || file.name.substr(file.name.lastIndexOf(".")+1 =="jpg")){
				$("#holder_helper").css("background-image", "url('" + event.target.result + "')");
				submissionImageToUpload = event.target.result;
				submissionImageSelected = new Date().getTime() + "." + file.name.substr(file.name.lastIndexOf(".")+1);
			}
        };

		reader.readAsDataURL(file);

	};
}
/*	Function:		getFileExtension(url)
	Description:	Returns the file extension of a url */
function getFileExtension(url) {
	return url.split('.').pop().split(/\#|\?/)[0];
}
/*	Function:		uploadDocuments(fileleafref, fileobj, libraryandsubfolder, submissiontimestamp, submission, title, comments, visibility, decisionitem, order)
	Description:	Handles document dropper for the submission thing	*/
function uploadDocuments(fileleafref, fileobj, libraryandsubfolder, submissiontimestamp, submission, giventitle, comments, visibility, decisionitem, order){
	//uploader
	$(".doc-status").html("Uploading");
	var reader = new FileReader();
	var path;
	var fieldsToAdd1;
	var epoch = new Date();
	var filename = fileobj.filename.substr(0, fileobj.filename.lastIndexOf(".")) + "-" + epoch.getTime() + fileobj.filename.substr(fileobj.filename.lastIndexOf("."));
	var reader = new FileReader();
	
	
	//public
	if (libraryandsubfolder == "Agenda Submission Documents"){
		path = thisSite + "/" + libraryandsubfolder + "/" + fileleafref.substr(fileleafref.indexOf("#")+1) + "/" + encodeURIComponent(filename);
	}
	//private
	else {
		path = thisSite + "/" + libraryandsubfolder + "/" + encodeURIComponent(filename);
	}
	
	fieldsToAdd1 =	"<FieldInformation Type='File' />"
					+"<FieldInformation Type='Text' DisplayName='ContentType' InternalName='ContentType' Value='"+documentContentType.Name+"' />"
					+"<FieldInformation Type='Text' DisplayName='ContentTypeId' InternalName='ContentTypeId' Value='"+documentContentType.ID+"' />"
					+"<FieldInformation Type='Text' DisplayName='Submission Timestamp ID' InternalName='Submission_x0020_Timestamp_x0020_ID' Value='"+submissiontimestamp+"' />"
					+"<FieldInformation Type='Text' DisplayName='Title' InternalName='Title' Value='"+giventitle.replace(/[&\/\\#,+()$~%"`:;*?<>{}|^!@$']/g,'')+"' />"
					+"<FieldInformation Type='Text' DisplayName='Document Comments' InternalName='Document_x0020_Comments' Value='"+comments.replace(/[&\/\\#,+()$~%"`:;*?<>{}|^!@$']/g,'')+"' />"
					+"<FieldInformation Type='Text' DisplayName='Original Filename' InternalName='Original_x0020_Filename' Value='"+fileobj.filename+"' />"
					+"<FieldInformation Type='Boolean' DisplayName='MeetingFlix Visibility' InternalName='MeetingFlix_x0020_Visibility' Value='"+(visibility?'True':'False')+"' />"
					+"<FieldInformation Type='Boolean' DisplayName='Decision Item' InternalName='Decision_x0020_Item' Value='"+(decisionitem?'True':'False')+"' />"
					+"<FieldInformation Type='Number' DisplayName='Document Order' InternalName='Document_x0020_Order' Value='"+order+"' />";
					
	console.log(fieldsToAdd1);
	
	reader.onloadend = function () {	
		$().SPServices({
			operation: "CopyIntoItems",
			processData: false,
			async: false,
			SourceUrl: path,
			Stream: reader.result.substr(reader.result.indexOf(",")+1),
			DestinationUrls: [path],
			Fields: fieldsToAdd1,
			completefunc: function (xData, Status) {
				docsUploaded++;
				console.log("UPLOAD INFO");
				console.log(xData);
				$("#doc-status-"+docsUploaded).html("Uploaded");
				if (docsUploaded == filesInSubmission.length){
					//reset the queue of documents
					docsUploaded = 0;
					filesInSubmission = [];
					//close the submission
					closeSubmission();
					$("#dialog-saved").dialog("open");
					$("#modalProtection").show();
				}
			}
		});
	}
	
	reader.readAsDataURL(fileobj.file);
}
/*	Function:		deleteDocument(fileref, id, list)
	Description:	Allows you to delete a document at a location	*/
function deleteDocument(fileref, id, list){
	var batchCmd = "<Batch OnError='Continue'><Method ID='1' Cmd='Delete'><Field Name='ID'>" + id + "</Field><Field Name='FileRef'>" + fileref + "</Field></Method></Batch>";
	
	$().SPServices({
		operation: "UpdateListItems",
		async: false,
		listName: list,
		updates: batchCmd,
		completefunc: function (xData, Status) {console.log(xData);}
	});
	
	var relevantdocument = $.grep(documentArray, function(e){ return e.id == id; });
	relevantdocument = relevantdocument[0];
	
	initializeDocumentReorder(null, {"OGIndex":(relevantdocument.order-1),"OGListID":(relevantdocument.decisionitem == true ? "decision-items-list" : "non-decision-items-list")}, null);
	
	//delete from array
	for(var i = 0; i < documentArray.length; i++){
        if(documentArray[i].id == id){
            documentArray.splice(i, 1);  //removes 1 element at position i 
            break;
        }
    }
}
/*	Function:		updateDocumentVisibility(visibility, id, list)
	Description:	Allows you to alter a document's visibility	*/
function updateDocumentVisibility(visibility, id, list){
	$().SPServices({
		operation: "UpdateListItems",
		async: false,
		batchCmd: "Update",
		listName: list,
		valuepairs: [
						["MeetingFlix_x0020_Visibility", (visibility?1:0)]
					],
		ID: id,
		completefunc: function(xData, Status) {
			$(xData.responseXML).SPFilterNode("z:row").each(function() {
				//complete
			});
		}
	});
}
/*	Function:		updateDocumentDecisionItemStatus(status, id, list)
	Description:	Allows you to alter a document's decision item status	*/
function updateDocumentDecisionItemStatus(status, id, list){
	$().SPServices({
		operation: "UpdateListItems",
		async: false,
		batchCmd: "Update",
		listName: list,
		valuepairs: [
						["Decision_x0020_Item", (status?1:0)]
					],
		ID: id,
		completefunc: function(xData, Status) {
			$(xData.responseXML).SPFilterNode("z:row").each(function() {
				console.log($(this));
			});
		}
	});
}
/*	Function:		reorderDocument(actualID, newOrder, list)
	Description:	Changes the Order of the document represented by actualID to newOrder	*/
function reorderDocument(actualID, newOrder, list){
	console.log(actualID + "  " + newOrder);
	$().SPServices({
		operation: "UpdateListItems",
		async: false,
		batchCmd: "Update",
		listName: list,
		valuepairs: [
						["Document_x0020_Order", newOrder]
					],
		ID: actualID,
		completefunc: function(xData, Status) {
			$(xData.responseXML).SPFilterNode("z:row").each(function() {});
		}
	});
}
/*	Function:		initializeDocumentMoveAndReorder(documentObject, oldLocation, newLocation)
	Description:	Given an old and new location of the tile, move relevant stuff. Then change decision status.	*/
function initializeDocumentMoveAndReorder(documentObject, oldLocation, newLocation){
	var relevantdocument = null;
	var idOfTab = null;
	
	//First set flip its status
	updateDocumentDecisionItemStatus((newLocation.NewListID == "non-decision-items-list" ? false : true), documentObject.id, documentObject.privateLocation == null?"Agenda Submission Documents":"Private Submission Documents");
	documentObject.decisionitem = (newLocation.NewListID == "non-decision-items-list" ? false : true);
	//Now move it
	reorderDocument(documentObject.id, (newLocation.NewIndex+1), documentObject.privateLocation == null?"Agenda Submission Documents":"Private Submission Documents");
	documentObject.order = (newLocation.NewIndex+1);
	if (documentObject.uploadObject != null){
		documentOrder.uploadObject.order = (newLocation.NewIndex+1);
	}

	//cool now fix up the rest of the list
	// ugh
	//  still hungry
	
	//old list
	//for oldLocation.OGListID, update order of all at that index or after
	for (var i = oldLocation.OGIndex; i < parseInt($("#"+oldLocation.OGListID+">li").length); i++){
		idOfTab = "#" + $("#"+oldLocation.OGListID).children("li").eq(i).attr("id");
		relevantdocument = $.grep(documentArray, function(e){ return e.tempdocstack == parseInt($(idOfTab).attr("id").substr(8)); });
		relevantdocument = relevantdocument[0];
		reorderDocument(relevantdocument.id, (parseInt($(idOfTab).index())+1), !relevantdocument.privateLocation?"Agenda Submission Documents":"Private Submission Documents");
		relevantdocument.order = (parseInt($(idOfTab).index())+1);
		console.log(relevantdocument);
		if (relevantdocument.uploadObject != null){
			relevantdocument.uploadObject.order = (parseInt($(idOfTab).index())+1);
		}
	}
	
	//new list
	//for newLocation.list, update order of all after that or after
	for (var i = newLocation.NewIndex+1; i < parseInt($("#"+newLocation.NewListID+">li").length); i++){
		idOfTab = "#" + $("#"+newLocation.NewListID).children("li").eq(i).attr("id");
		relevantdocument = $.grep(documentArray, function(e){ return e.tempdocstack == parseInt($(idOfTab).attr("id").substr(8)); });
		relevantdocument = relevantdocument[0];
		reorderDocument(relevantdocument.id, (parseInt($(idOfTab).index())+1), !relevantdocument.privateLocation?"Agenda Submission Documents":"Private Submission Documents");
		relevantdocument.order = (parseInt($(idOfTab).index())+1);
		console.log(relevantdocument);
		if (relevantdocument.uploadObject != null){
			relevantdocument.uploadObject.order = (parseInt($(idOfTab).index())+1);
		}
	}
}
/*	Function:		initializeDocumentReorder(documentObject, oldLocation, newLocation)
	Description:	Given an old and new location of the tile, move relevant stuff.	*/
function initializeDocumentReorder(documentObject, oldLocation, newLocation){
	var relevantdocument = null;
	var idOfTab = null;

	//Now move it
	if (documentObject != null){
		reorderDocument(documentObject.id, (newLocation.NewIndex+1), !documentObject.privateLocation?"Agenda Submission Documents":"Private Submission Documents");
		documentObject.order = (newLocation.NewIndex+1);
		if (documentObject.uploadObject != null){
			documentOrder.uploadObject.order = (newLocation.NewIndex+1);
		}
	}
	
	//old list/newlist
	//for oldLocation.OGListID, update order of all at that index or after
	for (var i = oldLocation.OGIndex; i < parseInt($("#"+oldLocation.OGListID+">li").length); i++){
		idOfTab = "#" + $("#"+oldLocation.OGListID).children("li").eq(i).attr("id");
		relevantdocument = $.grep(documentArray, function(e){ return e.tempdocstack == parseInt($(idOfTab).attr("id").substr(8)); });
		relevantdocument = relevantdocument[0];
		reorderDocument(relevantdocument.id, (parseInt($(idOfTab).index())+1), !relevantdocument.privateLocation?"Agenda Submission Documents":"Private Submission Documents");
		relevantdocument.order = (parseInt($(idOfTab).index())+1);
		if (relevantdocument.uploadObject != null){
			relevantdocument.uploadObject.order = (parseInt($(idOfTab).index())+1);
		}
	}
}
/*	Function:		newCategory(name)
	Description:	Allows you to create a new category to store tiles under	*/
function newCategory(name){
	$().SPServices({
		operation: "UpdateListItems",
		async: false,
		batchCmd: "New",
		listName: "Submission Category",
		valuepairs:	[
						["Title", name],
					],
		completefunc: function(xData, Status) {}
	});
}
/*	Function:		reorderTile(tileID, newOrder)
	Description:	Changes the Tile Order of the tile represented by tileID to newOrder	*/
function reorderTile(tileID, newOrder){
	$().SPServices({
		operation: "UpdateListItems",
		async: false,
		batchCmd: "Update",
		listName: "Agenda Submission Documents",
		valuepairs: [
						["Submission_x0020_Order", newOrder]
					],
		ID: tileID,
		completefunc: function(xData, Status) {}
	});
}
/*	Function:		moveTile(tileID, bandID, newOrder)
	Description:	Changes the Tile Agenda Item ID and Agenda Item Timestamp ID of the tile represented by tileID to the band represented by bandID at the order of newOrder	*/
function moveTile(tileID, bandID, newOrder){
	var timestamp = "";
	var idandname = "";

	$().SPServices({
		operation: "GetListItems",
		async: false,
		listName: "Agenda Item",
		CAMLQuery: "<Query><Where><Eq><FieldRef Name='ID'/><Value Type='Counter'>"+bandID+"</Value></Eq></Where></Query>",
		CAMLViewFields: "<ViewFields Properties='True' />",
		completefunc: function (xData, Status) {
			$(xData.responseXML).SPFilterNode("z:row").each(function() {
				console.log(xData);
				
				timestamp = $(this).attr("ows_Agenda_x0020_Item_x0020_Timestam");
				idandname = $(this).attr("ows_ID") + ";#" + $(this).attr("ows_Title");
				
				$().SPServices({
					operation: "UpdateListItems",
					async: false,
					batchCmd: "Update",
					listName: "Agenda Submission Documents",
					valuepairs: [
									["Agenda_x0020_Item_x0020_Timestamp_x0020_ID", timestamp],
									["Agenda_x0020_Item_x0020_ID", idandname],
									["Submission_x0020_Order", newOrder],
								],
					ID: tileID,
					completefunc: function(xData, Status) {
						console.log(xData);
					}
				});
			});
		}
	});
}
/*	Function:		reorderBand(bandID, newOrder, uiid)
	Description:	Changes the Tile Agenda Item ID and Agenda Item Timestamp ID of the tile represented by tileID to the band represented by bandID	*/
function reorderBand(bandID, newOrder, uiid){
	$().SPServices({
		operation: "UpdateListItems",
		async: false,
		batchCmd: "Update",
		listName: "Agenda Item",
		valuepairs: [
						["Presentation_x0020_Order", newOrder.toFixed(0)]
					],
		ID: bandID,
		completefunc: function(xData, Status) {
			$(xData.responseXML).SPFilterNode("z:row").each(function() {
				$("#tab-bar-title-"+uiid).html(newOrder + ". " + $(this).attr("ows_Title"));
			});
		}
	});
}
/*	Function:		initializeBandReorder(uiid, oldOrderIndex, newOrderIndex)
	Description:	Given an old and new index of the band, move relevant stuff	*/
function initializeBandReorder(uiid, oldOrderIndex, newOrderIndex){
	var relevanttab = $.grep(meetingTabs, function(e){ return e.uiID == uiid; });
	var idOfTab;
	relevanttab = relevanttab[0];
	
	//reorder the moved one here
	if (newOrderIndex != null){
		reorderBand(relevanttab.actualID, (newOrderIndex+1), uiid);
		relevanttab.order = newOrderIndex+1;
	}
	
	if (newOrderIndex == null){
		//this item was deleted
		//change all items after this one as well				
		for (var i = oldOrderIndex; i < parseInt($("#agenda-items-list>li").length); i++){
			idOfTab = "#" + $("#agenda-items-list").children("li").eq(i).attr("id");
			relevanttab = $.grep(meetingTabs, function(e){ return e.uiID == parseInt($(idOfTab).attr("id").substr(4)); });
			relevanttab = relevanttab[0];
			reorderBand(relevanttab.actualID, ((parseInt($(idOfTab).index())+1)-1), relevanttab.uiID);
			relevanttab.order = ((parseInt($(idOfTab).index())+1)-1);
		}
	}
	else if (oldOrderIndex > newOrderIndex){
		//moved upwards to change all items after this one as well				
		for (var i = newOrderIndex+1; i < parseInt($("#agenda-items-list>li").length); i++){
			idOfTab = "#" + $("#agenda-items-list").children("li").eq(i).attr("id");
			relevanttab = $.grep(meetingTabs, function(e){ return e.uiID == parseInt($(idOfTab).attr("id").substr(4)); });
			relevanttab = relevanttab[0];
			reorderBand(relevanttab.actualID, (parseInt($(idOfTab).index())+1), relevanttab.uiID);
			relevanttab.order = (parseInt($(idOfTab).index())+1);
		}
	}
	else{
		//moved downwards to change all items up to this one as well
		for (var i = 0; i < newOrderIndex; i++){
			idOfTab = "#" + $("#agenda-items-list").children("li").eq(i).attr("id");
			relevanttab = $.grep(meetingTabs, function(e){ return e.uiID == parseInt($(idOfTab).attr("id").substr(4)); });
			relevanttab = relevanttab[0];
			reorderBand(relevanttab.actualID, (parseInt($(idOfTab).index())+1), relevanttab.uiID);
			relevanttab.order = (parseInt($(idOfTab).index())+1);
		}
	}
}
/*	Function:		initializeTileReorder(uiid, oldOrderIndex, newOrderIndex)
	Description:	Given an old and new index of the tile, move relevant stuff	*/
function initializeTileReorder(uiid, oldOrderIndex, newOrderIndex){
	var listid = $("#submission-tile-"+uiid).parent().attr("id").substring(17);
	var relevantsubmission;
	var relevanttab;
	var idOfTab;
	
	relevanttab = $.grep(meetingTabs, function(e){ return e.uiID == listid; });
	relevanttab = relevanttab[0];
	relevantsubmission = $.grep(relevanttab.arrayOfSubmissions, function(e){ return e.uiID == uiid; });
	relevantsubmission = relevantsubmission[0];
	
	//reorder the moved one here
	if (newOrderIndex != null){
		reorderTile(relevantsubmission.actualID, newOrderIndex+1);
		relevantsubmission.order = newOrderIndex+1;
	}
	
	if (newOrderIndex == null){
		//this item was deleted
		//change all items after this one as well
		
		for (var i = oldOrderIndex; i < (parseInt($("#submissions-list-" + listid + ">li").length)); i++){
			idOfTab = "#" + $("#submissions-list-" + listid).children("li").eq(i).attr("id");
			relevantsubmission = $.grep(relevanttab.arrayOfSubmissions, function(e){ return e.uiID == parseInt($(idOfTab).attr("id").substr(16)); });
			relevantsubmission = relevantsubmission[0];
			reorderTile(relevantsubmission.actualID, ((parseInt($(idOfTab).index())+1)-1));
			relevantsubmission.order = ((parseInt($(idOfTab).index())+1)-1);
		}
	}
	else if (oldOrderIndex > newOrderIndex){
		//moved leftwards to change all items after this one as well
		for (var i = newOrderIndex+1; i < (parseInt($("#submissions-list-" + listid + ">li").length)); i++){
			idOfTab = "#" + $("#submissions-list-" + listid).children("li").eq(i).attr("id");
			relevantsubmission = $.grep(relevanttab.arrayOfSubmissions, function(e){ return e.uiID == parseInt($(idOfTab).attr("id").substr(16)); });
			relevantsubmission = relevantsubmission[0];
			reorderTile(relevantsubmission.actualID, (parseInt($(idOfTab).index())+1));
			relevantsubmission.order = (parseInt($(idOfTab).index())+1);
		}
	}
	else{
		//moved rightwards (i know that's not a word, but I'm tired) to change all items up to this one as well
		for (var i = 0; i < newOrderIndex; i++){
			idOfTab = "#" + $("#submissions-list-" + listid).children("li").eq(i).attr("id");
			relevantsubmission = $.grep(relevanttab.arrayOfSubmissions, function(e){ return e.uiID == parseInt($(idOfTab).attr("id").substr(16)); });
			relevantsubmission = relevantsubmission[0];
			reorderTile(relevantsubmission.actualID, (parseInt($(idOfTab).index())+1));
			relevantsubmission.order = (parseInt($(idOfTab).index())+1);
		}
	}
}
/*	Function:		initializeTileMoveAndReorder(uiid, oldLocation, newLocation)
	Description:	Given an old and new location of the tile, move relevant stuff. This was stressful to write.	*/
function initializeTileMoveAndReorder(uiid, oldLocation, newLocation){
	var tabtomovefrom = null;
	var relevantsubmission = null;
	var tabtomoveto = null;
	var idOfTab;
	
	console.log(oldLocation);
	
	tabtomovefrom = $.grep(meetingTabs, function(e){ return e.uiID == parseInt(oldLocation.list.substr(17)); });
	tabtomovefrom = tabtomovefrom[0];
	relevantsubmission = $.grep(tabtomovefrom.arrayOfSubmissions, function(e){ return e.uiID == uiid; });
	relevantsubmission = relevantsubmission[0];
	tabtomoveto = $.grep(meetingTabs, function(e){ return e.uiID == parseInt(newLocation.list.substr(17)); });
	tabtomoveto = tabtomoveto[0];
	
	//move tile
	//server
	moveTile(relevantsubmission.actualID, tabtomoveto.actualID, (newLocation.index+1));
	//ui/model
	relevantsubmission.order = (newLocation.index+1);
	tabtomoveto.arrayOfSubmissions.push(relevantsubmission);
	for(var i = 0; i < tabtomovefrom.arrayOfSubmissions.length; i++){
        if(tabtomovefrom.arrayOfSubmissions[i].uiid == uiid){
            arr.splice(i, 1);  //removes 1 element at position i 
            break;
        }
    }
	
	//old list
	//for oldLocation.list, update order of all at that index or after
	for (var i = oldLocation.index; i < parseInt($("#"+oldLocation.list+">li").length); i++){
		idOfTab = "#" + $("#"+oldLocation.list).children("li").eq(i).attr("id");
		relevantsubmission = $.grep(tabtomovefrom.arrayOfSubmissions, function(e){ return e.uiID == parseInt($(idOfTab).attr("id").substr(16)); });
		relevantsubmission = relevantsubmission[0];
		reorderTile(relevantsubmission.actualID, (parseInt($(idOfTab).index())+1));
		relevantsubmission.order = (parseInt($(idOfTab).index())+1);
	}
	
	//new list
	//for newLocation.list, update order of all after that or after
	for (var i = newLocation.index+1; i < parseInt($("#"+newLocation.list+">li").length); i++){
		idOfTab = "#" + $("#"+newLocation.list).children("li").eq(i).attr("id");
		relevantsubmission = $.grep(tabtomoveto.arrayOfSubmissions, function(e){ return e.uiID == parseInt($(idOfTab).attr("id").substr(16)); });
		relevantsubmission = relevantsubmission[0];
		reorderTile(relevantsubmission.actualID, (parseInt($(idOfTab).index())+1));
		relevantsubmission.order = (parseInt($(idOfTab).index())+1);
	}
}
/*	Function:		refreshTile(bandIndex, tileIndex)
	Description:	Refreshes the tile at bandIndex, tileIndex */
function refreshTile(relevanttile){
	$("#submission-tile-minutes-" + relevanttile.uiID).html((relevanttile.object.attr("ows_External_x0020_Identifier") && relevanttile.object.attr("ows_External_x0020_Identifier") != "" ? 'ID: ' + relevanttile.object.attr("ows_External_x0020_Identifier") + '<br/>' : '') + "<em>" + parseInt(relevanttile.object.attr("ows_Time_x0020_In_x0020_Minutes")).toFixed(0) + " Minutes</em>");
	$("#submission-tile-title-" + relevanttile.uiID).html(relevanttile.object.attr("ows_Title"));
	try{
		$("#submission-tile-" + relevanttile.uiID).css('background', 'url("'+ relevanttile.object.attr("ows_Submission_x0020_Picture").substr(0,relevanttile.object.attr("ows_Submission_x0020_Picture").indexOf(",")) + '") white');
	}catch(e){}
}
/*	Function:		validateTile(identifier)
	Description:	Validates the new tile */
function validateTile(identifier, tabIdentifier, submissionIdentifier){
	var missingData = false;
	var page = 0;
	
	//validation
	//page 1
	if ($("#submissionName" + identifier).val() == ""){
		$("#submissionName" + identifier).addClass("missingData");
		missingData = true;
	}
	else{
		$("#submissionName" + identifier).removeClass("missingData");
	}
	if ($("#submissionMinutes" + identifier).val() == ""){
		$("#submissionMinutes" + identifier).addClass("missingData");
		missingData = true;
	}
	else{
		$("#submissionMinutes" + identifier).removeClass("missingData");
	}
	if (missingData){
		page = 1;
	}
	
	//page 2
	if ($("#submissionLeadMinistries" + identifier + " input:checkbox:checked").length == 0){
		$("#submissionLeadMinistries" + identifier).addClass("missingData");
		missingData = true;
	}
	else{
		$("#submissionLeadMinistry" + identifier).removeClass("missingData");
	}
	if (missingData && page == 0){
		page=2;
	}
	
	
	//page 3
	for (var i = 0; i < filesInSubmission.length; i++){
		if ($("#doc-title-" + (i+1)).val() == ""){
			$("#doc-title-" + (i+1)).addClass("missingData");
			missingData = true;
		}
		else{
			$("#doc-title-" + (i+1)).removeClass("missingData");
		}
	}
	if (missingData && page == 0){
		page=4;
	}
	
	if (!missingData){
		saveSubmission(tabIdentifier, submissionIdentifier);
	}
	else{
		submissionChangePage(page);
	}
}

/*	Date ISO Fixes */
Date.prototype.dateToISO8601String  = function() {
    var padDigits = function padDigits(number, digits) {
        return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
    }
    var offsetMinutes = this.getTimezoneOffset();
    var offsetHours = offsetMinutes / 60;
    var offset= "Z";    
    if (offsetHours < 0)
      offset = "-" + padDigits(offsetHours.replace("-","") + "00",4);
    else if (offsetHours > 0) 
      offset = "+" + padDigits(offsetHours  + "00", 4);

    return this.getFullYear() 
            + "-" + padDigits((this.getUTCMonth()+1),2) 
            + "-" + padDigits(this.getUTCDate(),2) 
            + "T" 
            + padDigits(this.getUTCHours(),2)
            + ":" + padDigits(this.getUTCMinutes(),2)
            + ":" + padDigits(this.getUTCSeconds(),2)
            + "." + padDigits(this.getUTCMilliseconds(),2)
            + offset;

}
Date.dateFromISO8601 = function(isoDateString) {
      var parts = isoDateString.match(/\d+/g);
      var isoTime = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
      var isoDate = new Date(isoTime);
      return isoDate;       
}
