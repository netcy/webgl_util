var Camera = wg.Camera = function (scene) {
  var self = this,
    canvas;
  self._scene = scene;
  canvas = self._canvas = scene._canvas;
  self._viewMatrix = mat4.create();
  self._projectMatix = mat4.create();
  self._rotateMatrix = mat4.create();
  self._viewDirty = true;
  self._projectDirty = true;

  self._position = vec3.create(0, 0, 10);
  self._distance = 10;
  self._target = vec3.create();
  self._up = vec3.fromValues(0, 1, 0);

  self._fovy = 45;
  self._aspect = canvas.width / canvas.height;
  self._near = 0.1;
  self._far = 1000;

  self._maxRotateX = Math.PI / 2 * 0.95;
  self._rotateX = 0;
  self._rotateY = 0;

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('wheel', handleWheel);
  canvas.addEventListener('blur', clean);
  canvas.addEventListener('keydown', handleKeydown);

  var rotateSpeedY = 360 / canvas.width * window.devicePixelRatio / 180 * Math.PI,
    rotateSpeedX = 180 / canvas.height * window.devicePixelRatio / 180 * Math.PI,
    lastPoint;

  function handleMouseDown(e) {
    if (self._scene._isPresenting) {
      return;
    }
    lastPoint = getClientPoint(e);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', clean);
  }

  function handleMouseMove(e) {
    var point = getClientPoint(e),
      offsetX = point.x - lastPoint.x,
      offsetY = point.y - lastPoint.y,
      rotateX = self._rotateX,
      rotateY = self._rotateY;
    rotateX += -offsetY * rotateSpeedX;
    rotateY += -offsetX * rotateSpeedY;
    self.setRotateX(rotateX);
    self.setRotateY(rotateY);
    lastPoint = point;
  }

  function handleWheel(e) {
    // TODO chrome bug
    e.preventDefault();
    if (self._scene._isPresenting) {
      return;
    }
    var newDistance = self._distance;
    if (e.deltaY > 0) {
      newDistance *= 1.1;
    } else if (e.deltaY < 0) {
      newDistance /= 1.1;
    }
    self.setDistance(newDistance);
  }

  function clean() {
    lastPoint = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', clean);
  }

  function handleKeydown (e) {
    if (self._scene._isPresenting) {
      return;
    }
    var keyCode = e.keyCode,
      left = keyCode === 65 /*A*/ || keyCode === 37 /*Left*/,
      right = keyCode === 68 /*D*/ || keyCode === 39 /*Right*/,
      up = keyCode === 87 /*W*/ || keyCode === 38 /*Up*/,
      down = keyCode === 83 /*S*/ || keyCode === 40 /*Down*/;
    if (!left || !right || !up || !down) {
      return;
    }
    // TODO
  }
};

Camera.prototype.getDistance = function () {
  return this._distance;
};

Camera.prototype.setDistance = function (distance) {
  var self = this;
  if (distance < self._near) {
    distance = self._near;
  }
  if (distance > self._far) {
    distance = self._far;
  }
  self._distance = distance;
  self.invalidateViewMatrix();
};

Camera.prototype.getPosition = function () {
  return this._position;
};

Camera.prototype.setPosition = function (x, y, z) {
  var self = this,
    newPosition = vec3.create(),
    xz;
  if (x.length) {
    z = x[2];
    y = x[1];
    x = x[0];
  }
  vec3.set(self._position, x, y, z);
  vec3.subtract(newPosition, self._position, self._target);
  xz = Math.sqrt(newPosition[0]*newPosition[0] + newPosition[2] * newPosition[2]);
  self._rotateY = Math.atan2(newPosition[0], newPosition[2]);
  self._rotateX = -Math.atan2(newPosition[1], xz);
  self._distance = vec3.length(newPosition);
  self.invalidateViewMatrix();
};

Camera.prototype.getTarget = function () {
  return this._target;
};

Camera.prototype.setTarget = function (x, y, z) {
  var self = this;
  if (x.length) {
    z = x[2];
    y = x[1];
    x = x[0];
  }
  vec3.set(self._target, x, y, z);
  self.invalidateViewMatrix();
};

Camera.prototype.getRotateX = function () {
  return this._rotateX;
};

Camera.prototype.setRotateX = function (rotateX) {
  var self = this,
    maxRotateX = self._maxRotateX;
  if (rotateX > maxRotateX) {
    rotateX = maxRotateX;
  }
  if (rotateX < -maxRotateX) {
    rotateX = -maxRotateX;
  }
  self._rotateX = rotateX;
  self.invalidateViewMatrix();
};

Camera.prototype.getRotateY = function () {
  return this._rotateY;
};

Camera.prototype.setRotateY = function (rotateY) {
  var self = this;
  rotateY = rotateY % (Math.PI * 2);
  self._rotateY = rotateY;
  self.invalidateViewMatrix();
};

Camera.prototype.getViewMatrix = function () {
  var self = this,
    viewMatrix = self._viewMatrix,
    rotateMatrix = self._rotateMatrix,
    position = self._position;
  if (self._viewDirty) {
    mat4.identity(rotateMatrix);
    mat4.translate(rotateMatrix, rotateMatrix, self._target);
    mat4.rotateY(rotateMatrix, rotateMatrix, self._rotateY);
    mat4.rotateX(rotateMatrix, rotateMatrix, self._rotateX);
    vec3.transformMat4(position, vec3.fromValues(0, 0, self._distance), rotateMatrix);
    mat4.lookAt(viewMatrix, position, self._target, self._up);
    self._viewDirty = false;
  }
  return viewMatrix;
};

Camera.prototype.getProjectMatrix = function () {
  var self = this,
    projectMatix = self._projectMatix;
  if (self._projectDirty) {
    mat4.perspective(projectMatix, self._fovy / 180 * Math.PI, self._aspect, self._near, self._far);
    self._projectDirty = false;
  }
  return projectMatix;
};

Camera.prototype.getFovy = function () {
  return this._fovy;
};

Camera.prototype.setFovy = function (fovy) {
  var self = this;
  self._fovy = fovy;
  self.invalidateProjectMatrix();
};

Camera.prototype.getAspect = function () {
  return this._aspect;
};

Camera.prototype.setAspect = function (aspect) {
  var self = this;
  self._aspect = aspect;
  self.invalidateProjectMatrix();
};

Camera.prototype.getNear = function () {
  return this._near;
};

Camera.prototype.setNear = function (near) {
  var self = this;
  self._near = near;
  self.invalidateProjectMatrix();
};

Camera.prototype.getFar = function () {
  return this._far;
};

Camera.prototype.setFar = function (far) {
  var self = this;
  self._far = far;
  self.invalidateProjectMatrix();
};

Camera.prototype.invalidateViewMatrix = function () {
  var self = this;
  self._viewDirty = true;
  self._scene.redraw();
};

Camera.prototype.invalidateProjectMatrix = function () {
  var self = this;
  self._projectDirty = true;
  self._scene.redraw();
};
