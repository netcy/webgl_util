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