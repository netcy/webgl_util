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
    callback: function () {
      scene.redraw();
    },
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
    var vao = gl.cache.vaos[object.type];
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
