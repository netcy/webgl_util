'use strict';

var scene;

function init () {
  // glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas'/*, {
    antialias: false,
    stencil: true
  }*/);
  // scene.getCamera().setPosition(0, 0, 3);
  // scene.getCamera().setTarget(0, 0, -10);
  // scene.setClearColor([1, 0, 1, 0.3]);
  scene.setLightPosition([0, 0, 10]);
  // scene.setAmbientColor([0.2, 0.2, 0.2]);

  var cube1 = new wg.Cube().setPosition(0, 0, -50);
  cube1.outline = true;
  cube1.image = 'images/crate.gif';
  scene.add(cube1);

  var sphere = new wg.Sphere().setPosition(-5, 0, 0);
  sphere.outline = true;
  scene.add(sphere);

  var torus = new wg.Torus().setPosition(5, 0, 0);
  torus.outline = true;
  torus.color = [1, 0, 1, 1];
  scene.add(torus);

  var cube2 = new wg.Cube().setPosition(0, 0, /*-5*/0);
  cube2.image = 'images/crate.gif';
  scene.add(cube2);
}
