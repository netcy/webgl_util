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
    // weights
  },
  defaultTranslation = vec3.create(),
  defaultScale = vec3.fromValues(1, 1, 1),
  defaultRotation = quat.create();

GLTFParser.parse = function (urlPath, name, callback) {
  urlPath = urlPath + (urlPath.endsWith('/') ? '' : '/');
  ajax(urlPath + name + '.gltf', 'json', function (json) {
    console.log(json);
    var buffers = [],
      currentBufferCount = 0,
      bufferCount = json.buffers.length,
      accessors = [],
      geometries = [],
      nodes = [],
      nodeMap = {};

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
          // bufferView.byteStride, bufferView.target: 34962(ARRAY_BUFFER) 34963(ELEMENT_ARRAY_BUFFER)
          buffer = buffers[bufferView.buffer],
          offset = accessor.byteOffset + bufferView.byteOffset,
          typeSize = typeMap[accessor.type],
          count = accessor.count;
          length = count * typeSize;
        // accessor.max, accessor.min
        accessors.push({
          buffer: new arrayType(buffer, offset, length),
          offset: offset,
          count: count,
          typeSize: typeSize,
          length: length
        });
      });

      json.meshes.forEach(function (mesh) {
        // TODO Handle multi primitives
        // mesh.name
        mesh.primitives.forEach(function (primitive) {
          var geometry = {},
            targets;
          geometries.push(geometry);
          if (primitive.mode != null) {
            geometry.mode = modeMap[primitive.mode];
          }
          Object.keys(primitive.attributes).forEach(function (attributeKey) {
            var buffer = accessors[primitive.attributes[attributeKey]].buffer;
            switch (attributeKey) {
              case 'POSITION':
                geometry.position = buffer;
                break;
              case 'NORMAL':
                geometry.normal = buffer;
                break;
              case 'TANGENT':
                geometry.tangent = buffer;
                break;
              case 'TEXCOORD_0':
                geometry.uv = buffer;
                break;
              case 'TEXCOORD_1':
                break;
              case 'COLOR_0':
                geometry.color = buffer;
                break;
              case 'JOINTS_0':
                break;
              case 'WEIGHTS_0':
                break;
            }
          });
          if (primitive.targets) {
            targets = geometry.targets = [];
            primitive.targets.forEach(function (target) {
              var geometryTarget = {};
              targets.push(geometryTarget);
              if (target.POSITION) {
                geometryTarget.position = accessors[target.POSITION].buffer;
              }
              if (target.NORMAL) {
                geometryTarget.normal = accessors[target.NORMAL].buffer;
              }
              if (target.TANGENT) {
                geometryTarget.tangent = accessors[target.TANGENT].buffer;
              }
            });
            // TODO how multi primitives match one mesh.weights
            if (mesh.weights) {
              geometry.weights = mesh.weights;
            }
          }
          /*
          primitive.material*/
          if (primitive.indices != null) {
            geometry.index = accessors[primitive.indices].buffer;
          }
        });
      });

      // TODO multi scenes
      json.scenes.forEach(function (scene) {
        // scene.name
        scene.nodes && scene.nodes.forEach(function (nodeIndex) {
          var node = json.nodes[nodeIndex],
            matrix, nodeObject;
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
          if (node.camera != null) {
            ;
          } else if (node.mesh != null) {
            nodeObject = {
              name: node.name,
              matrix: matrix,
              geometry: node.mesh,
              rotation: node.rotation || defaultRotation,
              translation: node.translation || defaultTranslation,
              scale: node.scale || defaultScale
            };
            nodes.push(nodeObject);
            nodeMap[nodeIndex] = nodeObject;
            if (node.children) {
              node.children.forEach(function (child) {
                ;
              });
            }
            if (node.skin != null) {
              ;
            }
            // TODO node.weights will override mesh.weights
            if (node.weights) {
              nodeObject.weights = node.weights;
            }
          }
        });
      });

      // TODO mutil animations
      json.animations && json.animations.forEach(function (animation) {
        // animation.name
        var samplerObjects = [];
        animation.samplers.forEach(function (sampler) {
          samplerObjects.push({
            input: accessors[sampler.input].buffer,
            interpolation: sampler.interpolation, // 'LINEAR', 'STEP', 'CUBICSPLINE'
            output: accessors[sampler.output],
          });
        });
        animation.channels.forEach(function (channel) {
          var node = nodeMap[channel.target.node];
          var path = channel.target.path;
          var animations = node.animations || (node.animations = []);

          var samplerObject = samplerObjects[channel.sampler];
          var accessorObject = samplerObject.output;
          var buffer = accessorObject.buffer.buffer;
          var typeSize = accessorObject.typeSize;
          var output = [];
          for (var i=0; i<accessorObject.count; i++) {
            var offset = accessorObject.offset + i * typeSize * targetPathSizeMap[path];
            output.push(new Float32Array(buffer, offset, typeSize));
          }
          samplerObject.output = output;

          animations.push({
            sampler: samplerObject,
            path: path // 'translation', 'rotation', 'scale', 'weights'
          });
        });
      });

      callback({
        geometries: geometries,
        nodes: nodes
      });
    }
  });

  function dataURIToBufferArray (data) {
    var indexOfcomma = data.indexOf(','),
      i = 0,
      n, result;
    data = data.substr(indexOfcomma + 1);
    data = atob(data);
    n = data.length;
    result = new Uint8Array(n);
    for (; i<n; i++) {
      result[i] = data.charCodeAt(i);
    }
    return result.buffer;
  }
};
