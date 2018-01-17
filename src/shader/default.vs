attribute vec3 a_position;
uniform mat4 u_modelViewProjectMatrix;

#ifdef VERTEX_COLOR
  attribute vec4 a_color;
  varying vec4 v_color;
#endif

#if (defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) || defined(ENV_MAP))
  attribute vec3 a_normal;
#endif

#if defined(LIGHT) && defined(NORMAL_MAP)
  attribute vec3 a_tangent;
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
  vec4 position = vec4(a_position, 1.0);
  gl_Position = u_modelViewProjectMatrix * position;

  #if !defined(WIREFRAME) || !defined(WIREFRAME_ONLY)
    #if defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)
      v_normal = u_normalMatrix * a_normal;
    #endif

    #if (defined(DIFFUSE_MAP) && !defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) && defined(NORMAL_MAP))
      v_uv = a_uv * u_textureScale;
    #endif

    #ifdef LIGHT
      vec3 viewPosition = (u_modelViewMatrix * position).xyz;
      v_lightDirection = u_lightPosition - viewPosition;
      v_eyeDirection = -viewPosition;

      #ifdef NORMAL_MAP
        mat3 modelViewMatrix3 = mat3(u_modelViewMatrix);
        vec3 normal = normalize(modelViewMatrix3 * a_normal);
        vec3 tangent = normalize(modelViewMatrix3 * a_tangent);
        vec3 bitangent = cross(normal, tangent);
        mat3 tbnMatrix = mat3(
          tangent.x, bitangent.x, normal.x,
          tangent.y, bitangent.y, normal.y,
          tangent.z, bitangent.z, normal.z
        );
        v_lightDirection = tbnMatrix * v_lightDirection;
        v_eyeDirection = tbnMatrix * v_eyeDirection;
      #else
        v_normalView = u_normalViewMatrix * a_normal;
      #endif
    #else
      #if defined(ENV_MAP)
        v_normalView = u_normalViewMatrix * a_normal;
      #endif
    #endif

    #ifdef ENV_MAP
      v_viewPosition = u_viewMatrix * position;
    #endif

    #ifdef VERTEX_COLOR
      v_color = a_color;
    #endif
  #endif

  #ifdef WIREFRAME
    v_barycentric = a_barycentric;
  #endif

  #ifdef CLIPPLANE
    v_position = position;
  #endif
}
