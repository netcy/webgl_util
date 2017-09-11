'use strict';
+function (root) {
// Source: src/Util.js
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
        position: [
           1.0,  1.0, 0.0,
          -1.0,  1.0, 0.0,
          -1.0, -1.0, 0.0,
          -1.0, -1.0, 0.0,
           1.0, -1.0, 0.0,
           1.0,  1.0, 0.0
        ]
      }
    });
    initWebglFunc(gl);
  }

  init();
  return gl;
};

var createCube = Util.createCube = function (side) {
  var hs = side * 0.5;
  var pos = [
    -hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs,  hs,
    -hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs, -hs,
    -hs,  hs, -hs, -hs,  hs,  hs,  hs,  hs,  hs,  hs,  hs, -hs,
    -hs, -hs, -hs,  hs, -hs, -hs,  hs, -hs,  hs, -hs, -hs,  hs,
     hs, -hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs,
    -hs, -hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs
  ];
  var nor = [
    -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,  1.0,
    -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0, -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0,
    -1.0, -1.0, -1.0,  1.0, -1.0, -1.0,  1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
     1.0, -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,
    -1.0, -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0
  ];
  var st = [
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0
  ];
  var idx = [
     0,  1,  2,  0,  2,  3,
     4,  5,  6,  4,  6,  7,
     8,  9, 10,  8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23
  ];
  return {position : pos, normal : nor, uv : st, index : idx};
};

var createTorus = Util.createTorus = function (row, column, irad, orad) {
  var pos = [],
    nor = [],
    st = [],
    idx = [];
  for (var i = 0; i <= row; i++) {
    var r = Math.PI * 2 / row * i;
    var rr = Math.cos(r);
    var ry = Math.sin(r);
    for (var ii = 0; ii <= column; ii++) {
      var tr = Math.PI * 2 / column * ii;
      var tx = (rr * irad + orad) * Math.cos(tr);
      var ty = ry * irad;
      var tz = (rr * irad + orad) * Math.sin(tr);
      var rx = rr * Math.cos(tr);
      var rz = rr * Math.sin(tr);
      var rs = 1 / column * ii;
      var rt = 1 / row * i + 0.5;
      if (rt > 1.0) {
        rt -= 1.0;
      }
      rt = 1.0 - rt;
      pos.push(tx, ty, tz);
      nor.push(rx, ry, rz);
      st.push(rs, rt);
    }
  }
  for (i = 0; i < row; i++) {
    for (ii = 0; ii < column; ii++) {
      r = (column + 1) * i + ii;
      idx.push(r, r + column + 1, r + 1);
      idx.push(r + column + 1, r + column + 2, r + 1);
    }
  }
  return {
    position: pos,
    normal: nor,
    uv: st,
    index: idx
  };
};

var createSphere = Util.createSphere = function (row, column, rad) {
  var pos = [],
    nor = [],
    col = [],
    st = [],
    idx = [];
  for (var i = 0; i <= row; i++) {
    var r = Math.PI / row * i;
    var ry = Math.cos(r);
    var rr = Math.sin(r);
    for (var ii = 0; ii <= column; ii++) {
      var tr = Math.PI * 2 / column * ii;
      var tx = rr * rad * Math.cos(tr);
      var ty = ry * rad;
      var tz = rr * rad * Math.sin(tr);
      var rx = rr * Math.cos(tr);
      var rz = rr * Math.sin(tr);
      pos.push(tx, ty, tz);
      nor.push(rx, ry, rz);
      st.push(1 - 1 / column * ii, 1 / row * i);
    }
  }
  r = 0;
  for (i = 0; i < row; i++) {
    for (ii = 0; ii < column; ii++) {
      r = (column + 1) * i + ii;
      idx.push(r, r + 1, r + column + 2);
      idx.push(r, r + column + 2, r + column + 1);
    }
  }
  return {
    position: pos,
    normal: nor,
    uv: st,
    index: idx
  };
}

function createVaos(gl) {
  gl.cache.quadVao = new VertexArrayObject(gl, {
    buffers: {
      position: [
        1.0, 1.0, 0.0, -1.0, 1.0, 0.0, -1.0, -1.0, 0.0, -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0,
        1.0, 1.0, 0.0
      ]
    }
  });
  gl.cache.vaos = {};
  gl.cache.vaos['cube'] = new VertexArrayObject(gl, {
    buffers: createCube(1)
  });
  gl.cache.vaos['torus'] = new VertexArrayObject(gl, {
    buffers: createTorus(32, 32, 0.5, 1)
  });
  gl.cache.vaos['sphere'] = new VertexArrayObject(gl, {
    buffers: createSphere(32, 32, 1)
  });
}

// Source: src/Program.js
var attributesMap = {
  position: { index: 0, size: 3 },
  normal: { index: 1, size: 3 },
  uv: { index: 2, size: 2 },
  color: { index: 3, size: 4 },
};

var Program = wg.Program = function (gl, options) {
  var self = this;

  self._attributes = {};
  self._uniforms = {};
  self._gl = gl;
  self._program = null;

  self._validated = init(options.vertex, options.fragment);

  function init (vertexShaderSource, fragmentShaderSource) {
    var attributes = self._attributes,
      uniforms = self._uniforms,
      vertexShader, fragmentShader, program, attribCount, uniformCount, i, attrib, uniform;

    vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    if (!vertexShader) {
      return false;
    }

    fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!fragmentShader) {
      return false;
    }

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    Object.keys(attributesMap).forEach(function (attribute) {
      gl.bindAttribLocation(program, attributesMap[attribute].index, 'a_' + attribute);
    });
    gl.linkProgram(program);

    // https://www.khronos.org/webgl/wiki/HandlingContextLost#Handling_Shaders_and_Programs
    if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
      console.error('Link program error: ' + gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return false;
    }
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    self._program = program;

    attribCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (i = 0; i < attribCount; i++) {
      attrib = gl.getActiveAttrib(program, i);
      if (attrib) {
        attributes[attrib.name] = {
          location: gl.getAttribLocation(program, attrib.name),
          type: attrib.type
        };
      }
    }

    uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (i = 0; i < uniformCount; i++) {
      uniform = gl.getActiveUniform(program, i);
      if (uniform) {
        uniforms[uniform.name] = {
          location: gl.getUniformLocation(program, uniform.name),
          type: uniform.type
        };
      }
    }
    return true;
  }

  function loadShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // https://www.khronos.org/webgl/wiki/HandlingContextLost#Handling_Shaders_and_Programs
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      var errorType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
      console.log('Create ' + errorType + ' shader ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }
};

Program.prototype.use = function () {
  var self = this;
  self._gl.useProgram(self._program);
};

Program.prototype.setUniforms = function (values) {
  var self = this;
  Object.keys(values).forEach(function (name) {
    var value = values[name];
    self.setUniform(name, value)
  });
};

