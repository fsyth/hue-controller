/*global console, chrome*/
/*jslint bitwise: true*/


/*********************
   Global Objects
 *********************/

var storage, hue = {};


/**************************
   XMLHttpRequest Methods
 **************************/


function setHueUrls() {
  'use strict';
  // Assemble URLs and assign them to the global hue object
  hue.baseUrl = 'http://' + hue.ip + '/api/' + hue.userId + '/';
  hue.getUrl = hue.baseUrl + 'lights/' + hue.lightNo;
  hue.putUrl = hue.getUrl + '/state';
}


/*
 * Sends an XMLHttpRequest to put data on the Hue Bridge
 * The path should be a relevant location, such as
 * lights/1/state.
 * Paths are relative to the current user/developer api key.
 * The data should be either an object or JSON formatted
 * string with key-value pairs to be updated.
 * The callbacks for responseHandler or errorHandler are
 * functions of the data returned by the server, typically
 * an object.
 */
function huePut(path, data, responseHandler, errorHandler) {
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

  xhr.onerror = function () {
    // Unsuccessful xhr
    if (typeof errorHandler === 'function') {
      errorHandler(this);
    }
  };

  xhr.open('PUT', hue.baseUrl + path, true);
  xhr.send(typeof data === 'string' ? data : JSON.stringify(data));
}


/*
 * Sends an XMLHttpRequest to get data from the Hue Bridge
 * The path should be a relevant location, such as an individual
 * light, e.g. lights/1
 * An empty string will return all of the accessible data on the
 * bridge.
 * Paths are relative to the current user/developer api key.
 * The callbacks for responseHandler or errorHandler are
 * functions of the data returned by the server, typically
 * an object.
 */
function hueGet(path, responseHandler, errorHandler) {
  'use strict';
  var xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function () {
    // If complete and succesful
    if (this.readyState === 4 && this.status === 200) {
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
        responseHandler(res);
      }
    }
  };

  xhr.onerror = function () {
    // Unsuccessful xhr
    if (typeof errorHandler === 'function') {
      errorHandler(this);
    }
  };

  xhr.open('GET', hue.baseUrl + path);
  xhr.timeout = 30e3;
  xhr.ontimeout = xhr.onerror;
  xhr.send();
}

/*
 * This function sends a data object to the hue light.
 * @param settings - The light settings to be overwritten
 * @param responseHandler - a callback function whose first
 *                          argument contains the response
 *
 * Note: The callback is called asynchronously once the
 * XMLHttpRequest responds.
 */
function setState(settings, responseHandler, errorHandler) {
  'use strict';
  // The lightNo may be a comma separated string of lights, so split
  // it and handle each one with a separate huePut
  var ls = hue.lightNo.split(',');
  for (var i = 0; i < ls.length; i++) {
    huePut('lights/' + ls[i] + '/state', settings, responseHandler, errorHandler);
  }
}

/*
 * This function gets the current data object held by the light
 * @param responseHandler - a callback function whose first
 *                          argument contains the response
 *
 * Note: The callback is called asynchronously once the
 * XMLHttpRequest responds.
 */
function getState(responseHandler, errorHandler) {
  'use strict';
  hueGet('lights/' + hue.lightNo, function (res) {
    // For some reason, you cannot GET from /state directly
    // so GET from up one level and extract the state and
    // pass it into the response handler
    responseHandler(res.state);
  }, errorHandler);
}


/*
 * This function gets the current data object held by all lights
 * found connected to the Hue Bridge
 * @param responseHandler - a callback function whose first
 *                          argument contains the response
 *
 * Note: The callback is called asynchronously once the
 * XMLHttpRequest responds.
 */
function getAllLights(responseHandler, errorHandler) {
  'use strict';
  hueGet('lights', responseHandler, errorHandler);
}


/*
 *
 */
function getAllGroups(responseHandler, errorHandler) {
  'use strict';
  hueGet('groups', responseHandler, errorHandler);
}


/*
 * This function sends an XMLHttpRequest to the meethue nupnp broker
 * @param responseHandler - a callback function whose first argument
 *                          contains the response - an array of objects
 *                          { id, internalipaddress }
 *
 * Note: The callback is called asynchronously once the
 * XMLHttpRequest responds.
 */
function getBridgeIp(responseHandler, errorHandler) {
  'use strict';
  var xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function () {
    // If complete and succesful
    if (this.readyState === 4 && this.status === 200) {
      var res = JSON.parse(this.responseText);
      if (typeof responseHandler === 'function') {
        // Call the response handler and pass in
        // { id, internalipaddress }
        responseHandler(res);
      }
    }
  };

  xhr.onerror = function () {
    // Unsuccessful xhr
    if (typeof errorHandler === 'function') {
      errorHandler(this);
    }
  };


  // Send the request to the broker
  xhr.open('GET', 'https://www.meethue.com/api/nupnp');
  xhr.timeout = 30e3;
  xhr.ontimeout = xhr.onerror;
  xhr.send();
}


