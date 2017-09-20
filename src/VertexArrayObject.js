/**
 * VertexArrayObject
 * @param {[Scene]} scene Scene
 * @param {[Object]} options
 * @example
 *     buffers: { position: [], normal: [], uv: [], color: [], index: [] },
 *     offset: 0,
 *     mode: 'TRIANGLES'
 */
var VertexArrayObject = wg.VertexArrayObject = function (scene, options) {
  var self = this,
    buffers = options.buffers,
    gl;

  self._scene = scene;
  gl = self._gl = scene._gl;
  self._vao = gl.createVertexArray();

  gl.bindVertexArray(self._vao);
  Object.keys(buffers).forEach(function (attrName) {
    var attribute = attributesMap[attrName];
    if (!attribute && attrName !== 'index') {
      return;
    }
    var buffer = buffers[attrName];
    var bufferObject = gl.createBuffer();
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

VertexArrayObject.prototype.draw = function () {
  var self = this,
    gl = self._gl;
  gl.bindVertexArray(self._vao);
  if (self._index) {
    if (self._buffers.parts) {
      self._buffers.parts.forEach(function (part) {
        self._scene._sceneProgram.setUniforms({
          u_texture: !!part.image
        });
        if (part.image) {
          var image = part.image;
          if (!image.url) {
            image = part.image = {
              url: image
            };
          }
          var imageTexture = image.texture;
          if (!imageTexture) {
            image.callback = function () {
              self._scene.redraw();
            };
            imageTexture = image.texture = new Texture(gl, image);
          }
          imageTexture.bind(0);
        } else {
          gl.vertexAttrib4fv(attributesMap.color.index, part.color);
        }
        part.counts.forEach(function (item) {
          gl.drawElements(self._mode, item.count, self._element_type, item.offset * self._element_size);
        });
      });
    } else {
       // mode, count, type, offset
      gl.drawElements(self._mode, self._count, self._element_type, self._offset * self._element_size);
    }
  } else {
    gl.drawArrays(self._mode, self._offset, self._count);
  }
};

VertexArrayObject.prototype.dispose = function () {
  var self = this;
  self._gl.deleteVertexArray(self._vao);
  self._vao = null;
};
