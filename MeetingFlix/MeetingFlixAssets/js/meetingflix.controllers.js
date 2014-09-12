var highlightedtile;
var differences = [];
var responseObject = null;
var nonotificationsstring = 'No New Notifications';
var currentUser = $().SPServices.SPGetCurrentUser();

angular.module('meetingFlixApp.controllers', [])
	/* Directive: onLastRepeat
	   Function:  Creates the directive for when an ng-repeat is complete */
    .directive('onLastRepeat', function() {
        return function(scope, element, attrs) {
            if (scope.$last) setTimeout(function(){
                scope.$emit('onRepeatLast', element, attrs);
            }, 1);
        };
    })
	/* Filter: unsafe
	   Function: allows for html substitutions
	   From: http://stackoverflow.com/questions/18340872 */
	.filter('unsafe', function($sce) {
		return function(val) {
			return $sce.trustAsHtml(val);
		};
	})
	/* Filter: datetimetojusttime
	   Function:  grabs a DateTime String and returns the time only, gets rid of seconds */
	.filter('datetimetojusttime', function() {
		return function(newdateobject) {
			// 0123456789012345678901
			// 05/27/2014 #4:00:00 AM
			var x = "";
			
			if (newdateobject){
				x = newdateobject.substring(11, newdateobject.length);
				var tod = newdateobject.substring(newdateobject.length-2, newdateobject.length);
				x = x.substring(0,x.length-6) + " " + tod;
			}
			
			return x;
		}
	})
	/* Filter: truncatetitle
	   Function:  truncates title */
	.filter('truncatetitle', function() {
		return function(x) {
			
			if (x.length > 100){
				x = x.substring(0,100) + "...";
			}
			
			return x;
		}
	})
	/* Filter: checkForImageAuthenticity
	   Function: If the image is null, throw in a placeholder. This method is deprecated */
	.filter('checkForImageAuthenticity', function(){
		return function(newimageurl) {	
			return newimageurl;
		}
	})
	/* Filter: removeBlankBandsAndThenSort
	   Function: Gets rid of Bands without Submissions then sorts the remaining arrays */
	.filter('removeBlankBandsAndThenSort', function(){
		return function(input, attribute) {
			if (!angular.isObject(input)) return input;
		}
	})
	/* Controller: controllerBuildMainInterface
	   Function:  The main controller used to build the tile/band interface, agenda panel and header */
	.controller('controllerBuildMainInterface', function($scope, $window, sharePointAPIService) {
		$scope.bands = [];
		$scope.categories = [];
		$scope.types = [];
		$scope.meetingInfo = [];
		$scope.listview = 1;

		//*******************************************************
		//Touch Carousel Method - Called on last repeat
		//*******************************************************
		$scope.$on('onRepeatLast', function(scope, element, attrs){
			$(".carousel-image-and-text").touchCarousel({					
				pagingNav: false,
				snapToItems: false,
				itemsPerMove: 4,				
				scrollToLast: false,
				loopItems: false,
				scrollbar: true
			});
		});
		
		//*******************************************************
		// Right panel Binding
		//*******************************************************
		$scope.selected = function(tabid, tileid) {
			openRightPanel(tabid, tileid);
		};
		
		sharePointAPIService.getMeetingInfo().success(function (response) {
			// store for later cause why not?
			responseObject = response;
		
			//Changes since last visit determined here
			if (localStorage.getItem("meetingObject" + response.Meeting["@ID"])){
				// this meeting has been accessed on this device before. retrieve it and check for differences
				whatAreTheDifferences(JSON.parse(localStorage.getItem("meetingObject" + response.Meeting["@ID"])), response);
			}
			else {
				// this meeting has NOT been accessed on this device before. store it for later
				localStorage.setItem("meetingObject" + response.Meeting["@ID"], JSON.stringify(response));
				//and then tell the user there are no notifications
				$("#notifications-button").hide();
			}
			
			//check for COIs and ICEs
			checkForBlocks(response);
		
			// Get the relevant data
			$scope.bands = response.Meeting["@Bands"];
			$scope.meetingInfo = response.Meeting;
			// loop through bands & tiles to get all categories
			for (var i = 0; i < $scope.bands.length; i++) {
				var band = $scope.bands[i];
				for (var j = 0; j < band["@Tiles"].length; j++) {
					var tile = band["@Tiles"][j];
					if (tile["@Category"]) {
						$scope.categories.push(tile["@Category"]);
					} else {
						$scope.empty_categories = true;
					}
					if (tile["@Type"]) {
						$scope.types.push(tile["@Type"]);
					} else {
						$scope.empty_types = true;
					}
				};
			};
		});

		$scope.changePage = function() {
			// Views
			// 1 = Meeting.html
			// 2 = MeetingCategories.html
			// 3 = MeetingCoverflow.html
			// 4 = MeetingTypes.html

			// first we look at current URL to see if they just changed it to the current one
			// if so do nothing
			// else do a replace on URL

			var paths = [];
			paths[1] = 'Meeting.html';
			paths[2] = 'MeetingCategories.html';
			paths[3] = 'MeetingCoverflow.html';
			paths[4] = 'MeetingTypes.html';
			var path = $window.location.pathname,
				search = $window.location.search;
			if(path.indexOf(paths[$scope.listview])==-1){
				$window.location.pathname = path.replace(/Meeting[a-zA-Z]{0,11}\.html$/, paths[$scope.listview]);
			}
		};
    })
	/* Filter: unique
	   Function: filters out duplicates
	   From: http://stackoverflow.com/a/23595087 */
	.filter('unique', function() {
		return function (items, filterOn) {
		
			if (filterOn === false) {
				return items;
			}

			if ((filterOn || angular.isUndefined(filterOn)) && angular.isArray(items)) {
				var hashCheck = {}, newItems = [];

				var extractValueToCompare = function (item) {
					if (angular.isObject(item) && angular.isString(filterOn)) {
						return item[filterOn];
					} else {
						return item;
					}
				};

				angular.forEach(items, function (item) {
					var valueToCheck, isDuplicate = false;

					for (var i = 0; i < newItems.length; i++) {
						if (angular.equals(extractValueToCompare(newItems[i]), extractValueToCompare(item))) {
							isDuplicate = true;
							break;
						}
					}
					if (!isDuplicate) {
						newItems.push(item);
					}

				});
				items = newItems;
			}
			return items.sort();
		};
	})
		
	function getFileExtension(url) {
    	return url.split('.').pop().split(/\#|\?/)[0];
	}
	
	function whatAreTheDifferences(oldMeetingObject, newMeetingObject){	
		if (! (JSON.stringify(oldMeetingObject) == JSON.stringify(newMeetingObject))){
			// 1. check for new tiles - flag them as new
			// 2. check for updated data in the tiles - flag them as updated
			// 3. check for new documents in existing tiles - flag them and their tile as updated

			var arrayOfOldTiles = [];
			for (var i = 0; i < oldMeetingObject.Meeting["@Bands"].length; i++){
				for (var j = 0; j < oldMeetingObject.Meeting["@Bands"][i]["@Tiles"].length; j++){
					var x = [];
					var y = [];
					for (var k = 0; k < oldMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@DecisionItemDocuments"].length; k++){
						x.push({"@ID":oldMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@DecisionItemDocuments"][k]["@ID"]});
					};
					for (var k = 0; k < oldMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@SupportingDocuments"].length; k++){
						y.push({"@ID":oldMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@SupportingDocuments"][k]["@ID"]});
					};
					arrayOfOldTiles.push({
						"ID":oldMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@ID"],
						"Name":oldMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Name"],
						"Description":oldMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Description"],
						"DecisionItemDocuments": x,
						"SupportingDocuments":y
					});
				};
			};
			
			for (var i = 0; i < newMeetingObject.Meeting["@Bands"].length; i++){
				for (var j = 0; j < newMeetingObject.Meeting["@Bands"][i]["@Tiles"].length; j++){
					var x = $.grep(arrayOfOldTiles, function(e){ return e["ID"] == newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@ID"] });

					if (x[0] == null){
						// 1. check for new tiles - flag them as new
						newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@New"] = true;
						differences.push('A new tile named <a href="javascript:openRightPanel('+newMeetingObject.Meeting["@Bands"][i]["@ID"]+','+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@ID"]+')">"'+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Name"]+'"</a> has been added.');
					}
					else{
						newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@New"] = false;
						// 2. check for updated data in the tiles - flag them as updated
						if (!(newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Name"] == x[0]["Name"])){
							newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Updated"] = true;
							differences.push('The tile formerly named "' + x[0]["Name"] + '" has been renamed to <a href="javascript:openRightPanel('+newMeetingObject.Meeting["@Bands"][i]["@ID"]+','+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@ID"]+')">"'+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Name"]+'"</a>.');
						}
						else if (!(newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Description"] == x[0]["Description"])){
							newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Updated"] = true;
							differences.push('The tile named <a href="javascript:openRightPanel('+newMeetingObject.Meeting["@Bands"][i]["@ID"]+','+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@ID"]+')">"'+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Name"]+'"</a> has had its description updated.');
						}
						else{
							newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Updated"] = false;
						}
						// 3. check for new documents in existing tiles - flag them and their tile as updated
						// Decision Items
						for (var k = 0; k < newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@DecisionItemDocuments"].length; k++){
							var y = $.grep(x[0]["DecisionItemDocuments"], function(e){ return e["@ID"] == newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@DecisionItemDocuments"][k]["@ID"] });
							if (y[0] != null){
								// 3. check for new documents in existing tiles - flag them and their tile as updated
								newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@DecisionItemDocuments"][k]["@New"] = false;
							}
							else{
								newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@DecisionItemDocuments"][k]["@New"] = true;
								newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Updated"] = true;
								differences.push('The tile named <a href="javascript:openRightPanel('+newMeetingObject.Meeting["@Bands"][i]["@ID"]+','+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@ID"]+')">"'+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Name"]+'"</a> has a new or updated decision item document named <a data-ajax="false" href="'+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@DecisionItemDocuments"][k]["@Link"]+'">' + newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@DecisionItemDocuments"][k]["@Name"] + '</a>.');
							}
						}
						// 3. check for new documents in existing tiles - flag them and their tile as updated
						// Supporting Documents
						for (var k = 0; k < newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@SupportingDocuments"].length; k++){
							var y = $.grep(x[0]["SupportingDocuments"], function(e){ return e["@ID"] == newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@SupportingDocuments"][k]["@ID"] });
							if (y[0] != null){
								// 3. check for new documents in existing tiles - flag them and their tile as updated
								newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@SupportingDocuments"][k]["@New"] = false;
							}
							else{
								newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@SupportingDocuments"][k]["@New"] = true;
								newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Updated"] = true;
								differences.push('The tile named <a href="javascript:openRightPanel('+newMeetingObject.Meeting["@Bands"][i]["@ID"]+','+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@ID"]+')">"'+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@Name"]+'"</a> has a new or updated supporting document named <a data-ajax="false" href="'+newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@SupportingDocuments"][k]["@Link"]+'">' + newMeetingObject.Meeting["@Bands"][i]["@Tiles"][j]["@SupportingDocuments"][k]["@Name"] + '</a>.');
							}
						}
						//SKIPPING PRIVATE DOCUMENTS!!!!
					}
				};
			};
		}
		
		var numberOfDifferences = differences.length;
		if (numberOfDifferences != 0) {
			$("#notifications-count").empty().append(numberOfDifferences);
			var differencesString = "";
			for (var i = 0; i < numberOfDifferences; i++){
				differencesString += "<li>" + differences[i] + "</li>";
			}
			$("#notifications").append('<a href="javascript:clearNotifications()">Clear Notifications</a><ul>' + differencesString + '</ul>');
		}
		else {
			$("#notifications-count").empty().append('0');
			$("#notifications").append(nonotificationsstring);
		}
	}
	
	function checkForBlocks(response){
		for (var i = 0; i < response.Meeting["@Bands"].length; i++){
				for (var j = 0; j < response.Meeting["@Bands"][i]["@Tiles"].length; j++){
					try{
						if (response.Meeting["@Bands"][i]["@Tiles"][j]["@UsersWithACOI"].toLowerCase().indexOf(currentUser.toLowerCase()) != -1){
							//conflict of interest
							response.Meeting["@Bands"][i]["@Tiles"][j]["@DisplayCOI"] = true;
						}
						else{
							response.Meeting["@Bands"][i]["@Tiles"][j]["@DisplayCOI"] = false;
						}
					}catch(e){
						response.Meeting["@Bands"][i]["@Tiles"][j]["@DisplayCOI"] = false;
					}
					try{
						if (response.Meeting["@Bands"][i]["@Tiles"][j]["@UsersExcludedDueToInCamera"].toLowerCase().indexOf(currentUser.toLowerCase()) != -1){
							//in camera exclusion
							response.Meeting["@Bands"][i]["@Tiles"][j]["@DisplayICE"] = true;
						}
						else{
							response.Meeting["@Bands"][i]["@Tiles"][j]["@DisplayICE"] = false;
						}
					}catch(e){
						response.Meeting["@Bands"][i]["@Tiles"][j]["@DisplayICE"] = false;
					}
					
				}
		}
		return response; //not that it matters as its passing by reference but whatever...
	}
	
	function clearNotifications() {
		//make this meeting the new object so existing changes wont be generated as notifications again
		localStorage.setItem("meetingObject" + responseObject.Meeting["@ID"], JSON.stringify(responseObject));
		location.reload();
	}
	
	function openRightPanel(tabid, tileid){
		var submissionInfo = parseInt(tileid);
		var generatedSubmissionInfo = "";
		var x;
		
		//bleh. find the correct tile object, passes it and the panel to the RightPanelEngine.js function named "buildRightPanel"
		
		if (responseObject.Meeting["@Bands"]){
			for (var i = 0; i < responseObject.Meeting["@Bands"].length; i++){
				if (responseObject.Meeting["@Bands"][i]["@ID"] == tabid){
					for (var j = 0; j < responseObject.Meeting["@Bands"][i]["@Tiles"].length; j++){
						if (parseInt(responseObject.Meeting["@Bands"][i]["@Tiles"][j]['@ID']) == submissionInfo){
							if (!(responseObject.Meeting["@Bands"][i]["@Tiles"][j]["@Withdrawn"] || responseObject.Meeting["@Bands"][i]["@Tiles"][j]["@DisplayCOI"] || responseObject.Meeting["@Bands"][i]["@Tiles"][j]["@DisplayICE"] )){
								if (highlightedtile != null) {
									$("#tile"+ highlightedtile).removeClass("touched");
								}
								highlightedtile = tabid + "-" + tileid;
								$("#tile" + highlightedtile).addClass("touched");
								x = responseObject.Meeting["@Bands"][i]["@Tiles"][j];
								buildRightPanel(x, '#submission-info-panel-inner', '#submission-info-panel');
								break;
							}
						}
					}
				}
			}
		}
	}
	
	