'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.setLightPosition([0, 0, 0]);
  scene.getCamera().setPosition(0, 0, 4);
  scene.getCamera().setTarget(0, 0, -2);

  var count = 0;
  scene.onAnimationFrame = function () {
    /*count++;
    sphere.setRotation(0, (count * Math.PI / 360 / 2) % (Math.PI * 2), 0);
    scene.redraw();*/
  };
  addData();
  createGUI(scene);
}

function addData () {
  var stone = new wg.Object();
  stone.type = 'cube';
  stone.glow = true;
  stone.image = 'images/fieldstone.jpg';
  stone.imageNormal = 'images/fieldstone-normal.jpg';
  stone.setPosition(-2, 0, 0);
  scene.add(stone);

  var brick = new wg.Object();
  brick.type = 'cube';
  brick.outline = true;
  brick.image = 'images/brickwall.jpg';
  brick.imageNormal = 'images/brickwall_normal.jpg';
  brick.setPosition(0, 0, -2);
  scene.add(brick);

  window.sphere = new wg.Object();
  sphere.type = 'sphere';
  sphere.image = 'images/Earth_Diffuse.png';
  sphere.imageNormal = 'images/Earth_Normal.png';
  sphere.setPosition(20, 0, 0);
  sphere.setScale(10, 10, 10);
  scene.add(sphere);
}