Program.prototype.setUniform = function (name, value) {
  var self = this,
    gl = self._gl,
    uniforms = self._uniforms,
    uniform = uniforms[name],
    type, location;

  if (!uniform || value == null) {
    return;
  }

  type = uniform.type;
  location = uniform.location;

  switch (type) {
    case gl.INT:
    case gl.BOOL:
    case gl.SAMPLER_2D:
    case gl.SAMPLER_CUBE:
      gl.uniform1i(location, value);
      break;
    case gl.INT_VEC2:
    case gl.BOOL_VEC2:
      gl.uniform2iv(location, value);
      break;
    case gl.INT_VEC3:
    case gl.BOOL_VEC3:
      gl.uniform3iv(location, value);
      break;
    case gl.INT_VEC4:
    case gl.BOOL_VEC4:
      gl.uniform4iv(location, value);
      break;
    case gl.FLOAT:
      gl.uniform1f(location, value);
      break;
    case gl.FLOAT_VEC2:
      gl.uniform2fv(location, value);
      break;
    case gl.FLOAT_VEC3:
      gl.uniform3fv(location, value);
      break;
    case gl.FLOAT_VEC4:
      gl.uniform4fv(location, value);
      break;
    case gl.FLOAT_MAT2:
      gl.uniformMatrix2fv(location, false, value);
      break;
    case gl.FLOAT_MAT3:
      gl.uniformMatrix3fv(location, false, value);
      break;
    case gl.FLOAT_MAT4:
      gl.uniformMatrix4fv(location, false, value);
      break;
  }
};

Program.prototype.dispose = function () {
  var self = this;
  gl.deleteProgram(self._program);
  self._program = null;
};

// Source: src/Framebuffer.js
var Framebuffer = wg.Framebuffer = function (gl, options) {
  var self = this;

  self._gl = gl;
  self._texture = null;
  self._width = 0;
  self._height = 0;
  self._renderbuffer = null;
  self._framebuffer = null;

  init(options.width, options.height, options.depth, options.stencil);

  function init (width, height, depth, stencil) {
    var framebuffer, renderbuffer, texture, internalFormat, attachment;

    self._width = width;
    self._height = height;
    framebuffer = self._framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    texture = self._texture = new Texture(gl, { width: width, height: height });
    texture.bind(0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture._texture, 0);

    if (depth || stencil) {
      renderbuffer = self._renderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
      if (depth && !stencil) {
        internalFormat = gl.DEPTH_COMPONENT16;
        attachment = gl.DEPTH_ATTACHMENT;
      } else if (!depth && stencil) {
        internalFormat = gl.STENCIL_INDEX8;
        attachment = gl.STENCIL_ATTACHMENT;
      } else if (depth && stencil) {
        internalFormat = gl.DEPTH_STENCIL;
        attachment = gl.DEPTH_STENCIL_ATTACHMENT;
      }
      gl.renderbufferStorage(gl.RENDERBUFFER, internalFormat, width, height);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, renderbuffer);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
};

Framebuffer.prototype.getWidth = function () {
  return this._width;
};

Framebuffer.prototype.getHeight = function () {
  return this._height;
};

Framebuffer.prototype.bind = function () {
  var self = this,
    gl = self._gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, self._framebuffer);
  gl.viewport(0, 0, self._width, self._height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
};

Framebuffer.prototype.bindTexture = function (unit) {
  this._texture.bind(unit);
};

Framebuffer.prototype.getTexture = function () {
  return this._texture;
};

Framebuffer.prototype.dispose = function () {
  var self = this;
  self._texture.dispose();
  self._renderbuffer && gl.deleteRenderbuffer(self._renderbuffer);
  gl.deleteFramebuffer(self._framebuffer);
};

// Source: src/Texture.js
/**
 * Texture
 * @param {[WebGLRenderingContext]} gl WebGLRenderingContext
 * @param {[Object]} options
 * @example
 *     url: default undefinded, should input url or width&height
 *     width: default undefinded
 *     height: default undefinded
 *     flipY: default true when url supported, false or else
 *     mipmap: default true when url supported, false or else
 *     powerOfTwo: default true when url supported, false or else
 *     minFilter: default 'LINEAR_MIPMAP_NEAREST' when url supported, 'LINEAR' or else
 *     magFilter: default 'LINEAR'
 *     wrapS: default 'CLAMP_TO_EDGE'
 *     wrapT: default 'CLAMP_TO_EDGE'
 */
var Texture = wg.Texture = function (gl, options) {
  var self = this,
    url = options.url,
    callback = options.callback;

  self._gl = gl;
  self._options = options,
    self._initialized = false;
  self._imageLoaded = false;
  self._texture = gl.createTexture();

  if (url) {
    var image = self._image = new Image();
    gl.initingTextures[url] = image;
    image.src = url;
    image.onload = function () {
      image.onload = null;
      image.onerror = null;
      delete gl.initingTextures[url];
      self._imageLoaded = true;

      callback && callback();
    };
    image.onerror = function () {
      image.onload = null;
      image.onerror = null;
      delete gl.initingTextures[url];

      callback && callback();
    };
  }
};

Texture.prototype.bind = function (unit) {
  var self = this,
    gl = self._gl,
    options = self._options,
    width, height;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, self._texture);

  if (!self._initialized) {
    self._initialized = true;
    width = options.width;
    height = options.height;
    gl.pixelStorei(
      gl.UNPACK_FLIP_Y_WEBGL,
      (options.flipY == null ? false : options.flipY) ? 1 : 0
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      gl[options.magFilter || 'LINEAR']
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl[options.minFilter || 'LINEAR']
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      gl[options.wrapS || 'CLAMP_TO_EDGE']
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      gl[options.wrapT || 'CLAMP_TO_EDGE']
    );

    if (width && height) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
    } else {
      if (!self._imageLoaded) {
        gl.texImage2D(
          gl.TEXTURE_2D, // target
          0, // mipmapLevel
          gl.RGBA, // internalFormat
          1, // width
          1, // height
          0, // border
          gl.RGBA, // dataFormat
          gl.UNSIGNED_BYTE, // dataType
          new Uint8Array([127, 127, 127, 255]) // dataArray
        );
      }
    }
  }

  if (self._imageLoaded) {
    self._imageLoaded = false;
    gl.pixelStorei(
      gl.UNPACK_FLIP_Y_WEBGL,
      (options.flipY == null ? true : options.flipY) ? 1 : 0
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl[options.minFilter || 'LINEAR_MIPMAP_NEAREST']
    );
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      (options.powerOfTwo == null ? true : options.powerOfTwo) ?
        getPowerOfTwoImage(self._image) : self._image
    );
    if (options.mipmap == null ? true : options.mipmap) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    self._image = null;
  }
};

Texture.prototype.dispose = function () {
  var self = this;
  self._gl.deleteTexture(self._texture);
  self._texture = null;
};

// Source: src/VertexArrayObject.js
/**
 * VertexArrayObject
 * @param {[WebGLRenderingContext]} gl WebGLRenderingContext
 * @param {[Object]} options
 * @example
 *     buffers: { position: [], normal: [], uv: [], color: [], index: [] },
 *     offset: 0,
 *     mode: 'TRIANGLES'
 */