/*
 * Create a new developer login url.
 * The first post will respond with an error description
 * telling the user to press the link button on the hue bridge.
 * The second post should respond with the newdeveloper username.
 */
function createNewDeveloper(pressLinkButtonHandler, successHandler, errorHandler) {
  'use strict';
  var xhr = new XMLHttpRequest();

  function sendStuff() {
    xhr.open('POST', 'http://' + hue.ip + '/api');
    xhr.send(JSON.stringify({
      devicetype: "hue-controller#node"
    }));
    //console.log('requesting new user id');
  }

  xhr.onreadystatechange = function () {
    // If complete and succesful
    if (this.readyState === 4 && this.status === 200) {
      //console.log('response received');
      var res = JSON.parse(this.responseText);

      if (res[0] && res[0].error && res[0].error.type === 101) {
        // Link button needs to be pressed
        // Prompt user in the handler
        if (typeof pressLinkButtonHandler === 'function') {
          pressLinkButtonHandler(res[0].error);
        }

        // Try posting again until it is succesful
        setTimeout(sendStuff, 1000);
      } else if (res[0] && res[0].success) {
        // Link button was pressed
        if (typeof successHandler === 'function') {
          // Call the response handler and pass in
          // { username }
          successHandler(res[0].success);
        }
      }
    }
  };

  xhr.onerror = function () {
    // Unsuccessful xhr
    if (typeof errorHandler === 'function') {
      errorHandler(this);
    }
  };

  sendStuff();
}


function dispatchStartBridgeSearchEvent(res) {
  'use strict';
  document.dispatchEvent(new window.CustomEvent('huebridgesearchstart', {
    detail: res
  }));
}


function dispatchBridgeIpFoundEvent(res) {
  'use strict';
  document.dispatchEvent(new window.CustomEvent('huebridgeip', {
    detail: res
  }));
}


function dispatchConnectionEvent(res) {
  'use strict';
  document.dispatchEvent(new window.CustomEvent('hueconnection', {
    detail: res
  }));
}


function dispatchErrorEvent(err) {
  'use strict';
  document.dispatchEvent(new window.CustomEvent('hueerror', {
    detail: err
  }));
}


function dispatchLinkButtonEvent(linkerr) {
  'use strict';
  document.dispatchEvent(new window.CustomEvent('huelinkbutton', {
    detail: linkerr
  }));
}


/*
 * Called once the hue parameters have been obtained,
 * either from storage or by finding the bridge IP and
 * creating a new developer
 */
function establishConnection() {
  'use strict';
  // Attempt to get data from the light to test the connection
  getState(function (res) {
    // Dispatch connected event to provide the light's current colour
    dispatchConnectionEvent(res);

    // Hue settings clearly work, so store them for next time
    storage.set({
      hue: hue
    });
  }, function (err) {
    // Dispatch an event so that the user can be informed of the error
    dispatchErrorEvent(err);
  });
}


