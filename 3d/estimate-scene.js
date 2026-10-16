// LeadCatch estimate scene (three.js). Stufen 0..4 = Sturm -> goldene Stunde. Wird von leadcatch_worker.js auf /q/<kunde>
// eingebunden: <canvas id="gl" data-accent="#rrggbb"> im #stage, Import-Map für "three". window.__setStage(n) setzt die Stufe.
// Kein Modell-Download nötig: das Haus ist parametrisch (PBR-Materialien, prozedurale Texturen), Dach in der Betriebsfarbe.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const stageEl = document.getElementById('stage');
const canvas = document.getElementById('gl');
if (!canvas || !stageEl) throw new Error('no canvas');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 640px)').matches || /Mobi|Android/i.test(navigator.userAgent);
const accent = new THREE.Color(canvas.dataset.accent || '#0a66ff');
const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp, smooth = THREE.MathUtils.smoothstep;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
} catch (e) { stageEl.classList.add('nogl'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x222a36, 0.04);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 600);
const target = new THREE.Vector3(0, 1.4, 0);

// ── Himmel, Sonne, Umgebungslicht ─────────────────────────────
const sky = new Sky(); sky.scale.setScalar(2000); scene.add(sky);
const skyU = sky.material.uniforms;
const sunDir = new THREE.Vector3();
const sun = new THREE.DirectionalLight(0xffe2b0, 1);
sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 80;
sun.shadow.camera.left = sun.shadow.camera.bottom = -14; sun.shadow.camera.right = sun.shadow.camera.top = 14;
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0x8fa3c0, 0x3a3630, 0.6); scene.add(hemi);
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null, envStamp = -1;
function refreshEnv() {
  const rt = pmrem.fromScene(sky, 0, 0.1, 1000);
  if (envRT) envRT.dispose();
  envRT = rt; scene.environment = rt.texture;
}

// ── Prozedurale Texturen ─────────────────────────────────────
function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
const shingleColor = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  const rows = 14, cols = 12;
  for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
    const x = (c + (r % 2) * 0.5) * (w / cols), y = r * (h / rows);
    const v = 0.78 + Math.random() * 0.22; g.fillStyle = `rgb(${255 * v | 0},${255 * v | 0},${255 * v | 0})`;
    g.fillRect(x + 1, y + 1, w / cols - 2, h / rows - 2);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 1, y + h / rows - 4, w / cols - 2, 4);
  }
}, [3, 2]);
const shingleBump = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  const rows = 14, cols = 12;
  for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
    const x = (c + (r % 2) * 0.5) * (w / cols), y = r * (h / rows);
    g.fillStyle = '#9a9a9a'; g.fillRect(x + 1, y + 1, w / cols - 2, h / rows - 5);
    g.fillStyle = '#404040'; g.fillRect(x, y + h / rows - 5, w / cols, 5);
    g.fillStyle = '#505050'; g.fillRect(x, y, 2, h / rows);
  }
}, [3, 2], false);
const sidingColor = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,.09)'; g.fillRect(0, y + 12, w, 4); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, y, w, 1); }
}, [4, 3]);
const sidingBump = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) { g.fillStyle = '#404040'; g.fillRect(0, y + 12, w, 4); g.fillStyle = '#a0a0a0'; g.fillRect(0, y, w, 2); }
}, [4, 3], false);
const groundColor = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#6a6760'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = 90 + Math.random() * 60; g.fillStyle = `rgba(${v},${v - 4},${v - 10},.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}, [18, 18]);
const groundRough = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { const r = 20 + Math.random() * 50, x = Math.random() * w, y = Math.random() * h; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, '#202020'); gr.addColorStop(1, 'rgba(200,200,200,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
}, [6, 6], false);

// ── Boden ─────────────────────────────────────────────────────
const groundMat = new THREE.MeshStandardMaterial({ map: groundColor, roughnessMap: groundRough, roughness: 1, metalness: 0, color: 0xffffff });
const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 64), groundMat);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
// Weg zur Haustür
const path = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 9), new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: .9 }));
path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, 6.6); path.receiveShadow = true; scene.add(path);