var VertexArrayObject = wg.VertexArrayObject = function (gl, options) {
  var self = this,
    buffers = options.buffers;

  self._gl = gl;
  self._vao = gl.createVertexArray();

  gl.bindVertexArray(self._vao);
  Object.keys(buffers).forEach(function (attrName) {
    var attribute = attributesMap[attrName];
    var buffer = buffers[attrName];
    var bufferObject = gl.createBuffer();
    var element_type, element_size, array;

    if (attrName === 'position') {
      if (!self._index) {
        self._count = buffer.length / attribute.size;
      }
    }

    if (attrName === 'color') {
      self._color = true;
    }

    if (attrName === 'index') {
      self._index = true;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferObject);

      if (buffer.length <= 256) {
        element_type = 5121; // WebGLRenderingContext.UNSIGNED_BYTE
        element_size = 1;
        array = new Uint8Array(buffer);
      } else if (buffer.length <= 65536) {
        element_type = 5123; // WebGLRenderingContext.UNSIGNED_SHORT
        element_size = 2;
        array = new Uint16Array(buffer);
      } else {
        // TODO check gl.getExtension('OES_element_index_uint');
        element_type = 5125; // WebGLRenderingContext.UNSIGNED_INT
        element_size = 4;
        array = new Uint32Array(buffer);
      }
      self._element_type = element_type;
      self._element_size = element_size;
      self._count = buffer.length;
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buffer), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(attribute.index);
      // index, size, type, normalized, stride, offset
      gl.vertexAttribPointer(attribute.index, attribute.size, gl.FLOAT, false, 0, 0);
    }
  });
  gl.bindVertexArray(null);

  self._offset = options.offset || 0;
  self._mode = gl[options.mode || 'TRIANGLES'];
};

VertexArrayObject.prototype.draw = function () {
  var self = this,
    gl = self._gl;
  gl.bindVertexArray(self._vao);
  if (self._index) {
     // mode, count, type, offset
    gl.drawElements(self._mode, self._count, self._element_type, self._offset * self._element_size);
  } else {
    gl.drawArrays(self._mode, self._offset, self._count);
  }
};

VertexArrayObject.prototype.dispose = function () {
  var self = this;
  self._gl.deleteVertexArray(self._vao);
  self._vao = null;
};

// Source: src/Effect.js
var Effect = wg.Effect = function (gl) {
  var self = this;
  self._gl = gl;
};

Effect.prototype.pass = function (inputFrameBuffer, outputFrameBuffer) {

};

Effect.prototype.getOutputTexture = function () {
  return null;
};

// Source: src/FxaaEffect.js
var VERTEX_SHADER_FXAA = `
#ifdef GL_ES
  precision highp float;
#endif

attribute vec2 a_position;

uniform bool u_enabled;
uniform vec2 u_windowSize;

varying vec2 v_rgbNW;
varying vec2 v_rgbNE;
varying vec2 v_rgbSW;
varying vec2 v_rgbSE;
varying vec2 v_rgbM;
varying vec2 v_uv;

const vec2 SCALE = vec2(0.5, 0.5);

void main() {
  v_uv = (a_position * SCALE) + SCALE;

  if (u_enabled) {
    v_rgbNW = v_uv + vec2(-1.0, -1.0) * u_windowSize;
    v_rgbNE = v_uv + vec2( 1.0, -1.0) * u_windowSize;
    v_rgbSW = v_uv + vec2(-1.0,  1.0) * u_windowSize;
    v_rgbSE = v_uv + vec2( 1.0,  1.0) * u_windowSize;
    v_rgbM = v_uv;
  }

  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
var FRAGMENT_SHADER_FXAA = `
#ifdef GL_ES
  precision highp float;
#endif

#define FXAA_REDUCE_MIN (1.0 / 128.0)
#define FXAA_REDUCE_MUL (1.0 / 8.0)
#define FXAA_SPAN_MAX 8.0

uniform sampler2D u_sampler;
uniform vec2 u_windowSize;
uniform bool u_enabled;

varying vec2 v_rgbNW;
varying vec2 v_rgbNE;
varying vec2 v_rgbSW;
varying vec2 v_rgbSE;
varying vec2 v_rgbM;
varying vec2 v_uv;

void main() {
  if (u_enabled) {
    vec3 rgbNW    = texture2D(u_sampler, v_rgbNW).xyz;
    vec3 rgbNE    = texture2D(u_sampler, v_rgbNE).xyz;
    vec3 rgbSW    = texture2D(u_sampler, v_rgbSW).xyz;
    vec3 rgbSE    = texture2D(u_sampler, v_rgbSE).xyz;
    vec4 texColor = texture2D(u_sampler, v_rgbM);
    vec3 rgbM     = texColor.xyz;
    vec3 luma     = vec3(0.299, 0.587, 0.114);

    float lumaNW  = dot(rgbNW, luma);
    float lumaNE  = dot(rgbNE, luma);
    float lumaSW  = dot(rgbSW, luma);
    float lumaSE  = dot(rgbSE, luma);
    float lumaM   = dot(rgbM,  luma);
    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

    float dirReduce = max(
      (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL),
      FXAA_REDUCE_MIN
    );
    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);

    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
      max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * u_windowSize;

    vec4 rgbA = 0.5 * (
      texture2D(u_sampler, v_uv + dir * (1.0 / 3.0 - 0.5)) +
      texture2D(u_sampler, v_uv + dir * (2.0 / 3.0 - 0.5)));

    vec4 rgbB = rgbA * 0.5 + 0.25 * (
      texture2D(u_sampler, v_uv + dir * -0.5) +
      texture2D(u_sampler, v_uv + dir *  0.5));

    float lumaB = dot(rgbB.xyz, luma);

    if ((lumaB < lumaMin) || (lumaB > lumaMax)) {
      gl_FragColor = rgbA;
    } else {
      gl_FragColor = rgbB;
    }
  } else {
    gl_FragColor = texture2D(u_sampler, v_uv);
  }
}
`;

var FxaaEffect = wg.FxaaEffect = function (gl) {
  var self = this;

  self._gl = gl;
  self._enabled = 0;

  self._program = new wg.Program(gl, {
    vertex: VERTEX_SHADER_FXAA,
    fragment: FRAGMENT_SHADER_FXAA
  });
};

FxaaEffect.prototype.pass = function (inputFrameBuffer, outputFrameBuffer) {
  var self = this,
    gl = self._gl,
    quadVao = gl.cache.quadVao,
    program = self._program;

  if (outputFrameBuffer) {
    outputFrameBuffer.bind();
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  program.use();
  program.setUniforms({
    'u_sampler': 0,
    'u_enabled': self._enabled,
    'u_windowSize': [
      window.devicePixelRatio / gl.canvas.width,
      window.devicePixelRatio / gl.canvas.height
    ]
  });
  inputFrameBuffer.bindTexture(0);
  quadVao.draw();
};

FxaaEffect.prototype.getOutputTexture = function () {
  return null;
};

FxaaEffect.prototype.setEnabled = function (enabled) {
  this._enabled = enabled;
};

FxaaEffect.prototype.isEnabled = function () {
  return this._enabled;
};

// Source: src/TiltShiftEffect.js
var VERTEX_SHADER_TILT_SHIFT = `
#ifdef GL_ES
  precision highp float;
#endif

attribute vec2 a_position;
varying vec2 v_uv;

const vec2 SCALE = vec2(0.5, 0.5);

