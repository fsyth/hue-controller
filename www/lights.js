/*global console*/
/*jslint bitwise: true*/

var hue = {
	ip: '192.168.1.185',
	userId: 'qRZ0f2agZeihyCWSBBpWPRUpRg03n9VuXTcRHtHq',
	lightNo: 2,
	getUrl: function () {
		'use strict';
		//`http://$(this.ip)/api/$(this.userId)/lights/$(this.lightNo)`
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
			//console.log(res[0]);
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
			//console.log(res.state);
			if (typeof responseHandler === 'function') {
				/*if (!res.state.on) {
					console.log('Light will respond to changes once turned on.');
				}*/
				responseHandler(res.state);
			}
		}
	};

	xhr.open('GET', hue.getUrl());
	xhr.send();
}


/*
 * Converts values of hue, saturation and visibility to
 * red blue and green
 * @param h - the hue component of the colour (range 0-1)
 * @param s - the saturation component of the colour (range 0-1)
 * @param v - the visibility component of the colour (range 0-1)
 * @returns { r, g, b } - an object containing the values for
 *                        red, green and blue (range 0-255)
 */
function hsv2rgb(h, s, v) {
	'use strict';
    var r, g, b, i, f, p, q, t;
    /*if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }*/
    i = h * 6 | 0;
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
	
    switch (i % 6) {
	case 0:
		r = v;
		g = t;
		b = p;
		break;
	
	case 1:
		r = q;
		g = v;
		b = p;
		break;
	
	case 2:
		r = p;
		g = v;
		b = t;
		break;
	
	case 3:
		r = p;
		g = q;
		b = v;
		break;
	
	case 4:
		r = t;
		g = p;
		b = v;
		break;
	
	case 5:
		r = v;
		g = p;
		b = q;
		break;
	}
    
	return {
        r: r * 0xFF | 0,
        g: g * 0xFF | 0,
        b: b * 0xFF | 0
    };
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
		colourInput = document.getElementById('colour'),
		colourWheel = document.getElementById('colour-wheel'),
		canvas,
		ctx,
		buffer,
		radius = 200,
		W = 2 * radius,
		H = 2 * radius,
		i,
		x,
		y,
		r,
		t,
		h,
		s,
		v,
		rgb,
		mouse = {},
		intervalHandle,
		timeInterval = 100;
	
	function setColourToMousePosition() {
		var i = 4 * (mouse.y * W + mouse.x),
			rgb = {
				r: buffer.data[i],
				g: buffer.data[i + 1],
				b: buffer.data[i + 2],
				a: buffer.data[i + 3]
			},
			hex = (rgb.r << 16) + (rgb.g << 8) + rgb.b;

		if (rgb.a !== 0) {
			setColour(hex);
			document.body.style.backgroundColor = '#' + hex.toString(16);

		}
	}
			
	if (toggleInput) {
		toggleInput.addEventListener('click', toggle);
	}
	
	if (colourInput) {
		colourInput.addEventListener('change', function () {
			setColour(colourInput.value);
		});
	}
	
	if (colourWheel) {
		canvas = document.createElement('canvas');
		//canvas.style.border = "1px solid black";
		canvas.width = W;
		canvas.height = H;
		colourWheel.appendChild(canvas);
		ctx = canvas.getContext('2d');
		
		buffer = ctx.getImageData(0, 0, W, H);
		
		for (i = 0; i < buffer.data.length; i += 4) {
			x = i / 4 % W | 0;
			y = i / 4 / W | 0;
			r = Math.sqrt(Math.pow(x - W / 2, 2) + Math.pow(y - H / 2, 2));
			
			if (r >= radius) {
				// Outside of the circle
				buffer.data[i]     = 0;
				buffer.data[i + 1] = 0;
				buffer.data[i + 2] = 0;
				buffer.data[i + 3] = 0;
			} else if (x === W / 2 && y === H / 2) {
				// The exact centre
				buffer.data[i]     = 0xFF;
				buffer.data[i + 1] = 0xFF;
				buffer.data[i + 2] = 0xFF;
				buffer.data[i + 3] = 0xFF;
			} else {
				t = Math.atan((y - H / 2) / (x - W / 2));
				if (x < W / 2) {
					t += Math.PI;
				}
				h = t / (2 * Math.PI);
				if (h < 0) {
					h += 1;
				}
				s = r / radius;
				v = 1; ////////////////////////////////////////////////////////// from other bar
				rgb = hsv2rgb(h, s, v);

				buffer.data[i]     = rgb.r;
				buffer.data[i + 1] = rgb.g;
				buffer.data[i + 2] = rgb.b;
				buffer.data[i + 3] = 0xFF;
			}
		}
		
		ctx.putImageData(buffer, 0, 0);
		
		canvas.addEventListener('mousemove', function (e) {
			var rect = canvas.getBoundingClientRect();
			mouse.x = e.clientX - rect.left;
			mouse.y = e.clientY - rect.top;
		});
		
		canvas.addEventListener('mousedown', function (e) {
			setColourToMousePosition();
			intervalHandle = setInterval(setColourToMousePosition, timeInterval);
		});
		
		canvas.addEventListener('mouseup', function () {
			clearInterval(intervalHandle);
		});
		
		canvas.addEventListener('mouseout', function () {
			clearInterval(intervalHandle);
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
