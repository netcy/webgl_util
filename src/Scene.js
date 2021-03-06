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
    u_emissiveSampler: 4,
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
  self._animations = [];
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
    // self._outlineEffect = new OutlineEffect(self);
    // self._glowEffect = new GlowEffect(self);
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
        self.draw(time);

        mat4.copy(camera._viewMatrix, frameData.rightViewMatrix);
        mat4.multiply(camera._viewMatrix, camera._viewMatrix, tranMat);
        mat4.copy(camera._projectMatix, frameData.rightProjectionMatrix);
        self._setViewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        self._dirty = true;
        self.draw(time);
        vrDisplay.submitFrame();
      } else {
        if (self.onAnimationFrame(time) !== false) {
          if (time !== 0 && self._dirty) {
            gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
            self._setViewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
            self.draw(time);
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

Scene.prototype.onAnimationFrame = function (time) {
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

Scene.prototype.loadGLTF = function (urlPath, name, callback) {
  var self = this,
    gl = self._gl;
  GLTFParser.parse(urlPath, name, function (data) {
    window._data = data;
    console.log(data);
    var meshes = [],
      nodes = [];
    data.meshes.forEach(function (mesh) {
      var primitives = [],
        meshObject = {
          primitives: primitives
        };
      meshes.push(meshObject);
      mesh.primitives.forEach(function (primitive) {
        // TODO should not generate auto, if no normal, then no lights
        var buffers = primitive.buffers;
        if (!buffers.normal) {
          buffers.normal = calculateNormals(buffers.position, buffers.index);
        }
        if (buffers.position0 && !buffers.normal0) {
          buffers.normal0 = calculateNormals(buffers.position0, buffers.index);
        }
        // TODO tangent0, barycentric0
        var primitiveObject = {
          vao: new VertexArray(gl, primitive)
        };
        var material = primitiveObject.material = new Material();
        if (primitive.material != null) {
          var materialObject = data.materials[primitive.material];
          if (materialObject.pbrMetallicRoughness) {
            if (materialObject.pbrMetallicRoughness.baseColorTexture) {
              var texture = data.textures[materialObject.pbrMetallicRoughness.baseColorTexture.index];
              material.diffuseImage = texture;
            }
          }
        } else {
          // material.light = false;
          material.diffuseColor = [0.5, 0.5, 0.5, 1];
        }
        if (mesh.weights) {
          material.weights = mesh.weights;
        }
        primitives.push(primitiveObject);
      });
    });
    data.nodes.forEach(function (nodeObject) {
      var object = new wg.Object();
      var info = object._info = {};
      nodeObject.rotation && (info.rotation = nodeObject.rotation);
      nodeObject.translation && (info.translation = nodeObject.translation);
      nodeObject.scale && (info.scale = nodeObject.scale);
      nodeObject.weights && (info.weights = nodeObject.weights);
      if (nodeObject.matrix) {
        object._modelMatrix = nodeObject.matrix;
      }
      if (nodeObject.mesh != null) {
        object.mesh = meshes[nodeObject.mesh];
      }
      if (nodeObject.skin) {
        object.skin = nodeObject.skin;
        object.mesh.primitives.forEach(function (primitive) {
          primitive.material.jointsCount = object.skin.joints.length;
        });
      }
      nodes.push(object);
    });
    data.scenes.forEach(function (sceneObject) {
      sceneObject.nodes.forEach(function (nodeIndex) {
        addObject(nodeIndex);
      });
    });
    nodes.forEach(function (node) {
      if (node.skin) {
        var skin = node.skin;
        skin.node = node;
        // skin._inverseNodeMatrix = mat4.create();
        var inverseBindMatrices = skin.inverseBindMatrices;
        var joints = skin.joints = skin.joints.map(function (joint) {
          return nodes[joint];
        });
        var jointMatrixs = skin.jointMatrixs = new Array(joints.length);
        var jointMatrix = skin.jointMatrix = new Float32Array(16 * joints.length);
        for (var i = 0; i < joints.length; i++) {
          jointMatrixs[i] = new Float32Array(jointMatrix.buffer, i * 16 * 4, 16);
        }
        skin.update = function () {
          var self = this;
          // var inverseNodeMatrix = self._inverseNodeMatrix;
          // mat4.invert(inverseNodeMatrix, self.node.worldMatrix);
          self.joints.forEach(function (joint, i) {
            mat4.multiply(self.jointMatrixs[i], joint.worldMatrix, self.inverseBindMatrices[i]);
            /* TODO jointMatrix(j) =
              globalTransformOfNodeThatTheMeshIsAttachedTo^-1 *
              globalTransformOfJointNode(j) * inverseBindMatrixForJoint(j);*/
            // mat4.multiply(self.jointMatrixs[i], inverseNodeMatrix, self.jointMatrixs[i]);
          });
        };
        skin.update();
      }
    });

    // TODO which animation should be actived
    data.animations.forEach(function (animation) {
      animation.channels.forEach(function (channel) {
        channel.node = nodes[channel.node];
      });
      self.addAnimation(animation);
    });

    callback && callback(nodes);

    function addObject (nodeIndex, parent) {
      var object = nodes[nodeIndex],
        nodeObject = data.nodes[nodeIndex];
      self.add(object);
      if (parent) {
        object.parent = parent;
      }
      if (nodeObject.children) {
        nodeObject.children.forEach(function (childIndex) {
          addObject(childIndex, object);
        });
      }
    }
  });
};

Scene.prototype.clear = function () {
  this._objects = [];
  this._animations = [];
};

Scene.prototype.addAnimation = function (animation) {
  this._animations.push(animation);
};

Scene.prototype._handleAnimation = function (time) {
  var self = this;
  self._animations.forEach(function (animation) {
    animation.channels.forEach(function (channel) {
      var input = channel.sampler.input;
      var output = channel.sampler.splitOutput || channel.sampler.output;
      var currentTime = time / 1000 % input[input.length - 1];
      var previousTime, nextTime, previousValue, nextValue;
      input.some(function (time, index) {
        if (index !== 0 && time > currentTime) {
          previousTime = input[index - 1];
          nextTime = time;
          previousValue = output[index - 1];
          nextValue = output[index];
          return true;
        } else {
          return false;
        }
      });
      var t = (currentTime - previousTime) / (nextTime - previousTime);

      var node = channel.node;
      var info = node._info;
      if (channel.path === 'rotation') {
        quat.slerp(info.rotation, previousValue, nextValue, t);
      } else if (channel.path === 'translation') {
        vec3.lerp(info.translation, previousValue, nextValue, t);
      } else if (channel.path === 'scale') {
        vec3.lerp(info.scale, previousValue, nextValue, t);
      } else if (channel.path === 'weights') {
        var t0 = 1 - t;
        var weights = info.weights;
        for (var i = 0; i < previousValue.length; i++) {
          weights[i] = t0 * previousValue[i] + t * nextValue[i];
        }
      }
      if (channel.path !== 'weights') {
        // TODO performance if one node have two animations
        mat4.fromRotationTranslationScale(
          node._modelMatrix,
          info.rotation || defaultRotation,
          info.translation || defaultTranslation,
          info.scale || defaultScale
        );
        node.modelMatrix = node._modelMatrix;
      }
    });
  });
  // TODO hack
  self._objects.forEach(function (object) {
    if (object.skin) {
      object.skin.update();
    }
  });

  self._animations.length && self.redraw();
}

Scene.prototype.draw = function (time) {
  var self = this,
    // outputProgram = self._outputProgram,
    camera = self._camera,
    gl = self._gl,
    lightPosition = self._lightViewPosition,
    viewMatrix = camera.getViewMatrix(),
    uniforms = self._uniforms;
  self._dirty = false;
  self._handleAnimation(time);
  // self._framebuffer.bind();
  vec3.transformMat4(lightPosition, self._lightPosition, viewMatrix);

  gl.disable(gl.BLEND);
  gl.depthMask(true);
  gl._transparent = false;
  self._objects.forEach(function (object) {
    if (object.visible === false) {
      return;
    }
    drawObject(object);
  });

  gl.enable(gl.BLEND);
  gl.depthMask(false);
  gl._transparent = true;
  self._objects.forEach(function (object) {
    if (object.visible === false) {
      return;
    }
    drawObject(object);
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
    if (object.mesh) {
      object._refreshViewMatrix(viewMatrix, camera.getProjectMatrix());
      object.mesh.primitives.forEach(function (part) {
        if (part.material.transparent === gl._transparent) {
          setProgram(part.material);
          part.vao.draw();
        }
      });
    } else {
      var vao = self.getVertexArray(object);
      if (vao) {
        object._refreshViewMatrix(viewMatrix, camera.getProjectMatrix());
        if (vao._parts) {
          vao.draw(preDrawCallback);
        } else {
          if (object.material.transparent === gl._transparent) {
            setProgram(object.material);
            vao.draw();
          }
        }
      }
    }

    function setProgram (material) {
      var key = material.getKey(),
        program = self._programs[key];
      if (!program) {
        program = self._programs[key] = createProgram(gl, material._keys);
      }

      uniforms.u_viewMatrix = viewMatrix;
      uniforms.u_lightPosition = lightPosition;
      uniforms.u_lightColor = self._lightColor;
      uniforms.u_lightAmbientColor = self._ambientColor;

      uniforms.u_modelMatrix = object.worldMatrix;
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
      uniforms.u_emissiveColor = material.emissiveColor;
      uniforms.u_specularColor = material.specularColor;
      uniforms.u_shininess = material.shininess;
      uniforms.u_transparency = material.transparency;

      uniforms.u_weights = object._info.weights || material.weights;

      if (object.skin) {
        uniforms.u_jointMatrix = object.skin.jointMatrix;
      } else {
        uniforms.u_jointMatrix = null;
      }

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
      if (material.emissiveImage) {
        gl.cache.textures.get(material.emissiveImage).bind(4);
      }
      if (material.specularImage) {
        gl.cache.textures.get(material.specularImage).bind(5);
      }
    }

    function preDrawCallback (part) {
      setProgram(part.material);
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
  if (object.vao) {
    return object.vao;
  }
  if (!object.type) {
    return null;
  }

  var self = this,
    gl = self._gl,
    type = object.type,
    geometry = geometries[type],
    vao = gl.cache.vaos[type];
  if (geometry) {
    if (!vao) {
      vao = gl.cache.vaos[type] = new VertexArray(gl, geometry);
    }
    object.vao = vao;
    if (vao._color) {
      object.material.vertexColor = vao._color;
    }
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
