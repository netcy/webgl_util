var VERTEX_SHADER_SOURCE = `
#ifdef GL_ES
  precision highp float;
#endif

attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;

uniform mat4 u_projectMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform mat3 u_normalMatrix;

varying vec3 v_normal;
varying vec3 v_position;
varying vec2 v_uv;

void main () {
  gl_Position = u_projectMatrix * u_viewMatrix * u_modelMatrix * a_position;
  v_position = (u_modelMatrix * a_position).xyz;
  v_normal = normalize(u_normalMatrix * a_normal);
  v_uv = a_uv;
}`;

var FRAGMENT_SHADER_SOURCE = `
#ifdef GL_ES
  precision highp float;
#endif

uniform vec3 u_lightColor;
uniform vec3 u_lightPosition;
uniform vec3 u_ambientColor;
uniform sampler2D u_sampler;

varying vec3 v_normal;
varying vec3 v_position;
varying vec2 v_uv;

void main () {
  vec3 normal = normalize(v_normal);
  vec3 lightDirection = normalize(u_lightPosition - v_position);
  float nDotL = max(dot(lightDirection, normal), 0.0);
  vec4 color = texture2D(u_sampler, v_uv);
  vec3 diffuse = u_lightColor * color.rgb * nDotL;
  vec3 ambient = u_ambientColor * color.rgb;
  gl_FragColor = vec4(diffuse + ambient, color.a);
  // gl_FragColor = vec4(1, 0, 0, 1);
}`;

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
  self._ambientColor = [.3, .3, .3];
  self._clearColor = [0, 0, 0, 0];

  var gl = self._gl = canvas.getContext('webgl', options || {
    antialias: true
  });
  addVertexArrayObjectSupport(gl);
  gl.cache = {};
  self._program = new Program(gl, {
    vertex: VERTEX_SHADER_SOURCE,
    fragment: FRAGMENT_SHADER_SOURCE
  });

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
          index: 0,
          size: 2
        }
      }
    });
    gl.cache.vaos = {};
    gl.cache.vaos['cube'] = new VertexArrayObject(gl, {
      buffers: {
        position: {
          array: [
            -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5,-0.5,  // v6-v1-v0-v5 up
            -0.5, 0.5, 0.5,  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5,   0.5, 0.5, 0.5,  // v1-v2-v3-v0 front
             0.5, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5,-0.5,  // v0-v3-v4-v5 right
             0.5, 0.5,-0.5,   0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,  // v5-v4-v7-v6 back
            -0.5, 0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5,  -0.5, 0.5, 0.5,  // v6-v7-v2-v1 left
            -0.5,-0.5, 0.5,  -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5   // v2-v7-v4-v3 down
          ],
          index: 0,
          size: 3
        },
        normal: {
          array: [
             0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v1-v0-v5-v6 up
             0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v2-v3－v0-v1 front
             1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v3-v4-v5-v0 right
             0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,  // v4-v7-v6-v5 back
            -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v7-v2-v1-v6 left
             0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0   // v7-v4-v3-v2 down
          ],
          index: 1,
          size: 3
        },
        uv: {
          array: [
            0.0, 1.0,   0.0, 0.0,   1.0, 0.0,   1.0, 1.0,    // v6-v1-v0-v5 up
            0.0, 1.0,   0.0, 0.0,   1.0, 0.0,   1.0, 1.0,    // v1-v2-v3-v0 front
            0.0, 1.0,   0.0, 0.0,   1.0, 0.0,   1.0, 1.0,    // v0-v3-v4-v5 right
            0.0, 1.0,   0.0, 0.0,   1.0, 0.0,   1.0, 1.0,    // v5-v4-v7-v6 back
            0.0, 1.0,   0.0, 0.0,   1.0, 0.0,   1.0, 1.0,    // v6-v7-v2-v1 left
            0.0, 1.0,   0.0, 0.0,   1.0, 0.0,   1.0, 1.0     // v2-v7-v4-v3 down
          ],
          index: 2,
          size: 2
        },
        index: {
          array: [
             0, 1, 2,   2, 3, 0,    // up
             4, 5, 6,   6, 7, 4,    // front
             8, 9,10,  10,11, 8,    // right
            12,13,14,  14,15,12,    // back
            16,17,18,  18,19,16,    // left
            20,21,22,  22,23,20     // down
          ]
        }
      },
    });
    gl.enable(gl.CULL_FACE);
    // gl.frontFace(gl.CCW);
    gl.enable(gl.DEPTH_TEST);
    // gl.depthFunc(gl.LEQUAL);
    self._imageTexture = new wg.Texture(gl, {
      url: 'images/crate.gif',
      callback: function () {
        self.redraw();
      }
    });

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
    u_lightColor: self._lightColor,
    u_lightPosition: self._lightPosition,
    u_ambientColor: self._ambientColor
  });
  self._objects.forEach(function (object) {
    var vao = self._gl.cache.vaos[object.type];
    if (vao) {
      program.setUniforms({
        u_modelMatrix: object.modelMatrix,
        u_normalMatrix: object.normalMatrix,
        u_sampler: 0
      });
      self._imageTexture.bind(0);
      vao.draw();
    }
  });
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
