var TextureCache = wg.TextureCache = function (gl) {
  var self = this;
  self.gl = gl;
  self.cache = new Map();
  self.trigger = new Trigger();
};

TextureCache.prototype.get = function (image) {
  var self = this,
    cache = self.cache,
    gl = self.gl,
    options;
  var imageTexture = cache.get(image);
  if (!imageTexture) {
    if (typeof image === 'string' ||
        image instanceof HTMLImageElement ||
        image instanceof HTMLCanvasElement ||
        image instanceof HTMLVideoElement) {
      options = {
        url: image
      };
    } else {
      options = image;
    }
    imageTexture = new Texture(gl, options);
    cache.set(image, imageTexture);
  }
  return imageTexture;
};
