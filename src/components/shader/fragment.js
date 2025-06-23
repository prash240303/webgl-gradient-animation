export const fragment = `

vec2 uvCover (vec2 uv, vec2 size, vec2 resolution) {
  vec2 coverUv = uv;
  vec2 s = resolution; // Screen
  vec2 i = size;       // Image

  float rs = s.x / s.y;
  float ri = i.x / i.y;
  vec2 new = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
  vec2 offset = (rs < ri ? vec2((new.x - s.x) / 2.0, 0.0) : vec2(0.0, (new.y - s.y) / 2.0)) / new;

  coverUv = coverUv * s / new + offset;

  return coverUv;
}

varying vec2 vUv;
uniform float uTime;
uniform vec2 uImageSize;
uniform vec2 uScreenSize;
uniform float uAmplitude;
uniform vec3 uColors[3];
float PI = 3.141592653589793238;

void main() {
  vec2 uv = uvCover(vUv, uImageSize, uScreenSize);
  vec2 centeredUv = 2. * uv - vec2(1.);

  centeredUv += uAmplitude * 0.4 * sin(1. * centeredUv.yx + vec2(1.2, 3.4) + uTime);
  centeredUv += uAmplitude * 0.2 * sin(5.2 * centeredUv.yx + vec2(3.5, 0.4) + uTime);
  centeredUv += uAmplitude * 0.3 * sin(3.5 * centeredUv.yx + vec2(1.2, 3.1) + uTime);
  centeredUv += uAmplitude * 1.6 * sin(0.4 * centeredUv.yx + vec2(0.8, 2.4) + uTime);

  vec3 baseColor = uColors[0];

  for (int i = 0; i < 3; i++) {
    float r = cos(float(i) * length(centeredUv));
    vec3 noise = vec3(r);
    baseColor = mix(baseColor, uColors[i], noise);
  }

  gl_FragColor = vec4(baseColor, 1.0);
}

`;
