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
      nodes = [];

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
          count = accessor.count * typeMap[accessor.type];
        // accessor.max, accessor.min
        accessors.push(new arrayType(buffer, offset, count));
      });

      json.meshes.forEach(function (mesh) {
        mesh.primitives.forEach(function (primitive) {
          var geometry = {};
          geometries.push(geometry);
          if (primitive.mode) {
            geometry.mode = modeMap[primitive.mode];
          }
          Object.keys(primitive.attributes).forEach(function (attributeKey) {
            var accessor = accessors[primitive.attributes[attributeKey]];
            switch (attributeKey) {
              case 'POSITION':
                geometry.position = accessor;
                break;
              case 'NORMAL':
                geometry.normal = accessor;
                break;
              case 'TANGENT':
                geometry.tangent = accessor;
                break;
              case 'TEXCOORD_0':
                geometry.uv = accessor;
                break;
              case 'TEXCOORD_1':
                break;
              case 'COLOR_0':
                geometry.color = accessor;
                break;
              case 'JOINTS_0':
                break;
              case 'WEIGHTS_0':
                break;
            }
          });
          /*
          primitive.material
          primitive.targets*/
          if (primitive.indices != null) {
            geometry.index = accessors[primitive.indices];
          }
        });
      });

      json.scenes.forEach(function (scene) {
        scene.nodes.forEach(function (nodeIndex) {
          var node = json.nodes[nodeIndex],
            matrix;
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
            if (node.children) {
              node.children.forEach(function (child) {
                ;
              });
            }
            if (node.skin != null) {
              ;
            }
            if (node.weights) {
              ;
            }
            nodes.push({
              matrix: matrix,
              geometry: node.mesh
            });
          }
        });
      });

      callback({
        geometries: geometries,
        nodes: nodes
      })
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