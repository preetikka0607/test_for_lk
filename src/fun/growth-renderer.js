const vertex = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * .5 + .5;
  gl_Position = vec4(position, 0., 1.);
}`

const fragment = `
precision highp float;
varying vec2 uv;
uniform sampler2D dryLand;
uniform sampler2D firstRain;
uniform sampler2D forest;
uniform vec2 resolution;
uniform vec2 imageSize;
uniform float progress;
uniform float time;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float smoothGrowth(float amount, float field) {
  return smoothstep(field * .18, .82 + field * .18, amount);
}
float stream(vec2 p) {
  float center = mix(.235, .48, smoothstep(.675, .76, p.y));
  center = mix(center, .59, smoothstep(.76, .835, p.y));
  center = mix(center, .37, smoothstep(.835, 1., p.y));
  float width = mix(.006, .13, smoothstep(.67, 1., p.y));
  return (1. - smoothstep(width * .6, width, abs(p.x - center))) * smoothstep(.67, .7, p.y);
}
void main() {
  vec2 screen = vec2(uv.x, 1. - uv.y);
  float aspect = resolution.x / resolution.y;
  float imageAspect = imageSize.x / imageSize.y;
  vec2 cover = aspect < imageAspect ? vec2(aspect / imageAspect, 1.) : vec2(1., imageAspect / aspect);
  vec2 p = (screen - .5) * cover / (1.018 + progress * .045);
  // Keep the couple and shared tree in frame on portrait screens.
  p += vec2(.5) + vec2(.28, .0) * (1. - cover);

  float wet = smoothstep(.10, .44, progress);
  float green = smoothstep(.40, .89, progress);
  // A fixed spatial field lets growth spread unevenly, rather than replacing the frame at once.
  float field = noise(p * 8.) * .65 + noise(p * 22.) * .35;
  float wetReveal = smoothGrowth(wet, field);
  float forestReveal = smoothGrowth(green, 1. - field);
  // Let their gestures dissolve more quickly than the landscape around them.
  float people = (1. - smoothstep(.085, .13, abs(p.x - .675)))
    * smoothstep(.43, .49, p.y) * (1. - smoothstep(.75, .8, p.y));
  wetReveal = mix(wetReveal, smoothstep(.45, .55, wet), people);
  forestReveal = mix(forestReveal, smoothstep(.45, .55, green), people);
  float waterMask = stream(p) * wet;
  float ripple = sin(p.x * 240. + time * 1.4 + noise(p * 80.) * 4.);
  vec2 flow = vec2(ripple, sin(p.y * 290. - time * 2.)) * .0013;
  vec2 waterUV = p + flow * waterMask * smoothstep(.69, 1., p.y);
  vec3 dry = texture2D(dryLand, p).rgb;
  vec3 rain = texture2D(firstRain, waterUV).rgb;
  vec3 lush = texture2D(forest, waterUV).rgb;
  vec3 color = mix(mix(dry, rain, wetReveal), lush, forestReveal);

  // Two depths of rain; the shower arrives, then recedes as the canopy returns.
  float shower = smoothstep(.13, .25, progress) * (1. - smoothstep(.42, .63, progress));
  vec2 rainGrid = screen * vec2(120., 16.);
  rainGrid.x += screen.y * 3.;
  float column = floor(rainGrid.x);
  float speed = 1.8 + hash(vec2(column, 4.)) * 2.;
  float streak = pow(max(0., 1. - abs(fract(rainGrid.x) - .5) * 2.), 18.);
  float trail = pow(fract(rainGrid.y + time * speed + hash(vec2(column, 8.))), 12.);
  color += vec3(.75, .82, .84) * streak * trail * shower * .16;

  // Small elliptical impact rings appear only on the newly wet streambed.
  vec2 ringSpace = p * vec2(65., 130.);
  vec2 cell = floor(ringSpace);
  float age = fract(time * .55 + hash(cell));
  vec2 ring = (fract(ringSpace) - .5) * vec2(1., 1.6);
  float circle = exp(-abs(length(ring) - age * .48) * 85.);
  color += circle * (1. - age) * waterMask * shower * .025;

  float warmth = smoothstep(.55, .95, progress);
  color *= mix(vec3(1., .99, .97), vec3(1.025, 1.01, .965), warmth);
  color *= 1. - smoothstep(.25, .85, length((uv - .5) * vec2(.85, 1.))) * .13;
  gl_FragColor = vec4(color, 1.);
}`

export function createGrowthRenderer(canvas, images) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' })
  if (!gl) return null
  const shaders = []
  const textures = []
  let program, buffer
  function dispose() {
    textures.forEach((texture) => gl.deleteTexture(texture))
    shaders.forEach((shader) => gl.deleteShader(shader))
    if (program) gl.deleteProgram(program)
    if (buffer) gl.deleteBuffer(buffer)
  }

  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type)
      shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
    }
    program = gl.createProgram()
    shaders.forEach((shader) => gl.attachShader(program, shader))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
    gl.useProgram(program)
    buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    images.forEach((image, index) => {
      const texture = gl.createTexture()
      textures.push(texture)
      gl.activeTexture(gl.TEXTURE0 + index)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
      gl.uniform1i(gl.getUniformLocation(program, ['dryLand', 'firstRain', 'forest'][index]), index)
    })
    const uniforms = Object.fromEntries(['resolution', 'imageSize', 'progress', 'time'].map((name) => [name, gl.getUniformLocation(program, name)]))
    gl.uniform2f(uniforms.imageSize, images[0].naturalWidth, images[0].naturalHeight)

    return {
      draw(time, progress) {
        const ratio = Math.min(window.devicePixelRatio || 1, 1.3, Math.sqrt(1700000 / (window.innerWidth * window.innerHeight)))
        const width = Math.max(1, Math.round(window.innerWidth * ratio))
        const height = Math.max(1, Math.round(window.innerHeight * ratio))
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
          gl.viewport(0, 0, width, height)
        }
        gl.uniform2f(uniforms.resolution, width, height)
        gl.uniform1f(uniforms.progress, progress)
        gl.uniform1f(uniforms.time, time)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      },
      dispose,
    }
  } catch (error) {
    dispose()
    console.warn('Using the seasonal image transition without WebGL:', error.message)
    return null
  }
}