// ── Haus (parametrisch) ──────────────────────────────────────
const house = new THREE.Group(); scene.add(house);
const W = 7.2, D = 5.6, Hh = 3.0, roofH = 2.4, over = 0.45;
const wallMat = new THREE.MeshStandardMaterial({ map: sidingColor, bumpMap: sidingBump, bumpScale: 0.02, roughness: .85, color: 0xffffff });
const body = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D), wallMat);
body.position.y = Hh / 2; body.castShadow = body.receiveShadow = true; house.add(body);
// Giebel (vorne/hinten) als Dreiecksprisma
const gableShape = new THREE.Shape(); gableShape.moveTo(-W / 2, 0); gableShape.lineTo(W / 2, 0); gableShape.lineTo(0, roofH); gableShape.closePath();
const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(gableShape, { depth: D, bevelEnabled: false }), wallMat);
gable.position.set(0, Hh, -D / 2); gable.castShadow = gable.receiveShadow = true; house.add(gable);
// Dachflächen
const roofMat = new THREE.MeshStandardMaterial({ map: shingleColor, bumpMap: shingleBump, bumpScale: 0.035, roughness: .8, color: accent.clone() });
const slopeLen = Math.hypot(W / 2 + over, roofH + over * roofH / (W / 2)), ang = Math.atan2(roofH, W / 2);
function roofSide(sign) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(slopeLen + 0.1, 0.12, D + over * 2), roofMat);
  m.position.set(sign * (W / 4 + over / 2 - 0.05) , Hh + roofH / 2 + 0.02, 0);
  m.rotation.z = -sign * ang; m.castShadow = m.receiveShadow = true; return m;
}
house.add(roofSide(1), roofSide(-1));
const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, D + over * 2 + 0.05), new THREE.MeshStandardMaterial({ color: accent.clone().multiplyScalar(0.7), roughness: .7 }));
ridge.position.y = Hh + roofH + 0.1; house.add(ridge);
// Schornstein
const chim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), new THREE.MeshStandardMaterial({ color: 0x6f655d, roughness: .95 }));
chim.position.set(1.9, Hh + roofH - 0.3, -0.9); chim.castShadow = true; house.add(chim);
// Tür
const doorMat = new THREE.MeshStandardMaterial({ color: accent.clone().multiplyScalar(0.85), roughness: .5 });
const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.08), doorMat); door.position.set(0, 1.1, D / 2 + 0.04); house.add(door);
const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.35, 0.06), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: .6 })); frame.position.set(0, 1.17, D / 2 + 0.01); house.add(frame);
const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.7), new THREE.MeshStandardMaterial({ color: 0xb9b2a6, roughness: .9 })); step.position.set(0, 0.09, D / 2 + 0.4); step.castShadow = step.receiveShadow = true; house.add(step);
// Fenster (Glas mit Emission bei Licht an) + Rahmen
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x24344c, roughness: 0.08, metalness: 0, envMapIntensity: 1.6, emissive: 0xffc46a, emissiveIntensity: 0 });
const frameMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: .6 });
const windows = [];
function win(x, y, z, ry, w = 1.3, h = 1.1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
  const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, h + 0.18, 0.06), frameMat); f.position.z = 0.02; g.add(f);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat); p.position.z = 0.06; g.add(p);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.02), frameMat); bar.position.z = 0.07; g.add(bar);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.02), frameMat); bar2.position.z = 0.07; g.add(bar2);
  house.add(g); windows.push(g); return g;
}
win(-2.2, 1.65, D / 2, 0); win(2.2, 1.65, D / 2, 0);
win(W / 2, 1.65, -1.2, Math.PI / 2); win(W / 2, 1.65, 1.2, Math.PI / 2); win(-W / 2, 1.65, 0, -Math.PI / 2);
// Dachrinne + Fallrohr
const gutterMat = new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: .4, metalness: .6 });
for (const s of [1, -1]) {
  const gt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, D + over * 2, 10), gutterMat);
  gt.rotation.x = Math.PI / 2; gt.position.set(s * (W / 2 + over - 0.05), Hh - 0.02, 0); house.add(gt);
  const dp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, Hh, 8), gutterMat); dp.position.set(s * (W / 2 + 0.08), Hh / 2, D / 2 - 0.2); house.add(dp);
}
// Innenlicht (scheint durch die Fenster)
const roomLight = new THREE.PointLight(0xffc46a, 0, 9, 2); roomLight.position.set(0, 1.8, 0); house.add(roomLight);
const porch = new THREE.PointLight(0xffd59a, 0, 6, 2); porch.position.set(0, 2.4, D / 2 + 0.5); house.add(porch);
// Baum rechts als Silhouette mit Volumen
const treeMat = new THREE.MeshStandardMaterial({ color: 0x4f7a4a, roughness: .95 });
const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.2, 10), new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: .95 }));
trunk.position.set(7.4, 1.6, 1.5); trunk.castShadow = true; scene.add(trunk);
for (const [x, y, z, r] of [[7.4, 4.2, 1.5, 1.7], [6.6, 3.4, 2.1, 1.2], [8.2, 3.5, 0.9, 1.25], [7.3, 5.3, 1.4, 1.1]]) {
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), treeMat); b.position.set(x, y, z); b.castShadow = true; scene.add(b);
}
// Zaun links
const fenceMat = new THREE.MeshStandardMaterial({ color: 0xe8e3d8, roughness: .8 });
for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), fenceMat); p.position.set(-7.5 + i * 0.55, 0.5, 4.2 - i * 0.02); p.castShadow = true; scene.add(p); }
const rail = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 0.08), fenceMat); rail.position.set(-5.3, 0.7, 4.12); scene.add(rail);

