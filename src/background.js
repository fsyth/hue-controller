/*global chrome*/

chrome.app.runtime.onLaunched.addListener(function () {
	'use strict';
	chrome.app.window.create('www/index.html', {
		'bounds': {
			'width': 450,
			'height': 520
		}
	});
});
