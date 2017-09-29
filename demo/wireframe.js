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
  controller.wireframe = true;
  controller.transparent = true;
  controller.type = 'vive';
  scene.add(controller);

  var cube = new wg.Cube().setPosition(0, 0, -3);
  cube.image = 'images/crate.gif';
  cube.wireframe = true;
  cube.transparent = true;
  scene.add(cube);

  var sphere = new wg.Sphere().setPosition(-3, 0, 0);
  sphere.wireframe = true;
  sphere.transparent = true;
  sphere.color = [1, 0, 1, 1];
  scene.add(sphere);

  var torus = new wg.Torus().setPosition(3, 0, 0);
  torus.wireframe = true;
  torus.transparent = true;
  torus.color = [1, 0, 1, 1];
  scene.add(torus);
}
