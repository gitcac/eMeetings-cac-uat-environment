onmessage = function (oEvent) {
	var x = JSON.parse(oEvent.data);
	
	function makeRequest(url)
	{
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		xhr.onreadystatechange = receiveResponse;
		xhr.send();
	}
	
	function receiveResponse(e)
	{
		if (this.readyState == 4)
		{
			// xhr.readyState == 4, so we've received the complete server response
			if (this.status == 200)
			{
				// xhr.status == 200, so the response is good
				var n = this.response.search("Access Denied");

				postMessage((n!=-1 ? "" : "<li class='" + x['@cssClass']  + (x['@New'] == true ? 'newDocument' : '') + "'><a target='_blank' href='" + x['@Link'] + "'>" + x['@Name']+ "<span>["+x['@Filetype'].toUpperCase()+" - "+x['@Size']+"]</span></a></li>"));
				
			}
		}
	}
				
	makeRequest(x['@Link']);
};