'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.getCamera().setFovy(60);

  // var gui = createGUI(scene);

  var cube1 = new wg.Cube().setPosition(-3, 0, 0);
  cube1.material.diffuseImage = 'images/crate.gif';
  scene.add(cube1);

  var cube2 = new wg.Cube().setPosition(3, 0, 0);
  cube2.setScale(1, 0.5, 1);
  cube2.material.diffuseImage = 'images/crate.gif';
  scene.add(cube2);

  /*
  var cube = new wg.Object();
  cube.vao = new wg.VertexArray(scene._gl, {
    buffers: wg.Util.createCube(1)
  });
  cube.vao.setBufferDatas('offset', offsetAll2, true);
  cube.material.diffuseImage = 'images/crate.gif';
  scene.add(cube);*/
}
