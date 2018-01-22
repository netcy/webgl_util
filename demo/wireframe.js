'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.getCamera().setFovy(60);
  scene.getCamera().setNear(0.01);

  var gui = createGUI(scene);

  wg.ObjParser.parseObjMtlUrl('obj/vive/', 'vr_controller_vive_1_5', function (obj) {
    wg.Util.addGeometry('vive', obj);
    var controller = new wg.Object();
    controller.type = 'vive';
    scene.add(controller);
    scene.getVertexArray(controller)._parts.forEach(function (part) {
      part.material.wireframe = true;
      part.material.wireframeOnly = false;
      part.material.transparent = true;
      part.material.transparency = 0.7;
    });
  });

  var cube = new wg.Cube().setPosition(0, 0, -3);
  cube.material.diffuseImage = 'images/crate.gif';
  cube.material.wireframe = true;
  cube.material.transparent = true;
  scene.add(cube);

  var sphere = new wg.Sphere().setPosition(-3, 0, 0);
  sphere.material.wireframe = true;
  sphere.material.wireframeOnly = false;
  sphere.material.transparent = true;
  sphere.material.diffuseColor = [1, 0, 1, 1];
  scene.add(sphere);

  var torus = new wg.Torus().setPosition(3, 0, 0);
  torus.material.wireframe = true;
  torus.material.transparent = true;
  torus.material.diffuseColor = [1, 0, 1, 1];
  scene.add(torus);
}
