var Framebuffer = wg.Framebuffer = function (gl, options) {
  var self = this;

  self._gl = gl;
  self._width = options.width;
  self._height = options.height;
  self._dataType = options.dataType;
  self._format = options.format;
  self._depth = options.depth;
  self._stencil = options.stencil;
  self._texture = null;
  self._renderbuffer = null;
  self._framebuffer = null;

  self._init();
};

Framebuffer.prototype._init = function () {
  var self = this,
    gl = self._gl,
    width = self._width,
    height = self._height,
    depth = self._depth,
    stencil = self._stencil,
    framebuffer, renderbuffer, texture, internalFormat, attachment;
  framebuffer = self._framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  texture = self._texture = new Texture(gl, {
    width: width,
    height: height,
    minFilter: 'NEAREST',
    magFilter: 'NEAREST',
    dataType: self._dataType,
    format: self._format
  });
  texture.bind(0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture._texture, 0);

  if (depth || stencil) {
    renderbuffer = self._renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    if (depth && !stencil) {
      internalFormat = gl.DEPTH_COMPONENT16;
      attachment = gl.DEPTH_ATTACHMENT;
    } else if (!depth && stencil) {
      internalFormat = gl.STENCIL_INDEX8;
      attachment = gl.STENCIL_ATTACHMENT;
    } else if (depth && stencil) {
      internalFormat = gl.DEPTH_STENCIL;
      attachment = gl.DEPTH_STENCIL_ATTACHMENT;
    }
    gl.renderbufferStorage(gl.RENDERBUFFER, internalFormat, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, renderbuffer);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

Framebuffer.prototype.getWidth = function () {
  return this._width;
};

Framebuffer.prototype.getHeight = function () {
  return this._height;
};

Framebuffer.prototype.bind = function () {
  var self = this,
    gl = self._gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, self._framebuffer);
  gl.viewport(0, 0, self._width, self._height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
};

Framebuffer.prototype.bindTexture = function (unit) {
  this._texture.bind(unit);
};

Framebuffer.prototype.getTexture = function () {
  return this._texture;
};

Framebuffer.prototype.setSize = function (width, height) {
  var self = this;
  if (self._width === width && self._height === height) {
    return;
  }
  self.dispose();
  self._width = width;
  self._height = height;
  self._init();
};

Framebuffer.prototype.dispose = function () {
  var self = this,
    gl = self._gl;
  self._texture.dispose();
  self._renderbuffer && gl.deleteRenderbuffer(self._renderbuffer);
  gl.deleteFramebuffer(self._framebuffer);
};
