'use strict';

var scene;

function init () {
  // glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas'/*, {
    antialias: false
  }*/);
  // scene.getCamera().setPosition(0, 0, 3);
  // scene.getCamera().setTarget(-5, 1, 0);
  scene.setClearColor([1, 0, 1, 0.3]);
  // scene.setLightPosition([1, 0, 0]);
  scene.setAmbientColor([0.6, 0.6, 0.6]);
  scene.add(new wg.Cube());
  scene.add(new wg.Cube().setPosition(-5, 0, 0));
}
