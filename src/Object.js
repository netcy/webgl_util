var objectId = 1;
wg.Object = function () {
  var self = this;
  self.id = objectId++;
  self._modelMatrix = mat4.create();
  self._modelViewMatrix = mat4.create();
  self._modelViewProjectMatrix = mat4.create();
  self._normalMatrix = mat3.create();
  self.type = null;
  self._position = vec3.create();
  self._scale = vec3.fromValues(1, 1, 1);
  self._rotation = vec3.fromValues(0, 0, 0);
  self.textureScale = vec2.fromValues(1, 1);
  self.color = [1, 1, 1, 1];
  self._matrixDirty = false;
};

wg.Object.prototype.setPosition = function (x, y, z) {
  var self = this;
  vec3.set(self._position, x, y, z);
  self._matrixDirty = true;
  return self;
};

wg.Object.prototype.setScale = function (x, y, z) {
  var self = this;
  vec3.set(self._scale, x, y, z);
  self._matrixDirty = true;
  return self;
};

wg.Object.prototype.setRotation = function (x, y, z) {
  var self = this;
  vec3.set(self._rotation, x, y, z);
  self._matrixDirty = true;
  return self;
};

wg.Object.prototype._calculateMatrix = function () {
  var self = this;
  if (self._matrixDirty) {
    self._matrixDirty = false;
    mat4.fromTranslation(self._modelMatrix, self._position);
    mat4.rotateX(self._modelMatrix, self._modelMatrix, self._rotation[0]);
    mat4.rotateY(self._modelMatrix, self._modelMatrix, self._rotation[1]);
    mat4.rotateZ(self._modelMatrix, self._modelMatrix, self._rotation[2]);
    mat4.scale(self._modelMatrix, self._modelMatrix, self._scale);
  }
};

wg.Object.prototype.getModelMatrix = function () {
  var self = this;
  if (self._matrixDirty) {
    self._calculateMatrix();
  }
  return self._modelMatrix;
};

wg.Object.prototype._refreshViewMatrix = function (viewMatrix, projectMatrix) {
  var self = this;
  mat4.multiply(self._modelViewMatrix, viewMatrix, self.getModelMatrix());
  mat3.normalFromMat4(self._normalMatrix, self._modelViewMatrix);
  mat4.multiply(self._modelViewProjectMatrix, projectMatrix, self._modelViewMatrix);
};

wg.Object.prototype.fromRotationTranslation = function (orientation, position) {
  var self = this;
  mat4.fromRotationTranslation(self._modelMatrix, orientation, position);
};
