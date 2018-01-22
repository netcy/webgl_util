wg.geometries = {};
var addGeometry = Util.addGeometry = function (name, geometry) {
  if (!geometry.normal) {
    geometry.normal = calculateNormals(geometry.position, geometry.index);
  }
  if (!geometry.tangent && geometry.uv) {
    geometry = calculateTangent(geometry);
  }
  if (geometry.tangent) {
    geometry = calculateBarycentric(geometry);
  }
  if (geometry.targets) {
    geometry.targets.forEach(function (target) {
      if (!target.normal) {
        target.normal = calculateNormals(target.position, geometry.index);
      }
      // TODO tangent, barycentric
    });
  }
  wg.geometries[name] = geometry;
};

var createCube = Util.createCube = function (side) {
  var hs = side * 0.5;
  var pos = [
    -hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs,  hs, // front
    -hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs, -hs, // back
    -hs,  hs, -hs, -hs,  hs,  hs,  hs,  hs,  hs,  hs,  hs, -hs, // top
    -hs, -hs, -hs,  hs, -hs, -hs,  hs, -hs,  hs, -hs, -hs,  hs, // bottom
     hs, -hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs, // right
    -hs, -hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs  // left
  ];
  var nor = [
    -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,  1.0,
    -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0, -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0,
    -1.0, -1.0, -1.0,  1.0, -1.0, -1.0,  1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
     1.0, -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,
    -1.0, -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0
  ];
  var st = [
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0
  ];
  var idx = [
     0,  1,  2,  0,  2,  3,
     4,  5,  6,  4,  6,  7,
     8,  9, 10,  8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23
  ];
  return {position : pos, normal : nor, uv : st, index : idx};
};

var createTorus = Util.createTorus = function (row, column, irad, orad) {
  var pos = [],
    nor = [],
    st = [],
    idx = [];
  for (var i = 0; i <= row; i++) {
    var r = Math.PI * 2 / row * i;
    var rr = Math.cos(r);
    var ry = Math.sin(r);
    for (var ii = 0; ii <= column; ii++) {
      var tr = Math.PI * 2 / column * ii;
      var tx = (rr * irad + orad) * Math.cos(tr);
      var ty = ry * irad;
      var tz = (rr * irad + orad) * Math.sin(tr);
      var rx = rr * Math.cos(tr);
      var rz = rr * Math.sin(tr);
      var rs = 1 / column * ii;
      var rt = 1 / row * i + 0.5;
      if (rt > 1.0) {
        rt -= 1.0;
      }
      rt = 1.0 - rt;
      pos.push(tx, ty, tz);
      nor.push(rx, ry, rz);
      st.push(rs, rt);
    }
  }
  for (i = 0; i < row; i++) {
    for (ii = 0; ii < column; ii++) {
      r = (column + 1) * i + ii;
      idx.push(r, r + column + 1, r + 1);
      idx.push(r + column + 1, r + column + 2, r + 1);
    }
  }
  return {
    position: pos,
    normal: nor,
    uv: st,
    index: idx
  };
};

var createSphere = Util.createSphere = function (row, column, rad) {
  var pos = [],
    nor = [],
    col = [],
    st = [],
    idx = [];
  for (var i = 0; i <= row; i++) {
    var r = Math.PI / row * i;
    var ry = Math.cos(r);
    var rr = Math.sin(r);
    for (var ii = 0; ii <= column; ii++) {
      var tr = Math.PI * 2 / column * ii;
      var tx = rr * rad * Math.cos(tr);
      var ty = ry * rad;
      var tz = rr * rad * Math.sin(tr);
      var rx = rr * Math.cos(tr);
      var rz = rr * Math.sin(tr);
      pos.push(tx, ty, tz);
      nor.push(rx, ry, rz);
      st.push(1 - 1 / column * ii, 1 / row * i);
    }
  }
  r = 0;
  for (i = 0; i < row; i++) {
    for (ii = 0; ii < column; ii++) {
      r = (column + 1) * i + ii;
      idx.push(r, r + 1, r + column + 2);
      idx.push(r, r + column + 2, r + column + 1);
    }
  }
  return {
    position: pos,
    normal: nor,
    uv: st,
    index: idx
  };
};