function firstTimeSetup() {
  'use strict';

  if (firstTimeSetup.canTryUserIdFromSearch === undefined) {
    firstTimeSetup.canTryUserIdFromSearch = true;
  }

  // Dispatch event that state is currently searching for bridges
  dispatchStartBridgeSearchEvent();

  // We need to find the Hue Bridge IP if it was not found in storage
  getBridgeIp(function (res) {
    if (res && res.length === 0) {
      // The request was succesful, but no bridges were found
      console.error('UPnP returned empty array.');
      dispatchErrorEvent({
        description: 'Could not find any Hue bridges on the local network'
      });
    } else if (res && res[0] && res[0].internalipaddress) {
      // Successfully found IP
      hue.ip = res[0].internalipaddress;
      console.log('Hue Bridge found at IP ' + hue.ip);
      dispatchBridgeIpFoundEvent(res[0]);

      // Check if a developer user id was included in the url
      if (firstTimeSetup.canTryUserIdFromSearch && window.location.search) {
        if (/light=[\d+]+&id=[\w-]+/.test(location.search)) {
          // Get the user id from  id=_____ part of the query string
          hue.userId = location.search.match(/id=([\w-]+)/)[1];

          // Do the same for light=_
          hue.lightNo = location.search.match(/light=(\d+)/)[1];
        } else {
          // Strip leading question mark and use search string as user id
          hue.userId = window.location.search.replace(/^\?/, '');

          // Default hue light number
          hue.lightNo = '1';
        }
        // Prevent the search string from being retried if it fails
        firstTimeSetup.canTryUserIdFromSearch = false;

        // Now that Hue has values set for ip, userId, and lightNo,
        // the URLs can be set
        setHueUrls();

        establishConnection();
      } else {
        // Now need to create a newdeveloper
        createNewDeveloper(function (linkerr) {
          // The link button needs to be pressed.
          // Dispatch an event so the connecting splashscreen can prompt
          // the user.
          dispatchLinkButtonEvent(linkerr);
        }, function (success) {
          hue.userId = success.username;
          console.log('New username created: ' + hue.userId);

          // Default hue light number
          hue.lightNo = '1';

          // Now that Hue has values set for ip, userId, and lightNo,
          // the URLs can be set
          setHueUrls();

          establishConnection();
        }, function (err) {
          // XHR to hue bridge failed
          err.description = 'POST request to Hue Bridge failed.';
          console.error(err.description);
          dispatchErrorEvent(err);
        });
      }
    } else {
      console.error('Bridge IP address search failed');
      dispatchErrorEvent({
        description: 'Bridge IP Address search failed. Check internet connection.'
      });
    }
  }, function (err) {
    // XHR to meethue broker failed
    err.description = 'No internet connection.';
    console.error(err.description);
    dispatchErrorEvent(err);
  });
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
 * @param h - an object { h, s, v }
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
 * @param r - an object { r, g, b }
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
  getState(function (res) {
    setState({ on: !res.on });
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

  setState({
    hue: hsv.h * 0xFFFF | 0,
    sat: hsv.s * 0xFF | 0,
    bri: hsv.v * 0xFF | 0
  });

  document.body.style.backgroundColor = hexStr;
}


/***********************
   General DOM methods
 ***********************/

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
 * Removes the .hidden class from an element
 * @param el - the element to show
 */
function showElement(el) {
  el.classList.remove('hidden');
}


/*
 * Adds the .hidden class to an element
 * @param el - the element to hide
 */
function hideElement(el) {
  el.classList.add('hidden');
}


/*
 * Returns whether an element is hidden or not
 * @param el - the element to test
 * @returns bool
 */
function isHidden(el) {
  return el.classList.contains('hidden');
}


/*********************
   Colour wheel demo
 *********************/

/*
 * On page load, draw colour wheel and attach mouse/touch/click events
 */
function initialiseColourWheel() {
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
      canvas,
      ctx,
      buffer,
      radius = Math.min(200, window.innerWidth / 2 - 25),
      W = 2 * radius,
      H = 2 * radius,
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


  /*
   * Set the colour to the current colour
   * @param hex - a 6 digit hex string or number for the colour to set
   * @param hsv - optional, an object { h, s, v } containing the hue,
   *              saturation and visibility to set
   *              Note: for temperature gamut, an object { ct, v } is
   *                     expected instead
   */
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
      setState({
        ct:  hsv.ct,
        bri: hsv.v * 0xFF | 0
      });
    } else {
      // Otherwise just send the hsv values off
      setState({
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


  /*
   * Update currentColour to the colour of the pixel at the
   * mouse position
   */
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
        }
      }

      // Set colour to this hex and hsv
      setColour(hex, currentColour);
    }

  }


  /*
   * Create the canvas, context and drawing buffer
   */
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


  /*
   * Draw the colour wheel at the current visibility
   */
  function drawColourWheel() {
    // For each byte in the buffer
    for (var i = 0; i < buffer.data.length; i += 4) {
      // Calculate the x,y pixel coordinates
      var x = i / 4 % W | 0,
          y = i / 4 / W | 0;

      // Convert x,y to radius from centre of the cirlce
      var r = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2));

      // For certain radii, we can simplify calculations
      if (r >= radius + 2) {
        // Outside of the circle, set to transparent
        buffer.data[i]     = 0;
        buffer.data[i + 1] = 0;
        buffer.data[i + 2] = 0;
        buffer.data[i + 3] = 0;
      } else {
        // Calculate the angle from the circle centre to the pixel
        var t = Math.atan2(y - radius, x - radius);

        // Scale angle to range 0-1 to give hue
        var h = t / (2 * Math.PI);
        if (h < 0) {
          h += 1;
        }

        // Scale radius to range 0-1 to give saturation
        var s = r / radius;

        // Visibility
        var v = currentColour.v;

        // Convert hsv format to rgb format
        var rgb = hsv2rgb(h, s, v);

        // Set the pixel in the buffer to the rgb colour
        buffer.data[i]     = rgb.r;
        buffer.data[i + 1] = rgb.g;
        buffer.data[i + 2] = rgb.b;
        buffer.data[i + 3] = 0xFF;
      }
    }
  }


  /*
   * Draw a circular brightness slider at the current hue and saturation
   */
  function drawBrightnessSlider() {
    for (var i = 0; i < buffer.data.length; i += 4) {
      // Calculate the x,y pixel coordinates
      var x = i / 4 % W | 0,
          y = i / 4 / W | 0;

      // Convert x,y to radius from centre of the cirlce
      var r = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2));

      if (r >= radius + 2) {
        // Outside of the circle, set to transparent
        buffer.data[i]     = 0;
        buffer.data[i + 1] = 0;
        buffer.data[i + 2] = 0;
        buffer.data[i + 3] = 0;
      } else {
        // Adjust the visibility of the current based on height y
        var h = currentColour.h,
            s = currentColour.s,
            v = Math.max(1 - (y / H), 0.01);

        // Convert to rbg
        var rgb = hsv2rgb(h, s, v);

        // Adjust the darkness of the colour based on v
        buffer.data[i]     = rgb.r;
        buffer.data[i + 1] = rgb.g;
        buffer.data[i + 2] = rgb.b;
        buffer.data[i + 3] = 0xFF;
      }
    }
  }


  /*
   * Draw an approximation of the colour temperature scale
   * range 153-500/K
   */
  function drawTemperatureScale() {
    for (var i = 0; i < buffer.data.length; i += 4) {
      // Calculate the x,y pixel coordinates
      var x = i / 4 % W | 0,
          y = i / 4 / W | 0;

      // Convert x,y to radius from centre of the cirlce
      var r = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2));

      if (r >= radius + 2) {
        // Outside of the circle, set to transparent
        buffer.data[i]     = 0;
        buffer.data[i + 1] = 0;
        buffer.data[i + 2] = 0;
        buffer.data[i + 3] = 0;
      } else {
        // Adjust the temperature of the current based on height y
        var ct = (y / H) * 5000 + 2000;

        // Convert to rbg
        var rgb = ct2rgb(ct);

        // Adjust the darkness of the colour based on v
        buffer.data[i]     = rgb.r * currentColour.v | 0;
        buffer.data[i + 1] = rgb.g * currentColour.v | 0;
        buffer.data[i + 2] = rgb.b * currentColour.v | 0;
        buffer.data[i + 3] = 0xFF;
      }
    }
  }


  /*
   * Draw currentImage to the canvas and updates buffer to match
   */
  function drawImage() {
    // Draw the image
    ctx.drawImage(currentImage, 0, 0, W, H);

    // Put the image data into the buffer
    buffer = ctx.getImageData(0, 0, W, H);

    // Adjust brightness
    /*for (var i = 0; i < buffer.data.length; i += 4) {
      buffer.data[i]     *= currentColour.v;
      buffer.data[i + 1] *= currentColour.v;
      buffer.data[i + 2] *= currentColour.v;
    }*/
  }


  /*
   * Render the buffer to the canvas
   */
  function renderBuffer() {
    ctx.putImageData(buffer, 0, 0);
  }


  /*
   * Draw everything depending on which mode is selected
   */
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

    renderBuffer();
  }


  /*
   * Change to the next mode in the modes list
   * and re-draw everything
   */
  function changeMode() {
    mode = (mode + 1) % modes.length;
    fadeInAnimation(colourWheel, 100, draw);
  }


  /*
   * Update the mouse x,y coordinates relative to the canvas using the
   * current mouse/touch position
   */
  function updateMousePosition(e) {
    // On mouse move, update the mouse coordinates relative to the canvas
    var rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX || e.targetTouches[0].pageX) - rect.left | 0;
    mouse.y = (e.clientY || e.targetTouches[0].pageY) - rect.top  | 0;
  }


  /*
   * Called on mousedown or touchstart
   * Starts an interval that updates the light to the
   * colour of the pixel under the mouse.
   */
  function onDragStart(e) {
    // On mousedown, immediately update mouse position and set the colour
    updateMousePosition(e);
    setColourToMousePosition();
    // Clear any existing intervals, just in case.
    clearInterval(intervalHandle);
    // Also set an interval, allowing dynamic udate for click and drag
    intervalHandle = setInterval(setColourToMousePosition, timeInterval);
  }


  /*
   * On drag, update the mouse position.
   * The interval will update the light.
   */
  function onDrag(e) {
    updateMousePosition(e);
  }


  /*
   * On end of drag, stop the interval from updating the light
   */
  function onDragEnd(e) {
    // On mouseup, mouseout, touchend, end drag
    clearInterval(intervalHandle);
  }


  /*
   * On scroll, change the light's brightness
   */
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


  /*
   * Update which button in the carousel is shown as currently selected
   */
  function moveCarouselSelectionTo(element) {
    var siblings = element.parentElement.children;
    // Remove .selected class from all elements
    for (var i = 0; i < siblings.length; i += 1) {
      siblings[i].classList.remove('selected');
    }
    element.classList.add('selected');
  }


  /*
   * Hide the image gallery pane
   */
  function hideImageGallery() {
    if (imageGallery) {
      hideElement(imageGallery);
    }
  }


  /*
   * Shopw the image gallery pane
   */
  function showImageGallery() {
    if (imageGallery) {
      showElement(imageGallery);
    }
  }


  /*
   * Change the gamut to another one and redraw
   */
  function changeGamut(button, gamutIndex) {
    moveCarouselSelectionTo(button);
    gamut = gamutIndex;
    mode = 0;

    if (gamutIndex !== 2) {
      hideImageGallery();
    }

    draw();
  }


  /*
   * Redraw the colour wheel for the now updated currentColour
   * once the connection has been established
   * @param e - the CustomEvent object containing detail of
   *            the xhr response object from the hue bridge
   *            containing the light's states
   *            hue, sat, bri, on, ct, etc...
   */
  function onHueConnection(e) {
    var res = e.detail;

    // Update currentColour to the lights current state
    // Set brightness to alteast 2% so colour wheel is visible.
    currentColour.h = res.hue / 0xFFFF;
    currentColour.s = res.sat / 0xFF;
    currentColour.v = Math.max(res.bri / 0xFF, 0.02);

    // Convert to rgb to update the rest of current Colour
    var rgb = hsv2rgb(currentColour);

    currentColour.r = rgb.r;
    currentColour.g = rgb.g;
    currentColour.b = rgb.b;

    // Convert to hex to init HTML elements
    var hex = rgb2hex(rgb);

    // Initialise background
    document.body.style.backgroundColor = hex;
    if (colourInput) {
      colourInput.value = hex;
    }

    // Then draw the colour wheel or the brightness slider
    // now that current colour has been updated.
    draw();
  }


  /*
   * @param e - the CustomEvent object containing detail of
   *            the xhr response object from the hue bridge
   *            containing the error description
   */
  function onHueError(e) {
    console.error(e);
  }


  /*** Attach event listeners ***/

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
      setColour(0xFDDD72, {
        h: 8418 / 0x10000,
        s:  140 / 0x100,
        v:  254 / 0x100
      });
      draw();
    });
  }

  // Create a colour wheel to select from
  if (colourWheel) {

    // Initially setup drawing context and do an initial draw with
    // the default currentColour since the xhr can take a while.
    createDrawingContext();
    draw();

    // Redraw once connected
    document.addEventListener('hueconnection', onHueConnection, false);
    document.addEventListener('hueerror',      onHueError,  false);

    // Attach mouse and touch events to the canvas.
    document.body.addEventListener('mouseout', onDragEnd,   false);
    canvas.addEventListener('mousedown',  onDragStart, false);
    canvas.addEventListener('mousemove',  onDrag,      false);
    canvas.addEventListener('mouseup',    onDragEnd,   false);
    canvas.addEventListener('touchstart', onDragStart, false);
    canvas.addEventListener('touchmove',  onDrag,      false);
    canvas.addEventListener('touchend',   onDragEnd,   false);
    canvas.addEventListener('mousewheel', onScroll,    false);
    canvas.addEventListener('dblclick',   changeMode,  false);
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
        imageInput.setAttribute('accept', 'image/*');

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
}


