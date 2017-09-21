var VERTEX_SHADER_SCENE = `
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
uniform vec2 u_textureScale;

// uniform vec3 u_lightPosition;
// uniform vec3 u_eyePosition;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_color;
// varying vec3 v_lightDirection;
// varying vec3 v_eyeDirection;
varying vec3 v_worldPosition;

void main () {
  gl_Position = u_projectMatrix * u_viewMatrix * u_modelMatrix * a_position;
  v_normal = u_normalMatrix * a_normal;
  v_uv = a_uv * u_textureScale;
  v_color = a_color;

  // vec3 worldPosition = (u_modelMatrix * a_position).xyz;
  // v_lightDirection = u_lightPosition - worldPosition;
  // v_eyeDirection = u_eyePosition - worldPosition;
  v_worldPosition = (u_modelMatrix * a_position).xyz;
}
`;

var FRAGMENT_SHADER_SCENE = `
#ifdef GL_ES
  precision highp float;
#endif

uniform vec3 u_lightColor;
uniform vec3 u_ambientColor;
uniform bool u_texture;
uniform sampler2D u_sampler;

uniform vec3 u_lightPosition;
uniform vec3 u_eyePosition;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_color;
// varying vec3 v_lightDirection;
// varying vec3 v_eyeDirection;
varying vec3 v_worldPosition;

void main () {
  // v_lightDirection = u_lightPosition - worldPosition;
  // v_eyeDirection = u_eyePosition - worldPosition;
  vec3 normal = normalize(v_normal);
  // vec3 lightDirection = normalize(v_lightDirection);
  // vec3 eyeDirection = normalize(v_eyeDirection);
  vec3 lightDirection = normalize(u_lightPosition - v_worldPosition);
  vec3 eyeDirection = normalize(u_eyePosition - v_worldPosition);
  float diffuse = max(dot(lightDirection, normal), 0.0);

  // vec3 halfDirection = normalize(lightDirection + eyeDirection);
  // float specular = pow(max(dot(halfDirection, normal), 0.0), 24.0);

  vec3 reflectDirection = reflect(-lightDirection, normal);
  float specular = pow(max(dot(reflectDirection, eyeDirection), 0.0), 16.0);

  vec4 color = u_texture ? texture2D(u_sampler, v_uv) : v_color;
  vec3 ambientColor = u_ambientColor * color.rgb;
  vec3 diffuseColor = u_lightColor * color.rgb * diffuse;
  vec3 specularColor = u_lightColor * specular;
  gl_FragColor = clamp(vec4(ambientColor + diffuseColor + specularColor, color.a), 0.0, 1.0);
}
`;

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

  setCanvasSize(canvas);
  self._canvas = canvas;
  self._dirty = true;
  self._objects = [];
  self._camera = new Camera(self);
  self._lightColor = [1, 1, 1];
  self._lightPosition = [10, 10, 10];
  self._ambientColor = [.5, .5, .5];
  self._clearColor = [0, 0, 0, 0];
  self._enableSSAO = false;

  var gl = self._gl = canvas.getContext('webgl', options || {
    preserveDrawingBuffer: true,
    antialias: false,
    stencil: true
  });
  addVertexArrayObjectSupport(gl);
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
    gl.cache = { textures: {} };
    gl.cache.quadVao = new VertexArrayObject(self, {
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
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    // gl.disable(gl.CULL_FACE);

    gl.cache.emptyTexture = new Texture(gl, {
      width: 1,
      height: 1
    });
    self._sceneProgram = new Program(gl, {
      vertex: VERTEX_SHADER_SCENE,
      fragment: FRAGMENT_SHADER_SCENE
    });
    self._outputProgram = new Program(gl, {
      vertex: VERTEX_SHADER_OUTPUT,
      fragment: FRAGMENT_SHADER_OUTPUT
    });
    self._outputProgram.use();
    self._outputProgram.setUniforms({
      u_sampler: 0
    });
    self._framebuffer = new Framebuffer(gl, {
      width: gl.canvas.width,
      height: gl.canvas.height,
      depth: true,
      stencil: true
    });
    self._outlineEffect = new OutlineEffect(self);
    self._glowEffect = new GlowEffect(self);
    self._ssaoEffect = new SSAOEffect(self);
    // self._fxaaEffect = new FxaaEffect(self);
    // self._fxaaEffect.setEnabled(true);

    var step = vec3.fromValues(0, 0, -0.01),
      stepTrans = vec3.create(),
      tranMat = mat4.create(),
      viewMatrix = mat4.create(),
      cameraPosition = self._camera._position,
      leftGamePadPosition = vec3.create(),
      rightGamePadPosition = vec3.create(),
      leftGamePad, rightGamePad, orientation;
    (function render (time) {
      var vrDisplay = self._vrDisplay,
        frameData = self._frameData,
        camera = self._camera,
        canvas = self._canvas;
      self._aniamtionId = (vrDisplay || window).requestAnimationFrame(render);
      if (vrDisplay && vrDisplay.isPresenting) {
        vrDisplay.getFrameData(frameData);
        getVRGamepads();

        if (orientation) {
          vec3.transformQuat(stepTrans, step, orientation);
          vec3.add(cameraPosition, cameraPosition, stepTrans);
        }
        mat4.fromTranslation(tranMat, cameraPosition);
        mat4.invert(tranMat, tranMat);

        // set gamepad position and rotation
        if (leftGamePad) {
          vec3.add(leftGamePadPosition, leftGamePad.pose.position, cameraPosition);
          leftController.fromRotationTranslation(leftGamePad.pose.orientation, leftGamePadPosition)
        }
        if (rightGamePad) {
          vec3.add(rightGamePadPosition, rightGamePad.pose.position, cameraPosition);
          rightController.fromRotationTranslation(rightGamePad.pose.orientation, rightGamePadPosition)
        }

        camera._viewMatrix = frameData.leftViewMatrix;
        mat4.multiply(camera._viewMatrix, camera._viewMatrix, tranMat);
        camera._projectMatix = frameData.leftProjectionMatrix;
        self._gl.viewport(0, 0, canvas.width * 0.5, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        self._dirty = true;
        self.draw();

        camera._viewMatrix = frameData.rightViewMatrix;
        mat4.multiply(camera._viewMatrix, camera._viewMatrix, tranMat);
        camera._projectMatix = frameData.rightProjectionMatrix;
        self._gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
        self._dirty = true;
        self.draw(false);
        vrDisplay.submitFrame();
      } else {
        if (self.onAnimationFrame() !== false) {
          if (time !== 0 && self._dirty) {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
            self.draw();
          }
        }
      }
    })(0);

    function getVRGamepads() {
      orientation = null;
      leftGamePad = null;
      rightGamePad = null;
      var gamepads = navigator.getGamepads();
      for (var i=0; i<gamepads.length; i++) {
        var gamepad = gamepads[i];
        if (gamepad && gamepad.pose) {
          if (gamepad.hand === 'right') {
            rightGamePad = gamepad;
          } else {
            leftGamePad = gamepad;
          }
          gamepad.buttons.some(function (button) {
            if (button.pressed) {
              orientation = gamepad.pose.orientation;
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

Scene.prototype.onAnimationFrame = function () {
};

Scene.prototype.redraw = function () {
  this._dirty = true;
};

Scene.prototype.draw = function (clear) {
  var self = this,
    sceneProgram = self._sceneProgram,
    outputProgram = self._outputProgram,
    camera = self._camera,
    gl = self._gl,
    clearColor = self._clearColor;
  self._dirty = false;
  gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
  // self._framebuffer.bind(clear);
  sceneProgram.use();
  sceneProgram.setUniforms({
    u_projectMatrix: camera.getProjectMatrix(),
    u_viewMatrix: camera.getViewMatrix(),
    u_lightPosition: self._lightPosition,
    u_eyePosition: camera._position,
    u_lightColor: self._lightColor,
    u_ambientColor: self._ambientColor
  });
  self._objects.forEach(function (object) {
    var vao = self._getVertexArrayObject(object.type);
    if (vao) {
      sceneProgram.setUniforms({
        u_modelMatrix: object.getModelMatrix(),
        u_normalMatrix: object.getNormalMatrix(),
        u_sampler: 0,
        u_texture: !!object.image,
        u_textureScale: object.textureScale
      });
      if (object.image) {
        var image = object.image;
        if (!image.url) {
          image = object.image = {
            url: image
          };
        }
        // TODO cache
        /*var imageTexture = gl.cache.textures[image.url];
        if (!imageTexture) {
          imageTexture = gl.cache.textures[image.url] = new Texture(gl, {
            url: image.url,
            callback: function () {
              self.redraw();
            }
          });
        }*/
        var imageTexture = image.texture;
        if (!imageTexture) {
          image.callback = function () {
            self.redraw();
          };
          imageTexture = image.texture = new Texture(gl, image);
        }
        imageTexture.bind(0);
      } else {
        gl.cache.emptyTexture.bind(0);
        if (!vao._color) {
          gl.vertexAttrib4fv(attributesMap.color.index, object.color);
        }
      }
      vao.draw();
    }
  });

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
};

Scene.prototype.add = function (object) {
  var self = this;
  self._objects.push(object);
  self._dirty = true;
};

Scene.prototype._getVertexArrayObject = function (type) {
  var self = this,
    gl = self._gl,
    geometry = geometries[type],
    vao = gl.cache.vaos[type];
  if (geometry && !vao) {
    vao = gl.cache.vaos[type] = new VertexArrayObject(self, {
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
                width: canvas.width / window.devicePixelRatio,
                height: canvas.height / window.devicePixelRatio
              };
              canvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
              canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);
            } else {
              self._isPresenting = false;
              canvas.width = self._oldSize.width;
              canvas.height = self._oldSize.height;
            }
            self._framebuffer.setSize(canvas.width, canvas.height);
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
