'use strict';

var VERTEX_SHADER_SOURCE = `
#ifdef GL_ES
  precision highp float;
#endif

attribute vec2 a_position;

varying vec2 v_uv;

const vec2 SCALE = vec2(0.5, 0.5);

void main () {
  v_uv = (a_position * SCALE) + SCALE;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

var FRAGMENT_SHADER_SOURCE = `
#ifdef GL_ES
  precision highp float;
#endif

uniform sampler2D u_sampler;

varying vec2 v_uv;

void main () {
  gl_FragColor = texture2D(u_sampler, v_uv);
}
`;
var dirty = true,
  zoomBlurStrength = 0.5,
  zoomBlurDirection = 1,
  imageTexture, quadVao,
  normalProgram,
  normalFramebuffer,
  fxaaEffect,
  tiltShiftEffect,
  zoomBlurEffect;

function init() {
  wg.Util.initWebGL(document.getElementById('canvas'), {
    antialias: false
  }, initWebGL);
}

function initWebGL(gl) {
  window.gl = gl;
  gl.enable(gl.CULL_FACE);
  // gl.frontFace(gl.CCW);
  gl.enable(gl.DEPTH_TEST);
  // gl.depthFunc(gl.LEQUAL);

  quadVao = gl.cache.quadVao;

  fxaaEffect = new wg.FxaaEffect(gl);
  tiltShiftEffect = new wg.TiltShiftEffect(gl);
  zoomBlurEffect = new wg.ZoomBlurEffect(gl);

  normalProgram = new wg.Program(gl, {
    vertex: VERTEX_SHADER_SOURCE,
    fragment: FRAGMENT_SHADER_SOURCE
  });
  imageTexture = new wg.Texture(gl, {
    url: 'images/scene.jpeg',
    callback: function () {
      dirty = true;
    }
  });
  normalFramebuffer = new wg.Framebuffer(gl, {
    width: gl.canvas.width,
    height: gl.canvas.height,
    depth: true,
    stencil: false
  });

  (function render() {
    gl.aniamtionId = requestAnimationFrame(render);
    if (dirty) {
      draw(gl);
    }
  })();
}

var renderType = 'Normal';
var tiltShiftType = 0;
var fxaaEnabled = true;

function draw(gl) {
  if (!dirty) {
    return;
  }

  dirty = false;
  // zoomBlurStrength += 0.01 * zoomBlurDirection;
  // if (zoomBlurStrength <= 0 || zoomBlurStrength >= 1) {
  //   zoomBlurDirection *= -1;
  // }

  normalFramebuffer.bind();
  normalProgram.use();
  normalProgram.setUniforms({
    'u_sampler': 0
  });
  imageTexture.bind(0);
  quadVao.draw();

  if (renderType === 'Normal') {
    fxaaEffect.setEnabled(fxaaEnabled);

    fxaaEffect.pass(normalFramebuffer, null);
  } else if (renderType === 'TiltShift') {
    tiltShiftEffect.setTiltShiftType(tiltShiftType);
    tiltShiftEffect.setBlurRadius(parseFloat(txtBlurRadius.value));
    tiltShiftEffect.setGradientRadius(parseFloat(txtGradientRadius.value));
    tiltShiftEffect.setFromPoint([
      parseFloat(txtFromX.value),
      parseFloat(txtFromY.value)
    ]);
    tiltShiftEffect.setToPoint([
      parseFloat(txtToX.value),
      parseFloat(txtToY.value)
    ]);
    tiltShiftEffect.setCenter([
      parseFloat(txtCenterX.value),
      parseFloat(txtCenterY.value)
    ]);

    tiltShiftEffect.pass(normalFramebuffer, null);
  } else if (renderType === 'ZoomBlur') {
    zoomBlurEffect.setStrength(parseFloat(txtStrength.value));
    // zoomBlurEffect.setStrength(zoomBlurStrength);
    zoomBlurEffect.setCenter([
      parseFloat(txtZoomBlurCenterX.value),
      parseFloat(txtZoomBlurCenterY.value)
    ]);

    zoomBlurEffect.pass(normalFramebuffer, null);
  }
}

function showNormal() {
  renderType = 'Normal';
  dirty = true;
}

function toggleFxaa() {
  fxaaEnabled = !fxaaEnabled;
  dirty = true;
}

function showTiltShift() {
  renderType = 'TiltShift';
  tiltShiftType = 0;
  dirty = true;
}

function showCircle() {
  renderType = 'TiltShift';
  tiltShiftType = 1;
  dirty = true;
}

function showZoomBlur() {
  renderType = 'ZoomBlur';
  dirty = true;
}

function refresh() {
  dirty = true;
}