void main () {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = (a_position * SCALE) + SCALE;
}
`;

var FRAGMENT_SHADER_TILT_SHIFT_BLUR = `
#ifdef GL_ES
  precision highp float;
#endif

uniform vec2 u_windowSize;
uniform sampler2D u_sampler;
uniform int u_orientation;
uniform float u_blurRadius;

varying vec2 v_uv;

const float MAX_BLUR_RADIUS = 10.0;

void main () {
  vec4 color = vec4(0.0);
  vec2 texelOffset;
  if (u_orientation == 0) {
    texelOffset = vec2(u_windowSize.x, 0.0);
  } else {
    texelOffset = vec2(0.0, u_windowSize.y);
  }

  float blurAmount = min(floor(u_blurRadius), MAX_BLUR_RADIUS);
  float halfBlur = blurAmount * 0.5;
  for (float i = 0.0; i < MAX_BLUR_RADIUS; ++i) {
    if (i >= blurAmount) {
      break;
    }
    float offset = i - halfBlur;
    vec2 vOffset = v_uv + (texelOffset * offset);
    color += texture2D(u_sampler, vOffset);
  }

  gl_FragColor = color / blurAmount;
}
`;

var FRAGMENT_SHADER_TILT_SHIFT = `
#ifdef GL_ES
  precision highp float;
#endif

uniform sampler2D u_sampler0; // color texture
uniform sampler2D u_sampler1; // Blurred texture

uniform vec2 u_windowSize;
uniform float u_pixelRatio;
uniform float u_tiltShiftType; // 0 tilt, 1 circle
uniform float u_gradientRadius;
uniform vec2 u_fromPoint;
uniform vec2 u_toPoint;
uniform vec2 u_center;

varying vec2 v_uv;

float distanceFromPoint (in vec2 point) {
  if (u_fromPoint.x == u_toPoint.x) {
    return abs(point.x - u_fromPoint.x);
  }
  float lineK = (u_toPoint.y - u_fromPoint.y) / (u_toPoint.x - u_fromPoint.x);
  float lineC = (u_toPoint.x * u_fromPoint.y - u_fromPoint.x * u_toPoint.y) /
    (u_toPoint.x - u_fromPoint.x);
  return abs(lineK * point.x - point.y + lineC) / (sqrt(lineK * lineK + 1.0));
}

void main () {
  vec4 color = texture2D(u_sampler0, v_uv);
  vec4 blur = texture2D(u_sampler1, v_uv);
  vec2 point = vec2(
    gl_FragCoord.x / u_pixelRatio,
    (u_windowSize.y - gl_FragCoord.y) / u_pixelRatio
  );
  float _distance = 0.0;

  if (u_tiltShiftType == 0.0) {
    _distance = distanceFromPoint(point);
  } else {
    _distance = distance(u_center, point);
  }

  if (_distance >= u_gradientRadius) {
    gl_FragColor = blur;
  } else {
    float percent = _distance / u_gradientRadius;
    gl_FragColor = blur * percent + color * (1.0 - percent);
  }
}
`;

var TiltShiftEffect = wg.TiltShiftEffect = function (gl) {
  var self = this;

  self._gl = gl;
  self._tiltShiftType = 0;
  self._blurRadius = 3;
  self._gradientRadius = 50;
  self._fromPoint = [0, 0];
  self._toPoint = [0, 0];
  self._center = [0, 0];

  self._blurProgram = new Program(gl, {
    vertex: VERTEX_SHADER_TILT_SHIFT,
    fragment: FRAGMENT_SHADER_TILT_SHIFT_BLUR
  });
  self._tiltShiftProgram = new Program(gl, {
    vertex: VERTEX_SHADER_TILT_SHIFT,
    fragment: FRAGMENT_SHADER_TILT_SHIFT
  });
  self._hBlurFramebuffer = new Framebuffer(gl, {
    width: 128,
    height: 128,
    depth: false,
    stencil: false
  });
  self._vBlurFramebuffer = new Framebuffer(gl, {
    width: 128,
    height: 128,
    depth: false,
    stencil: false
  });
};

TiltShiftEffect.prototype.pass = function (inputFrameBuffer, outputFrameBuffer) {
  var self = this,
    gl = self._gl,
    quadVao = gl.cache.quadVao,
    blurProgram = self._blurProgram,
    tiltShiftProgram = self._tiltShiftProgram,
    hBlurFramebuffer = self._hBlurFramebuffer,
    vBlurFramebuffer = self._vBlurFramebuffer;

  hBlurFramebuffer.bind();
  blurProgram.use();
  blurProgram.setUniforms({
    'u_windowSize': [
      1 / hBlurFramebuffer.getWidth(),
      1 / hBlurFramebuffer.getHeight()
    ],
    'u_sampler': 0,
    'u_orientation': 0,
    'u_blurRadius': self._blurRadius
  });
  inputFrameBuffer.bindTexture(0);
  quadVao.draw();

  vBlurFramebuffer.bind();
  blurProgram.setUniforms({
    'u_orientation': 1
  });
  hBlurFramebuffer.bindTexture(0);
  quadVao.draw();

  if (outputFrameBuffer) {
    outputFrameBuffer.bind();
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  tiltShiftProgram.use();
  tiltShiftProgram.setUniforms({
    'u_windowSize': [gl.canvas.width, gl.canvas.height],
    'u_pixelRatio': window.devicePixelRatio,
    'u_tiltShiftType': self._tiltShiftType,
    'u_sampler0': 0,
    'u_sampler1': 1,
    'u_fromPoint': self._fromPoint,
    'u_toPoint': self._toPoint,
    'u_gradientRadius': self._gradientRadius,
    'u_center': self._center,
  });
  inputFrameBuffer.bindTexture(0);
  vBlurFramebuffer.bindTexture(1);
  quadVao.draw();
};

TiltShiftEffect.prototype.getOutputTexture = function () {
  return this._vBlurFramebuffer.getTexture();
};

TiltShiftEffect.prototype.setTiltShiftType = function (tiltShiftType) {
  this._tiltShiftType = tiltShiftType;
};

TiltShiftEffect.prototype.getTiltShiftType = function () {
  return this._tiltShiftType;
};

TiltShiftEffect.prototype.setBlurRadius = function (blurRadius) {
  this._blurRadius = blurRadius;
};

TiltShiftEffect.prototype.getBlurRadius = function () {
  return this._blurRadius;
};

TiltShiftEffect.prototype.setGradientRadius = function (gradientRadius) {
  this._gradientRadius = gradientRadius;
};

TiltShiftEffect.prototype.getGradientRadius = function () {
  return this._gradientRadius;
};

TiltShiftEffect.prototype.setFromPoint = function (fromPoint) {
  this._fromPoint = fromPoint;
};

TiltShiftEffect.prototype.getFromPoint = function () {
  return this._fromPoint;
};

TiltShiftEffect.prototype.setToPoint = function (toPoint) {
  this._toPoint = toPoint;
};

TiltShiftEffect.prototype.getToPoint = function () {
  return this._toPoint;
};

TiltShiftEffect.prototype.setCenter = function (center) {
  this._center = center;
};

TiltShiftEffect.prototype.getCenter = function () {
  return this._center;
};

// Source: src/ZoomBlurEffect.js
var VERTEX_SHADER_ZOOM_BLUR = `
#ifdef GL_ES
  precision highp float;
