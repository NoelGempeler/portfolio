/* p5 instance sketch for the enter screen only */

/** Tweak these to customize the enter-screen ball */
const WELCOME_SHADER = {
  ballScale: 0.3, // fraction of min(viewport)
  autoSpin: 100, // deg/sec idle spin
  mouseSpin: 0.3, // mouse rotation strength
  tileZoom: 10.0,
  warpStrength: 1.0,
  circleA: 5.0,
  circleB: 10.0,
  circleC: 20.0,
  titleParallax: 0.7, // how far title drifts with mouse (0–1 of half-screen)
  titleLag: 0.12, // lerp speed toward mouse
};

const vertexShader = `
precision highp float;

attribute vec3 aPosition;
attribute vec2 aTexCoord;
attribute vec4 aVertexColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying vec2 vTexCoord;

void main() {
  vec4 viewModelPosition =
    uModelViewMatrix *
    vec4(aPosition, 1.0);

  gl_Position =
    uProjectionMatrix *
    viewModelPosition;

  vTexCoord = aTexCoord;
}
`;

const fragmentShader = `
// casey conchinha - @kcconch
// louise lessel - @louiselessel
// rotate/tile from patricio gonzalez vivo @patriciogv

#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265358979323846

uniform vec2 resolution;
uniform float time;
uniform vec2 mouse;
uniform float uTileZoom;
uniform float uWarp;
uniform float uCircleA;
uniform float uCircleB;
uniform float uCircleC;
varying vec2 vTexCoord;

vec2 rotate2D (vec2 _st, float _angle) {
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}

vec2 tile (vec2 _st, float _zoom) {
    _st *= _zoom;
    return fract(_st);
}

float concentricCircles(in vec2 st, in vec2 radius, in float res, in float scale) {
    float dist = distance(st,radius);
    float pct = floor(dist*res)/scale;
    return pct;
}

void main (void) {
    vec2 st = vTexCoord;
    vec2 mst = gl_FragCoord.xy/max(mouse.xy, vec2(1.0));
    float mdist= distance(vec2(1.0,1.0), mst);

    float dist = distance(st,vec2(sin(time/10.0),cos(time/10.0)));
    st = tile(st, uTileZoom);

    st = rotate2D(st, dist / max(mdist / 5.0, 0.05) * PI * 2.0 * uWarp);

    gl_FragColor = vec4(vec3(
      concentricCircles(st, vec2(0.0,0.0), uCircleA, 5.0),
      concentricCircles(st, vec2(0.0,0.0), uCircleB, 10.0),
      concentricCircles(st, vec2(0.0,0.0), uCircleC, 10.0)
    ),1.0);
}
`;

window.__welcomeP5 = new p5((p) => {
  let theShader;
  let titleEl = null;
  let titleX = 0;
  let titleY = 0;

  p.setup = () => {
    const host = document.getElementById("welcome-p5");
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    if (host) canvas.parent(host);
    p.noStroke();
    p.angleMode(p.DEGREES);
    theShader = p.createShader(vertexShader, fragmentShader);
    titleEl = document.querySelector(".welcome-title");
  };

  p.draw = () => {
    p.background(255);

    theShader.setUniform("resolution", [p.width, p.height]);
    theShader.setUniform("time", p.millis() / 1000.0);
    theShader.setUniform("mouse", [
      Math.max(p.mouseX, 1),
      Math.max(p.map(p.mouseY, 0, p.height, p.height, 0), 1),
    ]);
    theShader.setUniform("uTileZoom", WELCOME_SHADER.tileZoom);
    theShader.setUniform("uWarp", WELCOME_SHADER.warpStrength);
    theShader.setUniform("uCircleA", WELCOME_SHADER.circleA);
    theShader.setUniform("uCircleB", WELCOME_SHADER.circleB);
    theShader.setUniform("uCircleC", WELCOME_SHADER.circleC);

    p.shader(theShader);

    const s = Math.min(p.width, p.height) * WELCOME_SHADER.ballScale;
    const t = p.millis() / 1000.0;
    p.push();
    p.rotateX(-p.mouseY * WELCOME_SHADER.mouseSpin + t * WELCOME_SHADER.autoSpin * 0.35);
    p.rotateY(-p.mouseX * WELCOME_SHADER.mouseSpin + t * WELCOME_SHADER.autoSpin);
    p.sphere(s);
    p.pop();

    // Title drifts with mouse (lerped), centered by default
    if (titleEl) {
      const nx = (p.mouseX / p.width - 0.5) * 2;
      const ny = (p.mouseY / p.height - 0.5) * 2;
      const targetX = nx * (p.width * 0.5) * WELCOME_SHADER.titleParallax;
      const targetY = ny * (p.height * 0.5) * WELCOME_SHADER.titleParallax;
      titleX += (targetX - titleX) * WELCOME_SHADER.titleLag;
      titleY += (targetY - titleY) * WELCOME_SHADER.titleLag;
      titleEl.style.setProperty("--tx", `${titleX}px`);
      titleEl.style.setProperty("--ty", `${titleY}px`);
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
});

window.__destroyWelcomeShader = () => {
  if (window.__welcomeP5) {
    window.__welcomeP5.remove();
    window.__welcomeP5 = null;
  }
};
