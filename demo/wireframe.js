'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.getCamera().setFovy(60);

  var gui = createGUI(scene);

  wg.ObjParser.parseObjMtlUrl('obj/vive/', 'vr_controller_vive_1_5', function (obj) {
    wg.Util.addGeometry('vive', obj);
    scene.redraw();
  });

  var controller = new wg.Object();
  controller.material.wireframe = true;
  controller.material.transparent = true;
  controller.type = 'vive';
  scene.add(controller);

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
