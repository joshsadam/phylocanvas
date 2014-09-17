$(function(){

	window.WGST = window.WGST || {};
	window.WGST.exports = window.WGST.exports || {};
	window.WGST.exports.mixpanel = window.WGST.exports.mixpanel || {};

	//
	// Landing page
	//

	$('[data-mixpanel-open-collection="Reference"]').on('click', function(){
		mixpanel.track("Landing > Open reference collection");
	});

	$('[data-mixpanel-open-collection="ST239"]').on('click', function(){
		mixpanel.track("Landing > Open ST239 collection");
	});

	$('[data-mixpanel-open-collection="EMRSA15"]').on('click', function(){
		mixpanel.track("Landing > Open EMRSA15 collection");
	});

	$('[data-mixpanel-button="subscribe"]').on('click', function(){
		mixpanel.track("Landing > Open EMRSA15 collection");
	});

	//
	// App page
	//

	$('body').on('click', '[data-mixpanel-navigation="feedback"]', function(){
		mixpanel.track("App > Open feedback");
	});

	$('body').on('click', '[data-mixpanel-navigation="landing"]', function(){
		mixpanel.track("App > Go to landing page");
	});

	$('body').on('click', '[data-mixpanel-show-tree-button="CORE_TREE_RESULT"]', function(){
		mixpanel.track("App | Collection Data Panel > Open CORE_TREE_RESULT tree");
	});

	$('body').on('click', '[data-mixpanel-open-assembly-panel]', function(){
		if ($(this).is('[title]')) {
			var userAssemblyId = $(this).attr('title');
			mixpanel.track("App | Collection Data Panel > Open assembly");
			mixpanel.track("App | Collection Data Panel > Open assembly " + userAssemblyId);
		}
	});

	window.WGST.exports.mixpanel.submitFeedback = function() {
		mixpanel.track("App > Submit feedback");
	}

	//
	// 404 page
	//
	
	$('[data-mixpanel-not-found-navigation="homepage"]').on('click', function(){
		mixpanel.track("404 > Go to landing page");
	});

});