$(function() {
    function next(arg) {
	$.getJSON('/get'+(arg?("/"+arg):""),function(data) {
	    if (data._id) {
		$("#email").val(data._id);
		$("#next").show();
		$("#get").hide();
	    } else {
		$("#get-no").show();
		$("#get").show();
		$("#next").hide();
	    }
	});
    }
    $("#get,#no").click(function() {next(); });
    $("#invite").click(function() { next($("#email").val());  });
});