#endif

attribute vec2 a_position;

varying vec2 v_uv;

const vec2 SCALE = vec2(0.5, 0.5);

void main() {
  v_uv = (a_position * SCALE) + SCALE;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
var FRAGMENT_SHADER_ZOOM_BLUR = `
#ifdef GL_ES
  precision highp float;
#endif

uniform sampler2D u_sampler;
uniform vec2 u_center;
uniform float u_strength;
uniform vec2 u_windowSize;

varying vec2 v_uv;

float random(vec3 scale, float seed) {
  /* use the fragment position for a different seed per-pixel */
  return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

void main() {
  vec4 color = vec4(0.0);
  float total = 0.0;
  vec2 toCenter = u_center - v_uv * u_windowSize;

  /* randomize the lookup values to hide the fixed number of samples */
  float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);

  for (float t = 0.0; t <= 10.0; t++) {
    float percent = (t + offset) / 10.0;
    float weight = 4.0 * (percent - percent * percent);
    vec4 sample = texture2D(u_sampler, v_uv + toCenter * percent * u_strength / u_windowSize);

    /* switch to pre-multiplied alpha to correctly blur transparent images */
    sample.rgb *= sample.a;

    color += sample * weight;
    total += weight;
  }

  gl_FragColor = color / total;

  /* switch back from pre-multiplied alpha */
  gl_FragColor.rgb /= gl_FragColor.a + 0.00001;
}
`;

var ZoomBlurEffect = wg.ZoomBlurEffect = function (gl) {
  var self = this;

  self._gl = gl;
  self._center = [0, 0];
  self._strength = 0;

  self._program = new wg.Program(gl, {
    vertex: VERTEX_SHADER_ZOOM_BLUR,
    fragment: FRAGMENT_SHADER_ZOOM_BLUR
  });
};

ZoomBlurEffect.prototype.pass = function (inputFrameBuffer, outputFrameBuffer) {
  var self = this,
    gl = self._gl,
    quadVao = gl.cache.quadVao,
    program = self._program;

  if (outputFrameBuffer) {
    outputFrameBuffer.bind();
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  program.use();
  program.setUniforms({
    'u_sampler': 0,
    'u_center': self._center,
    'u_strength': self._strength,
    'u_windowSize': [
      gl.canvas.width / window.devicePixelRatio,
      gl.canvas.height / window.devicePixelRatio
    ]
  });
  inputFrameBuffer.bindTexture(0);
  quadVao.draw();
};

ZoomBlurEffect.prototype.getOutputTexture = function () {
  return null;
};

ZoomBlurEffect.prototype.setCenter = function (center) {
  this._center = center;
};

ZoomBlurEffect.prototype.getCenter = function () {
  return this._center;
};

ZoomBlurEffect.prototype.setStrength = function (strength) {
  this._strength = strength;
};

ZoomBlurEffect.prototype.getStrength = function () {
  return this._strength;
};

// Source: src/OutlineEffect.js
var VERTEX_SHADER_OUTLINE = `
# ifdef GL_ES
  precision highp float;
# endif

attribute vec4 a_position;
attribute vec3 a_normal;

uniform mat4 u_viewProjectMatrix;
uniform mat4 u_modelMatrix;
uniform float u_outlineWidth;
uniform float u_outlineGap;
uniform bool u_outline;

void main() {
  // http://slides.com/xeolabs/silhouettes-in-webgl#/5
  mat4 mvpMatrix = u_viewProjectMatrix * u_modelMatrix;
  vec4 position = mvpMatrix * a_position;
  float offset = ((u_outline ? u_outlineWidth : 0.0) + u_outlineGap) * (position.z / 500.0);
  gl_Position = mvpMatrix * vec4(a_position.xyz + a_normal * offset, 1.0);
}
`;

var FRAGMENT_SHADER_OUTLINE = `
#ifdef GL_ES
  precision highp float;
#endif

uniform vec3 u_outlineColor;

void main() {
  gl_FragColor = vec4(u_outlineColor, 1.0);
}
`;

var OutlineEffect = wg.OutlineEffect = function (gl, scene) {
  var self = this;

  self._gl = gl;
  self._scene = scene;
  self._outlineColor = [1, 153/255, 51/255]; // CMYK(0, 40, 80, 0)
  self._outlineWidth = 4;
  self._outlineGap = 1;

  self._program = new Program(gl, {
    vertex: VERTEX_SHADER_OUTLINE,
    fragment: FRAGMENT_SHADER_OUTLINE
  });
};

OutlineEffect.prototype.pass = function (inputFrameBuffer, outputFrameBuffer) {
  var self = this,
    gl = self._gl,
    scene = self._scene,
    program = self._program;

  if (outputFrameBuffer) {
    outputFrameBuffer.bind();
  }

  program.use();
  var viewProjectMatrix = mat4.create();
  mat4.multiply(
    viewProjectMatrix,
    scene._camera.getProjectMatrix(),
    scene._camera.getViewMatrix()
  );
  program.setUniforms({
    u_outlineColor: self._outlineColor,
    u_outlineWidth: self._outlineWidth,
    u_outlineGap: self._outlineGap,
    u_viewProjectMatrix: viewProjectMatrix,
    u_outline: false
  });

  gl.enable(gl.STENCIL_TEST);
  gl.clear(gl.STENCIL_BUFFER_BIT);
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilFunc
  // func, ref, mask
  gl.stencilFunc(gl.ALWAYS, 1, -1);
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilOp
  // fail, zfail, zpass
  gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilMask
  // mask
  gl.stencilMask(-1);
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/colorMask
  gl.colorMask(false, false, false, false);

  scene._objects.forEach(function (object) {
    if (object.outline) {
      var vao = gl.cache.vaos[object.type];
      if (vao) {
        program.setUniforms({
          u_modelMatrix: object.modelMatrix
        });
        vao.draw();
      }
    }
  });

  program.setUniforms({
    u_outline: true
  });

  gl.stencilFunc(gl.EQUAL, 0, -1);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
  gl.colorMask(true, true, true, true);

  scene._objects.forEach(function (object) {
    if (object.outline) {
      var vao = gl.cache.vaos[object.type];
      if (vao) {
        program.setUniforms({
          u_modelMatrix: object.modelMatrix
        });
        vao.draw();
      }
    }
  });

  gl.disable(gl.STENCIL_TEST);
};

OutlineEffect.prototype.getOutputTexture = function () {
  return null;
};

OutlineEffect.prototype.setOutlineColor = function (outlineColor) {
  this._outlineColor = outlineColor;
};

OutlineEffect.prototype.getOutlineColor = function () {
  return this._outlineColor;
};

OutlineEffect.prototype.setOutlineWidth = function (outlineWidth) {
  this._outlineWidth = outlineWidth;
};

OutlineEffect.prototype.getOutlineWidth = function () {
  return this._outlineWidth;
};

OutlineEffect.prototype.setOutlineGap = function (outlineGap) {
  this._outlineGap = outlineGap;
};

OutlineEffect.prototype.getOutlineGap = function () {
  return this._outlineGap;
};

// Source: src/GlowEffect.js
var VERTEX_SHADER_GLOW_COLOR = `
# ifdef GL_ES
  precision highp float;
# endif

attribute vec4 a_position;

uniform mat4 u_viewProjectMatrix;
uniform mat4 u_modelMatrix;

void main() {
  gl_Position = u_viewProjectMatrix * u_modelMatrix * a_position;
}
`;

var FRAGMENT_SHADER_GLOW_COLOR = `
#ifdef GL_ES
  precision highp float;
#endif

uniform vec3 u_glowColor;

void main() {
  gl_FragColor = vec4(u_glowColor, 1.0);
}
`;

var VERTEX_SHADER_GLOW = `
# ifdef GL_ES
  precision highp float;
# endif

attribute vec2 a_position;

varying vec2 v_uv;

const vec2 SCALE = vec2(0.5, 0.5);

void main() {
  v_uv = (a_position * SCALE) + SCALE;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

var FRAGMENT_SHADER_GLOW = `
#ifdef GL_ES
  precision highp float;
#endif

uniform sampler2D u_sampler;

varying vec2 v_uv;

void main() {
  gl_FragColor = texture2D(u_sampler, v_uv);
}
`;

var FRAGMENT_SHADER_GLOW_BLUR = `
# ifdef GL_ES
  precision highp float;
# endif

/*uniform vec2 u_windowSize;
uniform sampler2D u_sampler;
uniform int u_orientation;
uniform float u_blurRadius;

varying vec2 v_uv;

const float MAX_BLUR_RADIUS = 10.0;

void main () {
  vec4 color = vec4(0.0);
  vec2 texelOffset;
  if (u_orientation == 0) {
    texelOffset = vec2(u_windowSize.x, 0.0);
  } else {
    texelOffset = vec2(0.0, u_windowSize.y);
  }

  float blurAmount = min(floor(u_blurRadius), MAX_BLUR_RADIUS);
  float halfBlur = blurAmount * 0.5;
  for (float i = 0.0; i < MAX_BLUR_RADIUS; ++i) {
    if (i >= blurAmount) {
      break;
    }
    float offset = i - halfBlur;
    vec2 vOffset = v_uv + (texelOffset * offset);
    color += texture2D(u_sampler, vOffset);
  }

  gl_FragColor = color / blurAmount;
}*/

uniform vec2 u_windowSize;
uniform float u_blurAmount;
uniform float u_blurScale;
uniform float u_blurStrength;
uniform bool u_horizontal;
uniform sampler2D u_sampler;

varying vec2 v_uv;

const float BLUR_PASSES = 20.0;

float gaussian(float x, float deviation) {
  return (1.0 / sqrt(6.28318530718 * deviation)) * exp(-((x * x) / (2.0 * deviation)));
}

void main() {
  vec4  color     = vec4(0.0);
  float half_blur = u_blurAmount * 0.5;
  float strength  = 1.0 - u_blurStrength;
  float deviation = half_blur * 0.35;
  deviation *= deviation;

  vec2 texelOffset = u_horizontal ? vec2(u_windowSize.x, 0.0) : vec2(0.0, u_windowSize.y);

  for (float i = 0.0; i < BLUR_PASSES; i += 1.0) {
    float offset = i - half_blur;
    vec4 tex_color = texture2D(u_sampler, v_uv +
      offset * u_blurScale * texelOffset) * gaussian(offset * strength, deviation);
    color += tex_color;
  }

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`;

var GlowEffect = wg.GlowEffect = function (gl, scene) {
  var self = this;

  self._gl = gl;
  self._scene = scene;
  self._glowColor = [0, 1, 0];
  self._blurAmount = 20;
  self._blurScale = 1;
  self._blurStrength = 0.5;
  self._blurSize = 1024;

  self._colorProgram = new Program(gl, {
    vertex: VERTEX_SHADER_GLOW_COLOR,
    fragment: FRAGMENT_SHADER_GLOW_COLOR
  });
  self._blurProgram = new Program(gl, {
    vertex: VERTEX_SHADER_GLOW,
    fragment: FRAGMENT_SHADER_GLOW_BLUR
  });
  self._glowProgram = new Program(gl, {
    vertex: VERTEX_SHADER_GLOW,
    fragment: FRAGMENT_SHADER_GLOW
  });
  self._colorFramebuffer = new Framebuffer(gl, {
    width: self._blurSize,
    height: self._blurSize,
    depth: true,
    stencil: true
  });
  self._hBlurFramebuffer = new Framebuffer(gl, {
    width: self._blurSize,
    height: self._blurSize,
    depth: false,
    stencil: false
  });
  self._vBlurFramebuffer = new Framebuffer(gl, {
    width: self._blurSize,
    height: self._blurSize,
    depth: false,
    stencil: false
  });
};

GlowEffect.prototype.pass = function (inputFrameBuffer, outputFrameBuffer) {
  var self = this,
    gl = self._gl,
    quadVao = gl.cache.quadVao,
    scene = self._scene;

  gl.clearColor(0, 0, 0, 0);
  self._colorFramebuffer.bind();

  self._colorProgram.use();
  var viewProjectMatrix = mat4.create();
  mat4.multiply(
    viewProjectMatrix,
    scene._camera.getProjectMatrix(),
    scene._camera.getViewMatrix()
  );
  self._colorProgram.setUniforms({
    u_glowColor: self._glowColor,
    u_viewProjectMatrix: viewProjectMatrix
  });

  drawGlowMask(true);

  gl.disable(gl.STENCIL_TEST);

  self._hBlurFramebuffer.bind();
  self._blurProgram.use();
  var hScale = 1;
  var vScale = 1;
  if (gl.canvas.width >= gl.canvas.height) {
    vScale = gl.canvas.width / gl.canvas.height;
  } else {
    hScale = gl.canvas.height / gl.canvas.width;
  }
  self._blurProgram.setUniforms({
    u_windowSize: [1 / self._blurSize, 1 / self._blurSize],
    u_blurAmount: self._blurAmount,
    u_blurScale: self._blurScale * hScale,
    u_blurStrength: self._blurStrength,
    u_horizontal: true,
    u_sampler: 0,

    u_orientation: 0,
    u_blurRadius: 5
  });
  self._colorFramebuffer.bindTexture(0);
  quadVao.draw();

  self._vBlurFramebuffer.bind();
  self._blurProgram.setUniforms({
    u_horizontal: false,
    u_blurScale: self._blurScale * vScale,

    u_orientation: 1
  });
  self._hBlurFramebuffer.bindTexture(0);
  quadVao.draw();

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clear(gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
  self._colorProgram.use();

  drawGlowMask(false);

  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.stencilFunc(gl.EQUAL, 0, -1);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
  gl.colorMask(true, true, true, true);

  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  self._glowProgram.use();
  self._glowProgram.setUniforms({
    u_sampler: 0
  });
  self._vBlurFramebuffer.bindTexture(0);
  quadVao.draw();

  gl.disable(gl.BLEND);
  gl.disable(gl.STENCIL_TEST);

  function drawGlowMask (withColor) {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/colorMask
    gl.colorMask(false, false, false, false);

    scene._objects.forEach(function (object) {
      if (!object.glow) {
        var vao = gl.cache.vaos[object.type];
        if (vao) {
          self._colorProgram.setUniforms({
            u_modelMatrix: object.modelMatrix
          });
          vao.draw();
        }
      }
    });

    gl.enable(gl.STENCIL_TEST);
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilFunc
    // func, ref, mask
    gl.stencilFunc(gl.ALWAYS, 1, -1);
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilOp
    // fail, zfail, zpass
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/stencilMask
    // mask
    gl.stencilMask(-1);
    if (withColor) {
      gl.colorMask(true, true, true, true);
    }

    scene._objects.forEach(function (object) {
      if (object.glow) {
        var vao = gl.cache.vaos[object.type];
        if (vao) {
          self._colorProgram.setUniforms({
            u_modelMatrix: object.modelMatrix
          });
          vao.draw();
        }
      }
    });
  }
};

GlowEffect.prototype.getOutputTexture = function () {
  return null;
};

GlowEffect.prototype.setGlowColor = function (glowColor) {
  this._glowColor = glowColor;
};

GlowEffect.prototype.getGlowColor = function () {
  return this._glowColor;
};

// Source: src/Camera.js
var Camera = wg.Camera = function (canvas, callback) {
  var self = this;
  self._callback = callback;
  self._viewMatrix = mat4.create();
  self._projectMatix = mat4.create();
  self._rotateMatrix = mat4.create();
  self._viewDirty = true;
  self._projectDirty = true;

  self._position = vec3.create();
  self._distance = 10;
  self._target = vec3.create();
  self._up = vec3.fromValues(0, 1, 0);

  self._fovy = 45 / 180 * Math.PI;
  self._aspect = canvas.width / canvas.height;
  self._near = 0.1;
  self._far = 1000;

  self._maxRotateX = Math.PI / 2 * 0.95;
  self._rotateX = 0;
  self._rotateY = 0;

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('wheel', handleWheel);
  canvas.addEventListener('blur', clean);

  var rotateSpeedY = 360 / canvas.width * window.devicePixelRatio / 180 * Math.PI,
    rotateSpeedX = 180 / canvas.height * window.devicePixelRatio / 180 * Math.PI,
    lastPoint;

  function handleMouseDown(e) {
    lastPoint = getClientPoint(e);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', clean);
  }

  function handleMouseMove(e) {
    var point = getClientPoint(e),
      offsetX = point.x - lastPoint.x,
      offsetY = point.y - lastPoint.y,
      rotateX = self._rotateX,
      rotateY = self._rotateY;
    rotateX += -offsetY * rotateSpeedX;
    rotateY += -offsetX * rotateSpeedY;
    self.setRotateX(rotateX);
    self.setRotateY(rotateY);
    lastPoint = point;
  }

  function handleWheel(e) {
    // TODO chrome bug
    e.preventDefault();
    var newDistance = self._distance;
    if (e.deltaY > 0) {
      newDistance *= 1.1;
    } else if (e.deltaY < 0) {
      newDistance /= 1.1;
    }
    self.setDistance(newDistance);
  }

  function clean() {
    lastPoint = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', clean);
  }
};

Camera.prototype.getDistance = function () {
  return this._distance;
};

Camera.prototype.setDistance = function (distance) {
  var self = this;
  if (distance < self._near) {
    distance = self._near;
  }
  if (distance > self._far) {
    distance = self._far;
  }
  self._distance = distance;
  self.invalidateViewMatrix();
};

Camera.prototype.getPosition = function () {
  return this._position;
};

Camera.prototype.setPosition = function (x, y, z) {
  var self = this,
    newPosition = vec3.create(),
    xz;
  vec3.set(self._position, x, y, z);
  vec3.subtract(newPosition, self._position, self._target);
  xz = Math.sqrt(newPosition[0]*newPosition[0] + newPosition[2] * newPosition[2]);
  self._rotateY = Math.atan2(newPosition[0], newPosition[2]);
  self._rotateX = -Math.atan2(newPosition[1], xz);
  self._distance = vec3.length(newPosition);
  self.invalidateViewMatrix();
};

Camera.prototype.getTarget = function () {
  return this._target;
};

Camera.prototype.setTarget = function (x, y, z) {
  var self = this;
  vec3.set(self._target, x, y, z);
  self.invalidateViewMatrix();
};

Camera.prototype.getRotateX = function () {
  return this._rotateX;
};

Camera.prototype.setRotateX = function (rotateX) {
  var self = this,
    maxRotateX = self._maxRotateX;
  if (rotateX > maxRotateX) {
    rotateX = maxRotateX;
  }
  if (rotateX < -maxRotateX) {
    rotateX = -maxRotateX;
  }
  self._rotateX = rotateX;
  self.invalidateViewMatrix();
};

Camera.prototype.getRotateY = function () {
  return this._rotateY;
};

Camera.prototype.setRotateY = function (rotateY) {
  var self = this;
  rotateY = rotateY % (Math.PI * 2);
  self._rotateY = rotateY;
  self.invalidateViewMatrix();
};

Camera.prototype.getViewMatrix = function () {
  var self = this,
    viewMatrix = self._viewMatrix,
    rotateMatrix = self._rotateMatrix,
    position = self._position;
  if (self._viewDirty) {
    mat4.identity(rotateMatrix);
    mat4.translate(rotateMatrix, rotateMatrix, self._target);
    mat4.rotateY(rotateMatrix, rotateMatrix, self._rotateY);
    mat4.rotateX(rotateMatrix, rotateMatrix, self._rotateX);
    vec3.transformMat4(position, vec3.fromValues(0, 0, self._distance), rotateMatrix);
    mat4.lookAt(viewMatrix, position, self._target, self._up);
    self._viewDirty = false;
  }
  return viewMatrix;
};

Camera.prototype.getProjectMatrix = function () {
  var self = this,
    projectMatix = self._projectMatix;
  if (self._projectDirty) {
    mat4.perspective(projectMatix, self._fovy, self._aspect, self._near, self._far);
    self._projectDirty = false;
  }
  return projectMatix;
};

Camera.prototype.getFovy = function () {
  return this._fovy;
};

Camera.prototype.setFovy = function (fovy) {
  var self = this;
  self._fovy = fovy;
  self.invalidateProjectMatrix();
};

Camera.prototype.getAspect = function () {
  return this._aspect;
};

Camera.prototype.setAspect = function (aspect) {
  var self = this;
  self._aspect = aspect;
  self.invalidateProjectMatrix();
};

Camera.prototype.getNear = function () {
  return this._near;
};

Camera.prototype.setNear = function (near) {
  var self = this;
  self._near = near;
  self.invalidateProjectMatrix();
};

Camera.prototype.getFar = function () {
  return this._far;
};

Camera.prototype.setFar = function (far) {
  var self = this;
  self._far = far;
  self.invalidateProjectMatrix();
};

Camera.prototype.invalidateViewMatrix = function () {
  var self = this;
  self._viewDirty = true;
  self._callback();
};

Camera.prototype.invalidateProjectMatrix = function () {
  var self = this;
  self._projectDirty = true;
  self._callback();
};

// Source: src/Scene.js
var VERTEX_SHADER_SOURCE = `
#ifdef GL_ES
  precision highp float;
#endif

attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;
attribute vec4 a_color;

uniform mat4 u_projectMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform mat3 u_normalMatrix;

uniform vec3 u_lightPosition;
uniform vec3 u_eyePosition;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_color;
varying vec3 v_lightDirection;
varying vec3 v_eyeDirection;

void main () {
  gl_Position = u_projectMatrix * u_viewMatrix * u_modelMatrix * a_position;
  v_normal = u_normalMatrix * a_normal;
  v_uv = a_uv;
  v_color = a_color;

  vec3 worldPosition = (u_modelMatrix * a_position).xyz;
  v_lightDirection = u_lightPosition - worldPosition;
  v_eyeDirection = u_eyePosition - worldPosition;
}
`;

var FRAGMENT_SHADER_SOURCE = `
#ifdef GL_ES
  precision highp float;
#endif

uniform vec3 u_lightColor;
uniform vec3 u_ambientColor;
uniform bool u_texture;
uniform sampler2D u_sampler;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_color;
varying vec3 v_lightDirection;
varying vec3 v_eyeDirection;

void main () {
  vec3 normal = normalize(v_normal);
  vec3 lightDirection = normalize(v_lightDirection);
  vec3 eyeDirection = normalize(v_eyeDirection);
  float diffuse = max(dot(lightDirection, normal), 0.0);

  // vec3 halfDirection = normalize(lightDirection + eyeDirection);
  // float specular = pow(max(dot(halfDirection, normal), 0.0), 24.0);

  vec3 reflectDirection = reflect(-lightDirection, normal);
  float specular = pow(max(dot(reflectDirection, eyeDirection), 0.0), 16.0);

  vec4 color = v_color;
  if (u_texture) {
    color *= texture2D(u_sampler, v_uv);
  }
  vec3 ambientColor = u_ambientColor * color.rgb;
  vec3 diffuseColor = u_lightColor * color.rgb * diffuse;
  vec3 specularColor = u_lightColor * specular;
  gl_FragColor = vec4(diffuseColor + ambientColor + specularColor, color.a);
}
`;

var Scene = wg.Scene = function (canvas, options) {
  var self = this;

  if (typeof canvas === 'string') {
    canvas = document.getElementById(canvas);
  }

  setCanvasSize(canvas);
  self._canvas = canvas;
  self._dirty = true;
  self._objects = [];
  self._camera = new Camera(canvas, function () {
    self.redraw();
  });
  self._lightColor = [1, 1, 1];
  self._lightPosition = [10, 10, 10];
  self._ambientColor = [.5, .5, .5];
  self._clearColor = [0, 0, 0, 0];

  var gl = self._gl = canvas.getContext('webgl', options || {
    antialias: true,
    stencil: true
  });
  addVertexArrayObjectSupport(gl);
  gl.cache = { textures: {} };
  self._program = new Program(gl, {
    vertex: VERTEX_SHADER_SOURCE,
    fragment: FRAGMENT_SHADER_SOURCE
  });
  self._outlineEffect = new OutlineEffect(gl, self);
  self._glowEffect = new GlowEffect(gl, self);

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
    createVaos(gl);
    gl.enable(gl.CULL_FACE);
    // gl.frontFace(gl.CCW);
    gl.enable(gl.DEPTH_TEST);
    // gl.depthFunc(gl.LEQUAL);

    (function render() {
      gl.aniamtionId = requestAnimationFrame(render);
      if (self._dirty) {
        self.draw(gl);
      }
    })();
  }

  init();
};

Scene.prototype.redraw = function () {
  this._dirty = true;
};

Scene.prototype.draw = function () {
  var self = this,
    program = self._program,
    camera = self._camera,
    gl = self._gl,
    clearColor = self._clearColor;
  self._dirty = false;
  gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  program.use();
  program.setUniforms({
    u_projectMatrix: camera.getProjectMatrix(),
    u_viewMatrix: camera.getViewMatrix(),
    u_lightPosition: self._lightPosition,
    u_eyePosition: camera._position,
    u_lightColor: self._lightColor,
    u_ambientColor: self._ambientColor
  });
  self._objects.forEach(function (object) {
    var vao = gl.cache.vaos[object.type];
    if (vao) {
      program.setUniforms({
        u_modelMatrix: object.modelMatrix,
        u_normalMatrix: object.normalMatrix,
        u_sampler: 0,
        u_texture: !!object.image
      });
      if (object.image) {
        var imageTexture = gl.cache.textures[object.image];
        if (!imageTexture) {
          imageTexture = gl.cache.textures[object.image] = new wg.Texture(gl, {
            url: object.image,
            callback: function () {
              self.redraw();
            }
          });
        }
        imageTexture.bind(0);
      }
      if (!vao._color) {
        gl.vertexAttrib4fv(attributesMap.color.index, object.color);
      }
      vao.draw();
    }
  });

  self._outlineEffect.pass();
  self._glowEffect.pass();
};

Scene.prototype.add = function (object) {
  var self = this;
  self._objects.push(object);
  self._dirty = true;
};

Scene.prototype.getCamera = function () {
  return this._camera;
};

Scene.prototype.getLightColor = function () {
  return this._lightColor;
};

Scene.prototype.setLightColor = function (lightColor) {
  this._lightColor = lightColor;
  this.redraw();
};

Scene.prototype.getLightPosition = function () {
  return this._lightPosition;
};

Scene.prototype.setLightPosition = function (lightPosition) {
  this._lightPosition = lightPosition;
  this.redraw();
};

Scene.prototype.getAmbientColor = function () {
  return this._ambientColor;
};

Scene.prototype.setAmbientColor = function (ambientColor) {
  this._ambientColor = ambientColor;
  this.redraw();
};

Scene.prototype.getClearColor = function () {
  return this._clearColor;
};

Scene.prototype.setClearColor = function (clearColor) {
  this._clearColor = clearColor;
  this.redraw();
};

// Source: src/Object.js
var objectId = 1;
wg.Object = function () {
  var self = this;
  self.id = objectId++;
  self.modelMatrix = mat4.create();
  self.normalMatrix = mat3.create();
  self.type = null;
  self._position = vec3.create();
  self.color = [1, 1, 1, 1];
};

wg.Object.prototype.setPosition = function (x, y, z) {
  var self = this;
  vec3.set(self._position, x, y, z);
  self._calculateMatrix();
  return self;
};

wg.Object.prototype._calculateMatrix = function () {
  var self = this;
  mat4.fromTranslation(self.modelMatrix, self._position);
  mat3.normalFromMat4(self.normalMatrix, self.modelMatrix);
};

// Source: src/Cube.js
var Cube = wg.Cube = function () {
  wg.Object.call(this);
  this.type = 'cube';
};

Cube.prototype.__proto__ = wg.Object.prototype;

// Source: src/Torus.js
var Torus = wg.Torus = function () {
  wg.Object.call(this);
  this.type = 'torus';
};

Torus.prototype.__proto__ = wg.Object.prototype;

// Source: src/Sphere.js
var Sphere = wg.Sphere = function () {
  wg.Object.call(this);
  this.type = 'sphere';
};

Sphere.prototype.__proto__ = wg.Object.prototype;
}(this);