/*********************
   Animations demo
 *********************/

/*
 * Initialise the animations pane.
 * Here, a sequence of values to be sent to the Hue light
 * can be queued up in a table.
 */
function initialiseAnimationsPane() {
  'use strict';
  var anim = document.getElementById('anim'),
      animTable = document.getElementById('anim-table'),
      animTbody = anim.getElementsByTagName('tbody')[0],
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
      currentColour = {
        hsv: {
          h: 0,
          s: 0,
          v: 1
        },
        on: true
      };


  /*
   * Handler for when the param dropdown changes.
   * Displays the correct value input type.
   */
  function paramChange(e) {
    var row = e.target.parentElement.parentElement,
        valTd = row.getElementsByClassName('val-td')[0],
        valInputs = valTd.getElementsByTagName('input');

    // Hide all inputs in valTd
    for (var i = 0; i < valInputs.length; i += 1) {
      hideElement(valInputs[i]);
    }

    // Then show the correct one
    switch (e.target.value) {
    case 'Colour':
      // Show color input
      showElement(valInputs[0]);
      break;

    case 'On/Off':
      // Show checkbox input
      showElement(valInputs[1]);
      break;

    case 'Hue':
    case 'Saturation':
    case 'Brightness':
    case 'Temperature':
      // Show number input
      showElement(valInputs[2]);
      break;
    }
  }


  /*
   * Delete the clicked on row
   */
  function deleteRow(e) {
    var row = e.target.parentElement.parentElement;
    row.parentElement.removeChild(row);
  }


  /*
   * Sets the frame indicator symbol to on or off depending on whether the
   * light is on or off
   */
  function setFrameIndicatorSymbol() {
    frameIndicator.innerHTML = currentColour.on ? 'play_arrow' : 'clear';
  }


  /*
   * Move the frame indicator next to a given row
   */
  function moveFrameIndicator(row) {
    // Get position of row relative to the animations pane
    // and define an offset for where the indicator is to
    // be positioned
    var animRect = anim.getBoundingClientRect(),
        rowRect  =  row.getBoundingClientRect(),
        rowX = rowRect.left - animRect.left,
        rowY = rowRect.top  - animRect.top,
        offsetX = -14,
        offsetY = 1;

    // Set the absolute position of the indicator
    frameIndicator.style.left = (rowX + offsetX) + 'px';
    frameIndicator.style.top  = (rowY + offsetY) + 'px';

    // Update colour to match light
    frameIndicator.style.color = hsv2hex(currentColour.hsv);
  }

  /*
   * Run one row of the animation table
   * @param index - the index of the row to run
   *                Note: index 0 is the headings row and should not be run
   *                      index 1 is the 1st row that can be run
   */
  function runAnimation(index) {
    if (index > 0 && index < animTable.rows.length - 1) {
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
          setState({
            hue: currentColour.hsv.h * 0xFFFF | 0,
            sat: currentColour.hsv.s * 0xFF   | 0,
            bri: currentColour.hsv.v * 0xFF   | 0
          });
          break;

        case 'Hue':
          currentColour.hsv.h = parseFloat(valueInputs[2].value);
          setState({
            hue: currentColour.hsv.h * 0xFFFF | 0
          });
          break;

        case 'Saturation':
          currentColour.hsv.s = parseFloat(valueInputs[2].value);
          setState({
            sat: currentColour.hsv.s * 0xFF | 0
          });
          break;

        case 'Brightness':
          currentColour.hsv.v = parseFloat(valueInputs[2].value);
          setState({
            bri: currentColour.hsv.v * 0xFF | 0
          });
          break;

        case 'Temperature':
          setState({
            ct: parseFloat(valueInputs[2].value) * 347 + 153 | 0
          });
          break;

        case 'Random':
          currentColour.hsv = {
            h: Math.random(),
            s: Math.random(),
            v: Math.random()
          };
          setState({
            hue: currentColour.hsv.h * 0xFFFF | 0,
            sat: currentColour.hsv.s * 0xFF   | 0,
            bri: currentColour.hsv.v * 0xFF   | 0
          });
          break;

        case 'On/Off':
          currentColour.on = valueInputs[1].checked;
          setState({
            on: currentColour.on
          });
          setFrameIndicatorSymbol();
          break;
        }
      }

      // Move the frame indicator arrow
      moveFrameIndicator(row);

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


  /*
   * Start playing animations, starting from row 1 of the animation table
   */
  function startAnimation() {
    // Clear any pre-existing animations, just in case
    clearTimeout(animTimeoutHandle);

    // Reset play flag to true
    animPlayFlag = true;

    // Add .playing class to #anim
    anim.classList.add('playing');

    // Ensure current colour is up to date
    getState(function (res) {
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
    hideElement(animPlayButton);
    showElement(animStopButton);
  }


  /*
   * Stop playing animations
   */
  function stopAnimation() {
    // Raise stop flag
    animPlayFlag = false;

    // Remove .playing class from #anim
    anim.classList.remove('playing');

    // Stop the currently running animation
    clearTimeout(animTimeoutHandle);

    // Show play button and hide stop button
    showElement(animPlayButton);
    hideElement(animStopButton);
  }


  /*
   * Add an animation frame row to the table
   * The last animation frame is cloned and inserted
   */
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
    showElement(anim);
  }

  function closeAnimationPane() {
    hideElement(anim);
    stopAnimation();
  }

  function toggleAnimationPane() {
    if (isHidden(anim)) {
      showAnimationPane();
    } else {
      closeAnimationPane();
    }
  }

  /*
   * Toggle the clicked element between having .checked class or not
   */
  function toggleChecked(e) {
    if (e.target.classList.contains('checked')) {
      e.target.classList.remove('checked');
    } else {
      e.target.classList.add('checked');
    }
  }


  /*** Add event listeners ***/

  // Add click event listeners to all toggle buttons
  for (var i = 0; i < toggles.length; i += 1) {
    toggles[i].addEventListener('click', toggleChecked, false);
  }

  // Add event listeners to all other buttons
  paramSelect.addEventListener('change', paramChange, false);
  deleteRowButton.addEventListener('click', deleteRow, false);
  toggleAnimButton.addEventListener('click', toggleAnimationPane, false);
  animCloseButton.addEventListener('click', closeAnimationPane, false);
  addFrameButton.addEventListener('click', addFrame, false);
  animPlayButton.addEventListener('click', startAnimation, false);
  animStopButton.addEventListener('click', stopAnimation, false);
}


/******************
   Settings Panel
 ******************/

function initialiseSettingsPanel() {
  'use strict';
  var hueIp = document.getElementById('hue-ip'),
      hueUsername = document.getElementById('hue-username'),
      hueLightNo = document.getElementById('hue-light-no'),
      hueTest = document.getElementById('hue-test'),
      hueSave = document.getElementById('hue-save'),
      hueClear = document.getElementById('hue-clear'),
      hueMessages = document.getElementById('hue-messages'),
      messageTimeoutHandle;

  /*
   * Display a message in a span in the settings page
   */
  function displayMessage(str, type, timeout) {
    // Show the message in the span
    hueMessages.innerHTML = str;
    hueMessages.classList.remove('fade-out');

    switch (type) {
    case 'info':
      hueMessages.style.color = '#6FC';
      break;

    case 'error':
      hueMessages.style.color = '#F44';
      break;

    default:
      hueMessages.style.color = '#CCC';
      break;
    }

    // Clear timeout handle in case several messages were
    // displayed in succesion
    clearTimeout(messageTimeoutHandle);

    // Clear the span after a few seconds
    messageTimeoutHandle = setTimeout(function () {
      hueMessages.classList.add('fade-out');
    }, timeout || 5000);
  }

  /*
   * Take values from the form and update the global hue variable
   */
  function submitForm() {
    hue.ip = hueIp.value || '192.168.0.0';
    hue.userId = hueUsername.value || 'undefined--clear-data-and-reload-to-create-new';
    hue.lightNo = hueLightNo.value || 1;
    setHueUrls();
  }

  /*
   * Get data from the hue bridge about all lights and
   * fill the light selection dropdown with room names
   */
  function populateLightSelection() {
    // Make sure the form elements are up to date
    hueIp.value = hue.ip;
    hueUsername.value = hue.userId;

    // Clear the light number selection
    hueLightNo.innerHTML = '';

    getAllGroups(function (res) {
      for (var groupNo in res) {
        if (res.hasOwnProperty(groupNo)) {
          // Add a named option for the group to be selected
          hueLightNo.innerHTML +=
            '<option value="' + res[groupNo].lights.join() + '">' +
            '[ROOM] ' + res[groupNo].name +
            '</option>';
        }
      }

      // Make sure the form elements are up to date
      hueLightNo.value = hue.lightNo;
    });

    getAllLights(function (res) {
      var lightNames = [];

      // For each light found connected to the bridge
      for (var lightNo in res) {
        if (res.hasOwnProperty(lightNo)) {
          // Add a named option for it to be selected
          hueLightNo.innerHTML +=
            '<option value="' + lightNo + '">' +
            '[LIGHT] ' + res[lightNo].name +
            '</option>';

          lightNames.push(res[lightNo].name);
        }
      }

      if (lightNames.length > 0) {
        displayMessage('Lights found: ' + lightNames.join(', '), 'info');
      } else {
        displayMessage('Connected, but list of lights was empty.', 'error');
      }

      // Make sure the form elements are up to date
      hueLightNo.value = hue.lightNo;
    }, function (err) {
      // Could not find any lights
      hueLightNo.innerHTML = '<option value="" selected>&lt;No lights found&gt;</option>';
      // Display error in message area
      displayMessage('The following error occurred: ' + err.description, 'error');
    });
  }

  document.addEventListener('huebridgeip', function (res) {
    hueIp.value = res.detail.internalipaddress;
  });

  document.addEventListener('hueconnection', populateLightSelection);

  document.addEventListener('hueerror', function (e) {
    // Update form with parameters currently being used so it is
    // populated even though the connection failed
    // This allows settings to be trial and errored manually.
    hueIp.value = hue.ip;
    hueUsername.value = hue.userId;
    //hueLightNo.value = '<No lights found>';
  });

  hueIp.addEventListener('change', function () {
    hue.ip = hueIp.value;
    setHueUrls();
  }, false);

  hueUsername.addEventListener('change', function () {
    hue.userId = hueUsername.value;
    setHueUrls();
  }, false);

  hueLightNo.addEventListener('change', function () {
    hue.lightNo = hueLightNo.value;
    setHueUrls();
  }, false);

  hueTest.addEventListener('click', function () {
    // Update the gloabl hue variable with
    // settings from the form
    submitForm();

    // Display the the search has started
    displayMessage('Searching for lights...', 'other', 20e3);

    // Search for lights
    populateLightSelection();
  });

  hueSave.addEventListener('click', function () {
    // Submit so that the global hue variable is up to date
    submitForm();

    // Store the global hue variable
    storage.set({
      hue: hue
    });

    // Save message
    displayMessage('Changes saved.', 'info');

    // Establish a connection with the new parameters
    establishConnection();
  }, false);

  hueClear.addEventListener('click', function () {
    storage.clear();

    displayMessage('Settings cleared.', 'info');
  }, false);
}


/***************************
   Connecting Splashscreen
 ***************************/

/*
 * Initialise the splashscreen that shows that connection is being made.
 * The splash screen will indicate that the connection is still being made.
 * It can be closed early, though the lights will not respond until the
 * connection is established.
 * The splashscreen will also display any error messages that occur when
 * trying to connect.
 */
function initialiseConnectingSplashscreen() {
  'use strict';
  var connectingSplashscreen = document.getElementById('connecting'),
      connectingMessage = document.getElementById('connecting-message'),
      connectingSkip = document.getElementById('connecting-skip'),
      connectingSpinner = document.getElementById('connecting-spinner'),
      connectingError = document.getElementById('connecting-error'),
      connectingErrorMessage = document.getElementById('connecting-error-message'),
      connectingTimedOut = document.getElementById('connecting-timed-out'),
      connectingRetryButton = document.getElementById('connecting-retry');

  /*
   * Prematurely close the connecting pane.
   * This allows access to other panels and other parts of the site,
   * however, lights will not respond to any inputs until the connection
   * is made.
   */
  function skipConnecting() {
    if (connectingSplashscreen) {
      hideElement(connectingSplashscreen);
    }
    window.alert('Please note: Hue lights will not respond until the connection is made.\nWill continue trying to connect in the background.');
  }

  /*
   * Reset hue parameters and reload
   */
  function resetAndRetry() {
    storage.clear();
    firstTimeSetup();
    showElement(connectingSpinner);
    hideElement(connectingError);
  }


  // Attach a click handler that allows the connecting splashscreen to be
  // hidden early.
  if (connectingSkip) {
    connectingSkip.addEventListener('click', skipConnecting, false);
  }

  if (connectingRetryButton) {
    connectingRetryButton.addEventListener('click', resetAndRetry, false);
  }

  // Once connected, hide the splashscreen
  document.addEventListener('hueconnection', function (e) {
    if (connectingSplashscreen) {
      hideElement(connectingSplashscreen);
    }
  });

  // If an error occurs, display the error message in the splashscreen
  document.addEventListener('hueerror', function (e) {
    var err = e.detail;

    if (err.detail || err.description) {
      connectingErrorMessage.innerHTML = err.detail || err.description;
      hideElement(connectingTimedOut);
    } else {
      connectingErrorMessage.innerHTML =  'Connection timed out.';
      showElement(connectingTimedOut);
    }

    hideElement(connectingSpinner);
    showElement(connectingError);
  });

  document.addEventListener('huelinkbutton', function (e) {
    connectingMessage.innerHTML = 'Please press the link button on the Hue Bridge...';
  });

  document.addEventListener('huebridgeip', function (e) {
    connectingMessage.innerHTML = 'Connecting to Hue Bridge...';
  });

  document.addEventListener('huebridgesearchstart', function(e) {
    connectingMessage.innerHTML = 'Searching for Hue Bridges...';
  });
}


/******************************************
   Connect with Hue Bridge and Initialise
 ******************************************/

function LocalDataStorage() {
  'use strict';

  // Find which type of storage to use for the environment
  this.storageType = chrome && chrome.runtime && chrome.runtime.id ?
    'chrome' : 'local';

  if (this.storageType === 'local') {
    // Check that local storage is available
    try {
      this.storageType = 'local';
      window.localStorage.setItem('available', true);
      // Bug - Safari incognito allows access to localStorage
      // but the storage available is 0 Bytes
    } catch (localErr) {
      // window.localStorage failed
      this.storageType = 'unavailable';
      console.error('Storage unavailable');
    }
  }

  /*
   * @param key - optional, a string key for the data
   *              to be retrieved. If omitted, an object
   *              of all key:value pairs will be returned
   * @param callback - a callback function whose first
   *                   argument contains either the value
   *                   at the provided key, or an object of
   *                   all key:value pairs
   */
  this.get = function (callback) {
    var key, items;

    switch (this.storageType) {
    case 'local':
      items = {};

      for (key in window.localStorage) {
        if (window.localStorage.hasOwnProperty(key)) {
          items[key] = JSON.parse(window.localStorage[key]);
        }
      }

      if (typeof callback === 'function') {
        callback(items);
      }

      break;

    case 'chrome':
      chrome.storage.local.get(null, function (items) {
        if (typeof callback === 'function') {
          callback(items);
        }
      });
      break;
    }
  };

  /*
   * @param obj - an object of key:value pairs to be stored
   * @param callback - the callback function to be run once
   *                   the objects have been saved
   */
  this.set = function (obj, callback) {
    var key;

    switch (this.storageType) {
    case 'local':
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          window.localStorage[key] = JSON.stringify(obj[key]);
        }
      }
      console.log('Saved to local storage.');
      break;

    case 'chrome':
      chrome.storage.local.set(obj, function () {
        console.log('Saved to chrome storage.');
      });
      break;
    }
  };

  /*
   * Clears all storage
   */
  this.clear = function () {
    switch (this.storageType) {
    case 'local':
      window.localStorage.clear();
      console.log('Local storage cleared.');
      break;

    case 'chrome':
      chrome.storage.local.clear(function () {
        console.log('Chrome storage cleared.');
      });
      break;
    }
  };
}


/******************************************
   Connect with Hue Bridge and Initialise
 ******************************************/

function initialise() {
  'use strict';

  // Initialise components
  initialiseConnectingSplashscreen();
  initialiseColourWheel();
  initialiseAnimationsPane();
  initialiseSettingsPanel();

  // Get local storage space
  storage = new LocalDataStorage();

  // Check for existing hue parameters
  storage.get(function (items) {
    if (items.hue) {
      // If present, make the hue parameters global
      hue = items.hue;
      setHueUrls();
      // Then test the connection
      establishConnection();
    } else {
      // If no parameters were present
      firstTimeSetup();
    }
  });
}

document.addEventListener('DOMContentLoaded', initialise, false);
