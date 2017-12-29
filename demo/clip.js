'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas'/*, {
    antialias: false,
    stencil: true
  }*/);
  scene.getCamera().setFovy(60);
  scene.getCamera().setNear(0.1);
  scene.getCamera().setFar(20);
  scene.getCamera().setTarget(0, 0, 0);
  scene.getCamera().setPosition(0, 0, 4);
  scene.setClearColor([1, 1, 1, 0]);
  scene.setLightPosition([4.0, 4.0, 4.0]);
  // scene.setAmbientColor([0.4, 0.4, 0.4]);
  scene._clipPane = [0, 1, 0, 0];

  var gui = createGUI(scene);

  var box = new wg.Cube();
  // box.setScale(1.0, 1.0, 1.0);
  // box.setPosition(0.0, 1.7, 0.0);
  // vec2.set(box.textureScale, 100, 100);
  // box.setScale(100, 100, 100);
  box.image = {
    url: 'images/crate.gif',
    anisotropy: 16,
    wrapS: 'REPEAT',
    wrapT: 'REPEAT'
  };
  // box.color = [0.6, 0.6, 0.6, 1];
  // box.outline = true;
  scene.add(box);
}
