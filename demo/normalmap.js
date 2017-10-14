'use strict';

var scene, leftController, rightController, leftRay, rightRay,
  leftGamepadPosition = vec3.create(),
  rightGamepadPosition = vec3.create(),
  currentRayPosition = vec3.create(),
  rayScale = vec3.fromValues(0.05, 1, 0.05),
  rayOffset = vec3.fromValues(0, 0.5, -0.8);

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.setLightPosition([0, 0, 0]);
  scene.getCamera().setPosition(0, 0, 4);
  scene.getCamera().setTarget(0, 0, -2);
  rayScale[1] = scene.getCamera().getFar();

  wg.ObjParser.parseObjMtlUrl('obj/vive/', 'vr_controller_vive_1_5', function (obj) {
    wg.Util.addGeometry('vive', obj);
    scene.redraw();
  });
  scene.onGamepadChanged = onGamepadChanged;
  var count = 0;
  scene.onAnimationFrame = function () {
    /*count++;
    sphere.setRotation(0, (count * Math.PI / 360 / 2) % (Math.PI * 2), 0);
    scene.redraw();*/
  };
  addData();
  createGUI(scene);
}

function onGamepadChanged (leftGamepad, rightGamepad, pressedGamepad) {
  var cameraPosition = scene.getCamera().getPosition(),
    currentRay;
  if (pressedGamepad) {
    leftRay.visible = pressedGamepad === leftGamepad;
    rightRay.visible = pressedGamepad === rightGamepad;
    currentRay = leftRay.visible ? leftRay : rightRay;
  } else {
    leftRay.visible = false;
    rightRay.visible = false;
  }

  // set gamepad position and rotation
  if (leftGamepad) {
    vec3.add(leftGamepadPosition, leftGamepad.pose.position, cameraPosition);
    leftController.fromRotationTranslation(leftGamepad.pose.orientation, leftGamepadPosition);
    leftController.visible = true;
  } else {
    leftController.visible = false;
  }
  if (rightGamepad) {
    vec3.add(rightGamepadPosition, rightGamepad.pose.position, cameraPosition);
    rightController.fromRotationTranslation(rightGamepad.pose.orientation, rightGamepadPosition);
    rightController.visible = true;
  } else {
    rightController.visible = false;
  }
  if (pressedGamepad) {
    vec3.add(currentRayPosition, pressedGamepad.pose.position, cameraPosition);
    currentRay.fromRotationTranslation(pressedGamepad.pose.orientation, currentRayPosition);
    mat4.rotateX(currentRay._modelMatrix, currentRay._modelMatrix, -Math.PI * 0.5);
    mat4.scale(currentRay._modelMatrix, currentRay._modelMatrix, rayScale);
    mat4.translate(currentRay._modelMatrix, currentRay._modelMatrix, rayOffset);
  }
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

  leftController = new wg.Object();
  leftController.visible = false;
  leftController.glow = true;
  leftController.type = 'vive';
  scene.add(leftController);

  rightController = new wg.Object();
  rightController.visible = false;
  rightController.glow = true;
  rightController.type = 'vive';
  scene.add(rightController);

  leftRay = new wg.Object();
  leftRay.visible = false;
  leftRay.glow = true;
  leftRay.type = 'cone';
  leftRay.color = [1, 153/255, 51/255, 1];
  scene.add(leftRay);

  rightRay = new wg.Object();
  rightRay.visible = false;
  rightRay.glow = true;
  rightRay.type = 'cone';
  rightRay.color = [1, 153/255, 51/255, 1];
  scene.add(rightRay);
}
