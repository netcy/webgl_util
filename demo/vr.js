'use strict';

var scene, leftController, rightController, selectRay, jumpRay,
  grid, helpMenuGamepad,
  pressedHelpMenu = false,
  helpMenuVisible = false,
  helpMenus = [],
  rayPositionStart = vec3.create(),
  rayPositionMiddle = vec3.create(),
  rayPositionEnd = vec3.create(),
  rayScale = vec3.fromValues(0.05, 1, 0.05),
  rayOffset = vec3.fromValues(0, 0.5, -0.8),
  jumping = false,
  moving = false,
  startGampadInvertMatrix = mat4.create(),
  startObjectMatrix = mat4.create();

function init () {
  glMatrix.setMatrixArrayType(Array);
  scene = new wg.Scene('canvas');
  scene.setClearColor([0, 0, 0, 1]);
  scene.setLightPosition([0, 10, 0]);
  scene.getCamera().setTarget(0, 0, -1);
  scene.getCamera().setPosition(0, 0, 0);
  scene.getCamera()._lockY = true;
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
  grid.visible = false;

  refreshController(leftController, leftGamepad);
  refreshController(rightController, rightGamepad);
  refreshHelpMenu();
  if (pressedGamepad) {
    // direction: 0, trigger: 1, side: 2, menu: 3
    if (buttonIndex === 0) {
      jumpRay.visible = true;
      grid.visible = true;
      jumping = true;
      vec3.set(rayPositionStart, 0, 0, 0);
      vec3.set(rayPositionMiddle, 0, 0, -1);
      vec3.set(rayPositionEnd, 0, 0, -4);
      vec3.transformMat4(rayPositionStart, rayPositionStart, pressedGamepad._matrix);
      vec3.transformMat4(rayPositionMiddle, rayPositionMiddle, pressedGamepad._matrix);
      vec3.transformMat4(rayPositionEnd, rayPositionEnd, pressedGamepad._matrix);
      var jumpRayPosition = [
        rayPositionStart[0], rayPositionStart[1], rayPositionStart[2],
        rayPositionMiddle[0], Math.max(rayPositionMiddle[1], 0), rayPositionMiddle[2],
        rayPositionEnd[0], 0, rayPositionEnd[2]
      ];
      jumpRay.vao.setPosition(jumpRayPosition);
    } else if (buttonIndex === 1) {
      /*refreshController(selectRay, pressedGamepad);
      var modelMatrix = selectRay._modelMatrix;
      // TODO: refresh normalMatrix
      mat4.rotateX(modelMatrix, modelMatrix, -Math.PI * 0.5);
      mat4.scale(modelMatrix, modelMatrix, rayScale);
      mat4.translate(modelMatrix, modelMatrix, rayOffset);*/
      if (moving) {
        var matrix = cube._modelMatrix;
        // TODO: refresh normalMatrix
        mat4.mul(matrix, pressedGamepad._matrix, startGampadInvertMatrix);
        mat4.mul(matrix, matrix, startObjectMatrix);
      } else {
        moving = true;
        mat4.invert(startGampadInvertMatrix, pressedGamepad._matrix);
        mat4.copy(startObjectMatrix, cube._modelMatrix);
      }
    } else if (buttonIndex === 3) {
      helpMenuGamepad = pressedGamepad;
      pressedHelpMenu = true;
    }
  } else {
    if (jumping) {
      jumping = false;
      var posePosition = scene._frameData.pose.position;
      var sittingMatrix = scene._vrDisplay.stageParameters.sittingToStandingTransform;
      scene._camera._position[0] = rayPositionEnd[0] - posePosition[0] - sittingMatrix[12];
      scene._camera._position[2] = rayPositionEnd[2] - posePosition[2] - sittingMatrix[14];
    }
    if (pressedHelpMenu) {
      pressedHelpMenu = false;
      helpMenuVisible = !helpMenuVisible;
      refreshHelpMenu();
    }
    moving = false;
  }
}

function refreshHelpMenu () {
  helpMenus.forEach(function (helpMenu) {
    helpMenu.visible = helpMenuVisible;
  });
  if (helpMenuVisible) {
    helpMenus.forEach(function (helpMenu) {
      var modelMatrix = helpMenu._modelMatrix;
      // TODO: refresh normalMatrix
      mat4.copy(modelMatrix, helpMenuGamepad._matrix);
      mat4.translate(modelMatrix, modelMatrix, helpMenu._position);
      mat4.rotateX(modelMatrix, modelMatrix, helpMenu._rotation[0]);
      mat4.scale(modelMatrix, modelMatrix, helpMenu._scale);
    });
  }
}

