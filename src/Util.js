var wg = root.wg = {};
var Util = wg.Util = {
  version: '0.23.0'
};

var getClientPoint = Util.getClientPoint = function (e) {
  return {
    x: (e.touches ? e.touches[0] : e).clientX,
    y: (e.touches ? e.touches[0] : e).clientY
  };
}

function nextPowerOfTwo(x) {
  --x;
  for (var i = 1; i < 32; i <<= 1) {
    x = x | x >> i;
  }
  return x + 1;
}

function isPowerOfTwo(x) {
  return (x & (x - 1)) === 0;
}

Util.initWebGL = function (canvas, options, callback) {
  var gl = canvas.getContext('webgl', options || {
    preserveDrawingBuffer: true,
    antialias: false,
    stencil: true
  });
  addVertexArraySupport(gl);
  addInstancedArraysSupport(gl);
  // https://developer.mozilla.org/en-US/docs/Web/API/OES_standard_derivatives
  gl.getExtension('OES_standard_derivatives');
  // http://blog.tojicode.com/2012/03/anisotropic-filtering-in-webgl.html
  var ext = gl.getExtension('EXT_texture_filter_anisotropic');
  if (ext) {
    gl._anisotropicExt = ext;
    gl._max_anisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
  }

  gl.initingTextures = {};
  // https://www.khronos.org/webgl/wiki/HandlingContextLost#Handling_Lost_Context_in_WebGL
  canvas.addEventListener('webglcontextlost', function (e) {
    console.log(e);
    e.preventDefault();
    // https://www.khronos.org/webgl/wiki/HandlingContextLost#Deal_with_outstanding_asynchronous_requests
    var imageUrls = Object.keys(gl.initingTextures);
    imageUrls.forEach(function (imageUrl) {
      gl.initingTextures[imageUrl].onload = null;
    });
    gl.initingTextures = {};
    // https://www.khronos.org/webgl/wiki/HandlingContextLost#Turn_off_your_rendering_loop_on_lost_context
    gl._aniamtionId && (gl._vrDisplay || window).cancelAnimationFrame(gl._aniamtionId);
  });
  canvas.addEventListener('webglcontextrestored', function (e) {
    console.log(e);
    callback(gl);
  });
  callback(gl);
};

var getPowerOfTwoImage = Util.getPowerOfTwoImage = function (image) {
  if (isPowerOfTwo(image.width) && isPowerOfTwo(image.height)) {
    return image;
  }
  var width = nextPowerOfTwo(image.width),
    height = nextPowerOfTwo(image.height),
    canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
};

var setCanvasSize = Util.setCanvasSize = function (canvas, width, height) {
  var ratio = window.devicePixelRatio || 1;
  !width && (width = canvas.width);
  !height && (height = canvas.height);
  // http://stackoverflow.com/questions/15892387/how-to-render-webgl-content-using-high-dpi-devices/15916364#15916364
  // https://www.khronos.org/webgl/wiki/HandlingHighDPI
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
};

function addVertexArraySupport (gl) {
  // https://github.com/greggman/oes-vertex-array-object-polyfill
  if (!gl.createVertexArray) {
    var ext = gl.getExtension("OES_vertex_array_object");
    if (ext) {
      gl.createVertexArray = ext.createVertexArrayOES.bind(ext);
      gl.deleteVertexArray = ext.deleteVertexArrayOES.bind(ext);
      gl.isVertexArray = ext.isVertexArrayOES.bind(ext);
      gl.bindVertexArray = ext.bindVertexArrayOES.bind(ext);
      gl.VERTEX_ARRAY_BINDING = ext.VERTEX_ARRAY_BINDING_OES;
    }
  }
}

function addInstancedArraysSupport (gl) {
  if (!gl.drawArraysInstanced) {
    var ext = gl.getExtension("ANGLE_instanced_arrays");
    if (ext) {
      gl.drawArraysInstanced = ext.drawArraysInstancedANGLE.bind(ext);
      gl.drawElementsInstanced = ext.drawElementsInstancedANGLE.bind(ext);
      gl.vertexAttribDivisor = ext.vertexAttribDivisorANGLE.bind(ext);
    }
  }
}

var equalObject = Util.equalObject = function (a, b) {
  if (a === b) {
    return true;
  }
  if (a == null || b == null) {
    return false;
  }
  var keysA = Object.keys(a),
    keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return !keysA.some(function (key) {
    return a[key] !== b[key];
  });
};

var ajax = Util.ajax = function (url, responseType, callback) {
  var xhr = new XMLHttpRequest();
  if (responseType) {
    xhr.responseType = responseType;
  }
  xhr.onreadystatechange = function (e) {
     if (this.readyState === 4) {
      if (this.status === 200) {
        callback(xhr.response);
      } else {
        console.log('ajax error:', this.status);
        callback(null);
      }
     }
  };
  xhr.open('get', url);
  xhr.send();
};

var defineProperty = Util.defineProperty = function (object, property, defaultValue, callback) {
  var propertyName = '_' + property;
  object[propertyName] = defaultValue;
  Object.defineProperty(object, property, {
    configurable: true,
    enumerable: true,
    get: function () {
      return this[propertyName];
    },
    set: function (value) {
      var oldValue = this[propertyName];
      this[propertyName] = value;
      if (callback) {
        callback.call(this, property, oldValue, value);
      }
    }
  });
};
