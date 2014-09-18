$(function(){!function(){window.WGST.exports.mapPanelTypeToContentTemplateId={assembly:"panel-content__assembly","collection-data":"panel-content__collection-data","collection-tree":"panel-content__collection-tree","collection-map":"collection-map-panel","assembly-upload-navigation":"assembly-upload-navigation-panel","assembly-upload-metadata":"assembly-upload-metadata-panel","assembly-upload-analytics":"assembly-upload-analytics-panel","assembly-upload-progress":"assembly-upload-progress-panel"},window.WGST.exports.createPanel=function(e,a){if($('.wgst-panel[data-panel-id="'+a.panelId+'"]').length>0)return window.WGST.exports.showPanel(a.panelId),void 0;a.panelLabel=window.WGST.exports.getContainerLabel({containerName:"panel",containerType:e,containerId:a.panelId,containerContext:a});var n=$('.wgst-template[data-template-id="panel"]').html(),t=Handlebars.compile(n),l=window.WGST.exports.mapPanelTypeToContentTemplateId[e];Handlebars.registerPartial("content",$('.wgst-template[data-template-id="'+l+'"]').html());var o=t(a);$(".wgst-workspace").prepend(o);var s=$('.wgst-panel[data-panel-id="'+a.panelId+'"]');s.draggable({handle:s.find(".wgst-draggable-handle"),appendTo:".wgst-page__app",scroll:!1}),window.WGST.exports.createHidable(a.panelId,a.panelLabel)},window.WGST.exports.removePanel=function(e){$('.wgst-panel[data-panel-id="'+e+'"]').remove(),window.WGST.exports.hidablePanelRemoved(e)},window.WGST.exports.showPanel=function(e){$('.wgst-panel[data-panel-id="'+e+'"]').removeClass("wgst--hide-this wgst--invisible-this"),window.WGST.exports.hidablePanelShown(e)},window.WGST.exports.hidePanel=function(e){$('.wgst-panel[data-panel-id="'+e+'"]').addClass("wgst--hide-this"),window.WGST.exports.hidablePanelHidden(e)},window.WGST.exports.togglePanel=function(e){var a=$('.wgst-panel[data-panel-id="'+e+'"]');a.is(".wgst--hide-this, .wgst--invisible-this")?window.WGST.exports.showPanel(e):window.WGST.exports.hidePanel(e)},window.WGST.exports.bringPanelToFront=function(e){var a=0;$(".wgst-panel").each(function(){var e=parseInt($(this).css("zIndex"),10);e>a&&(a=e)}),$('[data-panel-id="'+e+'"]').css("zIndex",a+1)},window.WGST.exports.maximizePanel=function(e){var a=$(".wgst-fullscreen").attr("data-fullscreen-id");window.WGST.exports.bringFullscreenToPanel(a),window.WGST.exports.bringPanelToFullscreen(e)},window.WGST.exports.getContainerLabel=function(e){console.debug("getContainerLabel:"),console.dir(e);var a="Anonymous";if("collection-data"===e.containerType)a="Data";else if("collection-map"===e.containerType)a="Map";else if("collection-tree"===e.containerType){var n=e.containerId.split("__")[2];a=n.replace(/[_]/g," ").toLowerCase().capitalize()}else"assembly"===e.containerType?a=e.containerContext.assemblyUserId:"assembly-upload-progress"===e.containerType?a="Assembly Upload":"assembly-upload-metadata"===e.containerType?a="Assembly Metadata":"assembly-upload-analytics"===e.containerType?a="Assembly Analytics":"assembly-upload-navigation"===e.containerType&&(a="Collection Navigation");return a},$("body").on("click",".wgst-panel-control-button__close",function(){var e=$(this).closest(".wgst-panel"),a=e.attr("data-panel-id");window.WGST.exports.hidePanel(a)}),$("body").on("click",'[data-panel-control-button="hide"]',function(){var e=$(this).closest(".wgst-panel"),a=e.attr("data-panel-id");window.WGST.exports.hidePanel(a)}),$("body").on("mousedown",".wgst-panel",function(){window.WGST.exports.bringPanelToFront($(this).attr("data-panel-id"))}),$("body").on("click",".wgst-panel-control-button__maximize",function(){var e=$(".wgst-fullscreen"),a=e.attr("data-fullscreen-id"),n=a;window.WGST.exports.bringFullscreenToPanel(a);var t=$(this).closest(".wgst-panel"),n=t.attr("data-panel-id"),a=n;window.WGST.exports.bringPanelToFullscreen(n,a)})}()});