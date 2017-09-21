'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.setLightPosition([0, 10, 0]);
  scene.getCamera().setPosition(0, 0, 1);

  wg.ObjParser.parseObjMtlUrl('obj/vive/', 'vr_controller_vive_1_5', function (obj) {
    wg.Util.addGeometry('vive', obj);
    scene.redraw();
  });

  var cube = new wg.Object();
  cube.type = 'cube';
  cube.image = 'images/crate.gif';
  cube.setPosition(-2, 0, 0);
  scene.add(cube);

  window.leftController = new wg.Object();
  leftController.type = 'vive';
  leftController.setPosition(-0.5, 0, 0);
  scene.add(leftController);

  window.rightController = new wg.Object();
  rightController.type = 'vive';
  rightController.setPosition(0.5, 0, 0);
  scene.add(rightController);

  var sphere = new wg.Object();
  sphere.type = 'sphere';
  sphere.color = [0.6, 0.6, 0.6, 1];
  sphere.setPosition(2, 0, 0);
  scene.add(sphere);
}
