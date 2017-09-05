var Camera = wg.Camera = function (canvas, callback) {
  var self = this;
  self._callback = callback;
  self._viewMatrix = mat4.create();
  self._projectMatix = mat4.create();
  self._rotateMatrix = mat4.create();
  self._viewDirty = true;
  self._projectDirty = true;

  self._position = vec3.create();
  self._distance = 10;
  self._target = vec3.create();
  self._up = vec3.fromValues(0, 1, 0);

  self._fovy = 45 / 180 * Math.PI;
  self._aspect = canvas.width / canvas.height;
  self._near = 1;
  self._far = 1000;

  self._rotateX = 0;
  self._rotateY = 0;

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('wheel', handleWheel);
  canvas.addEventListener('blur', clean);

  var rotateSpeedY = 360 / canvas.width * window.devicePixelRatio / 180 * Math.PI,
    rotateSpeedX = 180 / canvas.height * window.devicePixelRatio / 180 * Math.PI,
    maxRotateX = Math.PI / 2 * 0.95,
    lastPoint;

  function handleMouseDown(e) {
    lastPoint = getClientPoint(e);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', clean);
  }

  function handleMouseMove(e) {
    var point = getClientPoint(e),
      offsetX = point.x - lastPoint.x,
      offsetY = point.y - lastPoint.y;
    self._rotateX += -offsetY * rotateSpeedX;
    self._rotateY += -offsetX * rotateSpeedY;
    self._rotateY = self._rotateY % (Math.PI * 2);
    lastPoint = point;
    if (self._rotateX > maxRotateX) {
      self._rotateX = maxRotateX;
    }
    if (self._rotateX < -maxRotateX) {
      self._rotateX = -maxRotateX;
    }
    self._viewDirty = true;
    callback();
  }

  function handleWheel(e) {
    // TODO chrome bug
    e.preventDefault();
    var scale = 0;
    if (e.deltaY > 0) {
      self._distance *= 1.1;
    } else if (e.deltaY < 0) {
      self._distance /= 1.1;
    }
    self._viewDirty = true;
    callback();
  }

  function clean() {
    lastPoint = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', clean);
  }
};

Camera.prototype.getPosition = function () {
  return this._position;
};

Camera.prototype.setPosition = function (x, y, z) {
  var self = this,
    newPosition = vec3.create(),
    xz;
  vec3.set(self._position, x, y, z);
  vec3.subtract(newPosition, self._position, self._target);
  xz = Math.sqrt(newPosition[0]*newPosition[0] + newPosition[2] * newPosition[2]);
  self._rotateY = Math.atan2(newPosition[0], newPosition[2]);
  self._rotateX = -Math.atan2(newPosition[1], xz);
  self._distance = vec3.length(newPosition);
  self._viewDirty = true;
  self._callback();
};

Camera.prototype.getTarget = function () {
  return this._target;
};

Camera.prototype.setTarget = function (x, y, z) {
  var self = this;
  vec3.set(self._target, x, y, z);
  self._viewDirty = true;
  self._callback();
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
    mat4.perspective(projectMatix, self._fovy, self._aspect, self._near, self._far);
    self._projectDirty = false;
  }
  return projectMatix;
};
