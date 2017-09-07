'use strict';

var scene;

function init () {
  // glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas'/*, {
    antialias: false,
    stencil: true
  }*/);
  // scene.getCamera().setPosition(0, 0, 3);
  // scene.getCamera().setTarget(0, 0, -490);
  // scene.setClearColor([1, 0, 1, 0.3]);
  scene.setLightPosition([1.0, 1, 0]);
  scene.setAmbientColor([0.0, 0.0, 0.0]);

  var cube = new wg.Cube().setPosition(0, 0, -50);
  cube.outline = true;
  scene.add(cube);

  var sphere = new wg.Sphere().setPosition(-5, 0, 0);
  sphere.outline = true;
  scene.add(sphere);

  var torus = new wg.Torus().setPosition(5, 0, 0);
  torus.outline = true;
  scene.add(torus);

  scene.add(new wg.Cube().setPosition(0, 0, -5));
}
