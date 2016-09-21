/*global console*/
/*jslint bitwise: true*/

var hue = {
	ip: '192.168.1.185',
	userId: 'qRZ0f2agZeihyCWSBBpWPRUpRg03n9VuXTcRHtHq',
	lightNo: 2,
	getUrl: function () {
		'use strict';
		//`http://$(this.ip)/api/$(this.userId)/lights/$(this.lightNo)`
		/*return 'http://<ip>/api/<userId>/lights/<lightNo>'
			.replace(/<ip>/, this.ip)
			.replace(/<userId>/, this.userId)
			.replace(/<lightNo>/, this.lightNo);*/
		return 'http://' + this.ip + '/api/' + this.userId + '/lights/' + this.lightNo;
	},
	putUrl: function () {
		'use strict';
		return this.getUrl() + '/state';
	}
};


/*
 * This function sends a data object to the hue light.
 * @param settings - The light settings to be overwritten
 * @param responseHandler - a callback function whose first
 *                          argument contains the response
 */
function doStuff(settings, responseHandler) {
	'use strict';
	var xhr = new XMLHttpRequest();

	xhr.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			var res = JSON.parse(this.responseText);
			console.log(res[0]);
			if (responseHandler === 'function') {
				responseHandler(res[0]);
			}
		}
	};

	xhr.open('PUT', hue.putUrl(), true);

	xhr.send(typeof settings === 'string' ? settings : JSON.stringify(settings));
}


/*
 * This function gets the current data object held by the light
 * @param responseHandler - a callback function whose first
 *                          argument contains the response
 */
function getStuff(responseHandler) {
	'use strict';
	var xhr = new XMLHttpRequest();

	xhr.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			var res = JSON.parse(this.responseText);
			console.log(res.state);
			if (typeof responseHandler === 'function') {
				if (!res.state.on) {
					console.log('Light will respond to changes once turned on.');
				}
				responseHandler(res.state);
			}
		}
	};

	xhr.open('GET', hue.getUrl());
	xhr.send();
}


/*
 * Converts byte values of red, green and blue to
 * hue, saturation and visibility
 * @param r - the red component of the colour (range 0-255)
 * @param g - the green component of the colour (range 0-255)
 * @param b - the blue component of the colour (range 0-255)
 * @returns { h, s, v } - an object containing the values for
 *                        hue, saturation and visibility (range 0-1)
 */
function rgb2hsv(r, g, b) {
	'use strict';
	r /= 0xFF;
	g /= 0xFF;
	b /= 0xFF;
	
	var rr, gg, bb,
		h, s,
		v = Math.max(r, g, b),
		diff = v - Math.min(r, g, b),
		diffc = function (c) {
			return (v - c) / 6 / diff + 1 / 2;
		};

	if (diff === 0) {
		h = s = 0;
	} else {
		s = diff / v;
		rr = diffc(r);
		gg = diffc(g);
		bb = diffc(b);

		if (r === v) {
			h = bb - gg;
		} else if (g === v) {
			h = (1 / 3) + rr - bb;
		} else if (b === v) {
			h = (2 / 3) + gg - rr;
		}
		
		if (h < 0) {
			h += 1;
		} else if (h > 1) {
			h -= 1;
		}
	}
	
	return {
		h: h,
		s: s,
		v: v
	};
}


/*
 * Converts a 6 digit hexadecimal colour string or number to hsv
 * @param hex - The rgb hex colour string, e.g. '#1AF2A9', 0x123456
 * @returns { h, s, v } - an object containing the values for
 *                        hue, saturation and visibility (range 0-1)
 */
function hex2hsv(hex) {
	'use strict';
	if (typeof hex === 'string') {
		hex = parseInt(hex.replace(/^#/, ''), 16);
	}
	
	var r = (hex & 0xFF0000) >> 16,
		g = (hex & 0x00FF00) >> 8,
		b = (hex & 0x0000FF) >> 0;
	
	return rgb2hsv(r, g, b);
}


/*
 * Toggles the light between the on and off states
 */
function toggle() {
	'use strict';
	getStuff(function (res) {
		doStuff({ on: !res.on });
	});
}


/*
 * Sets the colour of the light from a colour hex
 * @param hex - The rgb hex colour string, e.g. '#1AF2A9', 0x123456
 */
function setColour(hex) {
	'use strict';
	var hsv = hex2hsv(hex);
	console.log(hsv);
	doStuff({
		hue: hsv.h * 0xFFFF | 0,
		sat: hsv.s * 0xFF | 0,
		bri: hsv.v * 0xFF | 0
	});
}


// Attach event listeners to HTML inputs
document.addEventListener('DOMContentLoaded', function () {
	'use strict';
	var toggleInput = document.getElementById('toggle'),
		colourInput = document.getElementById('colour');
	
	if (toggleInput) {
		toggleInput.addEventListener('click', toggle);
	}
	
	if (colourInput) {
		colourInput.addEventListener('change', function () {
			setColour(colourInput.value);
		});
	}
});

// Test refresh rates
/*var isOn = false;
setInterval(function () {
	'use strict';
	isOn = !isOn;
	doStuff({ on: isOn });
}, 100);*/
