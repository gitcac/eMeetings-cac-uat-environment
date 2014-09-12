/* Builds the right panel region (Submission Details) */

function buildRightPanel(obj, idOfContentInPanel, idOfPanel){	
	/* Usable Attributes in Obj (As of September 3rd 2014)
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
	"@LeadOrganizations": [{"@Name", "@Abbreviation"}]
	"@AffectedOrganizations"
	"@UsersWithACOI"
	"@UsersExcludedDueToInCamera"
	"@Image"
	"@DecisionItemDocuments": [{"@ID", "@Name", "@Link", "@PrivacyStatus", "@Order", "@Size", "@Filetype"}]
	"@SupportingDocuments": [{"@ID", "@Name", "@Link", "@PrivacyStatus", "@Order", "@Size", "@Filetype"}]
	"@PrivateDocuments": [{"@ID", "@Name", "@Link", "@PrivacyStatus", "@Order", "@Size", "@Filetype"}]
	"@DocumentCollectionStatus"
	"@TileNumber"
	"@Withdrawn"
	*/
	
	// Build List of Lead Organization(s)
	var stringOfLeadOrganizations = "<li>";
	for ( var i = 0; i < obj["@LeadOrganizations"].length; i++ ) {
		if ( i>0 ) {
			stringOfLeadOrganizations += "</li><li>";
		}
		stringOfLeadOrganizations += obj["@LeadOrganizations"][i]["@Name"];
	}
	stringOfLeadOrganizations += "</li>"
	
	var buildString = "<div id='submission-content'><h2 class='submission-header'>" + obj["@Name"] + "</h2><div class='css-table'>" +
				"<div class='css-table-row'><div class='css-table-cell'><h3>" + (obj["@LeadOrganizations"].length > 1 ? "Lead Organizations" : "Lead Organization") + ": </h3></div><div class='css-table-cell'><ul>" + stringOfLeadOrganizations + "</ul></div></div>" + 
				(obj["@AffectedOrganizations"] != "" ? "<div class='css-table-row'><div class='css-table-cell'><h3>" + ((obj["@AffectedOrganizations"].indexOf(",") > 1 ? "Affected Organizations" : "Affected Organization") + ": </h3></div><div class='css-table-cell'>" + obj["@AffectedOrganizations"] + "</div></div>") : "") +
				(obj["@Presenter"] && obj["@Presenter"] != "undefined" && obj["@Presenter"] != "" ? "<div class='css-table-row'><div class='css-table-cell'><h3>Presenter(s): </h3></div><div class='css-table-cell'>" + obj["@Presenter"] + "</div></div>" : "") +
				(obj["@Attendees"] && obj["@Attendees"] != "undefined" && obj["@Attendees"] != "" ? "<div class='css-table-row'><div class='css-table-cell'><h3>Attendee(s): </h3></div><div class='css-table-cell'>" + obj["@Attendees"] + "</div></div>" : "") +
				"</div><!-- /.css-table -->" +
				(obj["@Description"] && obj["@Description"] != "<p>undefined</p>" && obj["@Description"] != "" ? obj["@Description"] : "") +
				"<div id='documents-area'><h3 class='title-documents'>Documents</h3><p>Please note that all documents open in new windows/tabs</p>" + 
				"<div class='css-table'><div class='css-table-row'><div class='css-table-cell'><h4>Document Status: </h4></div><div class='css-table-cell'>" + obj["@DocumentCollectionStatus"] + "</div></div></div><!-- /.css-table -->" +
				(obj["@DecisionItemDocuments"] && obj["@DecisionItemDocuments"].length > 0 ? "<h4>Decision Items</h4>" : "" ) +
				"<div id='decisionitemdocumentlist'><ul id='di-doc-list' class='doc-list'></ul></div>" +
				(obj["@SupportingDocuments"] && obj["@SupportingDocuments"].length > 0 ? "<h4>Supporting Documents</h4>" : "" ) +
				"<div id='suportingdocumentlist'><ul id='s-doc-list' class='doc-list'></ul></div>" +
				(obj["@PrivateDocuments"] && obj["@PrivateDocuments"].length > 0 ? "<h4>Private Documents</h4>" : "" ) +
				"<div id='privatedocumentlist'><ul id='p-doc-list' class='doc-list'></ul></div></div>";
	
	$(idOfContentInPanel).html(buildString);
	$(idOfPanel).trigger('updatelayout');
	$(idOfPanel).panel('toggle');
	$('#di-doc-list').html(getDocuments(obj["@DecisionItemDocuments"]));
	$('#s-doc-list').html(getDocuments(obj["@SupportingDocuments"]));
	$('#p-doc-list').html(getDocuments(obj["@PrivateDocuments"]));
	$("#right-panel-close").focus();
	
	return buildString;
};


function getDocuments(obj){
	var buildString = "";
	var docCount = 0;
	
	for (var i = 0; i < obj.length; i++) {
		switch(obj[i]["@Filetype"]) {
			case "doc":
			case "docx":
				obj[i]["@cssClass"] = "doc";
				break;
			case "pdf":
				obj[i]["@cssClass"] = "pdf"
				break;
			case "ppt":
			case "pptx":
				obj[i]["@cssClass"] = "pp"
				break;
			case "xls":
			case "xlsx":
				obj[i]["@cssClass"] = "xls"
				break;
			default:
				obj[i]["@cssClass"] = "other"
				break;
		}

		if (obj[i]["@PrivacyStatus"] == "Yes") {
			var newThread = new Worker("../SharedAssets/thread.privatedocuments.js");

			newThread.onmessage = function (oEvent) {
				if (oEvent.data != "") {
					docCount++;
					$('#p-doc-list').append(oEvent.data);
				}
			};

			newThread.postMessage(JSON.stringify(obj[i]));
		}
		else {

			if (obj[i]["@New"] != null && obj[i]["@New"] == true) {
				obj[i]["@cssClass"]  += " newdocument";
			}
	
			buildString = buildString + "<li class='" + obj[i]["@cssClass"]  + "'><a target='_blank' href='" + obj[i]["@Link"] + "'>" + obj[i]["@Name"]+ "<span>["+obj[i]["@Filetype"].toUpperCase()+" - "+obj[i]["@Size"]+"]</span></a></li>";
			docCount++;
		}
	}
	
	if (docCount == 0){
		buildString = "";
	}
	
	return buildString;
};