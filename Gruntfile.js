var fs = require('fs');

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
      'src/shader/Shader.js',
      'src/shader/ShaderUtil.js',
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
      'src/parser/GLTFParser.js',
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

  grunt.registerTask('shader', 'Merge shader', function () {
    var defaultVertexShader = fs.readFileSync('src/shader/default.vs', { encoding: 'utf8' });
    var defaultFragmentShader = fs.readFileSync('src/shader/default.fs', { encoding: 'utf8' });
    var shader = "var defaultVertexShader = '" + defaultVertexShader.split('\n').join('\\n') + "';\n";
    shader += "var defaultFragmentShader = '" + defaultFragmentShader.split('\n').join('\\n') + "';\n";
    fs.writeFileSync('src/shader/Shader.js', shader);
  });

  grunt.config('uglify.all', {
    src: 'dist/wg.js',
    dest: 'dist/wg-min.js'
  });

  grunt.registerTask('default', [
    'clean',
    'shader',
    'concat'
  ]);

  grunt.registerTask('release', [
    'clean',
    'shader',
    'concat',
    'uglify'
  ]);
};
