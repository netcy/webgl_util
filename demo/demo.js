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
  // scene.setClearColor([0, 0, 1, .2]);
  scene.setLightPosition([0, 0, 10]);
  // scene.setAmbientColor([0.2, 0.2, 0.2]);

  var cube1 = new wg.Cube().setPosition(0, 0, -50);
  cube1.outline = true;
  cube1.image = 'images/crate.gif';
  scene.add(cube1);

  var sphere1 = new wg.Sphere().setPosition(-5, 0, 0);
  sphere1.outline = true;
  sphere1.color = [1, 0, 1, 1];
  scene.add(sphere1);

  var sphere2 = new wg.Sphere().setPosition(0, 0, 5);
  sphere2.glow = true;
  sphere2.color = [1, 0, 1, 1];
  scene.add(sphere2);

  var torus = new wg.Torus().setPosition(5, 0, 0);
  torus.outline = true;
  torus.color = [1, 0, 1, 1];
  scene.add(torus);

  var cube2 = new wg.Cube().setPosition(0, 0, /*-5*/0);
  cube2.image = 'images/crate.gif';
  cube2.glow = true;
  scene.add(cube2);
}
