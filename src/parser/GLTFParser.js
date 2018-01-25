var GLTFParser = wg.GLTFParser = {},
  componentTypeMap = {
    5121: Uint8Array, // WebGLRenderingContext.UNSIGNED_BYTE
    5123: Uint16Array, // WebGLRenderingContext.UNSIGNED_SHORT
    5125: Uint32Array, // WebGLRenderingContext.UNSIGNED_INT
    5126: Float32Array, // WebGLRenderingContext.FLOAT
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
  };

GLTFParser.parse = function (urlPath, name, callback) {
  urlPath = urlPath + (urlPath.endsWith('/') ? '' : '/');
  ajax(urlPath + name + '.gltf', 'json', function (json) {
    console.log(json);
    var buffers = [],
      currentBufferCount = 0,
      bufferCount = json.buffers.length,
      accessors = [],
      meshes = [],
      skins = [],
      nodes = [],
      animations = [];

    json.buffers.forEach(function (buffer, index) {
      if (buffer.uri.indexOf('data:') === 0) {
        addBuffer(dataURIToBufferArray(buffer.uri), index);
      } else {
        ajax(urlPath + buffer.uri, 'arraybuffer', function (arraybuffer) {
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
      json.accessors.forEach(function (accessor) {
        var arrayType = componentTypeMap[accessor.componentType],
          bufferView = json.bufferViews[accessor.bufferView],
          // TODO bufferView.byteStride, bufferView.target: 34962(ARRAY_BUFFER) 34963(ELEMENT_ARRAY_BUFFER)
          buffer = buffers[bufferView.buffer],
          offset = accessor.byteOffset + bufferView.byteOffset,
          typeSize = typeMap[accessor.type],
          count = accessor.count;
          length = count * typeSize;
        // TODO accessor.max, accessor.min
        accessors.push({
          buffer: new arrayType(buffer, offset, length),
          offset: offset,
          count: count,
          typeSize: typeSize,
          length: length
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
            var buffer = accessors[primitive.attributes[attributeKey]].buffer;
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
          inverseBindMatricesArray[i] = new Float32Array(inverseBindMatrices.buffer, i * 16 * 4, 16);
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

      callback({
        nodes: nodes,
        scenes: json.scenes,
        meshes: meshes,
        animations: animations
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
