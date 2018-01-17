/**
 * Texture
 * @param {WebGLRenderingContext} gl WebGLRenderingContext
 * @param {Object} options
 * @example
 *     url: default undefinded, should input url or width&height
 *     width: default undefinded
 *     height: default undefinded
 *     flipY: default true when url supported, false or else
 *     mipmap: default true when url supported, false or else
 *     powerOfTwo: default true when url supported, false or else
 *     minFilter: default 'LINEAR_MIPMAP_NEAREST' when url supported, 'LINEAR' or else
 *     magFilter: default 'LINEAR'
 *     wrapS: default 'CLAMP_TO_EDGE', can be 'REPEAT' or 'CLAMP_TO_EDGE'
 *     wrapT: default 'CLAMP_TO_EDGE'
 *     anisotropy: default 16
 *     dataType: default 'UNSIGNED_BYTE'
 *     format: default 'RGBA'
 *     data: default undefinded
 *     type: default '2D', options: '2D', 'CUBE_MAP'
 *       if type is 'CUBE_MAP', then url is array of string
 *       POSITIVE_X, NEGATIVE_X, POSITIVE_Y, NEGATIVE_Y, POSITIVE_Z, NEGATIVE_Z
 */
var Texture = wg.Texture = function (gl, options) {
  var self = this,
    url = options.url;

  self._gl = gl;
  self._options = options;
  self._initialized = false;
  self._imageLoaded = false;
  self._texture = gl.createTexture();
  self._unit = 0;

  var loadImage = function (url) {
    if (url instanceof HTMLImageElement ||
        url instanceof HTMLCanvasElement ||
        url instanceof HTMLVideoElement) {
      imageCount--;
      if (imageCount === 0) {
        self._imageLoaded = true;
      }
      return url;
    }
    var image = new Image();
    gl.initingTextures[url] = image;
    image.onload = function () {
      image.onload = null;
      image.onerror = null;
      delete gl.initingTextures[url];
      imageCount--;
      if (imageCount === 0) {
        self._imageLoaded = true;
        gl.cache.textures.trigger.fire({
          type: 'load',
          source: self
        });
      }
    };
    image.onerror = function () {
      image.onload = null;
      image.onerror = null;
      delete gl.initingTextures[url];
      imageCount--;
      if (imageCount === 0) {
        gl.cache.textures.trigger.fire({
          type: 'error',
          source: self
        });
      }
    };
    image.src = url;
    return image;
  };

  if (url) {
    var imageCount = 1;
    if (options.type === 'CUBE_MAP') {
      imageCount = url.length;
      self._image = [];
      url.forEach(function (urlItem) {
        self._image.push(loadImage(urlItem));
      });
    } else {
      self._image = loadImage(url);
    }
  }
};

Texture.prototype.bind = function (unit) {
  var self = this,
    gl = self._gl,
    options = self._options,
    type = gl['TEXTURE_' + (options.type || '2D')],
    width, height;
  self._unit = unit;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(type, self._texture);

  if (!self._initialized) {
    self._initialized = true;
    width = options.width;
    height = options.height;
    gl.pixelStorei(
      gl.UNPACK_FLIP_Y_WEBGL,
      (options.flipY == null ? false : options.flipY) ? 1 : 0
    );
    gl.texParameteri(
      type,
      gl.TEXTURE_MAG_FILTER,
      gl[options.magFilter || 'LINEAR']
    );
    gl.texParameteri(
      type,
      gl.TEXTURE_MIN_FILTER,
      gl[options.minFilter || 'LINEAR']
    );
    gl.texParameteri(
      type,
      gl.TEXTURE_WRAP_S,
      gl[options.wrapS || 'CLAMP_TO_EDGE']
    );
    gl.texParameteri(
      type,
      gl.TEXTURE_WRAP_T,
      gl[options.wrapT || 'CLAMP_TO_EDGE']
    );

    if (width && height) {
      if (options.type === 'CUBE_MAP') {
        for (var i=0; i<6; i++) {
          gl.texImage2D(
            i + gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            0,
            gl[options.format || 'RGBA'],
            width,
            height,
            0,
            gl[options.format || 'RGBA'],
            gl[options.dataType || 'UNSIGNED_BYTE'],
            options.data
          );
        }
      } else {
        // last parameter must be null, can not be undefined, or else iOS throw Type error
        gl.texImage2D(
          type,
          0,
          gl[options.format || 'RGBA'],
          width,
          height,
          0,
          gl[options.format || 'RGBA'],
          gl[options.dataType || 'UNSIGNED_BYTE'],
          options.data || null
        );
      }
    } else {
      if (!self._imageLoaded) {
        if (options.type === 'CUBE_MAP') {
          for (var i=0; i<6; i++) {
            gl.texImage2D(
              i + gl.TEXTURE_CUBE_MAP_POSITIVE_X, // target
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
        } else {
          gl.texImage2D(
            type, // target
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
  }

  if (self._imageLoaded) {
    self._imageLoaded = false;
    // http://blog.tojicode.com/2012/03/anisotropic-filtering-in-webgl.html
    if (gl._anisotropicExt) {
      var anisotropy = options.anisotropy || 16;
      anisotropy = Math.min(gl._max_anisotropy, anisotropy);
      gl.texParameterf(type, gl._anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, anisotropy);
    }
    gl.pixelStorei(
      gl.UNPACK_FLIP_Y_WEBGL,
      (options.flipY == null ? true : options.flipY) ? 1 : 0
    );
    gl.texParameteri(
      type,
      gl.TEXTURE_MIN_FILTER,
      gl[options.minFilter || 'LINEAR_MIPMAP_NEAREST']
    );
    if (options.type === 'CUBE_MAP') {
      self._image.forEach(function (imageItem, index) {
        gl.texImage2D(
          index + gl.TEXTURE_CUBE_MAP_POSITIVE_X,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          (options.powerOfTwo == null ? true : options.powerOfTwo) ?
            getPowerOfTwoImage(imageItem) : imageItem
        );
      });
    } else {
      gl.texImage2D(
        type,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        (options.powerOfTwo == null ? true : options.powerOfTwo) ?
          getPowerOfTwoImage(self._image) : self._image
      );
    }
    if (options.mipmap == null ? true : options.mipmap) {
      gl.generateMipmap(type);
    }
    self._image = null;
  }
};

Texture.prototype.dispose = function () {
  var self = this,
    gl = self._gl,
    options = self._options,
    type = gl['TEXTURE_' + (options.type || '2D')];
  gl.activeTexture(gl.TEXTURE0 + self._unit);
  gl.bindTexture(type, null);
  gl.deleteTexture(self._texture);
  self._texture = null;
};
