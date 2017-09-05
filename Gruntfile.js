module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.config('clean.all', [
    'dist'
  ]);

  grunt.config('concat.all', {
    src: [
      'src/Util.js',
      'src/Program.js',
      'src/Framebuffer.js',
      'src/Texture.js',
      'src/VertexArrayObject.js',
      'src/Effect.js',
      'src/FxaaEffect.js',
      'src/TiltShiftEffect.js',
      'src/ZoomBlurEffect.js',
      'src/Camera.js',
      'src/Scene.js',
      'src/Object.js',
      'src/Cube.js',
    ],
    dest: 'dist/wg.js',
    nonull: true,
    options: {
      banner: "'use strict';\n+function (root) {\n",
      footer: "}(this);\n",
      process: function (src, filepath) {
        return '// Source: ' + filepath + '\n' + src;
      }
    }
  });

  grunt.config('uglify.all', {
    src: 'dist/wg.js',
    dest: 'dist/wg-min.js'
  });

  grunt.registerTask('default', [
    'clean',
    'concat'
  ]);

  grunt.registerTask('release', [
    'clean',
    'concat',
    'uglify'
  ]);
};
