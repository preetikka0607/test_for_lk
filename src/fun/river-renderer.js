const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`

const fragmentSource = `
precision highp float;
varying vec2 uv;
uniform sampler2D landscape;
uniform vec2 resolution;
uniform vec2 imageSize;
uniform vec2 look;
uniform float time;
uniform float journey;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float river(vec2 p) {
  float leftBank = mix(.566, .47, smoothstep(.585, .68, p.y));
  leftBank = mix(leftBank, .425, smoothstep(.68, .75, p.y));
  leftBank = mix(leftBank, .52, smoothstep(.75, .84, p.y));
  leftBank = mix(leftBank, .485, smoothstep(.84, 1., p.y));
  float rightBank = mix(.603, 1.03, smoothstep(.59, .69, p.y));
  float mask = smoothstep(.584, .623, p.y);
  mask *= smoothstep(leftBank, leftBank + .025, p.x);
  mask *= 1. - smoothstep(rightBank - .025, rightBank, p.x);
  // Stationary rock islands interrupt the moving water.
  mask *= smoothstep(.70, 1.15, length((p - vec2(.491, .678)) / vec2(.065, .04)));
  mask *= smoothstep(.7, 1.2, length((p - vec2(.505, .813)) / vec2(.073, .045)));
  mask *= smoothstep(.7, 1.15, length((p - vec2(.649, .728)) / vec2(.028, .02)));
  return mask;
}
void main() {
  vec2 p = vec2(uv.x, 1. - uv.y);
  float screenAspect = resolution.x / resolution.y;
  float imageAspect = imageSize.x / imageSize.y;
  vec2 cover = screenAspect < imageAspect
    ? vec2(screenAspect / imageAspect, 1.)
    : vec2(1., imageAspect / screenAspect);
  float pushIn = 1.025 + journey * .09;
  vec2 center = vec2(.5) + vec2(.04, .005) * (1. - cover);
  p = (p - .5) * cover / pushIn + center;
  p += look * vec2(.0035, .002);

  vec3 original = texture2D(landscape, p).rgb;
  float water = river(p);
  float depth = smoothstep(.59, 1., p.y);
  // Advected, unequal waves: short cross-ripples over a slower downstream swell.
  vec2 current = p * vec2(110., 48.) - vec2(time * .11, time * .46);
  float swell = noise(current * .35);
  float smallWave = sin(p.x * 245. + swell * 4. + time * 1.4);
  float crossWave = sin(p.y * 340. - time * 2.1 + noise(current) * 3.);
  vec2 refraction = vec2(smallWave, crossWave) * (.00025 + depth * .0017);
  refraction += vec2(swell - .5, noise(current + 8.) - .5) * .003 * depth;
  vec3 color = texture2D(landscape, p + refraction * water).rgb;

  float glint = pow(max(0., smallWave * crossWave), 10.);
  float sunPath = exp(-pow((p.x - (.56 + depth * .10)) * 6., 2.));
  color += vec3(1., .91, .73) * glint * water * sunPath * .038;
  // Existing bright foam receives a small travelling highlight, not a white overlay.
  float foam = smoothstep(.65, .88, dot(original, vec3(.299, .587, .114)));
  color += foam * water * sin(time * 1.8 - p.y * 150.) * .013;

  float lowMist = exp(-pow((p.y - .38) * 11., 2.));
  float drifting = noise(vec2(p.x * 5. - time * .013, p.y * 16.));
  color = mix(color, vec3(.78, .81, .77), lowMist * drifting * .045);
  // A passing cloud changes exposure gently, without rotating artificial light beams.
  color *= 1. + sin(time * .075) * .008;
  color *= mix(vec3(1.025, 1.008, .98), vec3(.98, 1.005, 1.025), journey);
  float vignette = smoothstep(.3, .85, length((uv - .5) * vec2(.85, 1.)));
  color *= 1. - vignette * .12;
  gl_FragColor = vec4(color, 1.);
}`

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

// All GPU resources belong to one scene and are released when it closes.
export function createRiverRenderer(canvas, image) {
  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power', preserveDrawingBuffer: false,
  })
  if (!gl) return null

  const shaders = []
  let program, buffer, texture
  function dispose() {
    if (texture) gl.deleteTexture(texture)
    if (buffer) gl.deleteBuffer(buffer)
    if (program) gl.deleteProgram(program)
    shaders.forEach((shader) => gl.deleteShader(shader))
  }

  try {
    shaders.push(compileShader(gl, gl.VERTEX_SHADER, vertexSource))
    shaders.push(compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource))
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

    texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
    const uniforms = Object.fromEntries(['resolution', 'imageSize', 'look', 'time', 'journey', 'landscape']
      .map((name) => [name, gl.getUniformLocation(program, name)]))
    gl.uniform1i(uniforms.landscape, 0)
    gl.uniform2f(uniforms.imageSize, image.naturalWidth, image.naturalHeight)

    return {
      draw(time, journey, lookX, lookY) {
        // Limit fill-rate on phones and Retina displays; CSS keeps the canvas full size.
        const ratio = Math.min(window.devicePixelRatio || 1, 1.35, Math.sqrt(1900000 / (window.innerWidth * window.innerHeight)))
        const width = Math.max(1, Math.round(window.innerWidth * ratio))
        const height = Math.max(1, Math.round(window.innerHeight * ratio))
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
          gl.viewport(0, 0, width, height)
        }
        gl.uniform2f(uniforms.resolution, width, height)
        gl.uniform2f(uniforms.look, lookX, lookY)
        gl.uniform1f(uniforms.time, time)
        gl.uniform1f(uniforms.journey, journey)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      },
      dispose,
    }
  } catch (error) {
    dispose()
    console.warn('Using the still landscape because WebGL is unavailable:', error.message)
    return null
  }
}
