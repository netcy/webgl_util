var VERTEX_SHADER_SCENE = `
#ifdef GL_ES
  precision highp float;
#endif

attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;
attribute vec4 a_color;
attribute vec3 a_tangent;
attribute vec3 a_barycentric;

uniform mat4 u_modelViewProjectMatrix;
uniform mat4 u_modelViewMatrix;
uniform mat3 u_normalMatrix;
uniform vec2 u_textureScale;
uniform bool u_normalMap;

uniform vec3 u_lightPosition;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_color;
varying vec3 v_barycentric;
varying vec4 v_modelPosition;
varying vec3 v_lightDirection;
varying vec3 v_eyeDirection;

void main () {
  vec4 position = vec4(a_position, 1.0);
  gl_Position = u_modelViewProjectMatrix * position;
  v_normal = u_normalMatrix * a_normal;
  v_uv = a_uv * u_textureScale;
  v_color = a_color;
  v_barycentric = a_barycentric;
  v_modelPosition = position;

  vec3 viewPosition = (u_modelViewMatrix * position).xyz;
  v_lightDirection = u_lightPosition - viewPosition;
  v_eyeDirection = -viewPosition;

  if (u_normalMap) {
    vec3 tangent = u_normalMatrix * a_tangent;
    vec3 bitangent = cross(v_normal, tangent);
    mat3 tbnMatrix = mat3(
      tangent.x, bitangent.x, v_normal.x,
      tangent.y, bitangent.y, v_normal.y,
      tangent.z, bitangent.z, v_normal.z
    );
    v_lightDirection = tbnMatrix * v_lightDirection;
    v_eyeDirection = tbnMatrix * v_eyeDirection;
  }
}
`;

