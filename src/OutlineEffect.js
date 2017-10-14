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

var OutlineEffect = wg.OutlineEffect = function (scene) {
  var self = this,
    gl;

  self._scene = scene;
  gl = self._gl = scene._gl;
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
        var vao = scene.getVertexArrayObject(object);
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
