export const vertexShader = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// One full-screen draw: sky, a refractive meniscus, and light on the pool floor.
// All colors derive from the project's seafoam, lagoon, teal, sand and sun palette.
export const fragmentShader = `
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_waterline;
uniform vec2 u_pointer;
uniform vec4 u_ripples[4];

const vec3 SEAFOAM = vec3(0.7451, 0.9373, 0.9176);
const vec3 LAGOON = vec3(0.2235, 0.7216, 0.8157);
const vec3 TEAL = vec3(0.0588, 0.4980, 0.5608);
const vec3 SAND = vec3(0.9922, 0.9686, 0.9176);
const vec3 SUN = vec3(0.9686, 0.7804, 0.3569);

vec2 hash22(vec2 p) {
  vec3 a = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  a += dot(a, a.yzx + 33.33);
  return fract((a.xx + a.yz) * a.zy);
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
             mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
}

float waves(vec2 p, float t) {
  float w = sin(p.x * 1.72 + p.y * 2.13 + t * 0.57) * 0.48;
  w += sin(p.x * -2.61 + p.y * 1.67 - t * 0.43) * 0.26;
  w += sin(p.x * 4.83 + p.y * 3.42 + t * 0.71) * 0.12;
  w += sin(p.x * -8.17 + p.y * 5.23 - t * 0.8) * 0.065;
  return w;
}

float caustic(vec2 p, float t) {
  // Warped cellular edges approximate concentrations of refracted sunlight.
  p += vec2(waves(p * 0.85, t), waves(p.yx * 0.75 + 8.0, t)) * 0.95;
  vec2 cell = floor(p), local = fract(p);
  float closest = 8.0, second = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 seed = hash22(cell + neighbor);
      vec2 point = 0.5 + 0.35 * sin(6.2831 * seed + t * 0.32);
      vec2 delta = neighbor + point - local;
      float distance = dot(delta, delta);
      if (distance < closest) {
        second = closest;
        closest = distance;
      } else { second = min(second, distance); }
    }
  }
  float edge = second - closest;
  return exp(-edge * 27.0) * 0.75 + exp(-edge * 7.0) * 0.25;
}

void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  float aspect = u_resolution.x / u_resolution.y;
  float t = u_time;
  float x = uv.x * aspect;
  vec2 screen = vec2(x, uv.y);

  // The broad swell and fine surface detail move independently; the camera never moves.
  float surface = u_waterline;
  surface += sin(x * 3.6 + t * 0.38) * 0.018;
  surface += sin(x * 7.4 - t * 0.29 + 1.4) * 0.010;
  surface += sin(x * 15.0 + t * 0.45) * 0.003;
  surface += (u_pointer.y - 0.5) * 0.003 * sin(x * 2.0);
  float depth = uv.y - surface;

  vec2 sunPosition = vec2(aspect * 0.82, 0.14);
  float sunDistance = length(screen - sunPosition);
  vec3 sky = mix(SEAFOAM, LAGOON, 0.20 * (1.0 - uv.y / u_waterline));
  sky = mix(sky, SAND, exp(-sunDistance * 4.3) * 0.47);
  sky = mix(sky, SUN, exp(-sunDistance * 19.0) * 0.13);
  sky = mix(sky, SAND, exp(-sunDistance * sunDistance * 850.0) * 0.6);
  float wisps = noise(vec2(x * 1.8 - t * 0.012, uv.y * 13.0));
  sky = mix(sky, SAND, smoothstep(0.5, 0.9, wisps) * 0.10);

  // Looking across the surface: compressed waves reflect the sky between the
  // distant pool edge and the near, curved meniscus. This is a surface, not a divider.
  float horizon = u_waterline - 0.067;
  if (uv.y > horizon && depth < 0.003) {
    float distanceFromHorizon = max(0.001, uv.y - horizon);
    float z = 0.15 / (distanceFromHorizon + 0.018);
    vec2 surfaceUV = vec2((uv.x - 0.5) * aspect * z, z * 1.4);
    float w = waves(surfaceUV * 4.0, t);
    float wX = waves(surfaceUV * 4.0 + vec2(0.035, 0), t) - w;
    float wY = waves(surfaceUV * 4.0 + vec2(0, 0.035), t) - w;
    vec3 normal = normalize(vec3(wX * 5.0, 0.5, wY * 5.0));
    float reflection = clamp(0.5 + w * 0.38, 0.0, 1.0);
    vec3 reflected = mix(TEAL, SEAFOAM, 0.32 + reflection * 0.65);
    float sparkle = pow(max(0.0, dot(normal, normalize(vec3(0.4, 0.8, -0.3)))), 32.0);
    sparkle *= exp(-pow((uv.x - 0.82) * 7.0, 2.0));
    reflected = mix(reflected, SAND, min(0.85, sparkle * 1.6));
    reflected = mix(reflected, SEAFOAM, exp(-distanceFromHorizon * 180.0) * 0.7);
    sky = mix(sky, reflected, smoothstep(horizon, horizon + 0.002, uv.y));
  }

  // Refracted waves distort the caustic field and submerged floor geometry together.
  vec2 p = vec2((uv.x - 0.5) * aspect, depth);
  vec2 distortion = vec2(waves(p * 5.0, t), waves(p.yx * 4.6 + 5.0, t));
  float rippleLight = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 ripple = u_ripples[i];
    float age = t - ripple.z;
    vec2 delta = (uv - ripple.xy) * vec2(aspect, 1.0);
    float distance = length(delta);
    float ring = distance - age * 0.16;
    float envelope = exp(-abs(ring) * 55.0) * max(0.0, 1.0 - age / 3.6);
    float strength = sin(ring * 160.0) * envelope * ripple.w;
    distortion += normalize(delta + 0.0001) * strength * 0.30;
    rippleLight += strength * 0.055;
  }

  float floorDepth = max(depth, 0.0);
  float perspective = 1.0 / (0.45 + floorDepth * 1.7);
  vec2 floorUV = vec2((uv.x - 0.5) * aspect * perspective, 1.4 * perspective);
  floorUV += distortion * 0.026 + u_pointer * 0.014;
  vec2 lightUV = floorUV * 5.5;
  float light = caustic(lightUV, t);
  float fineLight = caustic(lightUV * 1.75 + 12.0, -t * 0.7);

  vec3 water = mix(LAGOON, TEAL, smoothstep(0.1, 0.85, floorDepth) * 0.62);
  water = mix(water, SEAFOAM, exp(-floorDepth * 7.0) * 0.4);
  float sunShaft = pow(0.5 + 0.5 * sin((uv.x - 0.82) / (0.3 + uv.y) * 24.0 + t * 0.12), 8.0);
  sunShaft *= exp(-abs(uv.x - 0.82) * 2.0) * exp(-floorDepth * 2.0);
  water = mix(water, SEAFOAM, sunShaft * 0.14);
  float shaftAngle = atan((uv.x - 0.82) * aspect, floorDepth + 0.1);
  float broadRays = pow(noise(vec2(shaftAngle * 11.0 + t * 0.025, t * 0.04)), 3.0);
  water = mix(water, SEAFOAM, broadRays * 0.30 * exp(-floorDepth * 0.9));
  water = mix(water, TEAL, smoothstep(0.2, 0.95, abs(uv.x - 0.5) * 1.5) * 0.12);
  // The sunlit foreground returns to lagoon, keeping small footer text readable.
  water = mix(water, LAGOON, smoothstep(0.34, 0.52, floorDepth));
  float lightAmount = (light * 0.33 + fineLight * 0.10) * smoothstep(0.015, 0.20, floorDepth);
  water = mix(water, SEAFOAM, lightAmount);
  water += vec3(rippleLight) * vec3(0.6, 1.0, 1.0);

  // Submerged tile seams recede towards the surface; never presented as a live feed.
  vec2 grid = abs(fract(floorUV * 4.0) - 0.5);
  float grout = max(smoothstep(0.49, 0.50, grid.x), smoothstep(0.49, 0.50, grid.y));
  water = mix(water, TEAL, grout * 0.10 * smoothstep(0.12, 0.45, depth));
  float laneX = abs(floorUV.x - 1.15);
  float lane = 1.0 - smoothstep(0.027, 0.036, laneX);
  water = mix(water, TEAL, lane * 0.14 * smoothstep(0.12, 0.38, depth));

  // A thin refractive lens at the waterline catches alternating reflected light.
  float meniscus = exp(-abs(depth) * 95.0);
  float glints = 0.5 + 0.5 * waves(vec2(x * 9.0, depth * 44.0), t * 1.3);
  water = mix(water, mix(TEAL, SEAFOAM, glints), meniscus * 0.90);
  water = mix(water, SAND, exp(-abs(depth - 0.003) * 700.0) * (0.25 + glints * 0.45));
  float underside = exp(-abs(depth - 0.032) * 62.0);
  water = mix(water, TEAL, underside * (0.10 + glints * 0.10));
  float ribbon = exp(-abs(depth - 0.016 - waves(vec2(x * 5.0, 0.0), t) * 0.006) * 340.0);
  water = mix(water, SEAFOAM, ribbon * 0.35);

  vec3 color = mix(sky, water, smoothstep(-0.0015, 0.0015, depth));
  // Dithering avoids banding on the slow sky and underwater gradients.
  color += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(color, 1.0);
}
`
