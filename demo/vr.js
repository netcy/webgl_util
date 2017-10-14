'use strict';

var scene, leftController, rightController, selectRay, jumpRay,
  rayPositionStart = vec3.create(),
  rayPositionMiddle = vec3.create(),
  rayPositionEnd = vec3.create(),
  rayScale = vec3.fromValues(0.05, 1, 0.05),
  rayOffset = vec3.fromValues(0, 0.5, -0.8);

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.setLightPosition([0, 10, 0]);
  scene.getCamera().setPosition(0, 0, 4);
  rayScale[1] = scene.getCamera().getFar();

  wg.ObjParser.parseObjMtlUrl('obj/vive/', 'vr_controller_vive_1_5', function (obj) {
    wg.Util.addGeometry('vive', obj);
    scene.redraw();
  });
  scene.onGamepadChanged = onGamepadChanged;
  addData();
  createGUI(scene);
}

function onGamepadChanged (leftGamepad, rightGamepad, pressedGamepad, buttonIndex) {
  selectRay.visible = false;
  jumpRay.visible = false;

  // set gamepad position and rotation
  refreshController(leftController, leftGamepad);
  refreshController(rightController, rightGamepad);
  if (pressedGamepad) {
    // direction: 0, trigger: 1, side: 2, menu: 3
    if (buttonIndex === 0) {
      jumpRay.visible = true;
      vec3.add(rayPositionStart, pressedGamepad.pose.position, scene._camera._position);
      vec3.set(rayPositionMiddle, 0, 0, -1);
      vec3.set(rayPositionEnd, 0, 0, -4);
      vec3.transformQuat(rayPositionMiddle, rayPositionMiddle, pressedGamepad.pose.orientation);
      vec3.add(rayPositionMiddle, rayPositionMiddle, rayPositionStart);
      vec3.transformQuat(rayPositionEnd, rayPositionEnd, pressedGamepad.pose.orientation);
      vec3.add(rayPositionEnd, rayPositionEnd, rayPositionStart);
      var jumpRayPosition = [
        rayPositionStart[0], rayPositionStart[1], rayPositionStart[2],
        rayPositionMiddle[0], Math.max(rayPositionMiddle[1], 0), rayPositionMiddle[2],
        rayPositionEnd[0], 0, rayPositionEnd[2]
      ];
      jumpRay.vao.setPosition(jumpRayPosition);
    } else if (buttonIndex === 1) {
      refreshController(selectRay, pressedGamepad);
      var modelMatrix = selectRay._modelMatrix;
      mat4.rotateX(modelMatrix, modelMatrix, -Math.PI * 0.5);
      mat4.scale(modelMatrix, modelMatrix, rayScale);
      mat4.translate(modelMatrix, modelMatrix, rayOffset);
    }
  }
}

function refreshController (object, gampad) {
  if (gampad) {
    vec3.add(object._position, gampad.pose.position, scene._camera._position);
    object.fromRotationTranslation(gampad.pose.orientation, object._position);
    object.visible = true;
  } else {
    object.visible = false;
  }
}

function addData () {
  var cube = new wg.Object();
  cube.type = 'cube';
  cube.glow = true;
  cube.image = 'images/crate.gif';
  cube.setPosition(-2, 0, 0);
  scene.add(cube);

  var sphere = new wg.Object();
  sphere.type = 'sphere';
  sphere.color = [0.6, 0.6, 0.6, 1];
  sphere.setPosition(2, 0, 0);
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

  selectRay = new wg.Object();
  selectRay.visible = false;
  selectRay.glow = true;
  selectRay.type = 'cone';
  selectRay.color = [1, 153/255, 51/255, 1];
  scene.add(selectRay);

  jumpRay = new wg.Object();
  jumpRay.visible = false;
  jumpRay.light = false;
  jumpRay.color = [1, 153/255, 51/255, 1];
  jumpRay.vao = new wg.VertexArrayObject(scene._gl, {
    buffers: {
      position: [
        0, 0, 0,
        0, 0, 0,
        0, 0, 0
      ],
      index: [
        0, 1, 1, 2
      ],
      color: [
        1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1
      ]
    },
    mode: 'LINES'
  });
  scene.add(jumpRay);

  var line = new wg.Object();
  line.color = [1, 0, 0, 1];
  line.light = false;
  line.vao = new wg.VertexArrayObject(scene._gl, {
    buffers: {
      position: [
        -0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5, // top
        -0.5, -0.5, -0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5, -0.5, -0.5, // bottom
      ],
      index: [
        0, 1,  1, 2,  2, 3,  3, 0,
        4, 5,  5, 6,  6, 7,  7, 4,
        0, 4,  1, 5,  2, 6,  3, 7
      ],
      color: [
        0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
        0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1
      ]
    },
    mode: 'LINES'
  });
  scene.add(line);
}
