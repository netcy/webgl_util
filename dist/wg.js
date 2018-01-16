'use strict';
+function (root) {
// Source: src/Util.js
var wg = root.wg = {};
var Util = wg.Util = {
  version: '0.17.0'
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

// Source: src/Trigger.js
var Trigger = wg.Trigger = function () {
  this._listeners = {};
};
Object.assign(Trigger.prototype, {
  on: function (type, listener, thisArg) {
    if (!type || !listener) {
      return this;
    }
    var self = this,
      listeners = self._listeners,
      bundles = listeners[type],
      bundle = {
        listener: listener,
        thisArg: thisArg
      },
      _listener = listener._listener || listener;
    if (!bundles) {
      listeners[type] = bundle;
    } else if (Array.isArray(bundles)) {
      if (!bundles.some(function (item) {
          return (item.listener._listener || item.listener) === _listener;
        })) {
        bundles.push(bundle);
      }
    } else {
      if ((bundles.listener._listener || bundles.listener) !== _listener) {
        listeners[type] = [bundles, bundle];
      }
    }
    return self;
  },
  once: function (type, listener, thisArg) {
    if (!type || !listener) {
      return this;
    }
    var self = this,
      newListener = function (event) {
        listener.call(thisArg, event);
        self.off(type, listener);
      };
    newListener._listener = listener;
    self.on(type, newListener, thisArg);
    return self;
  },
  off: function (type, listener) {
    var self = this,
      listeners = self._listeners,
      bundles = listeners[type],
      i, bundle;
    if (Array.isArray(bundles)) {
      bundles.some(function (bundle, i) {
        if ((bundle.listener._listener || bundle.listener) === listener) {
          bundles.splice(i, 1);
          return true;
        }
        return false;
      });
    } else if (bundles && ((bundles.listener._listener || bundles.listener) === listener)) {
      delete listeners[type];
    }
    return self;
  },
  fire: function (event) {
    var self = this,
      listeners = self._listeners,
      strictBundles = listeners[event.type],
      allBundles = listeners['all'],
      bundles;
    if (Array.isArray(strictBundles)) {
      if (allBundles) {
        bundles = strictBundles.concat(allBundles);
      } else {
        // Important, bundles will be changed if there is a once listener
        bundles = strictBundles.slice();
      }
    } else if (strictBundles) {
      if (allBundles) {
        bundles = [].concat(strictBundles, allBundles);
      } else {
        bundles = strictBundles;
      }
    } else {
      bundles = Array.isArray(allBundles) ? allBundles.slice() : allBundles;
    }
    if (Array.isArray(bundles)) {
      bundles.forEach(function (bundle) {
        bundle.listener.call(bundle.thisArg, event);
      });
    } else if (bundles) {
      bundles.listener.call(bundles.thisArg, event);
    }
    return self;
  },
  count: function (type) {
    var bundles = this._listeners[type];
    if (bundles) {
      return Array.isArray(bundles) ? bundles.length : 1;
    } else {
      return 0;
    }
  }
});

// Source: src/Geometries.js
wg.geometries = {};
var addGeometry = Util.addGeometry = function (name, geometry) {
  if (!geometry.tangent && geometry.uv) {
    geometry = calculateTangent(geometry);
  }
  if (geometry.tangent) {
    geometry = calculateBarycentric(geometry);
  }
  wg.geometries[name] = geometry;
};

var createCube = Util.createCube = function (side) {
  var hs = side * 0.5;
  var pos = [
    -hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs,  hs, // front
    -hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs, -hs, // back
    -hs,  hs, -hs, -hs,  hs,  hs,  hs,  hs,  hs,  hs,  hs, -hs, // top
    -hs, -hs, -hs,  hs, -hs, -hs,  hs, -hs,  hs, -hs, -hs,  hs, // bottom
     hs, -hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs, // right
    -hs, -hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs  // left
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
};

function createTruncatedCone(
    bottomRadius,
    topRadius,
    height,
    radialSubdivisions,
    verticalSubdivisions,
    opt_topCap,
    opt_bottomCap) {
  if (radialSubdivisions < 3) {
    throw Error('radialSubdivisions must be 3 or greater');
  }

  if (verticalSubdivisions < 1) {
    throw Error('verticalSubdivisions must be 1 or greater');
  }

  var topCap = (opt_topCap === undefined) ? true : opt_topCap;
  var bottomCap = (opt_bottomCap === undefined) ? true : opt_bottomCap;

  var extra = (topCap ? 2 : 0) + (bottomCap ? 2 : 0);

  var numVertices = (radialSubdivisions + 1) * (verticalSubdivisions + 1 + extra);
  var positions = [];
  var normals   = [];
  var texCoords = [];
  var indices   = [];

  var vertsAroundEdge = radialSubdivisions + 1;

  // The slant of the cone is constant across its surface
  var slant = Math.atan2(bottomRadius - topRadius, height);
  var cosSlant = Math.cos(slant);
  var sinSlant = Math.sin(slant);

  var start = topCap ? -2 : 0;
  var end = verticalSubdivisions + (bottomCap ? 2 : 0);

  for (var yy = start; yy <= end; ++yy) {
    var v = yy / verticalSubdivisions;
    var y = height * v;
    var ringRadius;
    if (yy < 0) {
      y = 0;
      v = 1;
      ringRadius = bottomRadius;
    } else if (yy > verticalSubdivisions) {
      y = height;
      v = 1;
      ringRadius = topRadius;
    } else {
      ringRadius = bottomRadius +
        (topRadius - bottomRadius) * (yy / verticalSubdivisions);
    }
    if (yy === -2 || yy === verticalSubdivisions + 2) {
      ringRadius = 0;
      v = 0;
    }
    y -= height / 2;
    for (var ii = 0; ii < vertsAroundEdge; ++ii) {
      var sin = Math.sin(ii * Math.PI * 2 / radialSubdivisions);
      var cos = Math.cos(ii * Math.PI * 2 / radialSubdivisions);
      positions.push(sin * ringRadius, y, cos * ringRadius);
      normals.push(
          (yy < 0 || yy > verticalSubdivisions) ? 0 : (sin * cosSlant),
          (yy < 0) ? -1 : (yy > verticalSubdivisions ? 1 : sinSlant),
          (yy < 0 || yy > verticalSubdivisions) ? 0 : (cos * cosSlant));
      texCoords.push((ii / radialSubdivisions), 1 - v);
    }
  }

  for (yy = 0; yy < verticalSubdivisions + extra; ++yy) {
    for (ii = 0; ii < radialSubdivisions; ++ii) {
      indices.push(vertsAroundEdge * (yy + 0) + 0 + ii,
                   vertsAroundEdge * (yy + 0) + 1 + ii,
                   vertsAroundEdge * (yy + 1) + 1 + ii);
      indices.push(vertsAroundEdge * (yy + 0) + 0 + ii,
                   vertsAroundEdge * (yy + 1) + 1 + ii,
                   vertsAroundEdge * (yy + 1) + 0 + ii);
    }
  }

  return {
    position: positions,
    normal: normals,
    uv: texCoords,
    index: indices,
  };
}

var calculateTangent = Util.calculateTangent = function (geometry) {
  var indices = geometry.index,
    uvs = geometry.uv,
    vertices = geometry.position,
    tangents = [],
    gtangent = geometry.tangent = [],
    v0 = vec3.create(),
    v1 = vec3.create(),
    v2 = vec3.create(),
    u0 = vec2.create(),
    u1 = vec2.create(),
    u2 = vec2.create(),
    edge1 = vec3.create(),
    edge2 = vec3.create(),
    tangent = vec3.create();
  for (var i = 0, n = vertices.length / 3; i < n; i++) {
    tangents[i] = vec3.create();
  }
  for (var i = 0, n = indices.length; i < n; i += 3) {
    var i0 = indices[i];
    var i1 = indices[i + 1];
    var i2 = indices[i + 2];

    vec3.set(v0, vertices[i0 * 3], vertices[i0 * 3 + 1], vertices[i0 * 3 + 2]);
    vec3.set(v1, vertices[i1 * 3], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2]);
    vec3.set(v2, vertices[i2 * 3], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2]);

    vec3.subtract(edge1, v1, v0);
    vec3.subtract(edge2, v2, v0);

    vec2.set(u0, uvs[i0 * 2], uvs[i0 * 2 + 1]);
    vec2.set(u1, uvs[i1 * 2], uvs[i1 * 2 + 1]);
    vec2.set(u2, uvs[i2 * 2], uvs[i2 * 2 + 1]);

    var deltaU1 = u1[0] - u0[0];
    var deltaV1 = u1[1] - u0[1];
    var deltaU2 = u2[0] - u0[0];
    var deltaV2 = u2[1] - u0[1];

    var f = 1.0 / (deltaU1 * deltaV2 - deltaU2 * deltaV1);

    vec3.set(tangent, f * (deltaV2 * edge1[0] - deltaV1 * edge2[0]),
      f * (deltaV2 * edge1[1] - deltaV1 * edge2[1]),
      f * (deltaV2 * edge1[2] - deltaV1 * edge2[2]));

    vec3.add(tangents[i0], tangents[i0], tangent);
    vec3.add(tangents[i1], tangents[i1], tangent);
    vec3.add(tangents[i2], tangents[i2], tangent);
  }

  for (var i = 0, n = tangents.length; i < n; i++) {
    vec3.normalize(tangents[i], tangents[i]);
    gtangent.push(tangents[i][0], tangents[i][1], tangents[i][2]);
  }
  return geometry;
}

var calculateBarycentric = Util.calculateBarycentric = function (geometry) {
  var indices = geometry.index,
    uvs = geometry.uv,
    vertices = geometry.position,
    normals = geometry.normal,
    tangents = geometry.tangent,
    newUv = [],
    newPosition = [],
    newNormal = [],
    newTangent = [],
    barycentric = [];
  for (var i = 0, n = indices.length; i < n; i++) {
    var index = indices[i];
    newUv.push(uvs[index * 2], uvs[index * 2 + 1]);
    newPosition.push(vertices[index * 3], vertices[index * 3 + 1], vertices[index * 3 + 2]);
    newNormal.push(normals[index * 3], normals[index * 3 + 1], normals[index * 3 + 2]);
    newTangent.push(tangents[index * 3], tangents[index * 3 + 1], tangents[index * 3 + 2]);
    if (i % 3 === 0) {
      barycentric.push(1, 0, 0);
    } else if (i % 3 === 1) {
      barycentric.push(0, 1, 0);
    } else {
      barycentric.push(0, 0, 1);
    }
  }
  return {
    uv: newUv,
    position: newPosition,
    normal: newNormal,
    tangent: newTangent,
    barycentric: barycentric,
    parts: geometry.parts
  }
};

function createPlane () {
  return {
    position: [
      -1.0, -1.0, 0.0,
       1.0, -1.0, 0.0,
       1.0,  1.0, 0.0,
      -1.0, 1.0, 0.0
    ],
    normal: [
      0.0, 0.0, 1.0,
      0.0, 0.0, 1.0,
      0.0, 0.0, 1.0,
      0.0, 0.0, 1.0
    ],
    uv: [
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0
    ],
    index: [
      0, 1, 2,
      0, 2, 3
    ]
  };
}

addGeometry('cube', createCube(1));
addGeometry('torus', createTorus(32, 32, 0.5, 1));
addGeometry('sphere', createSphere(32, 32, 0.5));
addGeometry('cone', createTruncatedCone(0.5, 0, 1, 32, 32, false, true));
addGeometry('plane', createPlane());

// Source: src/Program.js
var attributesMap = {
  position: { index: 0, size: 3 },
  normal: { index: 1, size: 3 },
  uv: { index: 2, size: 2 },
  color: { index: 3, size: 4 },
  tangent: { index: 4, size: 3 },
  bitangent: { index: 5, size: 3 },
  barycentric: { index: 6, size: 3 },
  offset: { index: 7, size: 16 },
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
  self._width = options.width;
  self._height = options.height;
  self._dataType = options.dataType;
  self._format = options.format;
  self._depth = options.depth;
  self._stencil = options.stencil;
  self._texture = null;
  self._renderbuffer = null;
  self._framebuffer = null;

  self._init();
};

Framebuffer.prototype._init = function () {
  var self = this,
    gl = self._gl,
    width = self._width,
    height = self._height,
    depth = self._depth,
    stencil = self._stencil,
    framebuffer, renderbuffer, texture, internalFormat, attachment;
  framebuffer = self._framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  texture = self._texture = new Texture(gl, {
    width: width,
    height: height,
    minFilter: 'NEAREST',
    magFilter: 'NEAREST',
    dataType: self._dataType,
    format: self._format
  });
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

Framebuffer.prototype.setSize = function (width, height) {
  var self = this;
  if (self._width === width && self._height === height) {
    return;
  }
  self.dispose();
  self._width = width;
  self._height = height;
  self._init();
};

Framebuffer.prototype.dispose = function () {
  var self = this,
    gl = self._gl;
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
 *     wrapS: default 'CLAMP_TO_EDGE', can be 'REPEAT' or 'CLAMP_TO_EDGE'
 *     wrapT: default 'CLAMP_TO_EDGE'
 *     anisotropy: default 16
 *     dataType: default 'UNSIGNED_BYTE'
 *     format: default 'RGBA'
 *     data: default undefinded
 *     type: default '2D', options: '2D', 'CUBE_MAP'
 *       if type is 'CUBE_MAP', then url is array of string
 *       POSITIVE_X, NEGATIVE_X, POSITIVE_Y, NEGATIVE_Y, POSITIVE_Z, NEGATIVE_Z
 */
var Texture = wg.Texture = function (gl, options) {
  var self = this,
    url = options.url;

  self._gl = gl;
  self._options = options;
  self._initialized = false;
  self._imageLoaded = false;
  self._texture = gl.createTexture();
  self._unit = 0;

  var loadImage = function (url) {
    if (url instanceof HTMLImageElement ||
        url instanceof HTMLCanvasElement ||
        url instanceof HTMLVideoElement) {
      imageCount--;
      if (imageCount === 0) {
        self._imageLoaded = true;
      }
      return url;
    }
    var image = new Image();
    gl.initingTextures[url] = image;
    image.onload = function () {
      image.onload = null;
      image.onerror = null;
      delete gl.initingTextures[url];
      imageCount--;
      if (imageCount === 0) {
        self._imageLoaded = true;
        gl.cache.textures.trigger.fire({
          type: 'load',
          source: self
        });
      }
    };
    image.onerror = function () {
      image.onload = null;
      image.onerror = null;
      delete gl.initingTextures[url];
      imageCount--;
      if (imageCount === 0) {
        gl.cache.textures.trigger.fire({
          type: 'error',
          source: self
        });
      }
    };
    image.src = url;
    return image;
  };

  if (url) {
    var imageCount = 1;
    if (options.type === 'CUBE_MAP') {
      imageCount = url.length;
      self._image = [];
      url.forEach(function (urlItem) {
        self._image.push(loadImage(urlItem));
      });
    } else {
      self._image = loadImage(url);
    }
  }
};

Texture.prototype.bind = function (unit) {
  var self = this,
    gl = self._gl,
    options = self._options,
    type = gl['TEXTURE_' + (options.type || '2D')],
    width, height;
  self._unit = unit;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(type, self._texture);

  if (!self._initialized) {
    self._initialized = true;
    width = options.width;
    height = options.height;
    gl.pixelStorei(
      gl.UNPACK_FLIP_Y_WEBGL,
      (options.flipY == null ? false : options.flipY) ? 1 : 0
    );
    gl.texParameteri(
      type,
      gl.TEXTURE_MAG_FILTER,
      gl[options.magFilter || 'LINEAR']
    );
    gl.texParameteri(
      type,
      gl.TEXTURE_MIN_FILTER,
      gl[options.minFilter || 'LINEAR']
    );
    gl.texParameteri(
      type,
      gl.TEXTURE_WRAP_S,
      gl[options.wrapS || 'CLAMP_TO_EDGE']
    );
    gl.texParameteri(
      type,
      gl.TEXTURE_WRAP_T,
      gl[options.wrapT || 'CLAMP_TO_EDGE']
    );

    if (width && height) {
      if (options.type === 'CUBE_MAP') {
        for (var i=0; i<6; i++) {
          gl.texImage2D(
            i + gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            0,
            gl[options.format || 'RGBA'],
            width,
            height,
            0,
            gl[options.format || 'RGBA'],
            gl[options.dataType || 'UNSIGNED_BYTE'],
            options.data
          );
        }
      } else {
        // last parameter must be null, can not be undefined, or else iOS throw Type error
        gl.texImage2D(
          type,
          0,
          gl[options.format || 'RGBA'],
          width,
          height,
          0,
          gl[options.format || 'RGBA'],
          gl[options.dataType || 'UNSIGNED_BYTE'],
          options.data || null
        );
      }
    } else {
      if (!self._imageLoaded) {
        if (options.type === 'CUBE_MAP') {
          for (var i=0; i<6; i++) {
            gl.texImage2D(
              i + gl.TEXTURE_CUBE_MAP_POSITIVE_X, // target
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
        } else {
          gl.texImage2D(
            type, // target
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
  }

  if (self._imageLoaded) {
    self._imageLoaded = false;
    // http://blog.tojicode.com/2012/03/anisotropic-filtering-in-webgl.html
    if (gl._anisotropicExt) {
      var anisotropy = options.anisotropy || 16;
      anisotropy = Math.min(gl._max_anisotropy, anisotropy);
      gl.texParameterf(type, gl._anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, anisotropy);
    }
    gl.pixelStorei(
      gl.UNPACK_FLIP_Y_WEBGL,
      (options.flipY == null ? true : options.flipY) ? 1 : 0
    );
    gl.texParameteri(
      type,
      gl.TEXTURE_MIN_FILTER,
      gl[options.minFilter || 'LINEAR_MIPMAP_NEAREST']
    );
    if (options.type === 'CUBE_MAP') {
      self._image.forEach(function (imageItem, index) {
        gl.texImage2D(
          index + gl.TEXTURE_CUBE_MAP_POSITIVE_X,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          (options.powerOfTwo == null ? true : options.powerOfTwo) ?
            getPowerOfTwoImage(imageItem) : imageItem
        );
      });
    } else {
      gl.texImage2D(
        type,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        (options.powerOfTwo == null ? true : options.powerOfTwo) ?
          getPowerOfTwoImage(self._image) : self._image
      );
    }
    if (options.mipmap == null ? true : options.mipmap) {
      gl.generateMipmap(type);
    }
    self._image = null;
  }
};

Texture.prototype.dispose = function () {
  var self = this,
    gl = self._gl,
    options = self._options,
    type = gl['TEXTURE_' + (options.type || '2D')];
  gl.activeTexture(gl.TEXTURE0 + self._unit);
  gl.bindTexture(type, null);
  gl.deleteTexture(self._texture);
  self._texture = null;
};

// Source: src/TextureCache.js
var TextureCache = wg.TextureCache = function (gl) {
  var self = this;
  self.gl = gl;
  self.cache = new Map();
  self.trigger = new Trigger();
};

TextureCache.prototype.get = function (image) {
  var self = this,
    cache = self.cache,
    gl = self.gl,
    options;
  var imageTexture = cache.get(image);
  if (!imageTexture) {
    if (typeof image === 'string' ||
        image instanceof HTMLImageElement ||
        image instanceof HTMLCanvasElement ||
        image instanceof HTMLVideoElement) {
      options = {
        url: image
      };
    } else {
      options = image;
    }
    imageTexture = new Texture(gl, options);
    cache.set(image, imageTexture);
  }
  return imageTexture;
};

// Source: src/VertexArray.js
/**
 * VertexArray
 * @param {[WebGLRenderingContext]} gl WebGLRenderingContext
 * @param {[Object]} options
 * @example
 *     buffers: { position: [], normal: [], uv: [], color: [], index: [] },
 *     offset: 0,
 *     mode: 'TRIANGLES',
 *     instancedAttrs: null // ['offset']
 */
var VertexArray = wg.VertexArray = function (gl, options) {
  var self = this,
    buffers = options.buffers;

  self._gl = gl;
  self._vao = gl.createVertexArray();
  self._bufferMap = {};

  gl.bindVertexArray(self._vao);
  Object.keys(buffers).forEach(function (attrName) {
    var attribute = attributesMap[attrName];
    if (!attribute && attrName !== 'index') {
      return;
    }
    var bufferData = buffers[attrName];
    var bufferObject = gl.createBuffer();
    self._bufferMap[attrName] = bufferObject;
    var element_type, element_size, array;

    if (attrName === 'position') {
      if (!self._index) {
        self._count = bufferData.length / attribute.size;
      }
    }

    if (attrName === 'color') {
      self._color = true;
    }

    if (attrName === 'index') {
      self._index = true;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferObject);

      if (bufferData.length <= 256) {
        element_type = 5121; // WebGLRenderingContext.UNSIGNED_BYTE
        element_size = 1;
        array = new Uint8Array(bufferData);
      } else if (bufferData.length <= 65536) {
        element_type = 5123; // WebGLRenderingContext.UNSIGNED_SHORT
        element_size = 2;
        array = new Uint16Array(bufferData);
      } else {
        // TODO check gl.getExtension('OES_element_index_uint');
        element_type = 5125; // WebGLRenderingContext.UNSIGNED_INT
        element_size = 4;
        array = new Uint32Array(bufferData);
      }
      self._element_type = element_type;
      self._element_size = element_size;
      self._count = bufferData.length;
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferData), gl.STATIC_DRAW);
      self._setBufferOptions(attribute, bufferData, options.instancedAttrs && options.instancedAttrs.indexOf(attrName) >= 0);
    }
  });
  gl.bindVertexArray(null);

  self._offset = options.offset || 0;
  self._mode = gl[options.mode || 'TRIANGLES'];
  self._parts = options.buffers.parts;
};

VertexArray.prototype.setPosition = function (datas) {
  this.setBufferDatas('position', datas);
};

VertexArray.prototype.setBufferDatas = function (name, datas, instanced) {
  var self = this,
    gl = self._gl,
    bufferObject, attribute;
  gl.bindVertexArray(self._vao);
  bufferObject = self._bufferMap[name];
  if (!bufferObject) {
    attribute = attributesMap[name];
    if (!attribute) {
      console.error('Unknown attribute: ' + name);
    }
    self._bufferMap[name] = bufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(datas), gl.STATIC_DRAW);
    self._setBufferOptions(attribute, datas, instanced);
  } else {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(datas), gl.STATIC_DRAW);
  }
};

VertexArray.prototype._setBufferOptions = function (attribute, datas, instanced) {
  //https://stackoverflow.com/questions/38853096/webgl-how-to-bind-values-to-a-mat4-attribute
  var self = this,
    gl = self._gl,
    attributeCount, i;
  if (attribute.size > 4) {
    attributeCount = attribute.size / 4;
    for (i = 0; i < attributeCount; i++) {
      gl.enableVertexAttribArray(attribute.index + i);
      gl.vertexAttribPointer(attribute.index + i, 4, gl.FLOAT, false, 4 * attribute.size, 16 * i);
      if (instanced) {
        gl.vertexAttribDivisor(attribute.index + i, 1);
      }
    }
  } else {
    gl.enableVertexAttribArray(attribute.index);
    // index, size, type, normalized, stride, offset
    gl.vertexAttribPointer(attribute.index, attribute.size, gl.FLOAT, false, 0, 0);
    if (instanced) {
      gl.vertexAttribDivisor(attribute.index, 1);
    }
  }
  if (instanced) {
    self._instanceCount = datas.length / attribute.size;
  }
};

VertexArray.prototype.draw = function (preDrawCallback) {
  var self = this,
    gl = self._gl;
  gl.bindVertexArray(self._vao);
  if (self._parts) {
    self._parts.forEach(function (part) {
      preDrawCallback && preDrawCallback(part);
      // TODO instance
      part.counts.forEach(function (item) {
        if (self._index) {
          gl.drawElements(self._mode, item.count, self._element_type, item.offset * self._element_size);
        } else {
          gl.drawArrays(self._mode, item.offset, item.count);
        }
      });
    });
  } else {
    // TODO check if draw*Instanced is supported
    if (self._instanceCount) {
      if (self._index) {
        // mode, count, type, offset, instanceCount
        gl.drawElementsInstanced(self._mode, self._count, self._element_type, self._offset * self._element_size, self._instanceCount);
      } else {
        // mode, first, count, instanceCount
        gl.drawArraysInstanced(self._mode, self._offset, self._count, self._instanceCount);
      }
    } else {
      if (self._index) {
        // mode, count, type, offset
        gl.drawElements(self._mode, self._count, self._element_type, self._offset * self._element_size);
      } else {
        gl.drawArrays(self._mode, self._offset, self._count);
      }
    }
  }
};

VertexArray.prototype.dispose = function () {
  var self = this;
  Object.keys(self._bufferMap).forEach(function (key) {
    self._gl.deleteBuffer(self._bufferMap[key]);
  });
  self._gl.deleteVertexArray(self._vao);
  self._vao = null;
  self._bufferMap = {};
};

// Source: src/shader/Shader.js
var defaultVertexShader = 'attribute vec3 a_position;\nuniform mat4 u_modelViewProjectMatrix;\n\n#ifdef VERTEX_COLOR\n  attribute vec4 a_color;\n  varying vec4 v_color;\n#endif\n\n#if (defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) || defined(ENV_MAP))\n  attribute vec3 a_normal;\n#endif\n\n#if defined(LIGHT) && defined(NORMAL_MAP)\n  attribute vec3 a_tangent;\n#endif\n\n#if (defined(DIFFUSE_MAP) && !defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) && defined(NORMAL_MAP))\n  attribute vec2 a_uv;\n  uniform vec2 u_textureScale;\n  varying vec2 v_uv;\n#endif\n\n#if defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)\n  uniform mat3 u_normalMatrix;\n  varying vec3 v_normal;\n#endif\n\n#if (defined(LIGHT) && !defined(NORMAL_MAP)) || defined(ENV_MAP)\n  varying vec3 v_normalView;\n#endif\n\n#ifdef ENV_MAP\n  uniform mat4 u_viewMatrix;\n  varying vec4 v_viewPosition;\n#endif\n\n#if defined(LIGHT) || defined(ENV_MAP)\n  uniform mat3 u_normalViewMatrix;\n#endif\n\n#ifdef LIGHT\n  uniform mat4 u_modelViewMatrix;\n  uniform vec3 u_lightPosition;\n  varying vec3 v_lightDirection;\n  varying vec3 v_eyeDirection;\n#endif\n\n#ifdef WIREFRAME\n  attribute vec3 a_barycentric;\n  varying vec3 v_barycentric;\n#endif\n\n#ifdef CLIPPLANE\n  uniform mat4 u_modelMatrix;\n  varying vec4 v_woldPosition;\n#endif\n\nvoid main () {\n  vec4 position = vec4(a_position, 1.0);\n  gl_Position = u_modelViewProjectMatrix * position;\n\n  #if !defined(WIREFRAME) || !defined(WIREFRAME_ONLY)\n    #if defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)\n      v_normal = u_normalMatrix * a_normal;\n    #endif\n\n    #if (defined(DIFFUSE_MAP) && !defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) && defined(NORMAL_MAP))\n      v_uv = a_uv * u_textureScale;\n    #endif\n\n    #ifdef LIGHT\n      vec3 viewPosition = (u_modelViewMatrix * position).xyz;\n      v_lightDirection = u_lightPosition - viewPosition;\n      v_eyeDirection = -viewPosition;\n\n      #ifdef NORMAL_MAP\n        mat3 modelViewMatrix3 = mat3(u_modelViewMatrix);\n        vec3 normal = normalize(modelViewMatrix3 * a_normal);\n        vec3 tangent = normalize(modelViewMatrix3 * a_tangent);\n        vec3 bitangent = cross(normal, tangent);\n        mat3 tbnMatrix = mat3(\n          tangent.x, bitangent.x, normal.x,\n          tangent.y, bitangent.y, normal.y,\n          tangent.z, bitangent.z, normal.z\n        );\n        v_lightDirection = tbnMatrix * v_lightDirection;\n        v_eyeDirection = tbnMatrix * v_eyeDirection;\n      #else\n        v_normalView = u_normalViewMatrix * a_normal;\n      #endif\n    #else\n      #if defined(ENV_MAP)\n        v_normalView = u_normalViewMatrix * a_normal;\n      #endif\n    #endif\n\n    #ifdef ENV_MAP\n      v_viewPosition = u_viewMatrix * position;\n    #endif\n\n    #ifdef VERTEX_COLOR\n      v_color = a_color;\n    #endif\n  #endif\n\n  #ifdef WIREFRAME\n    v_barycentric = a_barycentric;\n  #endif\n\n  #ifdef CLIPPLANE\n    v_woldPosition = u_modelMatrix * position;\n  #endif\n}\n';
var defaultFragmentShader = '#ifdef VERTEX_COLOR\n  varying vec4 v_color;\n#endif\n\n#ifdef DIFFUSE_MAP\n  #ifdef DIFFUSE_CUBE_MAP\n    uniform samplerCube u_diffuseSampler;\n    varying vec3 v_normal;\n  #else\n    uniform sampler2D u_diffuseSampler;\n  #endif\n#else\n  uniform vec4 u_diffuseColor;\n#endif\n\n#if (defined(DIFFUSE_MAP) && !defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) && defined(NORMAL_MAP))\n  varying vec2 v_uv;\n#endif\n\n#ifdef NORMAL_MAP\n  uniform sampler2D u_normalSampler;\n#endif\n\n#if (defined(LIGHT) && !defined(NORMAL_MAP)) || defined(ENV_MAP)\n  varying vec3 v_normalView;\n#endif\n\n#ifdef ENV_MAP\n  uniform mat3 u_modelViewInvMatrix;\n  uniform samplerCube u_envSampler;\n  varying vec4 v_viewPosition;\n#endif\n\n#ifdef LIGHT\n  uniform vec3 u_lightColor;\n  uniform vec3 u_lightAmbientColor;\n  uniform vec4 u_ambientColor;\n  uniform vec4 u_specularColor;\n  uniform vec4 u_emissionColor;\n  uniform float u_shininess;\n  varying vec3 v_lightDirection;\n  varying vec3 v_eyeDirection;\n#endif\n\n#ifdef WIREFRAME\n  uniform vec3 u_wireframeColor;\n  uniform float u_wireframeWidth;\n  varying vec3 v_barycentric;\n\n  float edgeFactor () {\n    vec3 d = fwidth(v_barycentric);\n    vec3 a3 = smoothstep(vec3(0.0), d * u_wireframeWidth, v_barycentric);\n    return min(min(a3.x, a3.y), a3.z);\n  }\n#endif\n\n#ifdef CLIPPLANE\n  uniform vec4 u_clipPlane;\n  varying vec4 v_woldPosition;\n#endif\n\nuniform float u_transparency;\n\nvoid main () {\n  #ifdef CLIPPLANE\n    float clipDistance = dot(v_woldPosition.xyz, u_clipPlane.xyz);\n    if (clipDistance > u_clipPlane.w) {\n      discard;\n    }\n  #endif\n\n  #if defined(WIREFRAME) && defined(WIREFRAME_ONLY)\n    gl_FragColor = vec4(u_wireframeColor, (1.0 - edgeFactor()));\n  #else\n    #ifdef VERTEX_COLOR\n      vec4 color = v_color;\n    #else\n      #ifdef DIFFUSE_MAP\n        #ifdef DIFFUSE_CUBE_MAP\n          vec4 color = textureCube(u_diffuseSampler, v_normal);\n        #else\n          vec4 color = texture2D(u_diffuseSampler, v_uv);\n        #endif\n      #else\n        vec4 color = u_diffuseColor;\n      #endif\n    #endif\n\n    #ifdef ENV_MAP\n      vec3 N = v_normalView;\n      vec3 V = v_viewPosition.xyz;\n      vec3 R = reflect(V, N);\n      R = u_modelViewInvMatrix * R;\n      color = textureCube(u_envSampler, R) * color;\n    #endif\n\n    color.a *= u_transparency;\n\n    #ifdef LIGHT\n      #ifdef NORMAL_MAP\n        vec3 normal = normalize((texture2D(u_normalSampler, v_uv) * 2.0 - 1.0).rgb);\n      #else\n        vec3 normal = normalize(v_normalView);\n      #endif\n\n      vec3 lightDirection = normalize(v_lightDirection);\n      vec3 eyeDirection = normalize(v_eyeDirection);\n      float diffuse = max(dot(lightDirection, normal), 0.0);\n\n      vec3 reflectDirection = reflect(-lightDirection, normal);\n      float specular = 0.0;\n      if (u_shininess > 0.0) {\n        specular = pow(max(dot(reflectDirection, eyeDirection), 0.0), u_shininess);\n      }\n\n      vec3 ambientColor = u_lightAmbientColor * u_ambientColor.rgb * color.rgb;\n      vec3 diffuseColor = u_lightColor * color.rgb * diffuse;\n      vec3 specularColor = u_lightColor * u_specularColor.rgb * specular;\n      color = clamp(vec4(ambientColor + diffuseColor + specularColor, color.a), 0.0, 1.0);\n    #endif\n    #ifdef WIREFRAME\n      gl_FragColor = mix(vec4(u_wireframeColor, 1.0), color, edgeFactor());\n    #else\n      gl_FragColor = color;\n    #endif\n  #endif\n}\n';

// Source: src/shader/ShaderUtil.js

var vertexShaderPrefix = 'precision highp float;\n';
var fragmentShaderPrefix = '#extension GL_OES_standard_derivatives : enable\nprecision highp float;\n';

function createProgram (gl, keys) {
  var vertexShader = vertexShaderPrefix,
    fragmentShader = fragmentShaderPrefix,
    defines = '';
  keys.forEach(function (key) {
    defines += '#define ' + key + '\n';
  });
  vertexShader += defines;
  vertexShader += defaultVertexShader;
  fragmentShader += defines;
  fragmentShader += defaultFragmentShader;
  return new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader
  });
}

// Source: src/Camera.js
var Camera = wg.Camera = function (scene) {
  var self = this,
    canvas;
  self._scene = scene;
  canvas = self._canvas = scene._canvas;
  self._viewMatrix = mat4.create();
  self._projectMatix = mat4.create();
  self._rotateMatrix = mat4.create();
  self._viewDirty = true;
  self._projectDirty = true;

  self._position = vec3.create(0, 0, 10);
  self._distance = 10;
  self._target = vec3.create();
  self._up = vec3.fromValues(0, 1, 0);

  self._fovy = 45;
  self._aspect = canvas.width / canvas.height;
  self._near = 0.1;
  self._far = 1000;

  self._lockY = false;

  self._maxRotateX = Math.PI / 2 * 0.95;
  self._rotateX = 0;
  self._rotateY = 0;

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleMouseDown);
  canvas.addEventListener('wheel', handleWheel);
  canvas.addEventListener('blur', clean);
  canvas.addEventListener('keydown', handleKeydown);

  var rotateSpeedY = 360 / canvas.width * window.devicePixelRatio / 180 * Math.PI,
    rotateSpeedX = 180 / canvas.height * window.devicePixelRatio / 180 * Math.PI,
    lastPoint;

  function handleMouseDown(e) {
    if (self._scene._isPresenting) {
      return;
    }
    lastPoint = getClientPoint(e);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', clean);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', clean);
  }

  function handleMouseMove(e) {
    if (self._scene._isPresenting) {
      return;
    }
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
    if (self._scene._isPresenting) {
      return;
    }
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

  function handleKeydown (e) {
    if (self._scene._isPresenting) {
      return;
    }
    var keyCode = e.keyCode,
      left = keyCode === 65 /*A*/ || keyCode === 37 /*Left*/,
      right = keyCode === 68 /*D*/ || keyCode === 39 /*Right*/,
      up = keyCode === 87 /*W*/ || keyCode === 38 /*Up*/,
      down = keyCode === 83 /*S*/ || keyCode === 40 /*Down*/;
    if (!left || !right || !up || !down) {
      return;
    }
    // TODO
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
  if (x.length) {
    z = x[2];
    y = x[1];
    x = x[0];
  }
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
  if (x.length) {
    z = x[2];
    y = x[1];
    x = x[0];
  }
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
    mat4.perspective(projectMatix, self._fovy / 180 * Math.PI, self._aspect, self._near, self._far);
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
  self._scene.redraw();
};

Camera.prototype.invalidateProjectMatrix = function () {
  var self = this;
  self._projectDirty = true;
  self._scene.redraw();
};

// Source: src/Scene.js
var VERTEX_SHADER_OUTPUT = `
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

var FRAGMENT_SHADER_OUTPUT = `
#ifdef GL_ES
  precision highp float;
#endif

uniform sampler2D u_sampler;

varying vec2 v_uv;

void main() {
  gl_FragColor = texture2D(u_sampler, v_uv);
}
`;

var Scene = wg.Scene = function (canvas, options) {
  var self = this;

  if (typeof canvas === 'string') {
    canvas = document.getElementById(canvas);
  }

  self._canvas = canvas;
  self._dirty = true;
  self._objects = [];
  self._programs = {};
  self._uniforms = {
    u_envSampler: 0,
    u_normalSampler: 1,
    u_ambientSampler: 2,
    u_diffuseSampler: 3,
    u_emissionSampler: 4,
    u_specularSampler: 5
  };
  self._camera = new Camera(self);
  self._lightColor = [1, 1, 1];
  self._lightPosition = [10, 10, 10];
  self._lightViewPosition = vec3.create();
  self._ambientColor = [.3, .3, .3];
  self._clearColor = [0, 0, 0, 0];
  self._enableSSAO = false;
  self._viewport = {x: 0, y: 0, width: 0, height: 0};
  self._autoResize = false;
  self._clipPane = [0, 0, 0, 0];
  self._handleResize = function () {
    self.setSize(window.innerWidth, window.innerHeight);
  };
  self.setAutoResize(true);
  self._handleResize();

  var gl = self._gl = canvas.getContext('webgl', options || {
    preserveDrawingBuffer: true,
    // antialias: false,
    stencil: true
  });
  addVertexArraySupport(gl);
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
    self._aniamtionId && (self._vrDisplay || window).cancelAnimationFrame(self._aniamtionId);
  });
  canvas.addEventListener('webglcontextrestored', function (e) {
    console.log(e);
    init();
  });

  function init () {
    if (gl.cache) {
      gl.cache.textures.trigger.off('load', self._handleImageLoaded);
    }
    gl.cache = { textures: new TextureCache(gl) };
    gl.cache.textures.trigger.on('load', self._handleImageLoaded, self);
    gl.cache.quadVao = new VertexArray(gl, {
      buffers: {
        position: [
          1.0, 1.0, 0.0,
          -1.0, 1.0, 0.0,
          -1.0, -1.0, 0.0,
          -1.0, -1.0, 0.0,
          1.0, -1.0, 0.0,
          1.0, 1.0, 0.0
        ]
      }
    });
    gl.cache.vaos = {};
    gl.frontFace(gl.CCW);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    /*self._outputProgram = new Program(gl, {
      vertex: VERTEX_SHADER_OUTPUT,
      fragment: FRAGMENT_SHADER_OUTPUT
    });
    self._outputProgram.use();
    self._outputProgram.setUniforms({
      u_sampler: 0
    });*/
    // self._framebuffer = new Framebuffer(gl, {
    //   width: gl.canvas.width,
    //   height: gl.canvas.height,
    //   depth: true,
    //   stencil: true
    // });
    self._outlineEffect = new OutlineEffect(self);
    self._glowEffect = new GlowEffect(self);
    // self._ssaoEffect = new SSAOEffect(self);

    // self._fxaaEffect = new FxaaEffect(gl);
    // self._fxaaEffect.setEnabled(true);

    var step = vec3.fromValues(0, 0, -0.01),
      stepTrans = vec3.create(),
      tranMat = mat4.create(),
      viewMatrix = mat4.create(),
      quaternion = quat.create(),
      translateMatrix = mat4.create(),
      sittingPosition = vec3.fromValues(0, 1.7, 0),
      sittingToStandingTransform = mat4.create(),
      cameraPosition = self._camera._position,
      leftGamepad, rightGamepad, pressedGamepad, buttonIndex;
    mat4.fromTranslation(sittingToStandingTransform, sittingPosition);
    (function render (time) {
      var vrDisplay = self._vrDisplay,
        frameData = self._frameData,
        camera = self._camera,
        canvas = self._canvas,
        clearColor = self._clearColor;
      self._aniamtionId = (vrDisplay || window).requestAnimationFrame(render);
      if (vrDisplay && vrDisplay.isPresenting) {
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        vrDisplay.getFrameData(frameData);
        getVRGamepads();
        if (vrDisplay.stageParameters) {
          mat4.copy(sittingToStandingTransform, vrDisplay.stageParameters.sittingToStandingTransform);
        }
        mat4.fromTranslation(translateMatrix, cameraPosition);
        refreshGamepadMatrix(leftGamepad);
        refreshGamepadMatrix(rightGamepad);
        if (pressedGamepad && buttonIndex === 2) {
          mat4.getRotation(quaternion, sittingToStandingTransform);
          quat.multiply(quaternion, quaternion, pressedGamepad.pose.orientation);
          vec3.transformQuat(stepTrans, step, quaternion);
          if (self._camera._lockY) {
            stepTrans[1] = 0;
          }
          vec3.add(cameraPosition, cameraPosition, stepTrans);
        }
        self.onGamepadChanged(leftGamepad, rightGamepad, pressedGamepad, buttonIndex);

        mat4.multiply(tranMat, translateMatrix, sittingToStandingTransform);
        mat4.invert(tranMat, tranMat);

        mat4.copy(camera._viewMatrix, frameData.leftViewMatrix);
        mat4.multiply(camera._viewMatrix, camera._viewMatrix, tranMat);
        mat4.copy(camera._projectMatix, frameData.leftProjectionMatrix);
        self._setViewport(0, 0, canvas.width * 0.5, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        self.draw();

        mat4.copy(camera._viewMatrix, frameData.rightViewMatrix);
        mat4.multiply(camera._viewMatrix, camera._viewMatrix, tranMat);
        mat4.copy(camera._projectMatix, frameData.rightProjectionMatrix);
        self._setViewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        self._dirty = true;
        self.draw();
        vrDisplay.submitFrame();
      } else {
        if (self.onAnimationFrame() !== false) {
          if (time !== 0 && self._dirty) {
            gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
            self._setViewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
            self.draw();
          }
        }
      }
    })(0);


    function refreshGamepadMatrix (gamepad) {
      if (!gamepad || !gamepad.pose.orientation || !gamepad.pose.position) {
        return;
      }
      var matrix = gamepad._matrix || (gamepad._matrix = mat4.create());
      mat4.fromRotationTranslation(matrix, gamepad.pose.orientation, gamepad.pose.position);
      mat4.multiply(matrix, sittingToStandingTransform, matrix);
      mat4.multiply(matrix, translateMatrix, matrix);
    }

    function getVRGamepads() {
      leftGamepad = null;
      rightGamepad = null;
      pressedGamepad = null;
      buttonIndex = -1;
      if (!navigator.getGamepads) {
        return;
      }
      var gamepads = navigator.getGamepads();
      for (var i=0; i<gamepads.length; i++) {
        var gamepad = gamepads[i];
        if (gamepad && gamepad.pose) {
          if (gamepad.hand === 'right') {
            rightGamepad = gamepad;
          } else {
            leftGamepad = gamepad;
          }
          // direction: 0, trigger: 1, side: 2, menu: 3
          gamepad.buttons.some(function (button, index) {
            if (button.pressed) {
              pressedGamepad = gamepad;
              buttonIndex = index;
              return true;
            }
          });
        }
      }
    }
  }

  init();
  self._initVR();
};

Scene.prototype.onGamepadChanged = function (leftGamepad, rightGamepad, pressedGamepad, buttonIndex) {
};

Scene.prototype.onAnimationFrame = function () {
};

Scene.prototype.redraw = function () {
  this._dirty = true;
};

Scene.prototype._setViewport = function (x, y, width, height) {
  var self = this,
    viewport = self._viewport;
  viewport.x = x;
  viewport.y = y;
  viewport.width = width;
  viewport.height = height;
  self._gl.viewport(x, y, width, height);
};

Scene.prototype.draw = function () {
  var self = this,
    // outputProgram = self._outputProgram,
    camera = self._camera,
    gl = self._gl,
    lightPosition = self._lightViewPosition,
    viewMatrix = camera.getViewMatrix(),
    uniforms = self._uniforms;
  self._dirty = false;
  // self._framebuffer.bind();
  vec3.transformMat4(lightPosition, self._lightPosition, viewMatrix);

  gl.disable(gl.BLEND);
  gl.depthMask(true);
  self._objects.forEach(function (object) {
    if (object.visible === false) {
      return;
    }
    if (!object.material.transparent) {
      drawObject(object);
    }
  });

  gl.enable(gl.BLEND);
  gl.depthMask(false);
  self._objects.forEach(function (object) {
    if (object.visible === false) {
      return;
    }
    if (object.material.transparent) {
      drawObject(object);
    }
  });

  gl.disable(gl.BLEND);
  gl.depthMask(true);

  // self._outlineEffect.pass();

  /*if (self._enableSSAO) {
    self._ssaoEffect.pass(self._framebuffer);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    outputProgram.use();
    if (clear !== false) {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    self._framebuffer.bindTexture(0);
    gl.cache.quadVao.draw();
    // self._fxaaEffect.pass(self._framebuffer);
  }*/

  // self._glowEffect.pass();

  function drawObject (object) {
    var vao = self.getVertexArray(object),
      material = object.material,
      key, program;
    if (!vao) {
      return;
    }
    key = material.getKey();
    program = self._programs[key];
    if (!program) {
      program = self._programs[key] = createProgram(gl, material._keys);
    }

    object._refreshViewMatrix(viewMatrix, camera.getProjectMatrix());

    uniforms.u_viewMatrix = viewMatrix;
    uniforms.u_lightPosition = lightPosition;
    uniforms.u_lightColor = self._lightColor;
    uniforms.u_lightAmbientColor = self._ambientColor;

    uniforms.u_modelMatrix = object._modelMatrix;
    uniforms.u_normalMatrix = object._normalMatrix;
    uniforms.u_normalViewMatrix = object._normalViewMatrix;
    uniforms.u_modelViewInvMatrix = object._modelViewInvMatrix;
    uniforms.u_modelViewMatrix = object._modelViewMatrix;
    uniforms.u_modelViewProjectMatrix = object._modelViewProjectMatrix;
    uniforms.u_modelViewMatrix3 = object._modelViewMatrix3;

    uniforms.u_textureScale = material.textureScale;
    uniforms.u_wireframeColor = material.wireframeColor;
    uniforms.u_wireframeWidth = material.wireframeWidth;
    uniforms.u_wireframeOnly = material.wireframeOnly;
    uniforms.u_clipPlane = material.clipPlane;
    uniforms.u_ambientColor = material.ambientColor;
    uniforms.u_diffuseColor = material.diffuseColor;
    uniforms.u_emissionColor = material.emissionColor;
    uniforms.u_specularColor = material.specularColor;
    uniforms.u_shininess = material.shininess;
    uniforms.u_transparency = material.transparency;

    // TODO material.vertexColor

    program.use();
    program.setUniforms(uniforms);

    if (material.doubleSided) {
      gl.disable(gl.CULL_FACE);
    } else {
      gl.enable(gl.CULL_FACE);
    }

    if (material.envImage) {
      gl.cache.textures.get(material.envImage).bind(0);
    }
    if (material.normalImage) {
      gl.cache.textures.get(material.normalImage).bind(1);
    }
    if (material.ambientImage) {
      gl.cache.textures.get(material.ambientImage).bind(2);
    }
    if (material.diffuseImage) {
      gl.cache.textures.get(material.diffuseImage).bind(3);
    }
    if (material.emissionImage) {
      gl.cache.textures.get(material.emissionImage).bind(4);
    }
    if (material.specularImage) {
      gl.cache.textures.get(material.specularImage).bind(5);
    }

    vao.draw(preDrawCallback);
  }

  function preDrawCallback (part) {
    // TODO change program
    if (part.diffuseImage) {
      gl.cache.textures.get(part.diffuseImage).bind(2);
    } else {
      program.setUniform('u_diffuseColor', part.diffuseColor);
    }
  }
};

Scene.prototype.add = function (object) {
  var self = this;
  self._objects.push(object);
  self._dirty = true;
};

Scene.prototype.clear = function () {
  var self = this;
  self._objects = [];
  self._dirty = true;
};

Scene.prototype.getVertexArray = function (object) {
  var self = this,
    gl = self._gl,
    type = object.type,
    geometry = wg.geometries[type],
    vao = gl.cache.vaos[type];
  if (object.vao) {
    return object.vao;
  }
  if (geometry && !vao) {
    vao = gl.cache.vaos[type] = new VertexArray(gl, {
      buffers: geometry
    });
  }
  return vao;
};

Scene.prototype._initVR = function () {
  var self = this,
    canvas = self._canvas,
    vrDisplay;
  if (self._vrDisplay) {
    return;
  }
  if (navigator.getVRDisplays) {
    navigator.getVRDisplays().then(function (vrDisplays) {
      if (vrDisplays && vrDisplays.length) {
        vrDisplay = self._vrDisplay = vrDisplays[0];
        self._frameData = new VRFrameData();
        vrDisplay.depthNear = self._camera._near;
        vrDisplay.depthFar = self._camera._far;

        if (!self.onVRRequestPresent) {
          self.onVRRequestPresent = function (e) {
            console.log('onVRRequestPresent', e);
            self.enterVR();
          };
        }

        if (!self.onVRExitPresent) {
          self.onVRExitPresent = function (e) {
            console.log('onVRExitPresent', e);
            self.exitVR();
          };
        }

        if (!self.onVRPresentChange) {
          self.onVRPresentChange = function (e) {
            // TODO resize Framebuffer
            if (vrDisplay.isPresenting) {
              self._isPresenting = true;
              var leftEye = vrDisplay.getEyeParameters('left');
              var rightEye = vrDisplay.getEyeParameters('right');
              self._oldSize = {
                width: canvas.width,
                height: canvas.height
              };
              canvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
              canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);
            } else {
              self._isPresenting = false;
              if (self._oldSize) {
                canvas.width = self._oldSize.width;
                canvas.height = self._oldSize.height;
              }
            }
            self.redraw();
            // self._framebuffer.setSize(canvas.width, canvas.height);
          };
        }
        window.addEventListener('vrdisplaypresentchange', self.onVRPresentChange, false);
        window.addEventListener('vrdisplayactivate', self.onVRRequestPresent, false);
        window.addEventListener('vrdisplaydeactivate', self.onVRExitPresent, false);
      } else {
        self._vrFailReason = 'Your browser does support WebVR, but no VR device connected';
      }
    });
  } else {
    self._vrFailReason = 'Your browser does not support WebVR, check http://webvr.info';
  }
};

Scene.prototype.enterVR = function () {
  var self = this,
    canvas = self._canvas,
    vrDisplay = self._vrDisplay;
  if (vrDisplay && !vrDisplay.isPresenting) {
    vrDisplay.requestPresent([{ source: canvas }]).then(function () {
    }, function (e) {
      console.log('requestPresent failed.', e);
    });
  }
  if (!vrDisplay && self._vrFailReason) {
    alert(self._vrFailReason);
  }
};

Scene.prototype.exitVR = function () {
  var self = this,
    vrDisplay = self._vrDisplay;
  if (vrDisplay && vrDisplay.isPresenting) {
    vrDisplay.exitPresent().then(function () {
    }, function (e) {
      console.log('exitPresent failed.', e);
    });
  }
};

Scene.prototype.resetPose = function () {
  var self = this,
    vrDisplay = self._vrDisplay;
  if (vrDisplay) {
    vrDisplay.resetPose();
  }
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

Scene.prototype.getEnableSSAO = function () {
  return this._enableSSAO;
};

Scene.prototype.setEnableSSAO = function (enableSSAO) {
  this._enableSSAO = enableSSAO;
  this.redraw();
};

Scene.prototype._handleImageLoaded = function (event) {
  this.redraw();
};

Scene.prototype.dispose = function  () {
  var self = this;
  self._gl.cache.textures.trigger.off('load', self._handleImageLoaded);
};

Scene.prototype.enterFullscreen = function () {
  var el = this._canvas;
  if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if (el.mozRequestFullScreen) {
    el.mozRequestFullScreen();
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  } else if (el.msRequestFullscreen) {
    el.msRequestFullscreen();
  }
};

Scene.prototype.setSize = function (width, height) {
  var self = this,
    canvas = self._canvas;
  setCanvasSize(canvas, width, height);
  self._camera.setAspect(width / height);
  self.redraw();
};

Scene.prototype.setAutoResize = function (autoResize) {
  var self = this;
  if (autoResize != self._autoResize) {
    self._autoResize = autoResize;
    if (autoResize) {
      window.addEventListener('resize', self._handleResize);
    } else {
      window.removeEventListener('resize', self._handleResize);
    }
  }
};

// Source: src/effect/Effect.js
var Effect = wg.Effect = function (gl) {
  var self = this;
  self._gl = gl;
};

Effect.prototype.pass = function (inputFrameBuffer, outputFrameBuffer) {

};

Effect.prototype.getOutputTexture = function () {
  return null;
};

// Source: src/effect/FxaaEffect.js
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
  self._enabled = false;

  self._program = new Program(gl, {
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

// Source: src/effect/TiltShiftEffect.js
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

// Source: src/effect/ZoomBlurEffect.js
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

  self._program = new Program(gl, {
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

// Source: src/effect/OutlineEffect.js
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
  float offset = ((u_outline ? u_outlineWidth : 0.0) + u_outlineGap) * (position.z / 1000.0);
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

var OutlineEffect = wg.OutlineEffect = function (scene) {
  var self = this,
    gl;

  self._scene = scene;
  gl = self._gl = scene._gl;
  self._outlineColor = [1, 153/255, 51/255]; // CMYK(0, 40, 80, 0)
  self._outlineWidth = 2;
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

  drawOutline();

  program.setUniforms({
    u_outline: true
  });

  gl.stencilFunc(gl.EQUAL, 0, -1);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
  gl.colorMask(true, true, true, true);

  drawOutline();

  function drawOutline () {
    scene._objects.forEach(function (object) {
      if (object.visible === false) {
        return;
      }
      if (object.outline) {
        var vao = scene.getVertexArray(object);
        if (vao) {
          program.setUniforms({
            u_modelMatrix: object.getModelMatrix()
          });
          vao.draw();
        }
      }
    });
  }

  gl.disable(gl.STENCIL_TEST);
};

OutlineEffect.prototype.getOutputTexture = function () {
  return null;
};

OutlineEffect.prototype.setOutlineColor = function (outlineColor) {
  var self = this;
  this._outlineColor = outlineColor;
  self._scene.redraw();
};

OutlineEffect.prototype.getOutlineColor = function () {
  return this._outlineColor;
};

OutlineEffect.prototype.setOutlineWidth = function (outlineWidth) {
  var self = this;
  self._outlineWidth = outlineWidth;
  self._scene.redraw();
};

OutlineEffect.prototype.getOutlineWidth = function () {
  return this._outlineWidth;
};

OutlineEffect.prototype.setOutlineGap = function (outlineGap) {
  var self = this;
  this._outlineGap = outlineGap;
  self._scene.redraw();
};

OutlineEffect.prototype.getOutlineGap = function () {
  return this._outlineGap;
};

// Source: src/effect/GlowEffect.js
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
    if (i >= u_blurAmount) {
      break;
    }
    float offset = i - half_blur;
    vec4 tex_color = texture2D(u_sampler, v_uv +
      offset * u_blurScale * texelOffset) * gaussian(offset * strength, deviation);
    color += tex_color;
  }

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`;

var GlowEffect = wg.GlowEffect = function (scene) {
  var self = this,
    gl;

  self._scene = scene;
  gl = self._gl = scene._gl;
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
    scene = self._scene,
    viewport = scene._viewport;

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
  gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

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
      if (object.visible === false) {
        return;
      }
      if (!object.glow && !object.material.transparent) {
        var vao = scene.getVertexArray(object);
        if (vao) {
          self._colorProgram.setUniforms({
            u_modelMatrix: object.getModelMatrix()
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
      if (object.visible === false) {
        return;
      }
      if (object.glow) {
        var vao = scene.getVertexArray(object);
        if (vao) {
          self._colorProgram.setUniforms({
            u_modelMatrix: object.getModelMatrix()
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
  var self = this;
  self._glowColor = glowColor;
  self._scene.redraw();
};

GlowEffect.prototype.getGlowColor = function () {
  return this._glowColor;
};

GlowEffect.prototype.setBlurAmount = function (blurAmount) {
  var self = this;
  self._blurAmount = blurAmount;
  self._scene.redraw();
};

GlowEffect.prototype.getBlurAmount = function () {
  return this._blurAmount;
};

GlowEffect.prototype.setBlurScale = function (blurScale) {
  var self = this;
  self._blurScale = blurScale;
  self._scene.redraw();
};

GlowEffect.prototype.getBlurScale = function () {
  return this._blurScale;
};

GlowEffect.prototype.setBlurStrength = function (blurStrength) {
  var self = this;
  self._blurStrength = blurStrength;
  self._scene.redraw();
};

GlowEffect.prototype.getBlurStrength = function () {
  return this._blurStrength;
};

GlowEffect.prototype.setBlurSize = function (blurSize) {
  var self = this;
  self._blurSize = blurSize;
  self._colorFramebuffer.setSize(blurSize, blurSize);
  self._hBlurFramebuffer.setSize(blurSize, blurSize);
  self._vBlurFramebuffer.setSize(blurSize, blurSize);
  self._scene.redraw();
};

GlowEffect.prototype.getBlurSize = function () {
  return this._blurSize;
};

// Source: src/effect/SSAOEffect.js
var VERTEX_SHADER_SSAO_DEFER = `
#ifdef GL_ES
  precision highp float;
#endif

attribute vec4 a_position;
attribute vec3 a_normal;

uniform mat4 u_projectMatrix;
uniform mat4 u_viewModelMatrix;
uniform mat3 u_normalMatrix;
uniform mat4 u_viewMatrix;

varying vec4 v_viewPosition;
varying vec3 v_normal;

void main () {
  v_normal = u_normalMatrix * a_normal;
  v_viewPosition = u_viewModelMatrix * a_position;
  gl_Position = u_projectMatrix * v_viewPosition;
}
`;

var FRAGMENT_SHADER_SSAO_DEFER_POSITION = `
#ifdef GL_ES
  precision highp float;
#endif

// Stores the (Far - Near) clip value used for calculating linear depth
uniform float u_linearDepth;

varying vec4 v_viewPosition;

void main() {
  float linearDepth = length(v_viewPosition) / u_linearDepth;
  gl_FragColor = vec4(v_viewPosition.xyz, linearDepth);
}
`;

var FRAGMENT_SHADER_SSAO_DEFER_NORMAL = `
#ifdef GL_ES
  precision highp float;
#endif

varying vec3 v_normal;

void main() {
  vec3 normal = normalize(v_normal);
  gl_FragColor = vec4(normal, 0.0);
}
`;

var VERTEX_SHADER_SSAO = `
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

var FRAGMENT_SHADER_SSAO = `
#ifdef GL_ES
  precision highp float;
#endif

uniform sampler2D u_samplerPosition;
uniform sampler2D u_samplerNormal;
uniform sampler2D u_samplerNormalMap;
uniform vec2 u_windowSize;
uniform float u_occluderBias;
uniform float u_samplingRadius;
uniform vec2 u_attenuation;

varying vec2 v_uv;

float SamplePixels (vec3 srcPosition, vec3 srcNormal, vec2 uv) {
  // Get the 3D position of the destination pixel
  vec3 dstPosition = texture2D(u_samplerPosition, uv).xyz;

  // Calculate ambient occlusion amount between these two points
  // It is simular to diffuse lighting. Objects directly above the fragment cast
  // the hardest shadow and objects closer to the horizon have minimal effect.
  vec3 positionVec = dstPosition - srcPosition;
  float intensity = max(dot(normalize(positionVec), srcNormal) - u_occluderBias, 0.0);

  // Attenuate the occlusion, similar to how you attenuate a light source.
  // The further the distance between points, the less effect AO has on the fragment.
  float dist = length(positionVec);
  float attenuation = 1.0 / (u_attenuation.x + (u_attenuation.y * dist));

  return intensity * attenuation;
}

void main() {
  // Get position and normal vector for this fragment
  vec3 srcPosition = texture2D(u_samplerPosition, v_uv).xyz;
  vec3 srcNormal = texture2D(u_samplerNormal, v_uv).xyz;
  vec2 randVec = normalize(texture2D(u_samplerNormalMap, v_uv).xy * 2.0 - 1.0);
  float srcDepth = texture2D(u_samplerPosition, v_uv).w;

  // The following variable specifies how many pixels we skip over after each
  // iteration in the ambient occlusion loop. We can't sample every pixel within
  // the sphere of influence because that's too slow. We only need to sample
  // some random pixels nearby to apprxomate the solution.
  //
  // Pixels far off in the distance will not sample as many pixels as those close up.
  float kernelRadius = u_samplingRadius * (1.0 - srcDepth);

  // Sample neighbouring pixels
  vec2 kernel[4];
  kernel[0] = vec2(0.0, 1.0);   // top
  kernel[1] = vec2(1.0, 0.0);   // right
  kernel[2] = vec2(0.0, -1.0);  // bottom
  kernel[3] = vec2(-1.0, 0.0);  // left

  const float Sin45 = 0.707107; // 45 degrees = sin(PI / 4)

  // Sample from 16 pixels, which should be enough to appromixate a result. You can
  // sample from more pixels, but it comes at the cost of performance.
  float occlusion = 0.0;
  for (int i = 0; i < 4; ++i)
  {
    vec2 k1 = reflect(kernel[i], randVec);
    vec2 k2 = vec2(k1.x * Sin45 - k1.y * Sin45,
             k1.x * Sin45 + k1.y * Sin45);
    k1 *= u_windowSize;
    k2 *= u_windowSize;

    occlusion += SamplePixels(srcPosition, srcNormal, v_uv + k1 * kernelRadius);
    occlusion += SamplePixels(srcPosition, srcNormal, v_uv + k2 * kernelRadius * 0.75);
    occlusion += SamplePixels(srcPosition, srcNormal, v_uv + k1 * kernelRadius * 0.5);
    occlusion += SamplePixels(srcPosition, srcNormal, v_uv + k2 * kernelRadius * 0.25);
  }

  // Average and clamp ambient occlusion
  occlusion /= 16.0;
  occlusion = clamp(occlusion, 0.0, 1.0);

  gl_FragColor.x = occlusion;
}
`;

var FRAGMENT_SHADER_SSAO_BLEND = `
#ifdef GL_ES
  precision highp float;
#endif

uniform sampler2D u_samplerScene;
uniform sampler2D u_samplerSSAO;

varying vec2 v_uv;

const vec3 ratio = vec3(1.0 / 2.2);

void main() {
  vec4 texColor = texture2D(u_samplerScene, v_uv);
  float ao = texture2D(u_samplerSSAO, v_uv).r;
  gl_FragColor.rgb = pow(clamp(texColor.rgb - ao, 0.0, 1.0), ratio);
  gl_FragColor.a = texColor.a;
}
`;

var NORMAL_MAP_IMAGE = 'data:image/png;base64,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';

var SSAOEffect = wg.SSAOEffect = function (scene) {
  var self = this,
    gl;

  self._scene = scene;
  gl = self._gl = scene._gl;
  self._occluderBias = 0.05; // 0 ~ 0.2, step: 0.01
  self._samplingRadius = 20; // 0 ~ 40, step: 1
  self._attenuation = [1, 5]; // x: 0 ~ 2  y: 0 ~ 10  step: 0.1
  self._brightness = 0; // -1 ~ 1
  self._contrast = 1;
  self._invGamma = 1 / 2.2;

  // https://developer.mozilla.org/en-US/docs/Web/API/OES_texture_float
  gl.getExtension('OES_texture_float');

  self._deferPositionProgram = new Program(gl, {
    vertex: VERTEX_SHADER_SSAO_DEFER,
    fragment: FRAGMENT_SHADER_SSAO_DEFER_POSITION
  });
  self._deferNormalProgram = new Program(gl, {
    vertex: VERTEX_SHADER_SSAO_DEFER,
    fragment: FRAGMENT_SHADER_SSAO_DEFER_NORMAL
  });
  self._program = new Program(gl, {
    vertex: VERTEX_SHADER_SSAO,
    fragment: FRAGMENT_SHADER_SSAO
  });
  self._blendProgram = new Program(gl, {
    vertex: VERTEX_SHADER_SSAO,
    fragment: FRAGMENT_SHADER_SSAO_BLEND
  });
  self._deferPositionFramebuffer = new Framebuffer(gl, {
    width: gl.canvas.width,
    height: gl.canvas.height,
    depth: true,
    stencil: false,
    dataType: 'FLOAT'
  });
  self._deferNormalFramebuffer = new Framebuffer(gl, {
    width: gl.canvas.width,
    height: gl.canvas.height,
    depth: true,
    stencil: false,
    dataType: 'FLOAT',
    format: 'RGB'
  });
  self._ssaoFramebuffer = new Framebuffer(gl, {
    width: gl.canvas.width,
    height: gl.canvas.height,
    depth: false,
    stencil: false,
    dataType: 'FLOAT',
    // format: 'RGB'
  });
  self._normalMapTexture = new Texture(gl, {
    url: NORMAL_MAP_IMAGE,
    anisotropy: 1,
    mipmap: false,
    minFilter: 'LINEAR',
    magFilter: 'LINEAR',
    flipY: false
  });
};

SSAOEffect.prototype.setSize = function (width, height) {
  var self = this;
  if (self._width === width && self._height === height) {
    return;
  }
  self._width = width;
  self._height = height;
  self._deferPositionFramebuffer.setSize(width, height);
  self._deferNormalFramebuffer.setSize(width, height);
  self._ssaoFramebuffer.setSize(width, height);
};

SSAOEffect.prototype._draw = function (program) {
  var self = this,
    gl = self._gl;
  self._scene._objects.forEach(function (object) {
    if (object.visible === false) {
      return;
    }
    var vao = scene.getVertexArray(object);
    if (vao) {
      if (!object._viewNormalMatrix) {
        object._viewNormalMatrix = mat3.create();
        object._viewModelMatrix = mat4.create();
      }
      // TODO performance
      mat4.multiply(object._viewModelMatrix,
        scene._camera.getViewMatrix(),
        object.getModelMatrix()
      );
      mat3.normalFromMat4(object._viewNormalMatrix, object._viewModelMatrix);
      program.setUniforms({
        u_viewModelMatrix: object._viewModelMatrix,
        // u_normalMatrix: object.getNormalMatrix(),
        u_normalMatrix: object._viewNormalMatrix
      });
      vao.draw();
    }
  });
};

SSAOEffect.prototype.pass = function (inputFrameBuffer, outputFrameBuffer) {
  var self = this,
    gl = self._gl,
    quadVao = gl.cache.quadVao,
    camera = self._scene._camera,
    projectMatrix = camera.getProjectMatrix(),
    viewMatrix = camera.getViewMatrix();

  self._deferPositionFramebuffer.bind();
  self._deferPositionProgram.use();
  self._deferPositionProgram.setUniforms({
    u_projectMatrix: projectMatrix,
    u_viewMatrix: viewMatrix,
    u_linearDepth: camera._far - camera._near
  });
  self._draw(self._deferPositionProgram);

  self._deferNormalFramebuffer.bind();
  self._deferNormalProgram.use();
  self._deferNormalProgram.setUniforms({
    u_projectMatrix: projectMatrix,
    u_viewMatrix: viewMatrix,
    u_linearDepth: camera._far - camera._near
  });
  self._draw(self._deferNormalProgram);

  self._ssaoFramebuffer.bind();
  self._program.use();
  self._program.setUniforms({
    u_samplerPosition: 0,
    u_samplerNormal: 1,
    u_samplerNormalMap: 2,
    u_windowSize: [
      1 / gl.canvas.width,
      1 / gl.canvas.height
    ],
    u_occluderBias: self._occluderBias,
    u_samplingRadius: self._samplingRadius,
    u_attenuation: self._attenuation
  });
  self._deferPositionFramebuffer.bindTexture(0);
  self._deferNormalFramebuffer.bindTexture(1);
  self._normalMapTexture.bind(2);
  quadVao.draw();

  if (outputFrameBuffer) {
    outputFrameBuffer.bind();
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  self._blendProgram.use();
  self._blendProgram.setUniforms({
    u_samplerScene: 0,
    u_samplerSSAO: 1
  });
  inputFrameBuffer.bindTexture(0);
  self._ssaoFramebuffer.bindTexture(1);
  quadVao.draw();
};

SSAOEffect.prototype.getOutputTexture = function () {
  return null;
};

// Occluder bias to minimize self-occlusion
SSAOEffect.prototype.setOccluderBias = function (occluderBias) {
  this._occluderBias = occluderBias;
};

SSAOEffect.prototype.getOccluderBias = function () {
  return this._occluderBias;
};

// Specifies the size of the sampling radius
SSAOEffect.prototype.setSamplingRadius = function (samplingRadius) {
  this._samplingRadius = samplingRadius;
};

SSAOEffect.prototype.getSamplingRadius = function () {
  return this._samplingRadius;
};

// Ambient occlusion attenuation values.
// These parameters control the amount of AO calculated based on distance
// to the occluders. You need to play with them to find the right balance.
//
// .x = constant attenuation. This is useful for removing self occlusion. When
//    set to zero or a low value, you will start to notice edges or wireframes
//    being shown. Typically use a value between 1.0 and 3.0.
//
// .y = linear attenuation. This provides a linear distance falloff.
// .z = quadratic attenuation. Smoother falloff, but is not used in this shader.
SSAOEffect.prototype.setAttenuation = function (attenuation) {
  this._attenuation = attenuation;
};

SSAOEffect.prototype.getAttenuation = function () {
  return this._attenuation;
};

// Source: src/object/Object.js
var objectId = 1;
wg.Object = function () {
  var self = this;
  self.id = objectId++;
  self._modelMatrix = mat4.create();
  self._modelViewMatrix = mat4.create();
  self._modelViewInvMatrix = mat3.create();
  self._modelViewProjectMatrix = mat4.create();
  self._normalMatrix = mat3.create();
  self._normalViewMatrix = mat3.create();
  self.type = null;
  self._position = vec3.create();
  self._scale = vec3.fromValues(1, 1, 1);
  self._rotation = vec3.fromValues(0, 0, 0);
  self._matrixDirty = false;
  self.material = new Material();
};

[
  {
    name: 'clipPlane',
    value: null
  },
].forEach(function (property) {
  defineProperty(wg.Object.prototype, property.name, property.value, function (property, oldValue, newValue) {
    this.material.clip = !!newValue;
  });
});

wg.Object.prototype.setPosition = function (x, y, z) {
  var self = this;
  vec3.set(self._position, x, y, z);
  self._matrixDirty = true;
  return self;
};

wg.Object.prototype.setScale = function (x, y, z) {
  var self = this;
  vec3.set(self._scale, x, y, z);
  self._matrixDirty = true;
  return self;
};

wg.Object.prototype.setRotation = function (x, y, z) {
  var self = this;
  vec3.set(self._rotation, x, y, z);
  self._matrixDirty = true;
  return self;
};

wg.Object.prototype.getModelMatrix = function () {
  var self = this,
    modelMatrix = self._modelMatrix;
  if (self._matrixDirty) {
    self._matrixDirty = false;
    mat4.fromTranslation(modelMatrix, self._position);
    mat4.rotateX(modelMatrix, modelMatrix, self._rotation[0]);
    mat4.rotateY(modelMatrix, modelMatrix, self._rotation[1]);
    mat4.rotateZ(modelMatrix, modelMatrix, self._rotation[2]);
    mat4.scale(modelMatrix, modelMatrix, self._scale);
    mat3.normalFromMat4(self._normalMatrix, modelMatrix);
  }
  return modelMatrix;
};

wg.Object.prototype._refreshViewMatrix = function (viewMatrix, projectMatrix) {
  var self = this;
  mat4.multiply(self._modelViewMatrix, viewMatrix, self.getModelMatrix());
  mat3.normalFromMat4(self._normalViewMatrix, self._modelViewMatrix);
  mat4.multiply(self._modelViewProjectMatrix, projectMatrix, self._modelViewMatrix);
  mat3.fromMat4(self._modelViewInvMatrix, self._modelViewMatrix);
  mat3.invert(self._modelViewInvMatrix, self._modelViewInvMatrix);
};

// Source: src/object/Cube.js
var Cube = wg.Cube = function () {
  wg.Object.call(this);
  this.type = 'cube';
};

Cube.prototype.__proto__ = wg.Object.prototype;

// Source: src/object/Torus.js
var Torus = wg.Torus = function () {
  wg.Object.call(this);
  this.type = 'torus';
};

Torus.prototype.__proto__ = wg.Object.prototype;

// Source: src/object/Sphere.js
var Sphere = wg.Sphere = function () {
  wg.Object.call(this);
  this.type = 'sphere';
};

Sphere.prototype.__proto__ = wg.Object.prototype;

// Source: src/parser/ObjParser.js
var ObjParser = wg.ObjParser = {};
var SPACE = /\s+/;

ObjParser.parseObjMtlUrl = function (urlPath, name, callback) {
  urlPath = urlPath + (urlPath.endsWith('/') ? '' : '/');
  ajax(urlPath + name + '.obj', undefined, function (obj) {
    ajax(urlPath + name + '.mtl', undefined, function (mtl) {
      callback(ObjParser.parseObjMtl(urlPath, obj, mtl));
    });
  });
};

ObjParser.parseObjMtl = function (urlPath, obj, mtl) {
  if (!obj) {
    return null;
  }
  // console.time('parse');
  urlPath = urlPath || '';
  urlPath.endsWith('/') || (urlPath = urlPath + '/');
  urlPath = urlPath + (urlPath.endsWith('/') ? '' : '/');
  var result = {
      vertices: [],
      normals: [],
      uvs: [],
      indices: [],
      index: 0,
      parts: []
    },
    materials = {},
    // Map better than Object
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
    allIndices = new Map(),
    allVertices = [],
    allUvs = [],
    allNormals = [],
    partMap = {},
    materialName, material, counts;

  materials['default'] = {
    Ka: [0, 0, 0, 1],
    Kd: [0.5, 0.5, 0.5, 1],
    Ks: [0, 0, 0, 1],
    Ns: 0,
    Ni: 0,
    d: 1,
    illum: 0
  };
  // https://en.wikipedia.org/wiki/Wavefront_.obj_file
  // http://paulbourke.net/dataformats/mtl/
  // http://paulbourke.net/dataformats/obj/
  // https://people.cs.clemson.edu/~dhouse/courses/405/docs/brief-mtl-file-format.html
  // http://www.fileformat.info/format/material/
  // http://exocortex.com/blog/extending_wavefront_mtl_to_support_pbr
  mtl && mtl.trim().split('\n').forEach(function (line) {
    line = line.trim();
    if (!line || line.startsWith('#')) {
      return;
    }
    line = line.split(SPACE);
    var command = line.shift();

    switch (command) {
      case 'newmtl': {
        material = line[0];
        material = materials[material] = {
          d: 1
        };
        break;
      }
      // ambient reflectivity of the current material
      case 'Ka': {
        material.Ka = [+line[0], +line[1], +line[2], line[3] == null ? 1 : +line[3]];
        break;
      }
      // diffuse reflectivity of the current material
      case 'Kd': {
        material.Kd = [+line[0], +line[1], +line[2], line[3] == null ? 1 : +line[3]];
        break;
      }
      // specular reflectivity of the current material
      case 'Ks': {
        material.Ks = [+line[0], +line[1], +line[2], line[3] == null ? 1 : +line[3]];
        break;
      }
      // Specifies the specular exponent for the current material.
      // This defines the focus of the specular highlight.
      case 'Ns': {
        material.Ns = +line[0];
        break;
      }
      case 'Ni': {
        material.Ni = +line[0];
        break;
      }
      // dissolve for the current material:
      // 1.0 is fully opaque, 0.0 is fully dissolved (completely transparent)
      case 'd': {
        material.d = +line[0];
        break;
      }
      case 'illum': {
        material.illum = +line[0];
        break;
      }
      // diffuse reflectivity of the material
      case 'map_Kd': {
        material.map_Kd = line[line.length - 1];
        break;
      }
      // ambient reflectivity of the material
      case 'map_Ka': {
        material.map_Ka = line[line.length - 1];
        break;
      }
      // specular reflectivity of the material
      case 'map_Ks': {
        material.map_Ks = line[line.length - 1];
        break;
      }
    }
  });

  function addIndex (segment) {
    var index = null;//allIndices.get(segment);
    if (index != null) {
      result.indices.push(index);
    } else {
      // allIndices.set(segment, index = result.index);
      result.indices.push(result.index);
      result.index += 1;

      segment = segment.split('/');
      var iii = (parseInt(segment[0]) - 1) * 3;
      if (allVertices[iii + 2] == null) {
        console.error('vertices overflow:', iii, allVertices.length);
      }
      result.vertices.push(allVertices[iii], allVertices[iii + 1], allVertices[iii + 2]);

      if (segment[1]) {
        iii = (parseInt(segment[1]) - 1) * 2;
        if (allUvs[iii + 1] == null) {
          console.error('uvs overflow', iii, allUvs.length);
        }
        result.uvs.push(allUvs[iii], allUvs[iii + 1]);
      }
      if (segment[2]) {
        iii = (parseInt(segment[2]) - 1) * 3;
        if (allNormals[iii + 2] == null) {
          console.error('normals overflow', iii, allNormals.length);
        }
        result.normals.push(allNormals[iii], allNormals[iii + 1], allNormals[iii + 2]);
      }
    }
    counts.count++;
    return index;
  }

  obj.trim().split('\n').forEach(function (lineStr) {
    lineStr = lineStr.trim();
    if (!lineStr || lineStr.charAt(0) === '#') {
      return;
    }
    var line = lineStr.split(SPACE);
    var command = line.shift(),
      i, n, part, offset;
    switch (command) {
      case 'v': {
        allVertices.push(parseFloat(line[0]), parseFloat(line[1]), parseFloat(line[2]));
        break;
      }
      case 'vn': {
        allNormals.push(parseFloat(line[0]), parseFloat(line[1]), parseFloat(line[2]));
        break;
      }
      case 'vt': {
        allUvs.push(parseFloat(line[0]), parseFloat(line[1]));
        break;
      }
      case 'usemtl': {
        materialName = materials[line[0]] ? line[0] : 'default';
        material = materials[materialName];
        offset = counts ? counts.offset + counts.count : 0;
        if (partMap[materialName]) {
          part = partMap[materialName];
          part.counts.push(counts = {
            offset: offset,
            count: 0
          });
        } else {
          result.parts.push(part = partMap[materialName] = {
            counts: [counts = {
              offset: offset,
              count: 0
            }],
            name: materialName,
            ambientColor: material.Ka,
            diffuseColor: material.Kd,
            specularColor: material.Ks,
            transparency: material.d,
            shininess: material.Ns,
            blending: material.d < 1
          });
          if (material.map_Ka) {
            part.ambientImage = urlPath + material.map_Ka;
          }
          if (material.map_Kd) {
            part.diffuseImage = urlPath + material.map_Kd;
          }
          if (material.map_Ks) {
            part.specularImage = urlPath + material.map_Ks;
          }
          if (part.blending) {
            result.blending = true;
          }
        }
        break;
      }
      case 'f': {
        // https://github.com/frenchtoast747/webgl-obj-loader/blob/master/webgl-obj-loader.js
        for (i=1, n=line.length - 1; i<n; i++) {
          addIndex(line[0]);
          addIndex(line[i]);
          addIndex(line[i + 1]);
        }
        break;
      }
    }
  });
  // console.timeEnd('parse');
  return {
    position: result.vertices,
    normal: result.normals,
    uv: result.uvs,
    index: result.indices,
    parts: result.parts,
    blending: result.blending
  };
};

// Source: src/parser/GLTFParser.js
var GLTFParser = wg.GLTFParser = {},
  componentTypeMap = {
    5121: Uint8Array, // WebGLRenderingContext.UNSIGNED_BYTE
    5123: Uint16Array, // WebGLRenderingContext.UNSIGNED_SHORT
    5125: Uint32Array, // WebGLRenderingContext.UNSIGNED_INT
    5126: Float32Array, // WebGLRenderingContext.FLOAT
  },
  modeMap = {
    0: 'POINTS',
    1: 'LINES',
    2: 'LINE_LOOP',
    3: 'LINE_STRIP',
    4: 'TRIANGLES',
    5: 'TRIANGLE_STRIP',
    6: 'TRIANGLE_FAN',
  },
  typeMap = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
  },
  defaultTranslation = vec3.create(),
  defaultScale = vec3.fromValues(1, 1, 1),
  defaultRotation = quat.create();

GLTFParser.parse = function (urlPath, name, callback) {
  urlPath = urlPath + (urlPath.endsWith('/') ? '' : '/');
  ajax(urlPath + name + '.gltf', 'json', function (json) {
    console.log(json);
    var buffers = [],
      currentBufferCount = 0,
      bufferCount = json.buffers.length,
      accessors = [],
      geometries = [],
      nodes = [];

    json.buffers.forEach(function (buffer, index) {
      if (buffer.uri.indexOf('data:') === 0) {
        addBuffer(dataURIToBufferArray(buffer.uri), index);
      } else {
        ajax(urlPath + buffer.uri, 'arraybuffer', function (arraybuffer) {
          addBuffer(arraybuffer, index);
        });
      }
    });

    function addBuffer (arraybuffer, index) {
      buffers[index] = arraybuffer;
      currentBufferCount ++;
      if (currentBufferCount === bufferCount) {
        onBufferReady();
      }
    }

    function onBufferReady () {
      json.accessors.forEach(function (accessor) {
        var arrayType = componentTypeMap[accessor.componentType],
          bufferView = json.bufferViews[accessor.bufferView],
          // bufferView.byteStride, bufferView.target: 34962(ARRAY_BUFFER) 34963(ELEMENT_ARRAY_BUFFER)
          buffer = buffers[bufferView.buffer],
          offset = accessor.byteOffset + bufferView.byteOffset,
          count = accessor.count * typeMap[accessor.type];
        // accessor.max, accessor.min
        accessors.push(new arrayType(buffer, offset, count));
      });

      json.meshes.forEach(function (mesh) {
        mesh.primitives.forEach(function (primitive) {
          var geometry = {};
          geometries.push(geometry);
          if (primitive.mode) {
            geometry.mode = modeMap[primitive.mode];
          }
          Object.keys(primitive.attributes).forEach(function (attributeKey) {
            var accessor = accessors[primitive.attributes[attributeKey]];
            switch (attributeKey) {
              case 'POSITION':
                geometry.position = accessor;
                break;
              case 'NORMAL':
                geometry.normal = accessor;
                break;
              case 'TANGENT':
                geometry.tangent = accessor;
                break;
              case 'TEXCOORD_0':
                geometry.uv = accessor;
                break;
              case 'TEXCOORD_1':
                break;
              case 'COLOR_0':
                geometry.color = accessor;
                break;
              case 'JOINTS_0':
                break;
              case 'WEIGHTS_0':
                break;
            }
          });
          /*
          primitive.material
          primitive.targets*/
          if (primitive.indices != null) {
            geometry.index = accessors[primitive.indices];
          }
        });
      });

      json.scenes.forEach(function (scene) {
        scene.nodes.forEach(function (nodeIndex) {
          var node = json.nodes[nodeIndex],
            matrix;
          if (node.matrix) {
            matrix = mat4.create();
            mat4.copy(matrix, node.matrix);
          } else if (node.rotation || node.scale || node.translation) {
            matrix = mat4.create();
            mat4.fromRotationTranslationScale(
              matrix,
              node.rotation || defaultRotation,
              node.translation || defaultTranslation,
              node.scale || defaultScale
            );
          }
          if (node.camera != null) {
            ;
          } else if (node.mesh != null) {
            if (node.children) {
              node.children.forEach(function (child) {
                ;
              });
            }
            if (node.skin != null) {
              ;
            }
            if (node.weights) {
              ;
            }
            nodes.push({
              matrix: matrix,
              geometry: node.mesh
            });
          }
        });
      });

      callback({
        geometries: geometries,
        nodes: nodes
      })
    }
  });

  function dataURIToBufferArray (data) {
    var indexOfcomma = data.indexOf(','),
      i = 0,
      n, result;
    data = data.substr(indexOfcomma + 1);
    data = atob(data);
    n = data.length;
    result = new Uint8Array(n);
    for (; i<n; i++) {
      result[i] = data.charCodeAt(i);
    }
    return result.buffer;
  }
};

// Source: src/material/Material.js
var Material = wg.Material = function () {
  var self = this;
  self._dirty = true;
  self._key = '';
  self._keys = [];
  self.textureScale = vec2.fromValues(1, 1);
};

[
  {
    name: 'ambientColor',
    value: [1, 1, 1, 1]
  },
  {
    name: 'ambientImage',
    value: null,
    dirty: true
  },
  {
    name: 'diffuseColor',
    value: [0.5, 0.5, 0.5, 1]
  },
  {
    name: 'diffuseImage',
    value: null,
    dirty: true
  },
  {
    name: 'emissionColor',
    value: [0, 0, 0, 1]
  },
  {
    name: 'emissionImage',
    value: null,
    dirty: true
  },
  {
    name: 'specularColor',
    value: [1, 1, 1, 1]
  },
  {
    name: 'specularImage',
    value: null,
    dirty: true
  },
  {
    name: 'doubleSided',
    value: false
  },
  {
    name: 'shininess',
    value: 10.0
  },
  {
    name: 'transparency',
    value: 1.0
  },
  {
    name: 'transparent',
    value: false
  },
  {
    name: 'light',
    value: true,
    dirty: true
  },
  {
    name: 'clip',
    value: false,
    dirty: true
  },
  {
    name: 'wireframe',
    value: false,
    dirty: true
  },
  {
    name: 'wireframeOnly',
    value: true,
    dirty: true
  },
  {
    name: 'wireframeColor',
    value: [69.0/255.0, 132.0/255.0, 206.0/255.0]
  },
  {
    name: 'wireframeWidth',
    value: 2.0
  },
  {
    name: 'vertexColor',
    value: false,
    dirty: true
  },
  {
    name: 'envImage',
    value: null,
    dirty: true
  },
  {
    name: 'normalImage',
    value: null,
    dirty: true
  },
].forEach(function (property) {
  defineProperty(Material.prototype, property.name, property.value, property.dirty ? function () {
    this._dirty = true;
  } : null);
});

Material.prototype.getKey = function () {
  /*
  CLIPPLANE: u_clipPlane, u_modelMatrix

  WIREFRAME: a_barycentric, u_wireframeColor, u_wireframeWidth
  WIREFRAME_ONLY

  VERTEX_COLOR: a_color

  ENV_MAP: u_viewMatrix, u_modelViewInvMatrix, u_envSampler
  NORMAL_MAP: u_normalSampler

  LIGHT: u_modelViewMatrix, u_normalViewMatrix, u_lightPosition

  DIFFUSE_MAP: u_diffuseSampler
  DIFFUSE_CUBE_MAP: u_diffuseSampler

  a_tangent: LIGHT && NORMAL_MAP
  a_normal: (DIFFUSE_MAP && DIFFUSE_CUBE_MAP) || (LIGHT || ENV_MAP)
  a_uv, u_textureScale: (DIFFUSE_MAP && !DIFFUSE_CUBE_MAP) || (LIGHT && NORMAL_MAP)
  u_normalMatrix: DIFFUSE_MAP && DIFFUSE_CUBE_MAP
  u_normalViewMatrix: LIGHT || ENV_MAP
  u_diffuseColor: !DIFFUSE_MAP
   */
  var self = this,
    keys;
  if (self._dirty) {
    self._dirty = false;
    keys = self._keys = []
    if (self._clip) {
      keys.push('CLIPPLANE');
    }
    if (self._wireframe) {
      keys.push('WIREFRAME');
      if (self._wireframeOnly) {
        keys.push('WIREFRAME_ONLY');
      }
    }
    if (!self._wireframe || !self._wireframeOnly) {
      if (self._vertexColor) {
        keys.push('VERTEX_COLOR');
      } else {
        if (self._diffuseImage) {
          if (self._diffuseImage.type === 'CUBE_MAP') {
            keys.push('DIFFUSE_CUBE_MAP');
          } else {
            keys.push('DIFFUSE_MAP');
          }
        }
      }
      if (self._envImage) {
        keys.push('ENV_MAP');
      }
      if (self._light) {
        keys.push('LIGHT');
        if (self._normalImage) {
          keys.push('NORMAL_MAP');
        }
      }
    }
    self._key = keys.join(':');
  }
  return self._key;
};
}(this);
