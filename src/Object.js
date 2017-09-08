var objectId = 1;
wg.Object = function () {
  var self = this;
  self.id = objectId++;
  self.modelMatrix = mat4.create();
  self.normalMatrix = mat3.create();
  self.type = null;
  self._position = vec3.create();
  self.color = [1, 1, 1, 1];
};

wg.Object.prototype.setPosition = function (x, y, z) {
  var self = this;
  vec3.set(self._position, x, y, z);
  self._calculateMatrix();
  return self;
};

wg.Object.prototype._calculateMatrix = function () {
  var self = this;
  mat4.fromTranslation(self.modelMatrix, self._position);
  mat3.normalFromMat4(self.normalMatrix, self.modelMatrix);
};
