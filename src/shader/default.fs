#ifdef VERTEX_COLOR
  varying vec4 v_color;
#endif

#ifdef DIFFUSE_MAP
  #ifdef DIFFUSE_CUBE_MAP
    uniform samplerCube u_diffuseSampler;
    varying vec3 v_normal;
  #else
    uniform sampler2D u_diffuseSampler;
  #endif
#else
  uniform vec4 u_diffuseColor;
#endif

#if (defined(DIFFUSE_MAP) && !defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) && defined(NORMAL_MAP))
  varying vec2 v_uv;
#endif

#ifdef NORMAL_MAP
  uniform sampler2D u_normalSampler;
#endif

#if (defined(LIGHT) && !defined(NORMAL_MAP)) || defined(ENV_MAP)
  varying vec3 v_normalView;
#endif

#ifdef ENV_MAP
  uniform mat3 u_modelViewInvMatrix;
  uniform samplerCube u_envSampler;
  varying vec4 v_viewPosition;
#endif

#ifdef LIGHT
  uniform vec3 u_lightColor;
  uniform vec3 u_lightAmbientColor;
  uniform vec4 u_ambientColor;
  uniform vec4 u_specularColor;
  uniform vec4 u_emissionColor;
  uniform float u_shininess;
  varying vec3 v_lightDirection;
  varying vec3 v_eyeDirection;
#endif

#ifdef WIREFRAME
  uniform vec3 u_wireframeColor;
  uniform float u_wireframeWidth;
  varying vec3 v_barycentric;

  float edgeFactor () {
    vec3 d = fwidth(v_barycentric);
    vec3 a3 = smoothstep(vec3(0.0), d * u_wireframeWidth, v_barycentric);
    return min(min(a3.x, a3.y), a3.z);
  }
#endif

#ifdef CLIPPLANE
  uniform vec4 u_clipPlane;
  varying vec4 v_woldPosition;
#endif

uniform float u_transparency;

void main () {
  #ifdef CLIPPLANE
    float clipDistance = dot(v_woldPosition.xyz, u_clipPlane.xyz);
    if (clipDistance > u_clipPlane.w) {
      discard;
    }
  #endif

  #if defined(WIREFRAME) && defined(WIREFRAME_ONLY)
    gl_FragColor = vec4(u_wireframeColor, (1.0 - edgeFactor()));
  #else
    #ifdef VERTEX_COLOR
      vec4 color = v_color;
    #else
      #ifdef DIFFUSE_MAP
        #ifdef DIFFUSE_CUBE_MAP
          vec4 color = textureCube(u_diffuseSampler, v_normal);
        #else
          vec4 color = texture2D(u_diffuseSampler, v_uv);
        #endif
      #else
        vec4 color = u_diffuseColor;
      #endif
    #endif

    #ifdef ENV_MAP
      vec3 N = v_normalView;
      vec3 V = v_viewPosition.xyz;
      vec3 R = reflect(V, N);
      R = u_modelViewInvMatrix * R;
      color = textureCube(u_envSampler, R) * color;
    #endif

    color.a *= u_transparency;

    #ifdef LIGHT
      #ifdef NORMAL_MAP
        vec3 normal = normalize((texture2D(u_normalSampler, v_uv) * 2.0 - 1.0).rgb);
      #else
        vec3 normal = normalize(v_normalView);
      #endif

      vec3 lightDirection = normalize(v_lightDirection);
      vec3 eyeDirection = normalize(v_eyeDirection);
      float diffuse = max(dot(lightDirection, normal), 0.0);

      vec3 reflectDirection = reflect(-lightDirection, normal);
      float specular = 0.0;
      if (u_shininess > 0.0) {
        specular = pow(max(dot(reflectDirection, eyeDirection), 0.0), u_shininess);
      }

      vec3 ambientColor = u_lightAmbientColor * u_ambientColor.rgb * color.rgb;
      vec3 diffuseColor = u_lightColor * color.rgb * diffuse;
      vec3 specularColor = u_lightColor * u_specularColor.rgb * specular;
      color = clamp(vec4(ambientColor + diffuseColor + specularColor, color.a), 0.0, 1.0);
    #endif
    #ifdef WIREFRAME
      gl_FragColor = mix(vec4(u_wireframeColor, 1.0), color, edgeFactor());
    #else
      gl_FragColor = color;
    #endif
  #endif
}
