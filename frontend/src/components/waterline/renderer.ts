import { fragmentShader, vertexShader } from './shaders'

export type WaterlineRenderer = {
  setActive: (active: boolean) => void
  setPointer: (x: number, y: number) => void
  addRipple: (x: number, y: number) => void
  dispose: () => void
}

/** Bounded, single-pass renderer. Owns GPU resources and animation, never React state. */
export function createWaterlineRenderer(
  canvas: HTMLCanvasElement,
  onReady: (ready: boolean) => void,
): WaterlineRenderer | null {
  let gl: WebGLRenderingContext | null
  try {
    gl = canvas.getContext('webgl', {
      alpha: true, antialias: false, depth: false, stencil: false,
      powerPreference: 'low-power', preserveDrawingBuffer: false,
    })
  } catch { return null }
  if (!gl) return null

  let disposed = false
  let active = false
  let lost = false
  let frame = 0
  let lastTime = 0
  let elapsed = 12
  let pixelScale = Math.min(window.devicePixelRatio || 1, 1.5)
  let slowFrames = 0
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  let uniforms: Record<string, WebGLUniformLocation | null> = {}
  const target = [0.5, 0.5]
  const pointer = [0.5, 0.5]
  const ripples = new Float32Array(16)
  let nextRipple = 0
  let lastRippleTime = -Infinity

  function compile(type: number, source: string) {
    const shader = gl!.createShader(type)
    if (!shader) throw new Error('Waterline shader could not be allocated')
    gl!.shaderSource(shader, source)
    gl!.compileShader(shader)
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      const message = gl!.getShaderInfoLog(shader)
      gl!.deleteShader(shader)
      throw new Error(message || 'Waterline shader compilation failed')
    }
    return shader
  }

  function initialize() {
    const vertex = compile(gl!.VERTEX_SHADER, vertexShader)
    let fragment: WebGLShader | null = null
    try {
      fragment = compile(gl!.FRAGMENT_SHADER, fragmentShader)
      program = gl!.createProgram()
      if (!program) throw new Error('Waterline program could not be allocated')
      gl!.attachShader(program, vertex)
      gl!.attachShader(program, fragment)
      gl!.bindAttribLocation(program, 0, 'a_position')
      gl!.linkProgram(program)
      if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) {
        throw new Error(gl!.getProgramInfoLog(program) || 'Waterline program link failed')
      }
    } finally {
      gl!.deleteShader(vertex)
      if (fragment) gl!.deleteShader(fragment)
    }
    gl!.useProgram(program)
    buffer = gl!.createBuffer()
    if (!buffer) throw new Error('Waterline vertex buffer could not be allocated')
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer)
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl!.STATIC_DRAW)
    gl!.enableVertexAttribArray(0)
    gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0)
    uniforms = Object.fromEntries(['u_resolution', 'u_time', 'u_waterline', 'u_pointer', 'u_ripples[0]']
      .map(name => [name, gl!.getUniformLocation(program!, name)]))
  }

  function draw() {
    if (disposed || lost || !program) return
    const bounds = canvas.getBoundingClientRect()
    // Pixel budget bounds fragment work even on large or high-density monitors.
    const budgetScale = Math.sqrt(1_250_000 / Math.max(1, bounds.width * bounds.height))
    const scale = Math.min(pixelScale, budgetScale)
    const width = Math.max(1, Math.round(bounds.width * scale))
    const height = Math.max(1, Math.round(bounds.height * scale))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      gl!.viewport(0, 0, width, height)
    }
    gl!.uniform2f(uniforms.u_resolution, width, height)
    gl!.uniform1f(uniforms.u_time, elapsed)
    const waterline = bounds.width <= 600 ? (bounds.height <= 740 ? 0.51 : 0.46) : 0.42
    gl!.uniform1f(uniforms.u_waterline, waterline)
    gl!.uniform2f(uniforms.u_pointer, pointer[0], pointer[1])
    gl!.uniform4fv(uniforms['u_ripples[0]'], ripples)
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
    if (!active) gl!.flush()
  }

  function animate(now: number) {
    if (!active || lost || disposed) return
    if (lastTime) {
      const delta = now - lastTime
      elapsed += Math.min(delta / 1000, 0.05)
      // Sustained slow frames lower resolution, without changing the composition.
      slowFrames = delta > 28 ? slowFrames + 1 : Math.max(0, slowFrames - 1)
      if (slowFrames > 90 && pixelScale > 0.65) {
        pixelScale = Math.max(0.65, pixelScale * 0.8)
        slowFrames = 0
      }
    }
    lastTime = now
    pointer[0] += (target[0] - pointer[0]) * 0.045
    pointer[1] += (target[1] - pointer[1]) * 0.045
    draw()
    frame = requestAnimationFrame(animate)
  }

  const onLost = (event: Event) => {
    event.preventDefault()
    lost = true
    cancelAnimationFrame(frame)
    onReady(false)
  }
  const onRestored = () => {
    if (disposed) return
    lost = false
    try {
      initialize()
      draw()
      onReady(true)
      if (active) { lastTime = 0; frame = requestAnimationFrame(animate) }
    } catch {
      onReady(false)
    }
  }

  try {
    initialize()
    draw()
    onReady(true)
  } catch (error) {
    if (program) gl.deleteProgram(program)
    if (buffer) gl.deleteBuffer(buffer)
    // Failure is decorative only; the local poster and all controls remain usable.
    if (import.meta.env.DEV) console.warn('Using the Waterline fallback.', error)
    return null
  }

  const observer = new ResizeObserver(() => { if (!active) draw() })
  observer.observe(canvas)
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  return {
    setActive(next) {
      if (active === next || disposed) return
      active = next
      cancelAnimationFrame(frame)
      lastTime = 0
      if (active && !lost) frame = requestAnimationFrame(animate)
    },
    setPointer(x, y) { if (active) { target[0] = x; target[1] = y } },
    addRipple(x, y) {
      if (!active || elapsed - lastRippleTime < 0.14) return
      const offset = nextRipple * 4
      ripples.set([x, y, elapsed, 1], offset)
      nextRipple = (nextRipple + 1) % 4
      lastRippleTime = elapsed
    },
    dispose() {
      disposed = true
      active = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    },
  }
}
