var Material = wg.Material = function () {
  ;
};

Object.defineProperty(Material.prototype, 'diffuseColor', {
  configurable: true,
  enumerable: true,
  get: function () {
    return this._diffuseColor;
  },
  set: function (value) {
    this._diffuseColor = value;
  }
});
