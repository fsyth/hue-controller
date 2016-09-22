/*global console*/
/*jslint bitwise: true*/


/*********************
   Hue Parameters
 *********************/

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


/**************************
   XMLHttpRequest Methods
 **************************/

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
 *
 * Note: The callback is called asynchronously once the 
 * XMLHttpRequest responds.
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


/*********************
   Colour Conversions
 *********************/

/*
 * Converts values of hue, saturation and visibility to
 * red blue and green
 * @param h - the hue component of the colour (range 0-1)
 * @param s - the saturation component of the colour (range 0-1)
 * @param v - the visibility component of the colour (range 0-1)
 * -OR-
 * @param h - an object {h, s, v}
 *
 * @returns { r, g, b } - an object containing the values for
 *                        red, green and blue (range 0-255)
 */
function hsv2rgb(h, s, v) {
	'use strict';
    var r, g, b, i, f, p, q, t;
	
	// Allow an object { h, s, v } to be passed as h
    if (arguments.length === 1) {
        s = h.s;
		v = h.v;
		h = h.h;
    }
	
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
 * -OR-
 * @param r - an object {r, g, b}
 *
 * @returns { h, s, v } - an object containing the values for
 *                        hue, saturation and visibility (range 0-1)
 */
function rgb2hsv(r, g, b) {
	'use strict';
	// Allow an object { r, g, b } to be passed as r
    if (arguments.length === 1) {
        g = r.g;
		b = r.b;
		r = r.r;
    }
	
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
 * Converts byte values of red, green and blue to
 * a hexadecimal string starting with #
 * @param r - the red component of the colour (range 0-255)
 * @param g - the green component of the colour (range 0-255)
 * @param b - the blue component of the colour (range 0-255)
 * -OR-
 * @param r - an object {r, g, b}
 *
 * @returns { h, s, v } - an object containing the values for
 */
function rgb2hex(r, g, b) {
	'use strict';
	// Allow an object { r, g, b } to be passed as r
    if (arguments.length === 1) {
        g = r.g;
		b = r.b;
		r = r.r;
    }
	
	return '#' + ('00000' + (r << 16 + g << 8 + b)).slice(-6);
}


/*********************
   Example functions
 *********************/

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
	var hsv = hex2hsv(hex),
		hexStr = typeof hex === 'string' ?
				hex :
				'#' + ('00000' + hex.toString(16)).slice(-6);
	
	doStuff({
		hue: hsv.h * 0xFFFF | 0,
		sat: hsv.s * 0xFF | 0,
		bri: hsv.v * 0xFF | 0
	});
	
	document.body.style.backgroundColor = hexStr;
}


/*********************
   Colour wheel demo
 *********************/

// Attach event listeners to HTML inputs
document.addEventListener('DOMContentLoaded', function () {
	'use strict';
	var toggleInput = document.getElementById('toggle'),
		colourInput = document.getElementById('colour'),
		colourWheel = document.getElementById('colour-wheel'),
		modeInput = document.getElementById('mode'),
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
		mode = 0,
		modes = [ 'hue-sat', 'bri' ],
		currentColour = {
			h: 0,
			s: 0,
			v: 1,
			hex: 0xFFFFFF,
			r: 0xFF,
			g: 0xFF,
			b: 0xFF,
			a: 0xFF
		},
		mouse = {
			x: 0,
			y: 0
		},
		intervalHandle,
		timeInterval = 100;
	
	
	// Set the colour to the current colour
	function setColour(hex, hsv) {
		var	hexStr = typeof hex === 'string' ?
					hex :
					'#' + ('00000' + hex.toString(16)).slice(-6);
		
		hsv = hsv || hex2hsv(hex);

		doStuff({
			hue: hsv.h * 0xFFFF | 0,
			sat: hsv.s * 0xFF | 0,
			bri: hsv.v * 0xFF | 0
		});

		document.body.style.backgroundColor = hexStr;

		currentColour.h = hsv.h;
		currentColour.s = hsv.s;
		currentColour.v = hsv.v;

		if (colourInput) {
			colourInput.value = hexStr;
		}
	}
	
	// Updates currentColour to the colour of the pixel at the
	// mouse position
	function setColourToMousePosition() {
		var i = 4 * (mouse.y * W + mouse.x),
			hex,
			hsv;
		
		currentColour.r = buffer.data[i];
		currentColour.g = buffer.data[i + 1];
		currentColour.b = buffer.data[i + 2];
		currentColour.a = buffer.data[i + 3];
		
		// Convert rgb back to hsv
		hsv = rgb2hsv(currentColour);
		
		currentColour.h = hsv.h;
		currentColour.s = hsv.s;
		currentColour.v = hsv.v;
		
		hex = (currentColour.r << 16) + (currentColour.g << 8) + currentColour.b;
		
		currentColour.hex = hex;
		
		if (currentColour.a !== 0) {
			setColour(hex);
		}
	}
	
	
	// Creates the canvas, context and drawing buffer
	function createDrawingContext() {
		// Create a canvas in div#colourWheel
		canvas = document.createElement('canvas');
		
		// Set canvas dimensions
		canvas.width = W;
		canvas.height = H;
		
		// Add the canvas to the document
		colourWheel.appendChild(canvas);
		
		// Get the 2D context
		ctx = canvas.getContext('2d');
		
		// Create a buffer texture the dimensions of the colourwheel
		buffer = ctx.getImageData(0, 0, W, H);
	}
	
	
	// Draws the colour wheel at the current visibility
	function drawColourWheel() {
		var h, s, v, rgb;
		
		// For each byte in the buffer
		for (i = 0; i < buffer.data.length; i += 4) {
			// Calculate the x,y pixel coordinates
			x = i / 4 % W | 0;
			y = i / 4 / W | 0;
			
			// Convert x,y to radius from centre of the cirlce
			r = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2));
			
			// For certain radii, we can simplify calculations
			if (r >= radius) {
				// Outside of the circle, set to transparent
				buffer.data[i]     = 0;
				buffer.data[i + 1] = 0;
				buffer.data[i + 2] = 0;
				buffer.data[i + 3] = 0;
			} else {
				// Calculate the angle from the circle centre to the pixel
				t = Math.atan2(y - radius, x - radius);
				// Need to distinguish between +x/+y and -x/-y
				/*if (x < radius) {
					t += Math.PI;
				}*/
				
				// Scale angle to range 0-1 to give hue
				h = t / (2 * Math.PI);
				if (h < 0) {
					h += 1;
				}
				
				// Scale radius to range 0-1 to give saturation
				s = r / radius;
				
				// Visibility
				v = currentColour.v;
				
				// Convert hsv format to rgb format
				rgb = hsv2rgb(h, s, v);

				// Set the pixel in the buffer to the rgb colour
				buffer.data[i]     = rgb.r;
				buffer.data[i + 1] = rgb.g;
				buffer.data[i + 2] = rgb.b;
				buffer.data[i + 3] = 0xFF;
			}
		}
	}
	
	// Draws a circular brightness slider at the current hue and saturation
	function drawBrightnessSlider() {
		var h, s, v, rgb;
		for (i = 0; i < buffer.data.length; i += 4) {
			// Calculate the x,y pixel coordinates
			x = i / 4 % W | 0;
			y = i / 4 / W | 0;
			
			// Convert x,y to radius from centre of the cirlce
			r = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2));
			
			if (r >= radius) {
				// Outside of the circle, set to transparent
				buffer.data[i]     = 0;
				buffer.data[i + 1] = 0;
				buffer.data[i + 2] = 0;
				buffer.data[i + 3] = 0;
			} else {
				// Adjust the visibility of the current based on height y
				h = currentColour.h;
				s = currentColour.s;
				v = Math.max(1 - (y / H), 0.01);
				
				// Convert to rbg
				rgb = hsv2rgb(h, s, v);
					
				// Adjust the darkness of the colour based on v
				buffer.data[i]     = rgb.r;
				buffer.data[i + 1] = rgb.g;
				buffer.data[i + 2] = rgb.b;
				buffer.data[i + 3] = 0xFF;
			}
		}
	}
	
	
	// Renders the buffer to the canvas
	function renderBuffer() {
		ctx.putImageData(buffer, 0, 0);
	}
	
	
	// Draws everything depending on which mode is selected
	function draw() {
		switch (modes[mode]) {
		case 'hue-sat':
			drawColourWheel();
			break;

		case 'bri':
			drawBrightnessSlider();
			break;
		}
		renderBuffer();
	}
	
	
	// Changes to the next mode in the modes list 
	// and re-draws everything
	function changeMode() {
		mode = (mode + 1) % modes.length;
		draw();
	}
	
	
	// Attach a function to the on/off button
	if (toggleInput) {
		toggleInput.addEventListener('click', toggle);
	}
	
	// Attach a function to the native colour input
	if (colourInput) {
		colourInput.addEventListener('change', function () {
			setColour(colourInput.value);
			draw();
		});
	}
	
	// Attach a function to the mode button
	if (modeInput) {
		modeInput.addEventListener('click', changeMode);
	}
	
	// Create a colour wheel to select from
	if (colourWheel) {
		getStuff(function (res) {
			var rgb;
			
			// First update currentColour to the lights current state
			currentColour.h = res.hue / 0xFFFF;
			currentColour.s = res.sat / 0xFF;
			currentColour.v = res.bri / 0xFF;
		
			// Convert to rgb to init HTML elements
			rgb = hsv2rgb(currentColour);
			
			// Then draw the colour wheel or the brightness slider
			createDrawingContext();
			draw();
			
			canvas.addEventListener('mousemove', function (e) {
				// On mouse move, update the mouse coordinates relative to the canvas
				var rect = canvas.getBoundingClientRect();
				mouse.x = e.clientX - rect.left | 0;
				mouse.y = e.clientY - rect.top | 0;
			});

			canvas.addEventListener('mousedown', function (e) {
				// On mousedown, immediately set the colour
				setColourToMousePosition();
				// Clear any existing intervals, just in case.
				clearInterval(intervalHandle);
				// Also set an interval, allowing dynamic udate for click and drag
				intervalHandle = setInterval(setColourToMousePosition, timeInterval);
			});

			canvas.addEventListener('mouseup', function () {
				// On mouseup, end drag
				clearInterval(intervalHandle);
			});

			document.body.addEventListener('mouseout', function () {
				// On mouseout, end drag
				clearInterval(intervalHandle);
			});
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
