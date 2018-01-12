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
      'src/Trigger.js',
      'src/Geometries.js',
      'src/Program.js',
      'src/Framebuffer.js',
      'src/Texture.js',
      'src/TextureCache.js',
      'src/VertexArray.js',
      'src/Camera.js',
      'src/Scene.js',
      'src/effect/Effect.js',
      'src/effect/FxaaEffect.js',
      'src/effect/TiltShiftEffect.js',
      'src/effect/ZoomBlurEffect.js',
      'src/effect/OutlineEffect.js',
      'src/effect/GlowEffect.js',
      'src/effect/SSAOEffect.js',
      'src/object/Object.js',
      'src/object/Cube.js',
      'src/object/Torus.js',
      'src/object/Sphere.js',
      'src/parser/ObjParser.js',
      'src/material/Material.js',
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
