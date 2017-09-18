/**
 * Texture
 * @param {[WebGLRenderingContext]} gl WebGLRenderingContext
 * @param {[Object]} options
 * @example
 *     url: default undefinded, should input url or width&height
 *     width: default undefinded
 *     height: default undefinded
 *     flipY: default true when url supported, false or else
 *     mipmap: default true when url supported, false or else
 *     powerOfTwo: default true when url supported, false or else
 *     minFilter: default 'LINEAR_MIPMAP_NEAREST' when url supported, 'LINEAR' or else
 *     magFilter: default 'LINEAR'
 *     wrapS: default 'CLAMP_TO_EDGE'
 *     wrapT: default 'CLAMP_TO_EDGE'
 *     anisotropy: default 16
 *     dataType: default 'UNSIGNED_BYTE'
 *     format: default 'RGBA'
 */
var Texture = wg.Texture = function (gl, options) {
  var self = this,
    url = options.url,
    callback = options.callback;

  self._gl = gl;
  self._options = options,
    self._initialized = false;
  self._imageLoaded = false;
  self._texture = gl.createTexture();
  self._unit = 0;

  if (url) {
    var image = self._image = new Image();
    gl.initingTextures[url] = image;
    image.onload = function () {
      image.onload = null;
      image.onerror = null;
      delete gl.initingTextures[url];
      self._imageLoaded = true;

      callback && callback();
    };
    image.onerror = function () {
      image.onload = null;
      image.onerror = null;
      delete gl.initingTextures[url];

      callback && callback();
    };
    image.src = url;
  }
};

Texture.prototype.bind = function (unit) {
  var self = this,
    gl = self._gl,
    options = self._options,
    width, height;
  self._unit = unit;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, self._texture);

  if (!self._initialized) {
    self._initialized = true;
    width = options.width;
    height = options.height;
    gl.pixelStorei(
      gl.UNPACK_FLIP_Y_WEBGL,
      (options.flipY == null ? false : options.flipY) ? 1 : 0
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      gl[options.magFilter || 'LINEAR']
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl[options.minFilter || 'LINEAR']
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      gl[options.wrapS || 'CLAMP_TO_EDGE']
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      gl[options.wrapT || 'CLAMP_TO_EDGE']
    );

    if (width && height) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl[options.format || 'RGBA'],
        width,
        height,
        0,
        gl[options.format || 'RGBA'],
        gl[options.dataType || 'UNSIGNED_BYTE'],
        null
      );
    } else {
      if (!self._imageLoaded) {
        gl.texImage2D(
          gl.TEXTURE_2D, // target
          0, // mipmapLevel
          gl.RGBA, // internalFormat
          1, // width
          1, // height
          0, // border
          gl.RGBA, // dataFormat
          gl.UNSIGNED_BYTE, // dataType
          new Uint8Array([127, 127, 127, 255]) // dataArray
        );
      }
    }
  }

  if (self._imageLoaded) {
    self._imageLoaded = false;
    // http://blog.tojicode.com/2012/03/anisotropic-filtering-in-webgl.html
    if (gl._anisotropicExt) {
      var anisotropy = options.anisotropy || 16;
      anisotropy = Math.min(gl._max_anisotropy, anisotropy);
      gl.texParameterf(gl.TEXTURE_2D, gl._anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, anisotropy);
    }
    gl.pixelStorei(
      gl.UNPACK_FLIP_Y_WEBGL,
      (options.flipY == null ? true : options.flipY) ? 1 : 0
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl[options.minFilter || 'LINEAR_MIPMAP_NEAREST']
    );
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      (options.powerOfTwo == null ? true : options.powerOfTwo) ?
        getPowerOfTwoImage(self._image) : self._image
    );
    if (options.mipmap == null ? true : options.mipmap) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    self._image = null;
  }
};

Texture.prototype.dispose = function () {
  var self = this;
  self._gl.activeTexture(gl.TEXTURE0 + self._unit);
  gl.bindTexture(gl.TEXTURE_2D, null);
  self._gl.deleteTexture(self._texture);
  self._texture = null;
};
