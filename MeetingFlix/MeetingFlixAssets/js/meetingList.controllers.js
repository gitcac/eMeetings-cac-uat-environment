angular.module('meetingList.controllers', [])
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
	/* Filter: datetimetojustdate
	   Function:  grabs a DateTime String and returns the date only */
	.filter('datetimetojustdate', function() {
		return function(newdateobject) {
			// 0123456789012345678901
			// 05/27/2014 #4:00:00 AM
						
			return new Date(newdateobject).toDateString();
		}
	})
	/* Controller: controllerManifest
	   Function:  The controller used to build the manifest of meetings */
	.controller('controllerManifest', function($scope, sharePointAPIService) {
        $scope.manifest = [];
		
        sharePointAPIService.getMeetingInfo().success(function (response) {
            // Get the relevant data
            $scope.manifest = response;
        });
    });
	