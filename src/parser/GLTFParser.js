var GLTFParser = wg.GLTFParser = {},
  componentTypeMap = {
    5121: Uint8Array, // WebGLRenderingContext.UNSIGNED_BYTE
    5123: Uint16Array, // WebGLRenderingContext.UNSIGNED_SHORT
    5125: Uint32Array, // WebGLRenderingContext.UNSIGNED_INT
    5126: Float32Array, // WebGLRenderingContext.FLOAT
  },
  componentTypeSizeMap = {
    5121: 1, // WebGLRenderingContext.UNSIGNED_BYTE
    5123: 2, // WebGLRenderingContext.UNSIGNED_SHORT
    5125: 4, // WebGLRenderingContext.UNSIGNED_INT
    5126: 4, // WebGLRenderingContext.FLOAT
  },
  modeMap = {
    0: 'POINTS',
    1: 'LINES',
    2: 'LINE_LOOP',
    3: 'LINE_STRIP',
    4: 'TRIANGLES',
    5: 'TRIANGLE_STRIP',
    6: 'TRIANGLE_FAN',
  },
  typeMap = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
  },
  targetPathSizeMap = {
    translation: 3,
    rotation: 4,
    scale: 3,
  },
  textureWrapMap = {
    33071: 'CLAMP_TO_EDGE', // WebGLRenderingContext.CLAMP_TO_EDGE
    10497: 'REPEAT', // WebGLRenderingContext.REPEAT
    33648: 'MIRRORED_REPEAT' // WebGLRenderingContext.MIRRORED_REPEAT
  },
  textureFilterMap = {
    9728: 'NEAREST', // WebGLRenderingContext.NEAREST,
    9729: 'LINEAR', // WebGLRenderingContext.LINEAR,
    9984: 'NEAREST_MIPMAP_NEAREST', // WebGLRenderingContext.NEAREST_MIPMAP_NEAREST,
    9985: 'LINEAR_MIPMAP_NEAREST', // WebGLRenderingContext.LINEAR_MIPMAP_NEAREST,
    9986: 'NEAREST_MIPMAP_LINEAR', // WebGLRenderingContext.NEAREST_MIPMAP_LINEAR,
    9987: 'LINEAR_MIPMAP_LINEAR', // WebGLRenderingContext.LINEAR_MIPMAP_LINEAR,
  };