var FRAGMENT_SHADER_SCENE = `#extension GL_OES_standard_derivatives : enable
#ifdef GL_ES
  precision highp float;
#endif


uniform vec3 u_lightColor;
uniform vec3 u_ambientColor;
uniform bool u_texture;
uniform bool u_normalMap;
uniform bool u_wireframe;
uniform bool u_wireframeOnly;
uniform vec3 u_wireframeColor;
uniform float u_wireframeWidth;
uniform sampler2D u_samplerImage;
uniform sampler2D u_samplerNormal;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec4 v_color;
varying vec3 v_barycentric;
varying vec4 v_modelPosition;
varying vec3 v_lightDirection;
varying vec3 v_eyeDirection;

float edgeFactor () {
  vec3 d = fwidth(v_barycentric);
  vec3 a3 = smoothstep(vec3(0.0), d * u_wireframeWidth, v_barycentric);
  return min(min(a3.x, a3.y), a3.z);
}

/*float edgeFactor (vec2 parameter) {
  vec2 d = fwidth(parameter);
  vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
  vec2 a2 = smoothstep(vec2(0.0), d * u_wireframeWidth, looped);
  return min(a2.x, a2.y);
}

float edgeFactor (vec3 parameter) {
  vec3 d = fwidth(parameter);
  vec3 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
  vec3 a3 = smoothstep(vec3(0.0), d * u_wireframeWidth, looped);
  return min(min(a3.x, a3.y), a3.z);
}*/

void main () {
  if (u_wireframe && u_wireframeOnly) {
    // gl_FragColor = vec4(u_wireframeColor, (1.0 - edgeFactor(v_modelPosition.xyz * 500.0)));
    gl_FragColor = vec4(u_wireframeColor, (1.0 - edgeFactor()));
  } else {
    vec3 normal = normalize(u_normalMap ? (texture2D(u_samplerNormal, v_uv) * 2.0 - 1.0).rgb : v_normal);
    vec3 lightDirection = normalize(v_lightDirection);
    vec3 eyeDirection = normalize(v_eyeDirection);
    float diffuse = max(dot(lightDirection, normal), 0.0);

    vec3 reflectDirection = reflect(-lightDirection, normal);
    float specular = pow(max(dot(reflectDirection, eyeDirection), 0.0), 10.0);

    vec4 color = u_texture ? texture2D(u_samplerImage, v_uv) : v_color;
    vec3 ambientColor = u_ambientColor * color.rgb;
    vec3 diffuseColor = u_lightColor * color.rgb * diffuse;
    vec3 specularColor = vec3(0.3, 0.3, 0.3) * u_lightColor * specular;
    gl_FragColor = clamp(vec4(ambientColor + diffuseColor + specularColor, color.a), 0.0, 1.0);
    if (u_wireframe) {
      // gl_FragColor = mix(vec4(u_wireframeColor, 1.0), gl_FragColor, edgeFactor(v_modelPosition.xyz * 500.0));
      gl_FragColor = mix(vec4(u_wireframeColor, 1.0), gl_FragColor, edgeFactor());
    }
  }
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
  self._ambientColor = [.3, .3, .3];
  self._clearColor = [0, 0, 0, 0];
  self._wireframeColor = [69.0/255.0, 132.0/255.0, 206.0/255.0];
  self._wireframeWidth = 1.0;
  self._wireframeOnly = true;
  self._enableSSAO = false;
  self._clear = true;
  self._viewport = {x: 0, y: 0, width: 0, height: 0};

  var gl = self._gl = canvas.getContext('webgl', options || {
    preserveDrawingBuffer: true,
    antialias: false,
    stencil: true
  });
  addVertexArrayObjectSupport(gl);
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
      height: 1,
      data: new Uint8Array([255, 255, 255, 255])
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
      leftGamePad, rightGamePad, pressedGamePad;
    (function render (time) {
      var vrDisplay = self._vrDisplay,
        frameData = self._frameData,
        camera = self._camera,
        canvas = self._canvas,
        clearColor = self._clearColor;
      self._aniamtionId = (vrDisplay || window).requestAnimationFrame(render);
      gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
      if (vrDisplay && vrDisplay.isPresenting) {
        vrDisplay.getFrameData(frameData);
        getVRGamepads();
        if (pressedGamePad) {
          vec3.transformQuat(stepTrans, step, pressedGamePad.pose.orientation);
          vec3.add(cameraPosition, cameraPosition, stepTrans);
        }
        self.onGamepadRender(leftGamePad, rightGamePad, pressedGamePad);

        mat4.fromTranslation(tranMat, cameraPosition);
        mat4.invert(tranMat, tranMat);

        camera._viewMatrix = frameData.leftViewMatrix;
        mat4.multiply(camera._viewMatrix, camera._viewMatrix, tranMat);
        camera._projectMatix = frameData.leftProjectionMatrix;
        self._setViewport(0, 0, canvas.width * 0.5, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        self._clear = true;
        self.draw();

        camera._viewMatrix = frameData.rightViewMatrix;
        mat4.multiply(camera._viewMatrix, camera._viewMatrix, tranMat);
        camera._projectMatix = frameData.rightProjectionMatrix;
        self._setViewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
        self._dirty = true;
        self._clear = false;
        self.draw();
        vrDisplay.submitFrame();
      } else {
        if (self.onAnimationFrame() !== false) {
          if (time !== 0 && self._dirty) {
            self._setViewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
            self._clear = true;
            self.draw();
          }
        }
      }
    })(0);

    function getVRGamepads() {
      leftGamePad = null;
      rightGamePad = null;
      pressedGamePad = null;
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
              pressedGamePad = gamepad;
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

Scene.prototype.onGamepadRender = function () {
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
    sceneProgram = self._sceneProgram,
    outputProgram = self._outputProgram,
    camera = self._camera,
    gl = self._gl,
    lightPosition = vec3.create();
  self._dirty = false;
  // self._framebuffer.bind();
  sceneProgram.use();
  vec3.transformMat4(lightPosition, self._lightPosition, camera.getViewMatrix());
  sceneProgram.setUniforms({
    u_lightPosition: lightPosition,
    u_lightColor: self._lightColor,
    u_ambientColor: self._ambientColor,
    u_wireframeColor: self._wireframeColor,
    u_wireframeWidth: self._wireframeWidth,
    u_wireframeOnly: self._wireframeOnly,
    u_samplerImage: 0,
    u_samplerNormal: 1,
  });

  gl.disable(gl.BLEND);
  gl.depthMask(true);
  self._objects.forEach(function (object) {
    if (object.visible === false) {
      return;
    }
    if (!object.transparent) {
      drawObject(object);
    }
  });

  gl.enable(gl.BLEND);
  gl.depthMask(false);
  self._objects.forEach(function (object) {
    if (object.visible === false) {
      return;
    }
    if (object.transparent) {
      drawObject(object);
    }
  });

  gl.disable(gl.BLEND);
  gl.depthMask(true);

  self._outlineEffect.pass();

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

  self._glowEffect.pass();

  function drawObject (object) {
    var vao = self._getVertexArrayObject(object.type);
    if (vao) {
      object._refreshViewMatrix(camera.getViewMatrix(), camera.getProjectMatrix());
      sceneProgram.setUniforms({
        u_normalMatrix: object._normalMatrix,
        u_texture: !!object.image,
        u_wireframe: !!object.wireframe,
        u_textureScale: object.textureScale,
        u_normalMap: !!object.imageNormal,
        u_modelViewMatrix: object._modelViewMatrix,
        u_modelViewProjectMatrix: object._modelViewProjectMatrix,
      });
      if (object.image) {
        gl.cache.textures.get(object.image).bind(0);
        if (object.imageNormal) {
          gl.cache.textures.get(object.imageNormal).bind(1);
        } else {
          gl.cache.emptyTexture.bind(1);
        }
      } else {
        gl.cache.emptyTexture.bind(0);
        gl.cache.emptyTexture.bind(1);
        if (!vao._color) {
          gl.vertexAttrib4fv(attributesMap.color.index, object.color);
        }
      }
      vao.draw(true);
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

Scene.prototype._getVertexArrayObject = function (type) {
  var self = this,
    gl = self._gl,
    geometry = wg.geometries[type],
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

Scene.prototype.getWireframeColor = function () {
  return this._wireframeColor;
};

Scene.prototype.setWireframeColor = function (wireframeColor) {
  this._wireframeColor = wireframeColor;
  this.redraw();
};

Scene.prototype.getWireframeWidth = function () {
  return this._wireframeWidth;
};

Scene.prototype.setWireframeWidth = function (wireframeWidth) {
  this._wireframeWidth = wireframeWidth;
  this.redraw();
};

Scene.prototype.getWireframeOnly = function () {
  return this._wireframeOnly;
};

Scene.prototype.setWireframeOnly = function (wireframeOnly) {
  this._wireframeOnly = wireframeOnly;
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
