var TextureCache = wg.TextureCache = function (gl) {
  var self = this;
  self.gl = gl;
  self.cache = new Map();
  self.trigger = new Trigger();
};

TextureCache.prototype.get = function (url) {
  var self = this,
    cache = self.cache,
    gl = self.gl,
    options;
  var imageTexture = cache.get(url);
  if (!imageTexture) {
    if (typeof url === 'string') {
      options = {
        url: url
      };
    } else {
      options = url;
    }
    imageTexture = new Texture(gl, options);
    cache.set(url, imageTexture);
  }
  return imageTexture;
};
