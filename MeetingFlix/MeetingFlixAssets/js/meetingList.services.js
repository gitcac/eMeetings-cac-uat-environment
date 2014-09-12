angular.module('meetingList.services', [])
    .factory('sharePointAPIService', function($http) {
        
        var sharePointAPI = {};
        
        sharePointAPI.getMeetingInfo = function() {
            return $http.get('../SharedAssets/JSONFiles/MeetingManifest.json.safe');
        }
        return sharePointAPI;
    });
	