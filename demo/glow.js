'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.getCamera().setFovy(60);
  // scene.getCamera().setNear(0.1);
  // scene.getCamera().setFar(20);
  // scene.getCamera().setTarget(0, 0.4, 0);
  scene.getCamera().setPosition(0, 2, 3.9);
  scene.setLightPosition([0.0, 4.0, 0.0]);
  scene.setAmbientColor([0.4, 0.4, 0.4]);
  scene.setClearColor([0, 0, 0, 1]);

  var gui = createGUI(scene);

  var cube1 = new wg.Cube().setPosition(0, 0, -5);
  cube1.material.diffuseImage = 'images/crate.gif';
  scene.add(cube1);

  var sphere1 = new wg.Sphere().setPosition(-5, 0, 0);
  sphere1.outline = true;
  sphere1.material.diffuseColor = [1, 0, 1, 1];
  scene.add(sphere1);

  var sphere2 = new wg.Sphere().setPosition(0, 0, 5);
  sphere2.glow = true;
  sphere2.material.diffuseColor = [1, 0, 1, 1];
  scene.add(sphere2);

  var torus = new wg.Torus().setPosition(5, 0, 0);
  torus.outline = true;
  torus.material.diffuseColor = [1, 0, 1, 1];
  scene.add(torus);

  var cube2 = new wg.Cube().setPosition(0, 0, 0);
  cube2.material.diffuseImage = 'images/crate.gif';
  cube2.glow = true;
  scene.add(cube2);
}