function createTruncatedCone(
    bottomRadius,
    topRadius,
    height,
    radialSubdivisions,
    verticalSubdivisions,
    opt_topCap,
    opt_bottomCap) {
  if (radialSubdivisions < 3) {
    throw Error('radialSubdivisions must be 3 or greater');
  }

  if (verticalSubdivisions < 1) {
    throw Error('verticalSubdivisions must be 1 or greater');
  }

  var topCap = (opt_topCap === undefined) ? true : opt_topCap;
  var bottomCap = (opt_bottomCap === undefined) ? true : opt_bottomCap;

  var extra = (topCap ? 2 : 0) + (bottomCap ? 2 : 0);

  var numVertices = (radialSubdivisions + 1) * (verticalSubdivisions + 1 + extra);
  var positions = [];
  var normals   = [];
  var texCoords = [];
  var indices   = [];

  var vertsAroundEdge = radialSubdivisions + 1;

  // The slant of the cone is constant across its surface
  var slant = Math.atan2(bottomRadius - topRadius, height);
  var cosSlant = Math.cos(slant);
  var sinSlant = Math.sin(slant);

  var start = topCap ? -2 : 0;
  var end = verticalSubdivisions + (bottomCap ? 2 : 0);

  for (var yy = start; yy <= end; ++yy) {
    var v = yy / verticalSubdivisions;
    var y = height * v;
    var ringRadius;
    if (yy < 0) {
      y = 0;
      v = 1;
      ringRadius = bottomRadius;
    } else if (yy > verticalSubdivisions) {
      y = height;
      v = 1;
      ringRadius = topRadius;
    } else {
      ringRadius = bottomRadius +
        (topRadius - bottomRadius) * (yy / verticalSubdivisions);
    }
    if (yy === -2 || yy === verticalSubdivisions + 2) {
      ringRadius = 0;
      v = 0;
    }
    y -= height / 2;
    for (var ii = 0; ii < vertsAroundEdge; ++ii) {
      var sin = Math.sin(ii * Math.PI * 2 / radialSubdivisions);
      var cos = Math.cos(ii * Math.PI * 2 / radialSubdivisions);
      positions.push(sin * ringRadius, y, cos * ringRadius);
      normals.push(
          (yy < 0 || yy > verticalSubdivisions) ? 0 : (sin * cosSlant),
          (yy < 0) ? -1 : (yy > verticalSubdivisions ? 1 : sinSlant),
          (yy < 0 || yy > verticalSubdivisions) ? 0 : (cos * cosSlant));
      texCoords.push((ii / radialSubdivisions), 1 - v);
    }
  }

  for (yy = 0; yy < verticalSubdivisions + extra; ++yy) {
    for (ii = 0; ii < radialSubdivisions; ++ii) {
      indices.push(vertsAroundEdge * (yy + 0) + 0 + ii,
                   vertsAroundEdge * (yy + 0) + 1 + ii,
                   vertsAroundEdge * (yy + 1) + 1 + ii);
      indices.push(vertsAroundEdge * (yy + 0) + 0 + ii,
                   vertsAroundEdge * (yy + 1) + 1 + ii,
                   vertsAroundEdge * (yy + 1) + 0 + ii);
    }
  }

  return {
    position: positions,
    normal: normals,
    uv: texCoords,
    index: indices,
  };
}


//indices have to be completely defined NO TRIANGLE_STRIP only TRIANGLES
function calculateNormals (vs, ind) {
  var x = 0;
  var y = 1;
  var z = 2;

  var ns = [];
  for (var i = 0; i < vs.length; i = i + 3) { //for each vertex, initialize normal x, normal y, normal z
    ns[i + x] = 0.0;
    ns[i + y] = 0.0;
    ns[i + z] = 0.0;
  }

  // TODO ind is null
  for (var i = 0; i < ind.length; i = i + 3) { //we work on triads of vertices to calculate normals so i = i+3 (i = indices index)
    var v1 = [];
    var v2 = [];
    var normal = [];
    //p2 - p1
    v1[x] = vs[3 * ind[i + 2] + x] - vs[3 * ind[i + 1] + x];
    v1[y] = vs[3 * ind[i + 2] + y] - vs[3 * ind[i + 1] + y];
    v1[z] = vs[3 * ind[i + 2] + z] - vs[3 * ind[i + 1] + z];
    //p0 - p1
    v2[x] = vs[3 * ind[i] + x] - vs[3 * ind[i + 1] + x];
    v2[y] = vs[3 * ind[i] + y] - vs[3 * ind[i + 1] + y];
    v2[z] = vs[3 * ind[i] + z] - vs[3 * ind[i + 1] + z];
    //cross product by Sarrus Rule
    normal[x] = v1[y] * v2[z] - v1[z] * v2[y];
    normal[y] = v1[z] * v2[x] - v1[x] * v2[z];
    normal[z] = v1[x] * v2[y] - v1[y] * v2[x];
    for (var j = 0; j < 3; j++) { //update the normals of that triangle: sum of vectors
      ns[3 * ind[i + j] + x] = ns[3 * ind[i + j] + x] + normal[x];
      ns[3 * ind[i + j] + y] = ns[3 * ind[i + j] + y] + normal[y];
      ns[3 * ind[i + j] + z] = ns[3 * ind[i + j] + z] + normal[z];
    }
  }
  //normalize the result
  for (var i = 0; i < vs.length; i = i + 3) { //the increment here is because each vertex occurs with an offset of 3 in the array (due to x, y, z contiguous values)

    var nn = [];
    nn[x] = ns[i + x];
    nn[y] = ns[i + y];
    nn[z] = ns[i + z];

    var len = Math.sqrt((nn[x] * nn[x]) + (nn[y] * nn[y]) + (nn[z] * nn[z]));
    if (len == 0) len = 1.0;

    nn[x] = nn[x] / len;
    nn[y] = nn[y] / len;
    nn[z] = nn[z] / len;

    ns[i + x] = nn[x];
    ns[i + y] = nn[y];
    ns[i + z] = nn[z];
  }

  return new Float32Array(ns);
}

