'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.setLightPosition([0, 10, 0]);
  wg.ObjParser.parseObjMtlUrl('obj/vive/', 'vr_controller_vive_1_5', function (obj) {
    wg.Util.addGeometry('vive', obj);
    scene.redraw();
  });
}

function addData () {
  for (var i=0; i<2; i++) {
    var cube = new wg.Object();
    // cube.type = 'vive';
    cube.type = 'cube';
    cube.material.diffuseImage = 'images/2048.jpeg';
    scene.add(cube);
  }
}

function clearData () {
  scene.clear();
  scene._gl.cache.vaos = {};
  // wg.geometries = {};
  var gl = scene._gl;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindVertexArray(null);
}