// ── Wolken (Sprites, prozedurale Textur) ──────────────────────
const cloudTex = canvasTex(256, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) { const x = w / 2 + (Math.random() - .5) * w * .5, y = h / 2 + (Math.random() - .5) * h * .3, r = 40 + Math.random() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
}, [1, 1]);
cloudTex.wrapS = cloudTex.wrapT = THREE.ClampToEdgeWrapping;
const clouds = [];
const cloudGroup = new THREE.Group(); scene.add(cloudGroup);
for (let i = 0; i < (mobile ? 26 : 40); i++) {
  const m = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: true, color: 0x3a414d, opacity: .9 });
  const s = new THREE.Sprite(m); const a = Math.random() * Math.PI * 2, r = 45 + Math.random() * 110;
  s.position.set(Math.cos(a) * r, 22 + Math.random() * 26 + r * 0.06, Math.sin(a) * r - 20);
  const sc = 26 + Math.random() * 40; s.scale.set(sc, sc * 0.5, 1);
  s.userData = { rank: Math.random(), speed: 0.4 + Math.random() * 0.8, base: s.position.clone() };
  cloudGroup.add(s); clouds.push(s);
}

// ── Regen (instanziert, Shader) ───────────────────────────────
const RAIN_N = mobile ? 3500 : 7000, RAIN_BOX = new THREE.Vector3(34, 16, 34);
const rainGeo = new THREE.InstancedBufferGeometry();
rainGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
rainGeo.setIndex([0, 1, 2, 0, 2, 3]);
const off = new Float32Array(RAIN_N * 3), spd = new Float32Array(RAIN_N), len = new Float32Array(RAIN_N);
for (let i = 0; i < RAIN_N; i++) { off[i * 3] = (Math.random() - .5) * RAIN_BOX.x; off[i * 3 + 1] = Math.random() * RAIN_BOX.y; off[i * 3 + 2] = (Math.random() - .5) * RAIN_BOX.z; spd[i] = 9 + Math.random() * 5; len[i] = 0.25 + Math.random() * 0.35; }
rainGeo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
rainGeo.setAttribute('aSpd', new THREE.InstancedBufferAttribute(spd, 1));
rainGeo.setAttribute('aLen', new THREE.InstancedBufferAttribute(len, 1));
const rainMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uT: { value: 0 }, uBox: { value: RAIN_BOX }, uWind: { value: 0.35 }, uOp: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uCol: { value: new THREE.Color(0.75, 0.82, 0.95) } },
  vertexShader: `attribute vec3 aOff;attribute float aSpd;attribute float aLen;uniform float uT,uWind,uOp;uniform vec3 uBox,uCenter;varying float vA;varying vec2 vUv;
    void main(){float y=mod(aOff.y-uT*aSpd,uBox.y);vec3 p=uCenter+vec3(aOff.x+y*uWind,y,aOff.z);
    vec3 up=normalize(vec3(uWind,1.,0.));vec3 toCam=normalize(cameraPosition-p);vec3 right=normalize(cross(up,toCam));
    vec3 w=p+right*position.x*0.012+up*position.y*aLen;vUv=position.xy+.5;
    float d=length(cameraPosition-p);vA=uOp*smoothstep(1.5,5.,d)*smoothstep(uBox.y,uBox.y-3.,y);
    gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
  fragmentShader: `uniform vec3 uCol;varying float vA;varying vec2 vUv;void main(){float a=(1.-abs(vUv.x-.5)*2.)*smoothstep(0.,.3,vUv.y)*smoothstep(1.,.6,vUv.y);gl_FragColor=vec4(uCol,a*vA*.55);}`
});
const rain = new THREE.Mesh(rainGeo, rainMat); rain.frustumCulled = false; scene.add(rain);

// ── Blitz ────────────────────────────────────────────────────
const bolt = new THREE.PointLight(0xcfe0ff, 0, 120, 1.2); bolt.position.set(-20, 30, -30); scene.add(bolt);
let flash = 0, nextStrike = 2;

// ── Post-Processing ──────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.7, 0.86); composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uVig: { value: 0.55 }, uWarm: { value: 0 } },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse;uniform float uT,uVig,uWarm;varying vec2 vUv;
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){vec2 d=(vUv-.5)*vec2(1.,1.2);float v=1.-smoothstep(.45,1.2,length(d))*uVig;
    vec3 c=texture2D(tDiffuse,vUv).rgb;c=mix(c,c*vec3(1.04,1.,.94),uWarm);c*=v;c+=(h(vUv*vec2(1920.,1080.)+fract(uT))-.5)*.03;gl_FragColor=vec4(c,1.);}`
}); composer.addPass(grade);
composer.addPass(new OutputPass());

