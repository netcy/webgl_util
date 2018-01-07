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
