var defaultVertexShader = 'attribute vec3 a_position;\nuniform mat4 u_modelViewProjectMatrix;\n\n#ifdef VERTEX_COLOR\n  attribute vec4 a_color;\n  varying vec4 v_color;\n#endif\n\n#if (defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) || defined(ENV_MAP))\n  attribute vec3 a_normal;\n#endif\n\n#if defined(LIGHT) && defined(NORMAL_MAP)\n  attribute vec3 a_tangent;\n#endif\n\n#if (defined(DIFFUSE_MAP) && !defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) && defined(NORMAL_MAP))\n  attribute vec2 a_uv;\n  uniform vec2 u_textureScale;\n  varying vec2 v_uv;\n#endif\n\n#if defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)\n  uniform mat3 u_normalMatrix;\n  varying vec3 v_normal;\n#endif\n\n#if (defined(LIGHT) && !defined(NORMAL_MAP)) || defined(ENV_MAP)\n  varying vec3 v_normalView;\n#endif\n\n#ifdef ENV_MAP\n  uniform mat4 u_viewMatrix;\n  varying vec4 v_viewPosition;\n#endif\n\n#if defined(LIGHT) || defined(ENV_MAP)\n  uniform mat3 u_normalViewMatrix;\n#endif\n\n#ifdef LIGHT\n  uniform mat4 u_modelViewMatrix;\n  uniform vec3 u_lightPosition;\n  varying vec3 v_lightDirection;\n  varying vec3 v_eyeDirection;\n#endif\n\n#ifdef WIREFRAME\n  attribute vec3 a_barycentric;\n  varying vec3 v_barycentric;\n#endif\n\n#ifdef CLIPPLANE\n  uniform mat4 u_modelMatrix;\n  varying vec4 v_position;\n#endif\n\nvoid main () {\n  vec4 position = vec4(a_position, 1.0);\n  gl_Position = u_modelViewProjectMatrix * position;\n\n  #if !defined(WIREFRAME) || !defined(WIREFRAME_ONLY)\n    #if defined(DIFFUSE_MAP) && defined(DIFFUSE_CUBE_MAP)\n      v_normal = u_normalMatrix * a_normal;\n    #endif\n\n    #if (defined(DIFFUSE_MAP) && !defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) && defined(NORMAL_MAP))\n      v_uv = a_uv * u_textureScale;\n    #endif\n\n    #ifdef LIGHT\n      vec3 viewPosition = (u_modelViewMatrix * position).xyz;\n      v_lightDirection = u_lightPosition - viewPosition;\n      v_eyeDirection = -viewPosition;\n\n      #ifdef NORMAL_MAP\n        mat3 modelViewMatrix3 = mat3(u_modelViewMatrix);\n        vec3 normal = normalize(modelViewMatrix3 * a_normal);\n        vec3 tangent = normalize(modelViewMatrix3 * a_tangent);\n        vec3 bitangent = cross(normal, tangent);\n        mat3 tbnMatrix = mat3(\n          tangent.x, bitangent.x, normal.x,\n          tangent.y, bitangent.y, normal.y,\n          tangent.z, bitangent.z, normal.z\n        );\n        v_lightDirection = tbnMatrix * v_lightDirection;\n        v_eyeDirection = tbnMatrix * v_eyeDirection;\n      #else\n        v_normalView = u_normalViewMatrix * a_normal;\n      #endif\n    #else\n      #if defined(ENV_MAP)\n        v_normalView = u_normalViewMatrix * a_normal;\n      #endif\n    #endif\n\n    #ifdef ENV_MAP\n      v_viewPosition = u_viewMatrix * position;\n    #endif\n\n    #ifdef VERTEX_COLOR\n      v_color = a_color;\n    #endif\n  #endif\n\n  #ifdef WIREFRAME\n    v_barycentric = a_barycentric;\n  #endif\n\n  #ifdef CLIPPLANE\n    v_position = position;\n  #endif\n}\n';
var defaultFragmentShader = '#ifdef VERTEX_COLOR\n  varying vec4 v_color;\n#endif\n\n#ifdef DIFFUSE_MAP\n  #ifdef DIFFUSE_CUBE_MAP\n    uniform samplerCube u_diffuseSampler;\n    varying vec3 v_normal;\n  #else\n    uniform sampler2D u_diffuseSampler;\n  #endif\n#else\n  uniform vec4 u_diffuseColor;\n#endif\n\n#if (defined(DIFFUSE_MAP) && !defined(DIFFUSE_CUBE_MAP)) || (defined(LIGHT) && defined(NORMAL_MAP))\n  varying vec2 v_uv;\n#endif\n\n#ifdef NORMAL_MAP\n  uniform sampler2D u_normalSampler;\n#endif\n\n#if (defined(LIGHT) && !defined(NORMAL_MAP)) || defined(ENV_MAP)\n  varying vec3 v_normalView;\n#endif\n\n#ifdef ENV_MAP\n  uniform mat3 u_modelViewInvMatrix;\n  uniform samplerCube u_envSampler;\n  varying vec4 v_viewPosition;\n#endif\n\n#ifdef LIGHT\n  uniform vec3 u_lightColor;\n  uniform vec3 u_lightAmbientColor;\n  #ifdef AMBIENT_MAP\n    uniform sampler2D u_ambientSampler;\n  #else\n    uniform vec4 u_ambientColor;\n  #endif\n  #ifdef SPECULAR_MAP\n    uniform sampler2D u_specularSampler;\n  #else\n    uniform vec4 u_specularColor;\n  #endif\n  #ifdef EMISSION_MAP\n    uniform sampler2D u_emissionSampler;\n  #else\n    uniform vec4 u_emissionColor;\n  #endif\n  uniform float u_shininess;\n  varying vec3 v_lightDirection;\n  varying vec3 v_eyeDirection;\n#endif\n\n#ifdef WIREFRAME\n  uniform vec3 u_wireframeColor;\n  uniform float u_wireframeWidth;\n  varying vec3 v_barycentric;\n\n  float edgeFactor () {\n    vec3 d = fwidth(v_barycentric);\n    vec3 a3 = smoothstep(vec3(0.0), d * u_wireframeWidth, v_barycentric);\n    return min(min(a3.x, a3.y), a3.z);\n  }\n#endif\n\n#ifdef CLIPPLANE\n  uniform vec4 u_clipPlane;\n  varying vec4 v_position;\n#endif\n\nuniform float u_transparency;\n\nvoid main () {\n  #ifdef CLIPPLANE\n    float clipDistance = dot(v_position.xyz, u_clipPlane.xyz);\n    if (clipDistance >= u_clipPlane.w) {\n      discard;\n    }\n  #endif\n\n  #if defined(WIREFRAME) && defined(WIREFRAME_ONLY)\n    gl_FragColor = vec4(u_wireframeColor, (1.0 - edgeFactor()));\n  #else\n    #ifdef VERTEX_COLOR\n      vec4 color = v_color;\n    #else\n      #ifdef DIFFUSE_MAP\n        #ifdef DIFFUSE_CUBE_MAP\n          vec4 color = textureCube(u_diffuseSampler, v_normal);\n        #else\n          vec4 color = texture2D(u_diffuseSampler, v_uv);\n        #endif\n      #else\n        vec4 color = u_diffuseColor;\n      #endif\n    #endif\n\n    #ifdef ENV_MAP\n      vec3 N = v_normalView;\n      vec3 V = v_viewPosition.xyz;\n      vec3 R = reflect(V, N);\n      R = u_modelViewInvMatrix * R;\n      color = textureCube(u_envSampler, R) * color;\n    #endif\n\n    color.a *= u_transparency;\n\n    #ifdef LIGHT\n      #ifdef NORMAL_MAP\n        vec3 normal = normalize((texture2D(u_normalSampler, v_uv) * 2.0 - 1.0).rgb);\n      #else\n        vec3 normal = normalize(v_normalView);\n      #endif\n\n      vec3 lightDirection = normalize(v_lightDirection);\n      vec3 eyeDirection = normalize(v_eyeDirection);\n      float diffuse = max(dot(lightDirection, normal), 0.0);\n\n      vec3 reflectDirection = reflect(-lightDirection, normal);\n      float specular = 0.0;\n      if (u_shininess > 0.0) {\n        specular = pow(max(dot(reflectDirection, eyeDirection), 0.0), u_shininess);\n      }\n\n      #ifdef AMBIENT_MAP\n        vec4 ambientMaterialColor = texture2D(u_ambientSampler, v_uv);\n      #else\n        vec4 ambientMaterialColor = u_ambientColor;\n      #endif\n\n      #ifdef SPECULAR_MAP\n        vec4 specularMaterialColor = texture2D(u_specularSampler, v_uv);\n      #else\n        vec4 specularMaterialColor = u_specularColor;\n      #endif\n\n      vec3 ambientColor = u_lightAmbientColor * ambientMaterialColor.rgb * color.rgb;\n      vec3 diffuseColor = u_lightColor * color.rgb * diffuse;\n      vec3 specularColor = u_lightColor * specularMaterialColor.rgb * specular;\n      color = clamp(vec4(ambientColor + diffuseColor + specularColor, color.a), 0.0, 1.0);\n    #endif\n    #ifdef WIREFRAME\n      gl_FragColor = mix(vec4(u_wireframeColor, 1.0), color, edgeFactor());\n    #else\n      gl_FragColor = color;\n    #endif\n  #endif\n}\n';