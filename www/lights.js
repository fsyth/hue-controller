/*global console*/
/*jslint bitwise: true*/


/*********************
   Hue Parameters
 *********************/

var hue = {
	ip: '192.168.1.185',
	userId: 'qRZ0f2agZeihyCWSBBpWPRUpRg03n9VuXTcRHtHq',
	lightNo: 2
};

hue.getUrl = 'http://' + hue.ip + '/api/' + hue.userId + '/lights/' + hue.lightNo;
hue.putUrl = hue.getUrl + '/state';


/**************************
   XMLHttpRequest Methods
 **************************/

/*
 * This function sends a data object to the hue light.
 * @param settings - The light settings to be overwritten
 * @param responseHandler - a callback function whose first
 *                          argument contains the response
 *
 * Note: The callback is called asynchronously once the
 * XMLHttpRequest responds.
 */
function doStuff(settings, responseHandler) {
	'use strict';
	var xhr = new XMLHttpRequest();

	xhr.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			var res = JSON.parse(this.responseText);
			//console.log(res[0]);
			if (typeof responseHandler === 'function') {
				responseHandler(res[0]);
			}
		}
	};

	xhr.open('PUT', hue.putUrl, true);
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
function getStuff(responseHandler, errorHandler) {
	'use strict';
	var xhr = new XMLHttpRequest();

	xhr.onreadystatechange = function () {
		if (this.readyState === 4) {
			// If complete
			if (this.status === 200) {
				// If successful
				var res = JSON.parse(this.responseText);
				//console.log(res.state);
				if (res[0] && res[0].error) {
					// An error occurred so alert it
					console.log('An error occurred when getting data from the Hue Bridge:\n' +
								res[0].error.description);

					if (typeof errorHandler === 'function') {
						errorHandler(res[0].error);
					}
				} else if (typeof responseHandler === 'function') {
					// Call the response handler and pass in the state object
					responseHandler(res.state);
				}
			}/* else {
				// Unsuccessful xhr
				console.log(this);
				if (typeof errorHandler === 'function') {
					errorHandler(this.statusText);
				}
			}*/
		}
	};
	
	xhr.onerror = function () {
		// Unsuccessful xhr
		if (typeof errorHandler === 'function') {
			errorHandler(this.statusText);
		}
	};

	xhr.open('GET', hue.getUrl);
	xhr.send();
}


/*********************
   Colour Conversions
 *********************/

function clamp(num, min, max) {
	'use strict';
	return num < min ? min : num > max ? max : num;
}


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
 * @returns string - formatted '#rrggbb'
 */
function rgb2hex(r, g, b) {
	'use strict';
	// Allow an object { r, g, b } to be passed as r
	if (arguments.length === 1) {
		g = r.g;
		b = r.b;
		r = r.r;
	}

	return '#' + ('00000' + ((r << 16) + (g << 8) + b).toString(16)).slice(-6);
}


/*
 * Converts values of hue, saturation and visibility to
 * a hexadecimal string starting with #
 * @param h - the hue component of the colour (range 0-1)
 * @param s - the saturation component of the colour (range 0-1)
 * @param v - the visibility component of the colour (range 0-1)
 * -OR-
 * @param h - an object {h, s, v}
 *
 * @returns string - formatted '#rrggbb'
 */
function hsv2hex(h, s, v) {
	'use strict';
	var rgb;

	// Allow an object { h, s, v } to be passed as h
	if (arguments.length === 1) {
		s = h.s;
		v = h.v;
		h = h.h;
	}

	// Convert hsv to rgb
	rgb = hsv2rgb(h, s, v);

	// Convert rgb to hex
	return rgb2hex(rgb);
}


/*
 * Converts colour temperature to rgb format
 */