GLTFParser.parse = function (path, name, callback) {
  path = path + (path.endsWith('/') ? '' : '/');
  ajax(path + name + '.gltf', 'json', function (json) {
    console.log(json);
    var buffers = [],
      currentBufferCount = 0,
      bufferCount = json.buffers.length,
      accessors = [],
      meshes = [],
      skins = [],
      nodes = [],
      animations = [],
      textures = [];

    json.buffers.forEach(function (buffer, index) {
      if (buffer.uri.indexOf('data:') === 0) {
        addBuffer(dataURIToBufferArray(buffer.uri), index);
      } else {
        ajax(path + buffer.uri, 'arraybuffer', function (arraybuffer) {
          addBuffer(arraybuffer, index);
        });
      }
    });

    function addBuffer (arraybuffer, index) {
      buffers[index] = arraybuffer;
      currentBufferCount ++;
      if (currentBufferCount === bufferCount) {
        onBufferReady();
      }
    }

    function onBufferReady () {
      // TODO reuse buffer (stride, offset)
      json.accessors.forEach(function (accessor, index) {
        var arrayType = componentTypeMap[accessor.componentType],
          bufferView = json.bufferViews[accessor.bufferView],
          buffer = buffers[bufferView.buffer],
          offset = (accessor.byteOffset || 0) + (bufferView.byteOffset || 0),
          count = accessor.count,
          length;
        if (bufferView.byteStride) {
          length = count * (bufferView.byteStride / componentTypeSizeMap[accessor.componentType]);
        } else {
          length = count * typeMap[accessor.type];
        }
        // TODO accessor.max, accessor.min
        accessors.push({
          buffer: new arrayType(buffer, offset, length),
          offset: offset,
          count: count,
          stride: bufferView.byteStride || 0,
          type: accessor.componentType
        });
      });

      json.meshes.forEach(function (mesh) {
        var primitives = [],
          meshObject = {
            primitives: primitives
          };
        meshes.push(meshObject);
        (mesh.name != null) && (meshObject.name = mesh.name);
        (mesh.weights != null) && (meshObject.weights = mesh.weights);
        mesh.primitives.forEach(function (primitive) {
          var buffers = {},
            primitiveObject = {
              buffers: buffers
            };
          primitives.push(primitiveObject);
          (primitive.mode != null) && (primitiveObject.mode = modeMap[primitive.mode]);
          Object.keys(primitive.attributes).forEach(function (attributeKey) {
            var accessor = accessors[primitive.attributes[attributeKey]];
            var buffer = {
              data: accessor.buffer,
              type: accessor.type
            };
            (accessor.stride) && (buffer.stride = accessor.stride);
            switch (attributeKey) {
              case 'POSITION':
                buffers.position = buffer;
                break;
              case 'NORMAL':
                buffers.normal = buffer;
                break;
              case 'TANGENT':
                buffers.tangent = buffer;
                break;
              case 'TEXCOORD_0':
                buffers.uv = buffer;
                break;
              case 'TEXCOORD_1':
                break;
              case 'COLOR_0':
                buffers.color = buffer;
                break;
              case 'JOINTS_0':
                buffers.joint = buffer;
                break;
              case 'WEIGHTS_0':
                buffers.weight = buffer;
                break;
            }
          });
          if (primitive.targets) {
            meshObject.targetCount = primitive.targets.length;
            primitive.targets.forEach(function (target, index) {
              buffers['position' + index] = accessors[target.POSITION].buffer;
              if (target.NORMAL) {
                buffers['normal' + index] = accessors[target.NORMAL].buffer;
              }
              if (target.TANGENT) {
                buffers['tangent' + index] = accessors[target.TANGENT].buffer;
              }
            });
          }
          (primitive.material != null) && (primitiveObject.material = primitive.material);
          // TODO primitive.material
          if (primitive.indices != null) {
            buffers.index = accessors[primitive.indices].buffer;
          }
        });
      });

      json.nodes && json.nodes.forEach(function (node) {
        var nodeObject = {},
          matrix;
        nodes.push(nodeObject);
        (node.name != null) && (nodeObject.name = node.name);
        node.rotation && (nodeObject.rotation = node.rotation);
        node.translation && (nodeObject.translation = node.translation);
        node.scale && (nodeObject.scale = node.scale);
        node.weights && (nodeObject.weights = node.weights);
        node.children && (nodeObject.children = node.children);
        if (node.matrix) {
          matrix = mat4.create();
          mat4.copy(matrix, node.matrix);
        } else if (node.rotation || node.scale || node.translation) {
          matrix = mat4.create();
          mat4.fromRotationTranslationScale(
            matrix,
            node.rotation || defaultRotation,
            node.translation || defaultTranslation,
            node.scale || defaultScale
          );
        }
        if (matrix) {
          nodeObject.matrix = matrix;
        }
        if (node.mesh != null) {
          nodeObject.mesh = node.mesh;
        }
        if (node.camera != null) {
          // TODO
        }
      });

      json.skins && json.skins.forEach(function (skin) {
        var inverseBindMatrices = accessors[skin.inverseBindMatrices],
          inverseBindMatricesArray = new Array(skin.joints.length),
          skinObject = {
            joints: skin.joints,
            inverseBindMatrices: inverseBindMatricesArray
          };
        for (var i = 0; i < skin.joints.length; i++ ) {
          inverseBindMatricesArray[i] = new Float32Array(inverseBindMatrices.buffer.buffer, i * 16 * 4, 16);
        }
        skins.push(skinObject);
      });

      json.nodes && json.nodes.forEach(function (node, index) {
        var nodeObject = nodes[index];
        if (node.skin != null) {
          nodeObject.skin = skins[node.skin];
        }
      });

      json.animations && json.animations.forEach(function (animation) {
        var channels = [],
          animationObject = {
            channels: channels
          },
          samples = [];
        animations.push(animationObject);
        (animation.name != null) && (animationObject.name = animation.name);
        animation.samplers.forEach(function (sampler) {
          samples.push({
            input: accessors[sampler.input].buffer,
            interpolation: sampler.interpolation, // 'LINEAR', 'STEP', 'CUBICSPLINE'
            output: accessors[sampler.output],
          });
        });
        animation.channels.forEach(function (channel) {
          var node = nodes[channel.target.node];
          var mesh = meshes[node.mesh];
          var path = channel.target.path;

          var samplerObject = samples[channel.sampler];
          var accessorObject = samplerObject.output;
          var buffer = accessorObject.buffer.buffer;
          var output = [];
          if (path === 'weights') {
            var targetCount = mesh.targetCount;
            var count = accessorObject.count / targetCount;
            for (var i = 0; i < count; i++) {
              var offset = accessorObject.offset + i * 4 * targetCount;
              output.push(new Float32Array(buffer, offset, targetCount));
            }
            samplerObject.splitOutput = output;
            if (!node.weights) {
              node.weights = mesh.weights.slice(0);
            }
          } else {
            var size = targetPathSizeMap[path];
            for (var i = 0; i < accessorObject.count; i++) {
              var offset = accessorObject.offset + i * 4 * size;
              output.push(new Float32Array(buffer, offset, size));
            }
            samplerObject.output = output;
            if (path === 'translation' && !node.translation) {
              node.translation = vec3.create();
            }
            if (path === 'rotation' && !node.rotation) {
              node.rotation = quat.create();
            }
            if (path === 'scale' && !node.scale) {
              node.scale = vec3.create();
            }
          }
          channels.push({
            node: channel.target.node,
            sampler: samplerObject,
            path: path // 'translation', 'rotation', 'scale', 'weights'
          });
        });
      });

      json.textures && json.textures.forEach(function (texture) {
        var textureObject = {};
        textures.push(textureObject);
        if (texture.sampler != null) {
          var sampler = json.samplers[texture.sampler];
          sampler.magFilter && (textureObject.magFilter = textureFilterMap[sampler.magFilter]);
          sampler.minFilter && (textureObject.minFilter = textureFilterMap[sampler.minFilter]);
          sampler.wrapS && (textureObject.wrapS = textureWrapMap[sampler.wrapS]);
          sampler.wrapT && (textureObject.wrapT = textureWrapMap[sampler.wrapT]);
        }
        if (texture.source != null) {
          var image = json.images[texture.source];
          if (image.uri) {
            textureObject.url = path + image.uri;
          }
          // TODO
          // image.bufferView
        }
      });

      callback({
        nodes: nodes,
        scenes: json.scenes,
        meshes: meshes,
        animations: animations,
        textures: textures,
        materials: json.materials,
        // TODO: For Test, should be deleted later
        buffers: buffers,
        accessors: accessors,
      });
    }
  });

  function dataURIToBufferArray (data) {
    var indexOfcomma = data.indexOf(','),
      i, n, result;
    data = data.substr(indexOfcomma + 1);
    data = atob(data);
    n = data.length;
    result = new Uint8Array(n);
    for (i = 0; i < n; i++) {
      result[i] = data.charCodeAt(i);
    }
    return result.buffer;
  }
};