// ── Wetter / Stufe ───────────────────────────────────────────
const STAGE_W = [1, 0.72, 0.42, 0.16, 0];
let targetStage = +stageEl.dataset.stage || 0, wet = STAGE_W[targetStage], wetTarget = wet;
window.__setStage = (n) => { targetStage = clamp(n | 0, 0, 4); wetTarget = STAGE_W[targetStage]; };
const fogStorm = new THREE.Color(0x1f2733), fogClear = new THREE.Color(0xf0dcc0);
const cloudStorm = new THREE.Color(0x343b47), cloudClear = new THREE.Color(0xfff4e6);
const sunStorm = new THREE.Color(0x9fb0c8), sunClear = new THREE.Color(0xffd7a0);
function applyWeather(w, t) {
  const day = 1 - w;                       // 0 Sturm .. 1 klar
  const lit = smooth(day, 0.78, 0.9);      // Fenster an (Stufe 3+)
  // Sonne: tief hinter dem Haus rechts, steigt mit dem Aufklaren
  const elev = THREE.MathUtils.degToRad(lerp(1.5, 7, smooth(day, 0.45, 1))), az = THREE.MathUtils.degToRad(-128);
  sunDir.setFromSphericalCoords(1, Math.PI / 2 - elev, az);
  skyU.sunPosition.value.copy(sunDir);
  skyU.turbidity.value = lerp(18, 5, day); skyU.rayleigh.value = lerp(0.25, 2.4, day);
  skyU.mieCoefficient.value = lerp(0.02, 0.012, day); skyU.mieDirectionalG.value = lerp(0.7, 0.86, day);
  renderer.toneMappingExposure = lerp(0.32, 1.05, smooth(day, 0, 1)) + flash * 0.5;
  sun.position.copy(sunDir).multiplyScalar(60); sun.intensity = lerp(0.25, 2.6, smooth(day, 0.35, 1)) + flash * 1.5;
  sun.color.copy(sunStorm).lerp(sunClear, day);
  hemi.intensity = lerp(0.35, 0.9, day); hemi.color.setHex(0x8fa3c0).lerp(new THREE.Color(0xffe6c8), day);
  scene.fog.density = lerp(0.045, 0.004, smooth(day, 0, 0.9)); scene.fog.color.copy(fogStorm).lerp(fogClear, day);
  groundMat.roughness = lerp(0.18, 0.95, smooth(day, 0.1, 0.75)); groundMat.color.setScalar(lerp(0.45, 1, smooth(day, 0, 0.7)));
  groundMat.envMapIntensity = lerp(1.6, 0.6, day);
  rainMat.uniforms.uOp.value = smooth(w, 0.12, 0.55); rainMat.uniforms.uWind.value = lerp(0.1, 0.45, w);
  const cover = lerp(1.0, 0.22, day);
  for (const c of clouds) {
    const vis = smooth(cover - c.userData.rank, -0.08, 0.1);
    c.material.opacity = vis * lerp(0.95, 0.42, day); c.material.color.copy(cloudStorm).lerp(cloudClear, day).addScalar(flash * 0.6);
    c.position.x = c.userData.base.x + Math.sin(t * 0.02 * c.userData.speed + c.userData.rank * 7) * 6;
    c.position.y = c.userData.base.y + lerp(-6, 4, day);
  }
  glassMat.emissiveIntensity = lit * (1.6 + 0.25 * Math.sin(t * 3.1)); glassMat.color.setHex(0x24344c).lerp(new THREE.Color(0xffd79a), lit * 0.5);
  roomLight.intensity = lit * 14; porch.intensity = lit * 4;
  bloom.strength = lerp(0.25, 0.55, lit) + flash * 0.4; grade.uniforms.uWarm.value = day; grade.uniforms.uVig.value = lerp(0.65, 0.4, day);
}

