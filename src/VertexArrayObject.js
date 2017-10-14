/**
 * VertexArrayObject
 * @param {[WebGLRenderingContext]} gl WebGLRenderingContext
 * @param {[Object]} options
 * @example
 *     buffers: { position: [], normal: [], uv: [], color: [], index: [] },
 *     offset: 0,
 *     mode: 'TRIANGLES'
 */
var VertexArrayObject = wg.VertexArrayObject = function (gl, options) {
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
    var buffer = buffers[attrName];
    var bufferObject = gl.createBuffer();
    self._bufferMap[attrName] = bufferObject;
    var element_type, element_size, array;

    if (attrName === 'position') {
      if (!self._index) {
        self._count = buffer.length / attribute.size;
      }
    }

    if (attrName === 'color') {
      self._color = true;
    }

    if (attrName === 'index') {
      self._index = true;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferObject);

      if (buffer.length <= 256) {
        element_type = 5121; // WebGLRenderingContext.UNSIGNED_BYTE
        element_size = 1;
        array = new Uint8Array(buffer);
      } else if (buffer.length <= 65536) {
        element_type = 5123; // WebGLRenderingContext.UNSIGNED_SHORT
        element_size = 2;
        array = new Uint16Array(buffer);
      } else {
        // TODO check gl.getExtension('OES_element_index_uint');
        element_type = 5125; // WebGLRenderingContext.UNSIGNED_INT
        element_size = 4;
        array = new Uint32Array(buffer);
      }
      self._element_type = element_type;
      self._element_size = element_size;
      self._count = buffer.length;
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buffer), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(attribute.index);
      // index, size, type, normalized, stride, offset
      gl.vertexAttribPointer(attribute.index, attribute.size, gl.FLOAT, false, 0, 0);
    }
  });
  gl.bindVertexArray(null);

  self._offset = options.offset || 0;
  self._mode = gl[options.mode || 'TRIANGLES'];
  self._buffers = options.buffers;
};

VertexArrayObject.prototype.setPosition = function (position) {
  var self = this,
    gl = self._gl;
  gl.bindVertexArray(self._vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, self._bufferMap['position']);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.STATIC_DRAW);
};

VertexArrayObject.prototype.draw = function (preDrawCallback) {
  var self = this,
    gl = self._gl;
  gl.bindVertexArray(self._vao);
  if (self._buffers.parts) {
    self._buffers.parts.forEach(function (part) {
      preDrawCallback && preDrawCallback(part);
      part.counts.forEach(function (item) {
        if (self._index) {
          gl.drawElements(self._mode, item.count, self._element_type, item.offset * self._element_size);
        } else {
          gl.drawArrays(self._mode, item.offset, item.count);
        }
      });
    });
  } else {
    if (self._index) {
       // mode, count, type, offset
      gl.drawElements(self._mode, self._count, self._element_type, self._offset * self._element_size);
    } else {
      gl.drawArrays(self._mode, self._offset, self._count);
    }
  }
};

VertexArrayObject.prototype.dispose = function () {
  var self = this;
  self._gl.deleteVertexArray(self._vao);
  self._vao = null;
  self._bufferMap = {};
};
