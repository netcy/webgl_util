var wg = root.wg = {};
var Util = wg.Util = {};

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

function addVertexArrayObjectSupport (gl) {
  // https://github.com/greggman/oes-vertex-array-object-polyfill
  if (!gl.createVertexArray) {
    var ext = gl.getExtension("OES_vertex_array_object");
    if (!ext) {
      ext = new OESVertexArrayObject(gl);
    }
    if (ext) {
      gl.createVertexArray = function () {
        return ext.createVertexArrayOES();
      };
      gl.deleteVertexArray = function (v) {
        ext.deleteVertexArrayOES(v);
      };
      gl.isVertexArray = function (v) {
        return ext.isVertexArrayOES(v);
      };
      gl.bindVertexArray = function (v) {
        ext.bindVertexArrayOES(v);
      };
      gl.VERTEX_ARRAY_BINDING = ext.VERTEX_ARRAY_BINDING_OES;
    }
  }
}

var initWebGL = Util.initWebGL = function (canvas, options, initWebglFunc) {
  if (typeof canvas === 'string') {
    canvas = document.getElementById(canvas);
  }

  setCanvasSize(canvas);
  var gl = canvas.getContext('webgl', options || {
    antialias: true
  });
  addVertexArrayObjectSupport(gl);
  gl.cache = {};

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
    gl.aniamtionId && cancelAnimationFrame(gl.aniamtionId);
  });
  canvas.addEventListener('webglcontextrestored', function (e) {
    console.log(e);
    init();
  });

  function init () {
    gl.cache.quadVao = new VertexArrayObject(gl, {
      buffers: {
        position: {
          array: [
            // First triangle
             1.0,  1.0,
            -1.0,  1.0,
            -1.0, -1.0,
            // Second triangle
            -1.0, -1.0,
             1.0, -1.0,
             1.0,  1.0
          ],
          type: 'FLOAT',
          index: 0,
          size: 2
        }
      }
    });
    initWebglFunc(gl);
  }

  init();
  return gl;
};
