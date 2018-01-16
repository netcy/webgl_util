
var vertexShaderPrefix = 'precision highp float;\n';
var fragmentShaderPrefix = '#extension GL_OES_standard_derivatives : enable\nprecision highp float;\n';

function createProgram (gl, keys) {
  var vertexShader = vertexShaderPrefix,
    fragmentShader = fragmentShaderPrefix,
    defines = '';
  keys.forEach(function (key) {
    defines += '#define ' + key + '\n';
  });
  vertexShader += defines;
  vertexShader += defaultVertexShader;
  fragmentShader += defines;
  fragmentShader += defaultFragmentShader;
  return new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader
  });
}
