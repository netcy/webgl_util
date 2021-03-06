attribute vec3 a_position;
uniform mat4 u_modelViewProjectMatrix;

#ifdef VERTEX_COLOR
  attribute vec4 a_color;
  varying vec4 v_color;
#endif

#ifdef MORPH_TARGETS
  #if MORPH_TARGETS_COUNT > 0
    attribute vec3 a_position0;
  #endif
  #if MORPH_TARGETS_COUNT > 1
    attribute vec3 a_position1;
  #endif
  #if MORPH_TARGETS_COUNT > 2
    attribute vec3 a_position2;
  #endif
  #if MORPH_TARGETS_COUNT > 3
    attribute vec3 a_position3;
  #endif
  uniform float u_weights[MORPH_TARGETS_COUNT];
#endif

#ifdef SKIN
  attribute vec4 a_joint;
  attribute vec4 a_weight;
  uniform mat4 u_jointMatrix[SKIN_JOINTS_COUNT];
#endif

#if (defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) || defined(ENV_MAP))
  attribute vec3 a_normal;
  #ifdef MORPH_TARGETS
    #if MORPH_TARGETS_COUNT > 0
      attribute vec3 a_normal0;
    #endif
    #if MORPH_TARGETS_COUNT > 1
      attribute vec3 a_normal1;
    #endif
    #if MORPH_TARGETS_COUNT > 2
      attribute vec3 a_normal2;
    #endif
    #if MORPH_TARGETS_COUNT > 3
      attribute vec3 a_normal3;
    #endif
  #endif
#endif

#if defined(LIGHT) && defined(NORMAL_MAP)
  attribute vec3 a_tangent;
  #ifdef MORPH_TARGETS
    #if MORPH_TARGETS_COUNT > 0
      attribute vec3 a_tangent0;
    #endif
    #if MORPH_TARGETS_COUNT > 1
      attribute vec3 a_tangent1;
    #endif
    #if MORPH_TARGETS_COUNT > 2
      attribute vec3 a_tangent2;
    #endif
    #if MORPH_TARGETS_COUNT > 3
      attribute vec3 a_tangent3;
    #endif
  #endif
#endif

#if (defined(DIFFUSE_MAP) && !defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) && defined(NORMAL_MAP))
  attribute vec2 a_uv;
  uniform vec2 u_textureScale;
  varying vec2 v_uv;
#endif

#if defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)
  uniform mat3 u_normalMatrix;
  varying vec3 v_normal;
#endif

#if (defined(LIGHT) && !defined(NORMAL_MAP)) || defined(ENV_MAP)
  varying vec3 v_normalView;
#endif

#ifdef ENV_MAP
  uniform mat4 u_viewMatrix;
  varying vec4 v_viewPosition;
#endif

#if defined(LIGHT) || defined(ENV_MAP)
  uniform mat3 u_normalViewMatrix;
#endif

#ifdef LIGHT
  uniform mat4 u_modelViewMatrix;
  uniform vec3 u_lightPosition;
  varying vec3 v_lightDirection;
  varying vec3 v_eyeDirection;
#endif

#ifdef WIREFRAME
  attribute vec3 a_barycentric;
  varying vec3 v_barycentric;
#endif

#ifdef CLIPPLANE
  uniform mat4 u_modelMatrix;
  varying vec4 v_position;
#endif

void main () {
  vec3 position = a_position;

  #ifdef MORPH_TARGETS
    #if MORPH_TARGETS_COUNT > 0
      position += a_position0 * u_weights[0];
    #endif
    #if MORPH_TARGETS_COUNT > 1
      position += a_position1 * u_weights[1];
    #endif
    #if MORPH_TARGETS_COUNT > 2
      position += a_position2 * u_weights[2];
    #endif
    #if MORPH_TARGETS_COUNT > 3
      position += a_position3 * u_weights[3];
    #endif
  #endif

  vec4 finalPosition = vec4(position, 1.0);

  #ifdef SKIN
    mat4 skinMat =
      a_weight.x * u_jointMatrix[int(a_joint.x)] +
      a_weight.y * u_jointMatrix[int(a_joint.y)] +
      a_weight.z * u_jointMatrix[int(a_joint.z)] +
      a_weight.w * u_jointMatrix[int(a_joint.w)];
    finalPosition = skinMat * finalPosition;
  #endif

  #if (defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) || defined(ENV_MAP))
    vec3 finalNormal = a_normal;
    #ifdef MORPH_TARGETS
      #if MORPH_TARGETS_COUNT > 0
        finalNormal += a_normal0 * u_weights[0];
      #endif
      #if MORPH_TARGETS_COUNT > 1
        finalNormal += a_normal1 * u_weights[1];
      #endif
      #if MORPH_TARGETS_COUNT > 2
        finalNormal += a_normal2 * u_weights[2];
      #endif
      #if MORPH_TARGETS_COUNT > 3
        finalNormal += a_normal3 * u_weights[3];
      #endif
    #endif
  #endif

  #if defined(LIGHT) && defined(NORMAL_MAP)
    vec3 finalTangent = a_tangent;
    #ifdef MORPH_TARGETS
      #if MORPH_TARGETS_COUNT > 0
        finalTangent += a_tangent0 * u_weights[0];
      #endif
      #if MORPH_TARGETS_COUNT > 1
        finalTangent += a_tangent1 * u_weights[1];
      #endif
      #if MORPH_TARGETS_COUNT > 2
        finalTangent += a_tangent2 * u_weights[2];
      #endif
      #if MORPH_TARGETS_COUNT > 3
        finalTangent += a_tangent3 * u_weights[3];
      #endif
    #endif
  #endif

  #if !defined(WIREFRAME) || !defined(WIREFRAME_ONLY)
    #if defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)
      v_normal = u_normalMatrix * finalNormal;
    #endif

    #if (defined(DIFFUSE_MAP) && !defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) && defined(NORMAL_MAP))
      v_uv = a_uv * u_textureScale;
    #endif

    #ifdef LIGHT
      vec3 viewPosition = (u_modelViewMatrix * finalPosition).xyz;
      v_lightDirection = u_lightPosition - viewPosition;
      v_eyeDirection = -viewPosition;

      #ifdef NORMAL_MAP
        mat3 modelViewMatrix3 = mat3(u_modelViewMatrix);
        vec3 normal = normalize(modelViewMatrix3 * finalNormal);
        vec3 tangent = normalize(modelViewMatrix3 * finalTangent);
        vec3 bitangent = cross(normal, tangent);
        mat3 tbnMatrix = mat3(
          tangent.x, bitangent.x, normal.x,
          tangent.y, bitangent.y, normal.y,
          tangent.z, bitangent.z, normal.z
        );
        v_lightDirection = tbnMatrix * v_lightDirection;
        v_eyeDirection = tbnMatrix * v_eyeDirection;
      #else
        v_normalView = u_normalViewMatrix * finalNormal;
      #endif
    #else
      #if defined(ENV_MAP)
        v_normalView = u_normalViewMatrix * finalNormal;
      #endif
    #endif

    #ifdef ENV_MAP
      v_viewPosition = u_viewMatrix * finalPosition;
    #endif

    #ifdef VERTEX_COLOR
      v_color = a_color;
    #endif
  #endif

  #ifdef WIREFRAME
    v_barycentric = a_barycentric;
  #endif

  #ifdef CLIPPLANE
    v_position = finalPosition;
  #endif

  gl_Position = u_modelViewProjectMatrix * finalPosition;
}
