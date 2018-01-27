var objectId = 1;
wg.Object = function () {
  var self = this;
  self.id = objectId++;
  self._modelMatrix = mat4.create();
  self._worldMatrix = null;
  self._modelViewMatrix = mat4.create();
  self._modelViewInvMatrix = mat3.create();
  self._modelViewProjectMatrix = mat4.create();
  self._normalMatrix = mat3.create();
  self._normalViewMatrix = mat3.create();
  self.type = null;
  self._position = vec3.create();
  self._scale = vec3.fromValues(1, 1, 1);
  self._rotation = vec3.fromValues(0, 0, 0);
  self._parent = null;
  self.children = [];
  self.material = new Material();
};

function refreshWorldMatrix (object) {
  if (!object._parent) {
    return;
  }
  var worldMatrix = object._worldMatrix;
  if (!worldMatrix) {
    worldMatrix = object._worldMatrix = mat4.create();
  }
  mat4.multiply(worldMatrix, object._parent.worldMatrix, object._modelMatrix);
  mat3.normalFromMat4(object._normalMatrix, worldMatrix);
}

function refreshChildWorldMatrix (object) {
  refreshWorldMatrix(object);
  object.children.length && object.children.forEach(function (child) {
    refreshChildWorldMatrix(child);
  });
}

Object.defineProperty(wg.Object.prototype, 'modelMatrix', {
  configurable: true,
  enumerable: true,
  get: function () {
    return this._modelMatrix;
  },
  set: function (value) {
    var self = this;
    self._modelMatrix = value;
    refreshChildWorldMatrix(self);
  }
});

Object.defineProperty(wg.Object.prototype, 'worldMatrix', {
  configurable: true,
  enumerable: true,
  get: function () {
    var self = this;
    if (self.parent) {
      return self._worldMatrix;
    } else {
      return self._modelMatrix;
    }
  },
  set: function (value) {
    // TODO
  }
});

Object.defineProperty(wg.Object.prototype, 'parent', {
  configurable: true,
  enumerable: true,
  get: function () {
    return this._parent;
  },
  set: function (value) {
    var self = this,
      oldParent = self._parent;
    if (value === oldParent) {
      return;
    }
    if (oldParent) {
      oldParent.children.slice(oldParent.children.indexOf(self), 1);
    }
    value.children.push(self);
    self._parent = value;
    if (!value) {
      self._worldMatrix = null;
    }
    refreshChildWorldMatrix(self);
  }
});

wg.Object.prototype.setPosition = function (x, y, z) {
  var self = this;
  vec3.set(self._position, x, y, z);
  self._refreshModelMatrix();
  return self;
};

wg.Object.prototype.setScale = function (x, y, z) {
  var self = this;
  vec3.set(self._scale, x, y, z);
  self._refreshModelMatrix();
  return self;
};

wg.Object.prototype.setRotation = function (x, y, z) {
  var self = this;
  vec3.set(self._rotation, x, y, z);
  self._refreshModelMatrix();
  return self;
};

wg.Object.prototype._refreshModelMatrix = function () {
  var self = this,
    modelMatrix = self._modelMatrix;
  mat4.fromTranslation(modelMatrix, self._position);
  mat4.rotateX(modelMatrix, modelMatrix, self._rotation[0]);
  mat4.rotateY(modelMatrix, modelMatrix, self._rotation[1]);
  mat4.rotateZ(modelMatrix, modelMatrix, self._rotation[2]);
  mat4.scale(modelMatrix, modelMatrix, self._scale);
  refreshChildWorldMatrix(self);
  return modelMatrix;
};

wg.Object.prototype._refreshViewMatrix = function (viewMatrix, projectMatrix) {
  var self = this;
  mat4.multiply(self._modelViewMatrix, viewMatrix, self.worldMatrix);
  mat3.normalFromMat4(self._normalViewMatrix, self._modelViewMatrix);
  mat4.multiply(self._modelViewProjectMatrix, projectMatrix, self._modelViewMatrix);
  mat3.fromMat4(self._modelViewInvMatrix, self._modelViewMatrix);
  mat3.invert(self._modelViewInvMatrix, self._modelViewInvMatrix);
};
