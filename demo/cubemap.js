'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.getCamera().setFovy(60);

  var gui = createGUI(scene);

  var image = {
    url: [
      // POSITIVE_X, NEGATIVE_X, POSITIVE_Y, NEGATIVE_Y, POSITIVE_Z, NEGATIVE_Z
      'images/skybox/yokohama2/posx.jpg',
      'images/skybox/yokohama2/negx.jpg',
      'images/skybox/yokohama2/posy.jpg',
      'images/skybox/yokohama2/negy.jpg',
      'images/skybox/yokohama2/posz.jpg',
      'images/skybox/yokohama2/negz.jpg',

      /*'images/skybox/park/posx.jpg',
      'images/skybox/park/negx.jpg',
      'images/skybox/park/posy.jpg',
      'images/skybox/park/negy.jpg',
      'images/skybox/park/posz.jpg',
      'images/skybox/park/negz.jpg',*/

      /*'images/skybox/sky/skyposx.png',
      'images/skybox/sky/skynegx.png',
      'images/skybox/sky/skyposy.png',
      'images/skybox/sky/skynegy.png',
      'images/skybox/sky/skyposz.png',
      'images/skybox/sky/skynegz.png',*/

      /*'images/skybox/fire/pano_r.jpg',
      'images/skybox/fire/pano_l.jpg',
      'images/skybox/fire/pano_u.jpg',
      'images/skybox/fire/pano_d.jpg',
      'images/skybox/fire/pano_f.jpg',
      'images/skybox/fire/pano_b.jpg',*/

      /*'images/skybox/sb_iceflow/iceflow_rt.jpg',
      'images/skybox/sb_iceflow/iceflow_lf.jpg',
      'images/skybox/sb_iceflow/iceflow_up.jpg',
      'images/skybox/sb_iceflow/iceflow_dn.jpg',
      'images/skybox/sb_iceflow/iceflow_bk.jpg',
      'images/skybox/sb_iceflow/iceflow_ft.jpg',*/
    ],
    type: 'CUBE_MAP',
    flipY: false
  };

  var cube = new wg.Cube().setPosition(0, 0, -5);
  cube.image = 'images/crate.gif';
  scene.add(cube);

  var sphere = new wg.Sphere().setPosition(-5, 0, 0);
  sphere.color = [1, 0, 1, 1];
  sphere.imageEnv = image;
  scene.add(sphere);

  var torus = new wg.Torus().setPosition(5, 0, 0);
  torus.color = [1, 0, 1, 1];
  torus.imageEnv = image;
  scene.add(torus);

  var skybox = new wg.Cube();
  skybox.image = image;
  skybox.setScale(50, 50, 50);
  skybox.light = false;
  scene.add(skybox);

  var center = new wg.Cube();
  center.image = 'images/crate.gif';
  center.imageEnv = image;
  center.light = false;
  scene.add(center);
}