// ── Kamera ───────────────────────────────────────────────────
let aspect = 1, pointer = new THREE.Vector2(), pointerT = new THREE.Vector2();
addEventListener('pointermove', (e) => { pointerT.set((e.clientX / innerWidth - .5), (e.clientY / innerHeight - .5)); }, { passive: true });
addEventListener('deviceorientation', (e) => { if (e.gamma != null) pointerT.set(clamp(e.gamma / 45, -1, 1) * .5, clamp((e.beta - 45) / 45, -1, 1) * .3); }, { passive: true });
function resize() {
  const w = stageEl.clientWidth, h = stageEl.clientHeight; aspect = w / h;
  renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = aspect; camera.updateProjectionMatrix();
  bloom.resolution.set(w / 2, h / 2);
}
addEventListener('resize', resize); resize();
function placeCamera(t) {
  const portrait = aspect < 0.8;
  const dist = (portrait ? 23 : 15.5) * (reduce ? 1 : 1 - 0.03 * Math.sin(t * 0.05));
  const a = 0.42 + (reduce ? 0 : Math.sin(t * 0.07) * 0.06) + pointer.x * 0.08;
  camera.position.set(Math.sin(a) * dist, (portrait ? 2.1 : 2.6) + pointer.y * -0.4 + (reduce ? 0 : Math.sin(t * 0.11) * 0.08), Math.cos(a) * dist);
  target.set(0, portrait ? -1.6 : 1.1, 0); // Hochformat: Haus sitzt im oberen Bildteil (unten liegt das Panel)
  camera.lookAt(target);
  rainMat.uniforms.uCenter.value.set(camera.position.x * 0.3, 0, camera.position.z * 0.3);
}

// ── Schleife ─────────────────────────────────────────────────
let last = performance.now(), vis = true, t = 0;
document.addEventListener('visibilitychange', () => { vis = !document.hidden; last = performance.now(); });
refreshEnv();
function frame(now) {
  requestAnimationFrame(frame); if (!vis) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  wet += (wetTarget - wet) * Math.min(1, dt * 1.4);
  // Blitz nur bei Sturm
  if (wet > 0.65) { nextStrike -= dt; if (nextStrike <= 0) { flash = 1; bolt.position.set((Math.random() - .5) * 90, 28 + Math.random() * 15, -40 + Math.random() * 30); nextStrike = 2.5 + Math.random() * 6; } }
  flash = Math.max(0, flash - dt * (flash > 0.6 ? 6 : 2.2)) * (Math.random() < 0.08 && flash > 0.2 ? 1.5 : 1);
  flash = Math.min(flash, 1.2); bolt.intensity = flash * 900 * smooth(wet, 0.5, 0.8);
  applyWeather(wet, t);
  if (Math.abs(wet - envStamp) > 0.04 || envStamp < 0) { refreshEnv(); envStamp = wet; }
  placeCamera(t); pointer.lerp(pointerT, 0.04);
  rainMat.uniforms.uT.value = reduce ? 0 : t; grade.uniforms.uT.value = t;
  composer.render();
}
requestAnimationFrame(frame);
stageEl.classList.add('gl-ready');
