'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.setLightPosition([0, 10, 0]);

  wg.ObjParser.parseObjMtlUrl('obj/vive/', 'vr_controller_vive_1_5', function (obj) {
    console.log(obj);
    wg.Util.addGeometry('vive', obj);
    scene.redraw();
  });

  var cube = new wg.Object();
  cube.type = 'cube';
  cube.color = [0.6, 0.6, 0.6, 1];
  cube.image = 'images/crate.gif';
  cube.setPosition(-5, 0, 0);
  scene.add(cube);

  var vive = new wg.Object();
  vive.type = 'vive';
  vive.color = [0.6, 0.6, 0.6, 1];
  vive.setScale(10, 10, 10);
  scene.add(vive);

  var sphere = new wg.Object();
  sphere.type = 'sphere';
  sphere.color = [0.6, 0.6, 0.6, 1];
  sphere.setPosition(5, 0, 0);
  scene.add(sphere);
}
