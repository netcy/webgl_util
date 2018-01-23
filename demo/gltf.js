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

  var count = 0,
    flag = 1,
    ratio;
  /*scene.onAnimationFrame = function () {
    if (window.object && window.object.vao) {
      if (count > 100) {
        flag = -1;
      }
      if (count < 0) {
        flag = 1;
      }
      count += flag;
      ratio = count / 100;
      window.object.vao._weights = [ratio, 1 - ratio];
      scene.redraw();
    }
  };*/

  wg.GLTFParser.parse('gltf/SimpleMorph', 'SimpleMorph', function (data) {
    console.log(data);
    var geometry = data.geometries[0];
    // geometry.weights = [0, 0];
    wg.Util.addGeometry('SimpleMorph', geometry);

    var object = window.object = new wg.Object();
    object.type = 'SimpleMorph';
    object.setPosition(-4, 0, 0);
    scene.add(object);
  });

  // wg.GLTFParser.parse('gltf/SimpleSkin', 'SimpleSkin', function (geometry) {
  //   wg.Util.addGeometry('SimpleSkin', obj);
  // });

  /*var box = new wg.Cube();
  // box.type = 'SimpleMorph';
  scene.add(box);*/
}