function ct2rgb(ct) {
	'use strict';
	ct /= 100;

	var r, g, b;

	if (ct <= 66) {
		r = 255;

		g = ct;
		g = 99.4708025861 * Math.log(g) - 161.1195681661;

		if (ct <= 19) {
			b = 0;
		} else {
			b = ct - 10;
			b = 138.5177312231 * Math.log(b) - 305.0447927307;
		}
	} else {
		r = ct - 60;
		r = 329.698727446 * Math.pow(r, -0.1332047592);

		g = ct - 60;
		g = 288.1221695283 * Math.pow(g, -0.0755148492);

		b = 255;
	}

	return {
		r: clamp(r, 0, 0xFF) | 0,
		g: clamp(g, 0, 0xFF) | 0,
		b: clamp(b, 0, 0xFF) | 0
	};
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


/*
 * Fade out, then fade in animation
 * @param el - the element to animate
 * @param time - the time in ms to fade in or out
 * @param callback - a function to be called when the
 *                   element is faded out
 */
function fadeInAnimation(el, time, callback) {
	'use strict';
	el.style.transition = 'opacity ' + time + 'ms';
	el.style.opacity = 0;
	setTimeout(function () {
		if (typeof callback === 'function') {
			callback();
		}
		el.style.opacity = 1;
	}, time);
}


/*
 * On page load, draw colour wheel and attach mouse/touch/click events
 */
document.addEventListener('DOMContentLoaded', function () {
	'use strict';
	var toggleInput = document.getElementById('toggle'),
		colourInput = document.getElementById('colour'),
		colourWheel = document.getElementById('colour-wheel'),
		modeInput = document.getElementById('mode'),
		resetButton = document.getElementById('reset-button'),
		carousel = document.getElementById('carousel'),
		carouselSelection = document.getElementById('carousel-selection'),
		carouselButtons = {
			wheel: document.getElementById('carousel-colour-wheel'),
			ct: document.getElementById('carousel-ct'),
			image: document.getElementById('carousel-image'),
			gamut: document.getElementById('carousel-gamut'),
			loop: document.getElementById('carousel-colour-loop')
		},
		imageGallery = document.getElementById('image-gallery'),
		addImageButton = document.getElementById('add-image'),
		imageGalleryCloseButton = imageGallery.getElementsByClassName('close')[0],
		imageInput,
		connectingSplashscreen = document.getElementById('connecting'),
		connectingSkip = document.getElementById('connecting-skip'),
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
		modes = [ 'colour', 'bri' ],
		gamut = 0,
		gamuts = [ 'hue-sat', 'temperature', 'image', 'gamut', 'loop' ],
		currentColour = {
			h: 0,
			s: 0,
			v: 1,
			hex: 0xFFFFFF,
			r: 0xFF,
			g: 0xFF,
			b: 0xFF,
			a: 0xFF,
			ct: 500
		},
		mouse = {
			x: 0,
			y: 0
		},
		intervalHandle,
		timeInterval = 100,
		currentImage = new Image();


	// Set the colour to the current colour
	function setColour(hex, hsv) {
		var	hexStr = typeof hex === 'string' ?
					hex :
					'#' + ('00000' + hex.toString(16)).slice(-6);

		hsv = hsv || hex2hsv(hex);

		currentColour.h = hsv.h;
		currentColour.s = hsv.s;
		currentColour.v = hsv.v;
		
		// Send the request to the light
		if (gamuts[gamut] === 'temperature') {
			// For temperature gamut, the ct value needs to be sent instead
			doStuff({
				ct: currentColour.ct,
				bri: hsv.v * 0xFF | 0
			});
		} else {
			// Otherwise just send the hsv values off
			doStuff({
				hue: hsv.h * 0xFFFF | 0,
				sat: hsv.s * 0xFF   | 0,
				bri: hsv.v * 0xFF   | 0
			});
		}

		document.body.style.backgroundColor = hexStr;

		if (colourInput) {
			colourInput.value = hexStr;
		}
	}

	// Updates currentColour to the colour of the pixel at the
	// mouse position
	function setColourToMousePosition() {
		// Get the pixel index from mouse x,y
		var i = 4 * (mouse.y * W + mouse.x),
			hex,
			hsv;

		// Ensure pixel under mouse is not transparent
		if (buffer.data[i + 3] !== 0) {
			// Get the rgba at the pixel index
			currentColour.r = buffer.data[i];
			currentColour.g = buffer.data[i + 1];
			currentColour.b = buffer.data[i + 2];
			currentColour.a = buffer.data[i + 3];

			// Convert rgb back to hsv
			hsv = rgb2hsv(currentColour);

			// Update currentColour hsv for redraws
			currentColour.h = hsv.h;
			currentColour.s = hsv.s;
			currentColour.v = hsv.v;

			// Convert to hex number
			hex = (currentColour.r << 16) + (currentColour.g << 8) + currentColour.b;

			if (gamuts[gamut] === 'temperature') {
				// Temperature mode does not send the pixel colour directly.
				if (modes[mode] === 'colour') {
					// Instead convert mouse position to colour temperature (range 153-500)
					currentColour.ct = (1 - (mouse.y / H)) * 347 + 153 | 0;
				} /*else if (modes[mode] === 'brightness') {
					// In brightness mode, get the brightness directly (range 0-1)
					currentColour.v = 1 - (mouse.y / H);
				} */
			}

			// Set colour to this hex and hsv
			setColour(hex, currentColour);
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
			if (r >= radius + 2) {
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

			if (r >= radius + 2) {
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

	function drawTemperatureScale() {
		var i, ct, rgb;
		for (i = 0; i < buffer.data.length; i += 4) {
			// Calculate the x,y pixel coordinates
			x = i / 4 % W | 0;
			y = i / 4 / W | 0;
			
			// Convert x,y to radius from centre of the cirlce
			r = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2));
			
			if (r >= radius + 2) {
				// Outside of the circle, set to transparent
				buffer.data[i]     = 0;
				buffer.data[i + 1] = 0;
				buffer.data[i + 2] = 0;
				buffer.data[i + 3] = 0;
			} else {
				// Adjust the temperature of the current based on height y
				ct = (y / H) * 5000 + 2000;
				
				// Convert to rbg
				rgb = ct2rgb(ct);

				// Adjust the darkness of the colour based on v
				buffer.data[i]     = rgb.r * currentColour.v | 0;
				buffer.data[i + 1] = rgb.g * currentColour.v | 0;
				buffer.data[i + 2] = rgb.b * currentColour.v | 0;
				buffer.data[i + 3] = 0xFF;
			}
		}
	}
	
	function drawImage() {
		var i;
		
		// Draw the image
		ctx.drawImage(currentImage, 0, 0, W, H);
		
		// Put the image data into the buffer
		buffer = ctx.getImageData(0, 0, W, H);
		
		// Adjust brightness
		/*for (i = 0; i < buffer.data.length; i += 4) {
			buffer.data[i]     *= currentColour.v;
			buffer.data[i + 1] *= currentColour.v;
			buffer.data[i + 2] *= currentColour.v;
		}*/
	}

	// Renders the buffer to the canvas
	function renderBuffer() {
		ctx.putImageData(buffer, 0, 0);
	}


	// Draws everything depending on which mode is selected
	function draw() {
		switch (modes[mode]) {
		case 'colour':
			switch (gamuts[gamut]) {
			case 'hue-sat':
				drawColourWheel();
				break;
					
			case 'temperature':
				drawTemperatureScale();
				break;
					
			case 'image':
				drawImage();
				break;
			}
			break;

		case 'bri':
			drawBrightnessSlider();
			break;
		}
		
		//if (gamuts[gamut] !== 'image') {
			// Image mode renders directly to the canvas.
			// All other modes render to the buffer so still need rendering.
		renderBuffer();
		//}
	}


	// Changes to the next mode in the modes list
	// and re-draws everything
	function changeMode() {
		mode = (mode + 1) % modes.length;
		fadeInAnimation(colourWheel, 100, draw);
	}


	function onDragStart(e) {
		// On mousedown, immediately set the colour
		setColourToMousePosition();
		// Clear any existing intervals, just in case.
		clearInterval(intervalHandle);
		// Also set an interval, allowing dynamic udate for click and drag
		intervalHandle = setInterval(setColourToMousePosition, timeInterval);
	}

	
	function onDrag(e) {
		// On mouse move, update the mouse coordinates relative to the canvas
		var rect = canvas.getBoundingClientRect();
		mouse.x = (e.clientX || e.targetTouches[0].pageX) - rect.left | 0;
		mouse.y = (e.clientY || e.targetTouches[0].pageY) - rect.top  | 0;
	}

	
	function onDragEnd(e) {
		// On mouseup, mouseout, touchend, end drag
		clearInterval(intervalHandle);
	}
	
	
	function onScroll(e) {
		// Get the current visibility
		var v = currentColour.v, hex;

		// Prevent default scrolling behaviour
		e.preventDefault();
		
		// Adjust by the mouse wheel event
		v += e.wheelDelta / 2000;

		// Clamp v between 0.01 and 1
		v = clamp(v, 0.01, 1);

		// Set current visibility to the new value
		currentColour.v = v;

		// Redraw with the changes
		draw();

		// Set colour
		hex = hsv2hex(currentColour);
		setColour(hex, currentColour);
	}

	function skipConnecting() {
		connectingSplashscreen.style.display = 'none';
		window.alert('Please note: Hue lights may not respond.');
	}
	
	function hideImageGallery() {
		if (imageGallery && !imageGallery.classList.contains('hidden')) {
			imageGallery.classList.add('hidden');
		}
	}
	
	function showImageGallery() {
		if (imageGallery && imageGallery.classList.contains('hidden')) {
			imageGallery.classList.remove('hidden');
		}
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

	// Attach a function to the reset button
	if (resetButton) {
		resetButton.addEventListener('click', function () {
			setColour(0xC9FE6E);
			draw();
		});
	}
	
	// Create a colour wheel to select from
	if (colourWheel) {

		// Initially setup drawing context and do an initial draw with
		// the default currentColour since the xhr can take a while.
		createDrawingContext();
		draw();

		getStuff(function (res) {
			var rgb, hex;
			
			// Received a response, so connected to Hue Bridge
			if (connectingSplashscreen) {
				connectingSplashscreen.style.display = 'none';
			}

			// Update currentColour to the lights current state
			// Set brightness to alteast 2% so colour wheel is visible.
			currentColour.h = res.hue / 0xFFFF;
			currentColour.s = res.sat / 0xFF;
			currentColour.v = Math.max(res.bri / 0xFF, 0.02);

			// Convert to rgb to update the rest of current Colour
			rgb = hsv2rgb(currentColour);

			currentColour.r = rgb.r;
			currentColour.g = rgb.g;
			currentColour.b = rgb.b;

			// Convert to hex to init HTML elements
			hex = rgb2hex(rgb);

			// Initialise background
			document.body.style.backgroundColor = hex;
			if (colourInput) {
				colourInput.value = hex;
			}

			// Then draw the colour wheel or the brightness slider
			// now that current colour has been updated.
			draw();
		}, function (err) {
			// Error occurred
			connectingSplashscreen.innerHTML = '<span>An error occurred getting data from the Hue Bridge:</span><br>' + err.description + '<br>';
			connectingSplashscreen.appendChild(connectingSkip);
		});
		
		// Attach mouse and touch events to the canvas.
		canvas.addEventListener('mousedown',       onDragStart, false);
		canvas.addEventListener('mousemove',       onDrag,      false);
		canvas.addEventListener('mouseup',         onDragEnd,   false);
		document.body.addEventListener('mouseout', onDragEnd,   false);
		canvas.addEventListener('touchstart',      onDragStart, false);
		canvas.addEventListener('touchmove',       onDrag,      false);
		canvas.addEventListener('touchend',        onDragEnd,   false);
		canvas.addEventListener('mousewheel',      onScroll,    false);
		canvas.addEventListener('dblclick',        changeMode,  false);
	}
	
	function moveCarouselSelectionTo(element) {
		/*var children = element.parentElement.getElementsByClassName('material-icons'),
			index = [].indexOf.call(children, element);
		carouselSelection.style.left = index * (100 / children.length + 0.5) + '%';*/
		var siblings = element.parentElement.children,
			i;
		// Remove .selected class from all elements
		for (i = 0; i < siblings.length; i += 1) {
			siblings[i].classList.remove('selected');
		}
		element.classList.add('selected');
	}
	
	function changeGamut(button, gamutIndex) {
		moveCarouselSelectionTo(button);
		gamut = gamutIndex;
		mode = 0;
		
		if (gamutIndex !== 2) {
			hideImageGallery();
		}
		
		draw();
	}
	
	if (carouselButtons.wheel) {
		carouselButtons.wheel.addEventListener('click', function (e) {
			changeGamut(e.target, 0);
		}, false);
	}
	
	if (carouselButtons.ct) {
		carouselButtons.ct.addEventListener('click', function (e) {
			changeGamut(e.target, 1);
		}, false);
	}
	
	if (carouselButtons.image) {
		carouselButtons.image.addEventListener('click', function (e) {
			showImageGallery();
			changeGamut(e.target, 2);
		}, false);
		
		if (imageGalleryCloseButton) {
			imageGalleryCloseButton.addEventListener('click', function (e) {
				hideImageGallery();
			});
		}
		
		if (canvas && imageGallery) {
			// Hide the image gallery when interacting with the colourwheel
			canvas.addEventListener('mousedown',  hideImageGallery, false);
			canvas.addEventListener('touchstart', hideImageGallery, false);
		}
	}
	
	if (addImageButton) {
		addImageButton.addEventListener('click', function (e) {
			currentImage = new Image();
			
			currentImage.onload = function () {
				// Add the image to the gallery
				if (imageGallery && imageGallery.children[0]) {
					imageGallery.children[0].appendChild(currentImage);
					
					// Clicking the image draws it
					currentImage.addEventListener('click', function (e) {
						currentImage = e.target;
						mode = 0;
						draw();
					}, false);
				}
				
				// Change gamut and redraw
				changeGamut(e.target, 2);
			};
			
			// Load custom image
			if (imageInput === undefined) {
				imageInput = document.createElement('input');
				imageInput.setAttribute('type', 'file');
				imageInput.setAttribute('accept', 'image');

				imageInput.onchange = function (e) {
					currentImage.src = window.URL.createObjectURL(e.path[0].files[0]);
				};
			}
			
			imageInput.click();
			
		}, false);
	}
	
	if (carouselButtons.gamut) {
		carouselButtons.gamut.addEventListener('click', function (e) {
			changeGamut(e.target, 3);
		}, false);
	}
	
	if (carouselButtons.loop) {
		carouselButtons.loop.addEventListener('click', function (e) {
			changeGamut(e.target, 4);
		}, false);
	}
	
	if (connectingSkip) {
		connectingSkip.addEventListener('click', skipConnecting, false);
	}
});


/*********************
   Animations demo
 *********************/

document.addEventListener('DOMContentLoaded', function () {
	'use strict';
	var anim = document.getElementById('anim'),
		animTable = document.getElementById('anim-table'),
		animTbody = document.getElementsByTagName('tbody')[0],
		toggleAnimButton = document.getElementById('show-anim'),
		addFrameButton = document.getElementById('add-frame'),
		paramSelect = anim.getElementsByClassName('param')[0],
		valueInput = anim.getElementsByClassName('val')[0],
		deleteRowButton = anim.getElementsByClassName('delete-row')[0],
		animCloseButton = anim.getElementsByClassName('close')[0],
		animPlayButton = document.getElementById('play-animation'),
		animStopButton = document.getElementById('stop-animation'),
		animTimeoutHandle,
		animPlayFlag = true,
		frameIndicator = document.getElementById('frame-indicator'),
		loop = document.getElementById('loop-anim'),
		toggles = document.getElementsByClassName('toggle'),
		i,
		currentColour = {
			hsv: {
				h: 0,
				s: 0,
				v: 1
			},
			on: true
		};
	
	function paramChange(e) {
		var row = e.target.parentElement.parentElement,
			valTd = row.getElementsByClassName('val-td')[0],
			valInputs = valTd.getElementsByTagName('input'),
			i;

		// Hide all inputs in valTd
		for (i = 0; i < valInputs.length; i += 1) {
			valInputs[i].style.display = 'none';
		}
		
		// Then show the correct one
		switch (e.target.value) {
		case 'Colour':
			// Show color input
			valInputs[0].style.display = 'inline';
			break;

		case 'On/Off':
			// Show checkbox input
			valInputs[1].style.display = 'inline';
			break;

		case 'Hue':
		case 'Saturation':
		case 'Brightness':
		case 'Temperature':
			// Show number input
			valInputs[2].style.display = 'inline';
			break;
		}
	}
	
	function deleteRow(e) {
		var row = e.target.parentElement.parentElement;
		row.parentElement.removeChild(row);
	}
	
	function setFrameIndicatorSymbol() {
		frameIndicator.innerHTML = currentColour.on ? 'play_arrow' : 'clear';
	}
	
	function runAnimation(index) {
		if (index < animTable.rows.length - 1) {
			// Get the row at the index
			var row = animTable.rows[index],
				param = row.cells[0].getElementsByClassName('param')[0].value,
				valueInputs = row.cells[1].getElementsByClassName('val'),
				time  = parseFloat(row.cells[2].getElementsByClassName('time')[0].value, 10) * 1000,
				hsv;

			// Only make make changes if the light is on, or is about to be turned on
			if (currentColour.on || param === 'On/Off') {
				switch (param) {
				case 'Colour':
					currentColour.hsv = hex2hsv(valueInputs[0].value);
					doStuff({
						hue: currentColour.hsv.h * 0xFFFF | 0,
						sat: currentColour.hsv.s * 0xFF   | 0,
						bri: currentColour.hsv.v * 0xFF   | 0
					});
					break;

				case 'Hue':
					currentColour.hsv.h = parseFloat(valueInputs[2].value);
					doStuff({
						hue: currentColour.hsv.h * 0xFFFF | 0
					});
					break;

				case 'Saturation':
					currentColour.hsv.s = parseFloat(valueInputs[2].value);
					doStuff({
						sat: currentColour.hsv.s * 0xFF | 0
					});
					break;

				case 'Brightness':
					currentColour.hsv.v = parseFloat(valueInputs[2].value);
					doStuff({
						bri: currentColour.hsv.v * 0xFF | 0
					});
					break;

				case 'Temperature':
					doStuff({
						ct: parseFloat(valueInputs[2].value) * 347 + 153 | 0
					});
					break;

				case 'Random':
					currentColour.hsv = {
						h: Math.random(),
						s: Math.random(),
						v: Math.random()
					};
					doStuff({
						hue: currentColour.hsv.h * 0xFFFF | 0,
						sat: currentColour.hsv.s * 0xFF   | 0,
						bri: currentColour.hsv.v * 0xFF   | 0
					});
					break;

				case 'On/Off':
					currentColour.on = valueInputs[1].checked;
					doStuff({
						on: currentColour.on
					});
					setFrameIndicatorSymbol();
					break;
				}
			}
			
			// Move the frame indicator arrow
			frameIndicator.style.top = (1.23 * index - 0.28) + 'em';
			currentColour.hex = hsv2hex(currentColour.hsv);
			frameIndicator.style.color = currentColour.hex;
			
			// Only run the next animation frame if the flag is true
			if (animPlayFlag) {
				// Run the next animation after a timeout
				animTimeoutHandle = setTimeout(function () {
					runAnimation(index + 1);
				}, time);
			}
			
		} else {
			// We have reached the row where the loop button is
			if (loop.classList.contains('checked')) {
				// Go back to the start if loop is checked immediately
				runAnimation(1);
			}
		}
			
	}
	
	function playAnimation() {
		// Clear any pre-existing animations, just in case
		clearTimeout(animTimeoutHandle);
		
		// Reset play flag to true
		animPlayFlag = true;
		
		// Ensure current colour is up to date
		getStuff(function (res) {
			currentColour = {
				hsv: {
					h: res.hue / 0xFFFF,
					s: res.sat / 0xFF,
					v: res.bri / 0xFF
				},
				on: res.on
			};
			
			setFrameIndicatorSymbol();

			// Start animations from the top
			runAnimation(1);
		}, function (err) {
			// An error occurred so lights may not respond
			window.alert('An error occurred when getting data from the Hue Bridge:\n' + err.description);
			
			// Play animations anyway but with current colour set to off
			currentColour.on = false;
			setFrameIndicatorSymbol();
			runAnimation(1);
		});
		
		
		// Hide play button and show stop button
		animPlayButton.classList.add('hidden');
		animStopButton.classList.remove('hidden');
	}
	
	function stopAnimation() {
		// Raise stop flag
		animPlayFlag = false;
		
		// Stop the currently running animation
		clearTimeout(animTimeoutHandle);
		
		// Show play button and hide stop button
		animPlayButton.classList.remove('hidden');
		animStopButton.classList.add('hidden');
	}
	
	function addFrame() {
		// Duplicate the penultimate row in the table
		var index = animTable.rows.length - 2,
			oldRow = animTable.rows[index],
			newRow = oldRow.cloneNode(true),
			lastRow = animTable.rows[index + 1];
		
		// Add event listeners
		newRow.getElementsByClassName('delete-row')[0]
			.addEventListener('click', deleteRow, false);
		newRow.getElementsByClassName('param')[0]
			.addEventListener('change', paramChange);
		
		// Match parameter select
		newRow.getElementsByClassName('param')[0].value =
			oldRow.getElementsByClassName('param')[0].value;
		
		// Insert into table
		animTbody.insertBefore(newRow, lastRow);
	}
	
	function showAnimationPane() {
		anim.style.display = 'block';
	}
	
	function closeAnimationPane() {
		anim.style.display = 'none';
		stopAnimation();
	}
	
	function toggleAnimationPane() {
		if (anim.style.display === 'block') {
			closeAnimationPane();
		} else {
			showAnimationPane();
		}
	}
	
	// Toggle the clicked element between having .checked class or not
	function toggleChecked(e) {
		if (e.target.classList.contains('checked')) {
			e.target.classList.remove('checked');
		} else {
			e.target.classList.add('checked');
		}
	}
	
	// Add click event listeners to all toggle buttons
	for (i = 0; i < toggles.length; i += 1) {
		toggles[i].addEventListener('click', toggleChecked, false);
	}
	
	// Add event listeners to all other buttons
	paramSelect.addEventListener('change', paramChange, false);
	deleteRowButton.addEventListener('click', deleteRow, false);
	toggleAnimButton.addEventListener('click', toggleAnimationPane, false);
	animCloseButton.addEventListener('click', closeAnimationPane, false);
	addFrameButton.addEventListener('click', addFrame, false);
	animPlayButton.addEventListener('click', playAnimation, false);
	animStopButton.addEventListener('click', stopAnimation, false);
});


// Test refresh rates
/*var isOn = false;
setInterval(function () {
	'use strict';
	isOn = !isOn;
	doStuff({ on: isOn });
}, 100);*/
