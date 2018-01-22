/**
 * VertexArray
 * @param {WebGLRenderingContext} gl WebGLRenderingContext
 * @param {Object} options
 * @example
 *     buffers: {
 *       position: [],
 *       normal: [],
 *       uv: [],
 *       tangent: [],
 *       color: [],
 *       index: [],
 *       targets: [{ position: [], normal: [], tangent: [] }]
 *     },
 *     offset: 0,
 *     mode: 'TRIANGLES'
 */
var VertexArray = wg.VertexArray = function (gl, options) {
  var self = this,
    buffers = options.buffers;

  self._gl = gl;
  self._vao = gl.createVertexArray();
  self._bufferMap = {};
  self._program = null;

  gl.bindVertexArray(self._vao);
  Object.keys(buffers).forEach(function (attrName) {
    if (attrName === 'weights') {
      self._weights = buffers[attrName];
      return;
    }
    var bufferData = buffers[attrName];
    var bufferObject = gl.createBuffer();
    self._bufferMap[attrName] = bufferObject;
    var element_type, element_size, array;

    if (attrName === 'color') {
      self._color = true;
    }

    if (attrName === 'index') {
      self._index = true;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferObject);

      if (bufferData.length <= 256) {
        element_type = 5121; // WebGLRenderingContext.UNSIGNED_BYTE
        element_size = 1;
        array = new Uint8Array(bufferData);
      } else if (bufferData.length <= 65536) {
        element_type = 5123; // WebGLRenderingContext.UNSIGNED_SHORT
        element_size = 2;
        array = new Uint16Array(bufferData);
      } else {
        // TODO check gl.getExtension('OES_element_index_uint');
        element_type = 5125; // WebGLRenderingContext.UNSIGNED_INT
        element_size = 4;
        array = new Uint32Array(bufferData);
      }
      self._element_type = element_type;
      self._element_size = element_size;
      self._count = bufferData.length;
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);
    } else if (attrName === 'targets') {
      self._bufferMap.targets = {};
      // TODO targets.length > 4
      buffers.targets.forEach(function (target, index) {
        createBuffer('position' + index, target.position);
        createBuffer('normal' + index, target.normal);
        createBuffer('tangent' + index, target.tangent);

        function createBuffer (name, data) {
          if (data) {
            var targetBufferObject = gl.createBuffer();
            self._bufferMap[name] = targetBufferObject;
            gl.bindBuffer(gl.ARRAY_BUFFER, targetBufferObject);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
          }
        }
      });
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferData), gl.STATIC_DRAW);
      if (attrName === 'position' && !self._index) {
        self._count = bufferData.length / 3;
      }
      if (attrName === 'offset') {
        self._instanceCount = bufferData.length / 16;
      }
    }
  });
  gl.bindVertexArray(null);

  self._offset = options.offset || 0;
  self._mode = gl[options.mode || 'TRIANGLES'];
  self._parts = options.buffers.parts;
};

VertexArray.prototype.setPosition = function (datas) {
  this.setBufferDatas('position', datas);
};

VertexArray.prototype.setBufferDatas = function (name, datas) {
  var self = this,
    gl = self._gl,
    bufferObject;
  gl.bindVertexArray(self._vao);
  bufferObject = self._bufferMap[name];
  if (!bufferObject) {
    self._bufferMap[name] = bufferObject = gl.createBuffer();
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(datas), gl.STATIC_DRAW);
  if (name === 'offset') {
    self._instanceCount = datas.length / 16;
  }
  if (name === 'position' && !self._index) {
    self._count = datas.length / 3;
  }
};

VertexArray.prototype._setBufferOptions = function (attribute, buffer) {
  //https://stackoverflow.com/questions/38853096/webgl-how-to-bind-values-to-a-mat4-attribute
  var self = this,
    gl = self._gl,
    attributeCount, i;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  if (attribute.size > 4) {
    attributeCount = attribute.size / 4;
    for (i = 0; i < attributeCount; i++) {
      gl.enableVertexAttribArray(attribute.location + i);
      gl.vertexAttribPointer(attribute.location + i, 4, gl.FLOAT, false, 4 * attribute.size, 16 * i);
      if (attribute.name === 'offset') {
        gl.vertexAttribDivisor(attribute.location + i, 1);
      }
    }
  } else {
    gl.enableVertexAttribArray(attribute.location);
    // index, size, type, normalized, stride, offset
    gl.vertexAttribPointer(attribute.location, attribute.size, gl.FLOAT, false, 0, 0);
    if (attribute.name === 'offset') {
      gl.vertexAttribDivisor(attribute.location, 1);
    }
  }
};

VertexArray.prototype.bind = function (program) {
  var self = this,
    gl = self._gl,
    bufferMap = self._bufferMap;
  gl.bindVertexArray(self._vao);
  if (self._program !== program) {
    self._program = program;
    Object.keys(bufferMap).forEach(function (key) {
      var attribute = program._attributes[key],
        buffer = bufferMap[key];
      if (attribute && key !== 'index') {
        self._setBufferOptions(attribute, bufferMap[key]);
      }
    });
  }
};

VertexArray.prototype.draw = function (preDrawCallback) {
  var self = this,
    gl = self._gl;
  if (self._parts) {
    self._parts.forEach(function (part) {
      if (part.material.transparent !== gl._transparent) {
        return;
      }
      preDrawCallback && preDrawCallback(part);
      self.bind(gl._program);
      // TODO instance
      part.counts.forEach(function (item) {
        if (self._index) {
          gl.drawElements(self._mode, item.count, self._element_type, item.offset * self._element_size);
        } else {
          gl.drawArrays(self._mode, item.offset, item.count);
        }
      });
    });
  } else {
    self.bind(gl._program);
    // TODO check if draw*Instanced is supported
    if (self._instanceCount) {
      if (self._index) {
        // mode, count, type, offset, instanceCount
        gl.drawElementsInstanced(self._mode, self._count, self._element_type, self._offset * self._element_size, self._instanceCount);
      } else {
        // mode, first, count, instanceCount
        gl.drawArraysInstanced(self._mode, self._offset, self._count, self._instanceCount);
      }
    } else {
      if (self._index) {
        // mode, count, type, offset
        gl.drawElements(self._mode, self._count, self._element_type, self._offset * self._element_size);
      } else {
        gl.drawArrays(self._mode, self._offset, self._count);
      }
    }
  }
};

VertexArray.prototype.dispose = function () {
  var self = this,
    gl = self._gl,
    bufferMap = self._bufferMap;
  Object.keys(bufferMap).forEach(function (key) {
    gl.deleteBuffer(bufferMap[key]);
  });
  gl.deleteVertexArray(self._vao);
  self._vao = null;
  self._bufferMap = {};
};
