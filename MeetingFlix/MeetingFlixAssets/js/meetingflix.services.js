angular.module('meetingFlixApp.services', [])
    .factory('sharePointAPIService', function($http) {
        
        var sharePointAPI = {};
        
        sharePointAPI.getMeetingInfo = function() {		
			if (!doesThisUrlExist((location.href.substr(0, location.href.lastIndexOf("/"))).substr(0, (location.href.substr(0, location.href.lastIndexOf("/"))).lastIndexOf("/")+1) + 'SharedAssets/JSONFiles/binder.' +  getParameterByName("id") + '.json.safe')){
				location.href = location.href.substr(0, location.href.lastIndexOf("/") + 1) + 'MeetingNotFound.html';
			}

			return $http.get('../SharedAssets/JSONFiles/binder.' +  getParameterByName("id") + '.json.safe');
        }
		
        return sharePointAPI;
    });
	
	
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function doesThisUrlExist(url)
{
	var http = new XMLHttpRequest();
	http.open('HEAD', url, false);
	http.send();
	return http.status!=404;
}