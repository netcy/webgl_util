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
      if (!object.glow) {
        var vao = gl.cache.vaos[object.type];
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
        var vao = gl.cache.vaos[object.type];
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
