'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas'/*, {
    antialias: false,
    stencil: true
  }*/);
  scene.getCamera().setFovy(60);
  scene.getCamera().setNear(0.1);
  scene.getCamera().setFar(20);
  scene.getCamera().setTarget(0, 0, 0);
  scene.getCamera().setPosition(0, 0, 4);
  scene.setClearColor([1, 1, 1, 0]);
  scene.setLightPosition([4.0, 4.0, 4.0]);
  // scene.setAmbientColor([0.4, 0.4, 0.4]);

  // var gui = createGUI(scene);

  var count = 0;
  scene.onAnimationFrame = function (time) {
    if (window.object) {
      count ++;
      var animation = window.object.animations[0];
      var input = animation.sampler.input;
      var output = animation.sampler.output;
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
      var node = object._node;

      if (animation.path === 'rotation') {
        quat.slerp(node.rotation, previousValue, nextValue, t);
      } else if (animation.path === 'translation') {
        vec3.lerp(node.translation, previousValue, nextValue, t);
      } else if (animation.path === 'scale') {
        vec3.lerp(node.scale, previousValue, nextValue, t);
      }
      mat4.fromRotationTranslationScale(object._modelMatrix, node.rotation, node.translation, node.scale);
      mat3.normalFromMat4(object._normalMatrix, object._modelMatrix);

      scene.redraw();
    }
  };

  wg.GLTFParser.parse('gltf/SimpleAnimation', 'SimpleAnimation', function (data) {
    console.log(data);
    var geometry = data.geometries[0];
    wg.Util.addGeometry('SimpleAnimation', geometry);

    data.nodes.forEach(function (node) {
      var object = window.object = new wg.Object();
      object.type = 'SimpleAnimation';
      object.animations = node.animations;
      object._node = node;
      if (node.matrix) {
        object._modelMatrix = node.matrix;
      }
      scene.add(object);
    });
  });
}