var calculateTangent = Util.calculateTangent = function (geometry) {
  var indices = geometry.index,
    uvs = geometry.uv,
    vertices = geometry.position,
    tangents = [],
    gtangent = geometry.tangent = [],
    v0 = vec3.create(),
    v1 = vec3.create(),
    v2 = vec3.create(),
    u0 = vec2.create(),
    u1 = vec2.create(),
    u2 = vec2.create(),
    edge1 = vec3.create(),
    edge2 = vec3.create(),
    tangent = vec3.create();
  for (var i = 0, n = vertices.length / 3; i < n; i++) {
    tangents[i] = vec3.create();
  }
  for (var i = 0, n = indices.length; i < n; i += 3) {
    var i0 = indices[i];
    var i1 = indices[i + 1];
    var i2 = indices[i + 2];

    vec3.set(v0, vertices[i0 * 3], vertices[i0 * 3 + 1], vertices[i0 * 3 + 2]);
    vec3.set(v1, vertices[i1 * 3], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2]);
    vec3.set(v2, vertices[i2 * 3], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2]);

    vec3.subtract(edge1, v1, v0);
    vec3.subtract(edge2, v2, v0);

    vec2.set(u0, uvs[i0 * 2], uvs[i0 * 2 + 1]);
    vec2.set(u1, uvs[i1 * 2], uvs[i1 * 2 + 1]);
    vec2.set(u2, uvs[i2 * 2], uvs[i2 * 2 + 1]);

    var deltaU1 = u1[0] - u0[0];
    var deltaV1 = u1[1] - u0[1];
    var deltaU2 = u2[0] - u0[0];
    var deltaV2 = u2[1] - u0[1];

    var f = 1.0 / (deltaU1 * deltaV2 - deltaU2 * deltaV1);

    vec3.set(tangent, f * (deltaV2 * edge1[0] - deltaV1 * edge2[0]),
      f * (deltaV2 * edge1[1] - deltaV1 * edge2[1]),
      f * (deltaV2 * edge1[2] - deltaV1 * edge2[2]));

    vec3.add(tangents[i0], tangents[i0], tangent);
    vec3.add(tangents[i1], tangents[i1], tangent);
    vec3.add(tangents[i2], tangents[i2], tangent);
  }

  for (var i = 0, n = tangents.length; i < n; i++) {
    vec3.normalize(tangents[i], tangents[i]);
    gtangent.push(tangents[i][0], tangents[i][1], tangents[i][2]);
  }
  return geometry;
}

var calculateBarycentric = Util.calculateBarycentric = function (geometry) {
  var indices = geometry.index,
    uvs = geometry.uv,
    vertices = geometry.position,
    normals = geometry.normal,
    tangents = geometry.tangent,
    newUv = [],
    newPosition = [],
    newNormal = [],
    newTangent = [],
    barycentric = [];
  for (var i = 0, n = indices.length; i < n; i++) {
    var index = indices[i];
    newUv.push(uvs[index * 2], uvs[index * 2 + 1]);
    newPosition.push(vertices[index * 3], vertices[index * 3 + 1], vertices[index * 3 + 2]);
    newNormal.push(normals[index * 3], normals[index * 3 + 1], normals[index * 3 + 2]);
    newTangent.push(tangents[index * 3], tangents[index * 3 + 1], tangents[index * 3 + 2]);
    if (i % 3 === 0) {
      barycentric.push(1, 0, 0);
    } else if (i % 3 === 1) {
      barycentric.push(0, 1, 0);
    } else {
      barycentric.push(0, 0, 1);
    }
  }
  return {
    uv: newUv,
    position: newPosition,
    normal: newNormal,
    tangent: newTangent,
    barycentric: barycentric,
    parts: geometry.parts
  }
};

function createPlane () {
  return {
    position: [
      -1.0, -1.0, 0.0,
       1.0, -1.0, 0.0,
       1.0,  1.0, 0.0,
      -1.0, 1.0, 0.0
    ],
    normal: [
      0.0, 0.0, 1.0,
      0.0, 0.0, 1.0,
      0.0, 0.0, 1.0,
      0.0, 0.0, 1.0
    ],
    uv: [
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0
    ],
    index: [
      0, 1, 2,
      0, 2, 3
    ]
  };
}

addGeometry('cube', createCube(1));
addGeometry('torus', createTorus(32, 32, 0.5, 1));
addGeometry('sphere', createSphere(32, 32, 0.5));
addGeometry('cone', createTruncatedCone(0.5, 0, 1, 32, 32, false, true));
addGeometry('plane', createPlane());