function refreshController (object, gampad) {
  if (gampad) {
    mat4.copy(object._modelMatrix, gampad._matrix);
    // TODO: refresh normalMatrix
    object.visible = true;
  } else {
    object.visible = false;
  }
}

function addHelpMenus () {
  createHelpMenu('跳跃', [0.13, 0.01, 0.1], [0, -0.05, 0.007], [0.05, -0.1, 0.01]);
  createHelpMenu('选中', [-0.1, -0.1, -0.01], [0, -0.04, -0.03], [-0.02, 0.02, -0.1]);
  createHelpMenu('行走', [-0.13, -0.02, 0.1], [-0.02, -0.085, -0.01], [-0.05, -0.09, -0.02]);
  createHelpMenu('菜单', [0.15, 0.01, -0.04], [0, -0.02, 0.01], [0.07, 0.045, 0.01]);
}

function createHelpMenu (text, translate, from, to) {
  var helpCanvas = document.createElement('canvas');
  helpCanvas.width = 128;
  helpCanvas.height = 128;

  var ctx = helpCanvas.getContext('2d');
  ctx.fillStyle = 'rgba(104, 190, 141, 0.5)';
  ctx.fillRect(0, 0, 128, 128);
  ctx.font = 'bold ' + 60 + 'px "Microsoft Yahei"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText(text, 64, 64);

  var helpMenu = new wg.Object();
  helpMenus.push(helpMenu);
  helpMenu.visible = false;
  helpMenu.light = false;
  helpMenu.type = 'plane';
  vec3.set(helpMenu._scale, 0.08, 0.04, 1);
  vec3.copy(helpMenu._position, translate);
  vec3.set(helpMenu._rotation, -Math.PI * 0.5, 0, 0);
  helpMenu.image = helpCanvas;
  helpMenu.transparent = true;
  scene.add(helpMenu);

  var line = new wg.Object();
  helpMenus.push(line);
  line.visible = false;
  line.light = false;
  line.color = [1, 153/255, 51/255, 1];
  vec3.set(line._rotation, -Math.PI * 0.5, 0, 0);
  line.vao = new wg.VertexArray(scene._gl, {
    buffers: {
      position: [
        from[0], from[1], from[2],
        to[0], to[1], to[2]
      ]
    },
    mode: 'LINES'
  });
  scene.add(line);
}

function addData () {
  var cube = window.cube = new wg.Object();
  cube.type = 'cube';
  cube.outline = true;
  cube.image = 'images/crate.gif';
  cube.setPosition(-2, 0, 0);
  scene.add(cube);

  var sphere = new wg.Object();
  sphere.type = 'sphere';
  sphere.glow = true;
  sphere.color = [0.6, 0.6, 0.6, 1];
  sphere.setPosition(0, 0, -2);
  scene.add(sphere);

  leftController = new wg.Object();
  leftController.visible = false;
  // leftController.glow = true;
  leftController.type = 'vive';
  scene.add(leftController);

  rightController = new wg.Object();
  rightController.visible = false;
  // rightController.glow = true;
  rightController.type = 'vive';
  scene.add(rightController);

  selectRay = new wg.Object();
  selectRay.visible = false;
  // selectRay.glow = true;
  selectRay.type = 'cone';
  selectRay.color = [1, 153/255, 51/255, 1];
  scene.add(selectRay);

  jumpRay = new wg.Object();
  jumpRay.visible = false;
  jumpRay.light = false;
  jumpRay.color = [1, 153/255, 51/255, 1];
  jumpRay.vao = new wg.VertexArray(scene._gl, {
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

  grid = new wg.Object();
  grid.visible = false;
  grid.setRotation(-Math.PI / 2, 0, 0);
  grid.setScale(10, 10, 1);
  vec2.set(grid.textureScale, 10, 10);
  grid.light = false;
  grid.type = 'plane';
  grid.image = {
    url: 'images/grid.png',
    wrapS: 'REPEAT',
    wrapT: 'REPEAT'
  };
  grid.transparent = true;
  scene.add(grid);

  var line = new wg.Object();
  line.color = [1, 0, 0, 1];
  line.light = false;
  line.vao = new wg.VertexArray(scene._gl, {
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

  addHelpMenus();
}
