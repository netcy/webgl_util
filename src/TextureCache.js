var TextureCache = wg.TextureCache = function (gl) {
  var self = this;
  self.gl = gl;
  self.cache = {};
  self.trigger = new Trigger();
};

TextureCache.prototype.get = function (url) {
  // TODO same url, but different options
  var self = this,
    cache = self.cache,
    gl = self.gl;
  var imageTexture = cache[url];
  if (!imageTexture) {
    imageTexture = cache[url] = new Texture(gl, {
      url: url
    });
  }
  return imageTexture;
};
