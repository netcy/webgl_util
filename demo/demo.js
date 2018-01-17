'use strict';

var scene;

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas'/*, {
    antialias: false,
    stencil: true
  }*/);
  scene.getCamera().setFovy(60);
  // scene.getCamera().setNear(0.1);
  // scene.getCamera().setFar(20);
  scene.getCamera().setTarget(0, 0, 0);
  scene.getCamera().setPosition(0, 0, 4);
  // scene.setClearColor([1, 1, 1, 0]);
  scene.setLightPosition([4.0, 4.0, 4.0]);
  // scene.setAmbientColor([0.4, 0.4, 0.4]);

  var gui = createGUI(scene);

  /*var floor = new wg.Cube();
  vec2.set(floor.material.textureScale, 100, 100);
  floor.setScale(100, 100, 0.1);
  floor.setPosition(0, -0.6, 0);
  floor.setRotation(Math.PI / 2, 0, 0);
  floor.material.diffuseImage = {
    url: 'images/crate.gif',
    anisotropy: 16,
    wrapS: 'REPEAT',
    wrapT: 'REPEAT'
  };
  scene.add(floor);*/

  /*var skybox = new wg.Cube();
  skybox.material.diffuseImage = {
    url: 'images/crate.gif',
    anisotropy: 1,
    wrapS: 'REPEAT',
    wrapT: 'REPEAT'
  };
  skybox.setScale(2, 1, 1);
  skybox.setPosition(-1, 0, 0);
  scene.add(skybox);

  var skybox1 = new wg.Cube();
  skybox1.material.diffuseImage = {
    url: 'images/crate.gif',
    // anisotropy: 16,
    wrapS: 'REPEAT',
    wrapT: 'REPEAT'
  };
  vec2.set(skybox1.material.textureScale, 2, 1);
  skybox1.setScale(2, 1, 1);
  skybox1.setPosition(1.5, 0, 0);
  scene.add(skybox1);*/

  /*var cube1 = new wg.Cube().setPosition(0, 0, -5);
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
  scene.add(cube2);*/

  /*var count = 4;
  var current = count;
  var scale = 0.4;
  var spread = scale * 2.0;
  var halfCount = (current - 1.0) * 0.5 * spread;
  var ySpread = Math.sqrt(scale * scale * 2.0);
  for (var y = 0; y < count; ++y)
  {
    for (var z = 0; z < current; ++z)
    {
      for (var x = 0; x < current; ++x)
      {
        var sphere = new wg.Sphere();
        sphere.setPosition(x * spread - halfCount, y * ySpread, z * spread - halfCount);
        sphere.setScale(scale, scale, scale);
        // sphere.material.diffuseColor = [1, 0, 1, 1];
        scene.add(sphere);
      }
    }
    --current;
    if ( current == 0 )
      current = 1;
    halfCount = (current - 1.0) * 0.5 * spread;
  }*/

  var box = new wg.Cube();
  // box.material.wireframe = true;
  // box.material.wireframeWidth = 2;
  // box.material.wireframeOnly = false;
  box.material.light = false;
  // box.material.doubleSided = true;
  // box.setScale(1.0, 1.0, 1.0);
  // box.setPosition(0.0, 1.7, 0.0);
  // vec2.set(box.material.textureScale, 2, 2);
  box.setScale(2, 2, 2);
  box.material.diffuseImage = {
    url: 'images/crate.gif',
    anisotropy: 16,
    wrapS: 'REPEAT',
    wrapT: 'REPEAT'
  };
  box.material.diffuseColor = [0, 0, 1, 1];
  // box.material.transparent = true;
  // box.material.transparency = 0.5;
  // box.outline = true;
  scene.add(box);

  var box1 = new wg.Cube();
  box1.material.diffuseColor = [0, 1, 0, 1];
  box1.setPosition(4, 0, 0);
  scene.add(box1);
}
