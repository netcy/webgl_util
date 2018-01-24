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

  wg.GLTFParser.parse('gltf/SimpleMorph', 'SimpleMorph', function (data) {
    console.log(data);
    var geometry = data.geometries[0];
    wg.Util.addGeometry('SimpleMorph', geometry);

    data.nodes.forEach(function (node) {
      var object = window.object = new wg.Object();
      object.type = 'SimpleMorph';
        object.animations = node.animations;
        object._node = node;
        if (node.matrix) {
          object._modelMatrix = node.matrix;
        }
      scene.add(object);
    });
  });
}
