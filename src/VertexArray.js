/**
 * VertexArray
 * @param {WebGLRenderingContext} gl WebGLRenderingContext
 * @param {Object} options
 * @example
 *     buffers: { position: [], normal: [], uv: [], color: [], index: [] },
 *     offset: 0,
 *     mode: 'TRIANGLES',
 *     instancedAttrs: null // ['offset']
 */
var VertexArray = wg.VertexArray = function (gl, options) {
  var self = this,
    buffers = options.buffers;

  self._gl = gl;
  self._vao = gl.createVertexArray();
  self._bufferMap = {};

  gl.bindVertexArray(self._vao);
  Object.keys(buffers).forEach(function (attrName) {
    var attribute = attributesMap[attrName];
    if (!attribute && attrName !== 'index') {
      return;
    }
    var bufferData = buffers[attrName];
    var bufferObject = gl.createBuffer();
    self._bufferMap[attrName] = bufferObject;
    var element_type, element_size, array;

    if (attrName === 'position') {
      if (!self._index) {
        self._count = bufferData.length / attribute.size;
      }
    }

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
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferData), gl.STATIC_DRAW);
      self._setBufferOptions(attribute, bufferData, options.instancedAttrs && options.instancedAttrs.indexOf(attrName) >= 0);
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

VertexArray.prototype.setBufferDatas = function (name, datas, instanced) {
  var self = this,
    gl = self._gl,
    bufferObject, attribute;
  gl.bindVertexArray(self._vao);
  bufferObject = self._bufferMap[name];
  if (!bufferObject) {
    attribute = attributesMap[name];
    if (!attribute) {
      console.error('Unknown attribute: ' + name);
    }
    self._bufferMap[name] = bufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(datas), gl.STATIC_DRAW);
    self._setBufferOptions(attribute, datas, instanced);
  } else {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(datas), gl.STATIC_DRAW);
  }
};

VertexArray.prototype._setBufferOptions = function (attribute, datas, instanced) {
  //https://stackoverflow.com/questions/38853096/webgl-how-to-bind-values-to-a-mat4-attribute
  var self = this,
    gl = self._gl,
    attributeCount, i;
  if (attribute.size > 4) {
    attributeCount = attribute.size / 4;
    for (i = 0; i < attributeCount; i++) {
      gl.enableVertexAttribArray(attribute.index + i);
      gl.vertexAttribPointer(attribute.index + i, 4, gl.FLOAT, false, 4 * attribute.size, 16 * i);
      if (instanced) {
        gl.vertexAttribDivisor(attribute.index + i, 1);
      }
    }
  } else {
    gl.enableVertexAttribArray(attribute.index);
    // index, size, type, normalized, stride, offset
    gl.vertexAttribPointer(attribute.index, attribute.size, gl.FLOAT, false, 0, 0);
    if (instanced) {
      gl.vertexAttribDivisor(attribute.index, 1);
    }
  }
  if (instanced) {
    self._instanceCount = datas.length / attribute.size;
  }
};

VertexArray.prototype.draw = function (preDrawCallback) {
  var self = this,
    gl = self._gl;
  gl.bindVertexArray(self._vao);
  if (self._parts) {
    self._parts.forEach(function (part) {
      preDrawCallback && preDrawCallback(part);
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
  var self = this;
  Object.keys(self._bufferMap).forEach(function (key) {
    self._gl.deleteBuffer(self._bufferMap[key]);
  });
  self._gl.deleteVertexArray(self._vao);
  self._vao = null;
  self._bufferMap = {};
};