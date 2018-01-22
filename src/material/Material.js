var Material = wg.Material = function () {
  var self = this;
  self._dirty = true;
  self._key = '';
  self._keys = [];
  self.textureScale = vec2.fromValues(1, 1);
};

[
  {
    name: 'ambientColor',
    value: [1, 1, 1, 1]
  },
  {
    name: 'ambientImage',
    value: null,
    dirty: true
  },
  {
    name: 'diffuseColor',
    value: [1, 1, 1, 1]
  },
  {
    name: 'diffuseImage',
    value: null,
    dirty: true
  },
  {
    name: 'emissiveColor',
    value: [0, 0, 0, 1]
  },
  {
    name: 'emissiveImage',
    value: null,
    dirty: true
  },
  {
    name: 'specularColor',
    value: [1, 1, 1, 1]
  },
  {
    name: 'specularImage',
    value: null,
    dirty: true
  },
  {
    name: 'doubleSided',
    value: false
  },
  {
    name: 'shininess',
    value: 10.0
  },
  {
    name: 'transparency',
    value: 1.0
  },
  {
    name: 'transparent',
    value: false
  },
  {
    name: 'light',
    value: true,
    dirty: true
  },
  {
    name: 'clipPlane',
    value: null,
    dirty: true
  },
  {
    name: 'wireframe',
    value: false,
    dirty: true
  },
  {
    name: 'wireframeOnly',
    value: true,
    dirty: true
  },
  {
    name: 'wireframeColor',
    value: [69.0/255.0, 132.0/255.0, 206.0/255.0]
  },
  {
    name: 'wireframeWidth',
    value: 1.0
  },
  {
    name: 'vertexColor', // TODO
    value: false,
    dirty: true
  },
  {
    name: 'envImage',
    value: null,
    dirty: true
  },
  {
    name: 'normalImage',
    value: null,
    dirty: true
  },
].forEach(function (property) {
  defineProperty(Material.prototype, property.name, property.value, property.dirty ? function (property, oldValue, newValue) {
    this._dirty = true;
  } : null);
});

Material.prototype.getKey = function () {
  /*WIREFRAME: a_barycentric
  VERTEX_COLOR: a_color
  a_tangent: LIGHT && NORMAL_MAP
  a_normal: (DIFFUSE_MAP && DIFFUSE_CUBE_MAP) || (LIGHT || ENV_MAP)
  a_uv: (DIFFUSE_MAP && !DIFFUSE_CUBE_MAP) || (LIGHT && NORMAL_MAP)*/
  var self = this,
    keys;
  if (self._dirty) {
    self._dirty = false;
    keys = self._keys = []
    if (self._clipPlane) {
      keys.push('CLIPPLANE');
    }
    if (self._wireframe) {
      keys.push('WIREFRAME');
      if (self._wireframeOnly) {
        keys.push('WIREFRAME_ONLY');
      }
    }
    if (!self._wireframe || !self._wireframeOnly) {
      if (self._vertexColor) {
        keys.push('VERTEX_COLOR');
      }
      if (self._diffuseImage) {
        if (self._diffuseImage.type === 'CUBE_MAP') {
          keys.push('DIFFUSE_CUBE_MAP');
        } else {
          keys.push('DIFFUSE_MAP');
        }
      }
      if (self._envImage) {
        keys.push('ENV_MAP');
      }
      if (self._light) {
        keys.push('LIGHT');
        if (self._normalImage) {
          keys.push('NORMAL_MAP');
        }
        if (self._ambientImage) {
          keys.push('AMBIENT_MAP');
        }
        if (self._specularImage) {
          keys.push('SPECULAR_MAP');
        }
        if (self._emissiveImage) {
          keys.push('EMISSIVE_MAP');
        }
      }
    }
    self._key = keys.join(':');
  }
  return self._key;
};
