var ObjParser = wg.ObjParser = {};
var SPACE = /\s+/;

ObjParser.parseObjMtlUrl = function (urlPath, name, callback) {
  urlPath = urlPath + (urlPath.endsWith('/') ? '' : '/');
  ajax(urlPath + name + '.obj', undefined, function (obj) {
    ajax(urlPath + name + '.mtl', undefined, function (mtl) {
      callback(ObjParser.parseObjMtl(urlPath, obj, mtl));
    });
  });
};

ObjParser.parseObjMtl = function (urlPath, obj, mtl) {
  if (!obj) {
    return null;
  }
  // console.time('parse');
  urlPath = urlPath || '';
  urlPath.endsWith('/') || (urlPath = urlPath + '/');
  urlPath = urlPath + (urlPath.endsWith('/') ? '' : '/');
  var result = {
      vertices: [],
      normals: [],
      uvs: [],
      indices: [],
      index: 0,
      parts: []
    },
    materials = {},
    // Map better than Object
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
    allIndices = new Map(),
    allVertices = [],
    allUvs = [],
    allNormals = [],
    partMap = {},
    materialName, material, counts;

  materials['default'] = new Material();
  // https://en.wikipedia.org/wiki/Wavefront_.obj_file
  // http://paulbourke.net/dataformats/mtl/
  // http://paulbourke.net/dataformats/obj/
  // https://people.cs.clemson.edu/~dhouse/courses/405/docs/brief-mtl-file-format.html
  // http://www.fileformat.info/format/material/
  // http://exocortex.com/blog/extending_wavefront_mtl_to_support_pbr
  mtl && mtl.trim().split('\n').forEach(function (line) {
    line = line.trim();
    if (!line || line.startsWith('#')) {
      return;
    }
    line = line.split(SPACE);
    var command = line.shift();

    switch (command) {
      case 'newmtl': {
        material = line[0];
        material = materials[material] = new Material();
        break;
      }
      // ambient reflectivity of the current material
      case 'Ka': {
        material.ambientColor = [+line[0], +line[1], +line[2], line[3] == null ? 1 : +line[3]];
        break;
      }
      // diffuse reflectivity of the current material
      case 'Kd': {
        material.diffuseColor = [+line[0], +line[1], +line[2], line[3] == null ? 1 : +line[3]];
        break;
      }
      // specular reflectivity of the current material
      case 'Ks': {
        material.specularColor = [+line[0], +line[1], +line[2], line[3] == null ? 1 : +line[3]];
        break;
      }
      // Specifies the specular exponent for the current material.
      // This defines the focus of the specular highlight.
      case 'Ns': {
        material.shininess = +line[0];
        break;
      }
      /*case 'Ni': {
        material.Ni = +line[0];
        break;
      }
      case 'illum': {
        material.illum = +line[0];
        break;
      }*/
      // dissolve for the current material:
      // 1.0 is fully opaque, 0.0 is fully dissolved (completely transparent)
      case 'd': {
        material.transparency = +line[0];
        material.transparent = material.transparency !== 1.0;
        break;
      }
      // diffuse reflectivity of the material
      case 'map_Kd': {
        material.diffuseImage = urlPath + line[line.length - 1];
        break;
      }
      // ambient reflectivity of the material
      case 'map_Ka': {
        material.ambientImage = urlPath + line[line.length - 1];
        break;
      }
      // specular reflectivity of the material
      case 'map_Ks': {
        material.specularImage = urlPath + line[line.length - 1];
        break;
      }
    }
  });

  function addIndex (segment) {
    var index = allIndices.get(segment);
    if (index != null) {
      result.indices.push(index);
    } else {
      allIndices.set(segment, index = result.index);
      result.indices.push(result.index);
      result.index += 1;

      segment = segment.split('/');
      var iii = (parseInt(segment[0]) - 1) * 3;
      if (allVertices[iii + 2] == null) {
        console.error('vertices overflow:', iii, allVertices.length);
      }
      result.vertices.push(allVertices[iii], allVertices[iii + 1], allVertices[iii + 2]);

      if (segment[1]) {
        iii = (parseInt(segment[1]) - 1) * 2;
        if (allUvs[iii + 1] == null) {
          console.error('uvs overflow', iii, allUvs.length);
        }
        result.uvs.push(allUvs[iii], allUvs[iii + 1]);
      }
      if (segment[2]) {
        iii = (parseInt(segment[2]) - 1) * 3;
        if (allNormals[iii + 2] == null) {
          console.error('normals overflow', iii, allNormals.length);
        }
        result.normals.push(allNormals[iii], allNormals[iii + 1], allNormals[iii + 2]);
      }
    }
    counts.count++;
    return index;
  }

  obj.trim().split('\n').forEach(function (lineStr) {
    lineStr = lineStr.trim();
    if (!lineStr || lineStr.charAt(0) === '#') {
      return;
    }
    var line = lineStr.split(SPACE);
    var command = line.shift(),
      i, n, part, offset;
    switch (command) {
      case 'v': {
        allVertices.push(parseFloat(line[0]), parseFloat(line[1]), parseFloat(line[2]));
        break;
      }
      case 'vn': {
        allNormals.push(parseFloat(line[0]), parseFloat(line[1]), parseFloat(line[2]));
        break;
      }
      case 'vt': {
        allUvs.push(parseFloat(line[0]), parseFloat(line[1]));
        break;
      }
      case 'usemtl': {
        materialName = materials[line[0]] ? line[0] : 'default';
        material = materials[materialName];
        offset = counts ? counts.offset + counts.count : 0;
        if (partMap[materialName]) {
          part = partMap[materialName];
          part.counts.push(counts = {
            offset: offset,
            count: 0
          });
        } else {
          result.parts.push(part = partMap[materialName] = {
            counts: [counts = {
              offset: offset,
              count: 0
            }],
            name: materialName,
            material: material
          });
        }
        break;
      }
      case 'f': {
        // https://github.com/frenchtoast747/webgl-obj-loader/blob/master/webgl-obj-loader.js
        for (i=1, n=line.length - 1; i<n; i++) {
          addIndex(line[0]);
          addIndex(line[i]);
          addIndex(line[i + 1]);
        }
        break;
      }
    }
  });
  // console.timeEnd('parse');
  return {
    buffers: {
      position: result.vertices,
      normal: result.normals,
      uv: result.uvs,
      index: result.indices
    },
    parts: result.parts
  };
};
