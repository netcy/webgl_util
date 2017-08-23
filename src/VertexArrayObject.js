/**
 * VertexArrayObject
 * @param {[WebGLRenderingContext]} gl WebGLRenderingContext
 * @param {[Object]} options
 * @example
 *     buffers: { array: [], index: 0, size: 3, type: 'FLOAT' }
 *     offset: default 0
 *     mode: default 'TRIANGLES'
 */
var VertexArrayObject = wg.VertexArrayObject = function (gl, options) {
  var self = this,
    buffers = options.buffers;

  self._gl = gl;
  self._vao = gl.createVertexArray();

  gl.bindVertexArray(self._vao);
  Object.keys(buffers).forEach(function (attrName) {
    var buffer = buffers[attrName];
    var bufferObject = gl.createBuffer();
    var element_type, element_size, array;

    if (attrName === 'position') {
      if (!self._index) {
        self._count = buffer.array.length / buffer.size;
      }
    }

    if (attrName === 'index') {
      self._index = true;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferObject);

      if (buffer.array.length <= 256) {
        element_type = 5121; // WebGLRenderingContext.UNSIGNED_BYTE
        element_size = 1;
        array = new Uint8Array(buffer.array);
      } else if (buffer.array.length <= 65536) {
        element_type = 5123; // WebGLRenderingContext.UNSIGNED_SHORT
        element_size = 2;
        array = new Uint16Array(buffer.array);
      } else {
        // TODO check gl.getExtension('OES_element_index_uint');
        element_type = 5125; // WebGLRenderingContext.UNSIGNED_INT
        element_size = 4;
        array = new Uint32Array(buffer.array);
      }
      self._element_type = element_type;
      self._element_size = element_size;
      self._count = buffer.array.length;
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buffer.array), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(buffer.index);
      // index, size, type, normalized, stride, offset
      gl.vertexAttribPointer(buffer.index, buffer.size, gl[buffer.type], false, 0, 0);
    }
  });
  gl.bindVertexArray(null);

  self._offset = options.offset || 0;
  self._mode = gl[options.mode || 'TRIANGLES'];
};

VertexArrayObject.prototype.draw = function () {
  var self = this,
    gl = self._gl;
  gl.bindVertexArray(self._vao);
  if (self._index) {
     // mode, count, type, offset
    gl.drawElements(self._mode, self._count, self._element_type, self._offset * self._element_size);
  } else {
    gl.drawArrays(self._mode, self._offset, self._count);
  }
};

VertexArrayObject.prototype.dispose = function () {
  var self = this;
  self._gl.deleteVertexArray(self._vao);
  self._vao = null;
};
