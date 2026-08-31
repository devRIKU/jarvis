import type { AssistantState } from '../../types/assistant';

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_audioEnergy;
uniform int u_state;
uniform float u_stateProgress;
uniform float u_warmth;
uniform float u_bloom;

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Domain-warped Fractal Brownian Motion
float fbm(vec2 p) {
  float f = 0.0;
  float w = 0.5;
  for (int i = 0; i < 4; i++) {
    f += w * snoise(p);
    p *= 2.02;
    w *= 0.5;
  }
  return f;
}

void main() {
  vec2 st = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  vec2 mouse = (u_pointer * 2.0 - 1.0);
  mouse.y = -mouse.y;

  float t = u_time * 0.25;

  // State-specific motion parameters
  float speed = 0.3;
  float turbulence = 0.5;
  vec3 cDeep = vec3(0.047, 0.043, 0.06);     // Rich deep obsidian
  vec3 cPrimary = vec3(0.96, 0.62, 0.15);   // Warm Amber
  vec3 cSecondary = vec3(0.92, 0.35, 0.25); // Warm Sunset Coral
  vec3 cAccent = vec3(0.99, 0.85, 0.45);    // Soft Gold

  // States: 0=idle, 1=listening, 2=thinking, 3=focused, 4=searching, 5=speaking, 6=happy, 7=confused, 8=waiting, 9=error, 10=success
  if (u_state == 1) { // Listening - alert warm peach/cyan shimmer
    speed = 0.45;
    turbulence = 0.65;
    cPrimary = vec3(0.98, 0.45, 0.3);
    cSecondary = vec3(0.95, 0.72, 0.25);
    cAccent = vec3(1.0, 0.9, 0.6);
  } else if (u_state == 2) { // Thinking - swirling deeper cosmic gold/amber
    speed = 0.8;
    turbulence = 1.1;
    cPrimary = vec3(0.85, 0.4, 0.1);
    cSecondary = vec3(0.7, 0.2, 0.4);
    cAccent = vec3(1.0, 0.75, 0.2);
  } else if (u_state == 3) { // Focused - concentrated amber core
    speed = 0.2;
    turbulence = 0.4;
    cPrimary = vec3(0.92, 0.58, 0.12);
    cSecondary = vec3(0.75, 0.3, 0.15);
  } else if (u_state == 4) { // Searching - directional radar energy
    speed = 0.9;
    turbulence = 0.9;
    cPrimary = vec3(0.95, 0.6, 0.2);
    cSecondary = vec3(0.3, 0.6, 0.85);
    cAccent = vec3(0.6, 0.9, 1.0);
  } else if (u_state == 5) { // Speaking - harmonic voice wave pulses
    speed = 0.6 + u_audioEnergy * 0.8;
    turbulence = 0.7 + u_audioEnergy * 0.5;
    cPrimary = vec3(0.98, 0.58, 0.18);
    cSecondary = vec3(0.9, 0.28, 0.35);
    cAccent = vec3(1.0, 0.92, 0.5);
  } else if (u_state == 6) { // Happy - radiant vibrant gold/coral
    speed = 0.65;
    turbulence = 0.75;
    cPrimary = vec3(1.0, 0.7, 0.2);
    cSecondary = vec3(0.98, 0.4, 0.45);
    cAccent = vec3(1.0, 0.95, 0.7);
  } else if (u_state == 7) { // Confused - subtle asymmetry / shifting violet
    speed = 0.4;
    turbulence = 0.8;
    cPrimary = vec3(0.75, 0.4, 0.6);
    cSecondary = vec3(0.9, 0.5, 0.2);
  } else if (u_state == 8) { // Waiting - rhythmic ambient breathing
    speed = 0.25;
    turbulence = 0.35;
    cPrimary = vec3(0.85, 0.55, 0.25);
    cSecondary = vec3(0.5, 0.35, 0.55);
  } else if (u_state == 9) { // Error - controlled glitch / crimson pulse
    speed = 1.2;
    turbulence = 1.3;
    cPrimary = vec3(0.95, 0.2, 0.2);
    cSecondary = vec3(0.7, 0.1, 0.3);
    cAccent = vec3(1.0, 0.4, 0.3);
  } else if (u_state == 10) { // Success - harmonic warm golden emerald bloom
    speed = 0.5;
    turbulence = 0.6;
    cPrimary = vec3(0.15, 0.8, 0.5);
    cSecondary = vec3(0.95, 0.75, 0.2);
    cAccent = vec3(0.7, 1.0, 0.6);
  }

  // Domain warping for organic fluid feel
  vec2 q = vec2(0.0);
  q.x = fbm(st + vec2(0.0, 0.0) + t * speed);
  q.y = fbm(st + vec2(5.2, 1.3) + t * speed * 0.8);

  vec2 r = vec2(0.0);
  r.x = fbm(st + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t * speed);
  r.y = fbm(st + 4.0 * q + vec2(8.3, 2.8) + 0.126 * t * speed);

  // Interactive mouse light influence
  float mouseDist = length(st - mouse * 0.75);
  float mouseGlow = exp(-mouseDist * 2.2) * 0.35;

  // Audio energy boost
  float audioGlow = u_audioEnergy * 0.45;

  float f = fbm(st + 4.0 * r * turbulence);

  // Soft atmospheric radial vignette
  float centerDist = length(st);
  float vignette = smoothstep(1.8, 0.3, centerDist);

  // Color blending
  vec3 color = mix(cDeep, cSecondary, clamp((f * f) * 3.5, 0.0, 1.0));
  color = mix(color, cPrimary, clamp(length(q) * 0.9, 0.0, 1.0));
  color = mix(color, cAccent, clamp(length(r.x) * 0.7, 0.0, 1.0));

  // Add mouse light and audio bloom
  color += cAccent * mouseGlow;
  color += cPrimary * audioGlow * (1.0 - centerDist * 0.4);

  // Apply subtle warmth factor
  color *= (0.85 + u_warmth * 0.3);

  // Vignette & subtle organic contrast
  color *= vignette;
  color = pow(color, vec3(0.92)); // Soft gamma / contrast

  // Subtle natural film grain
  float grain = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.025;
  color += grain;

  fragColor = vec4(color, 1.0);
}
`;

export class GradientRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private isFallback: boolean = false;

  // Uniform locations
  private uResolutionLoc: WebGLUniformLocation | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uPointerLoc: WebGLUniformLocation | null = null;
  private uAudioEnergyLoc: WebGLUniformLocation | null = null;
  private uStateLoc: WebGLUniformLocation | null = null;
  private uWarmthLoc: WebGLUniformLocation | null = null;
  private uBloomLoc: WebGLUniformLocation | null = null;

  // State
  private startTime: number = performance.now();
  private pointer: { x: number; y: number; targetX: number; targetY: number } = {
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
  };
  private audioEnergy: number = 0;
  private stateIndex: number = 0;
  private warmth: number = 0.9;
  private bloom: number = 0.75;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.initWebGL();
  }

  private initWebGL(): void {
    try {
      this.gl = this.canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        powerPreference: 'high-performance',
      });

      if (!this.gl) {
        console.warn('WebGL 2.0 not available, using fallback gradient.');
        this.isFallback = true;
        return;
      }

      const vs = this.compileShader(this.gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
      const fs = this.compileShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
      if (!vs || !fs) {
        this.isFallback = true;
        return;
      }

      this.program = this.gl.createProgram()!;
      this.gl.attachShader(this.program, vs);
      this.gl.attachShader(this.program, fs);
      this.gl.linkProgram(this.program);

      if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
        console.error('Shader link error:', this.gl.getProgramInfoLog(this.program));
        this.isFallback = true;
        return;
      }

      this.gl.useProgram(this.program);

      // Setup screen quad
      const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]);

      this.positionBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

      const aPositionLoc = this.gl.getAttribLocation(this.program, 'a_position');
      this.gl.enableVertexAttribArray(aPositionLoc);
      this.gl.vertexAttribPointer(aPositionLoc, 2, this.gl.FLOAT, false, 0, 0);

      // Locate uniforms
      this.uResolutionLoc = this.gl.getUniformLocation(this.program, 'u_resolution');
      this.uTimeLoc = this.gl.getUniformLocation(this.program, 'u_time');
      this.uPointerLoc = this.gl.getUniformLocation(this.program, 'u_pointer');
      this.uAudioEnergyLoc = this.gl.getUniformLocation(this.program, 'u_audioEnergy');
      this.uStateLoc = this.gl.getUniformLocation(this.program, 'u_state');
      this.uWarmthLoc = this.gl.getUniformLocation(this.program, 'u_warmth');
      this.uBloomLoc = this.gl.getUniformLocation(this.program, 'u_bloom');
    } catch (err) {
      console.warn('Error initializing WebGL gradient:', err);
      this.isFallback = true;
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  public resize(width: number, height: number): void {
    const renderWidth = Math.floor(width * this.dpr);
    const renderHeight = Math.floor(height * this.dpr);

    if (this.canvas.width !== renderWidth || this.canvas.height !== renderHeight) {
      this.canvas.width = renderWidth;
      this.canvas.height = renderHeight;
    }

    if (this.gl) {
      this.gl.viewport(0, 0, renderWidth, renderHeight);
    }
  }

  public setPointer(x: number, y: number): void {
    this.pointer.targetX = x;
    this.pointer.targetY = y;
  }

  public setAudioEnergy(energy: number): void {
    this.audioEnergy = energy;
  }

  public setState(state: AssistantState): void {
    const statesMap: Record<AssistantState, number> = {
      idle: 0,
      listening: 1,
      thinking: 2,
      focused: 3,
      searching: 4,
      speaking: 5,
      happy: 6,
      confused: 7,
      waiting: 8,
      error: 9,
      success: 10,
    };
    this.stateIndex = statesMap[state] ?? 0;
  }

  public setWarmth(warmth: number): void {
    this.warmth = warmth;
  }

  public setBloom(bloom: number): void {
    this.bloom = bloom;
  }

  public render(): void {
    const now = performance.now();
    const elapsedTime = (now - this.startTime) * 0.001;

    // Smooth pointer damping
    this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.08;
    this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.08;

    if (this.isFallback || !this.gl || !this.program) {
      this.renderFallback(elapsedTime);
      return;
    }

    this.gl.useProgram(this.program);

    this.gl.uniform2f(this.uResolutionLoc, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.uTimeLoc, elapsedTime);
    this.gl.uniform2f(this.uPointerLoc, this.pointer.x, this.pointer.y);
    this.gl.uniform1f(this.uAudioEnergyLoc, this.audioEnergy);
    this.gl.uniform1i(this.uStateLoc, this.stateIndex);
    this.gl.uniform1f(this.uWarmthLoc, this.warmth);
    this.gl.uniform1f(this.uBloomLoc, this.bloom);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  private renderFallback(t: number): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Organic 2D radial gradient fallback
    const cx = w * (0.5 + Math.sin(t * 0.5) * 0.1);
    const cy = h * (0.5 + Math.cos(t * 0.4) * 0.1);

    const grad = ctx.createRadialGradient(
      this.pointer.x * w,
      this.pointer.y * h,
      10,
      cx,
      cy,
      Math.max(w, h) * 0.8
    );

    grad.addColorStop(0, '#f59e0b22');
    grad.addColorStop(0.4, '#e11d4818');
    grad.addColorStop(1, '#0c0b0f');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  public destroy(): void {
    if (this.gl) {
      if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }
  }
}
