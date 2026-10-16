// LeadCatch Anfrage-Szene v2 „Wetter“ – fotoreale Platten statt Hand-3D (Ersteller 16.10.: „vergleich es mit einem echten Haus“).
// Fünf pixelgenau deckungsgleiche Fotos EINES Hauses (lokal mit FLUX.2 Klein + Referenz-Latent gerendert:
// Sturm → Regen → Aufklaren → Golden Hour → Sonne) werden in WebGL überblendet (Noise-Wipe von oben: der Himmel
// reißt zuerst auf) und mit Echtzeit-Regen, Blitzen, Dunst, Parallaxe und Grading überlagert.
// Schnittstelle wie v1: window.__setStage(n), Klasse gl-ready auf #stage, window.__sceneDebug().
// Eingebunden ohne three.js (reines WebGL1, ~0 Abhängigkeiten); Platten liegen auf GitHub Pages (CORS *).
(() => {
  const stageEl = document.getElementById("stage");
  const canvas = document.getElementById("gl");
  if (!stageEl || !canvas) return;
  const base = stageEl.getAttribute("data-plates") || "/3d/plates/";
  const ver = stageEl.getAttribute("data-v") || "";
  const NAMES = ["storm", "rain", "clearing", "golden", "sun"];
  const PLATE_ASPECT = 0.8; // 4:5 Hochformat
  const FOCUS = [0.52, 0.44]; // Hausmitte in Plattenkoordinaten (Zuschnitt zentriert hier)
  // Wetterparameter je Stufe: Regen, Dunst, Blitzrate (pro s), Wärme/Sonnenschein, Nässe
  const W = [
    { rain: 1.0, haze: 0.5, bolt: 0.22, warm: 0.0, wet: 1.0 },
    { rain: 0.6, haze: 0.3, bolt: 0.06, warm: 0.0, wet: 0.9 },
    { rain: 0.18, haze: 0.14, bolt: 0.0, warm: 0.25, wet: 0.6 },
    { rain: 0.0, haze: 0.04, bolt: 0.0, warm: 0.55, wet: 0.2 },
    { rain: 0.0, haze: 0.0, bolt: 0.0, warm: 0.7, wet: 0.0 },
  ];
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance" })
    || canvas.getContext("experimental-webgl");
  if (!gl) { stageEl.classList.add("nogl"); return; }

  const VS = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
  const FS = `precision highp float;varying vec2 v;
uniform sampler2D tA,tB;uniform float uMix,uTime,uRain,uHaze,uFlash,uWarm,uWet,uZoom,uAsp;uniform vec2 uPar,uBolt;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.07+vec2(1.7,9.2);a*=.5;}return s;}
// Regenschicht: hohe Zellen, in jeder ein Streifen mit zufaelliger Lage/Laenge/Phase
float rainLayer(vec2 uv,float scale,float speed,float seed,float thick){
 uv.x+=uv.y*.14; vec2 p=uv*vec2(scale,scale*.22); p.y+=uTime*speed;
 vec2 id=floor(p),f=fract(p); float r=hash(id+seed);
 float x=.15+.7*r, len=.35+.5*hash(id+seed+7.), ph=hash(id+seed+3.);
 if(ph<.45) return 0.;
 float d=abs(f.x-x)/thick; float core=exp(-d*d*3.);
 float tail=smoothstep(0.,.18,f.y)*smoothstep(len,len-.3,f.y);
 return core*tail;}
void main(){
 float ca=uAsp; vec2 uv=v;
 // Cover-Zuschnitt um den Fokuspunkt + Zoom + Parallaxe
 vec2 foc=vec2(${FOCUS[0]},${FOCUS[1]});
 if(ca<${PLATE_ASPECT}) uv.x=(uv.x-.5)*(ca/${PLATE_ASPECT})+foc.x; else uv.y=(uv.y-.5)*(${PLATE_ASPECT}/ca)+foc.y;
 uv=foc+(uv-foc)/uZoom+uPar;
 vec2 puv=vec2(uv.x,1.-uv.y);
 // Regen vorab, damit Tropfen das Bild leicht brechen
 float rn=0.; if(uRain>0.001){
  rn+=rainLayer(v,18.,1.9,1.,.08)*.55;
  rn+=rainLayer(v,34.,2.6,2.,.1)*.4;
  rn+=rainLayer(v,60.,3.4,3.,.14)*.3;
  rn*=uRain; }
 vec2 ruv=puv+vec2(0.,-rn*.012);
 vec3 a=texture2D(tA,ruv).rgb, b=texture2D(tB,ruv).rgb;
 // Wetterfront: Noise-Wipe, Himmel zuerst (oben beginnt die Ueberblendung)
 float n=fbm(uv*3.+vec2(uTime*.03,0.))*.55+(1.-uv.y)*.45;
 float m=smoothstep(n-.22,n+.22,uMix*1.44-.22);
 vec3 col=mix(a,b,m);
 // Naesse: etwas dunkler + mehr Kontrast
 col=mix(col,col*col*1.35,uWet*.18);
 // Dunst / Gischt
 float hz=fbm(uv*2.2+vec2(uTime*.02,-uTime*.01));
 col=mix(col,vec3(.52,.58,.68),uHaze*(.25+.5*hz)*(.6+.4*(1.-uv.y)));
 // Regenstreifen (fangen Licht)
 col+=rn*vec3(.78,.84,.95)*.5;
 // Blitz: Himmel hellt staerker auf, leichte Richtungsabhaengigkeit vom Einschlag
 float bl=uFlash*(.55+.45*(1.-uv.y))*(1.-.35*distance(uv,uBolt));
 col=col*(1.+bl*.9)+bl*vec3(.42,.5,.7);
 // Sonne: weiches warmes Licht von oben links, sehr zurueckhaltend
 float sun=pow(max(0.,1.-length((uv-vec2(.12,.08))*vec2(1.,1.25))*1.1),2.);
 col+=uWarm*sun*vec3(1.,.86,.62)*.16;
 col=mix(col,col*vec3(1.03,1.,.96),uWarm*.5);
 // Grading: Vignette, sanfte S-Kurve, Korn
 float vg=smoothstep(1.25,.35,length((v-.5)*vec2(1.,1.15)));
 col*=mix(.78,1.,vg);
 col=mix(col,col*col*(3.-2.*col),.22);
 col+=(hash(v*vec2(900.,900./uAsp)+fract(uTime))-.5)*.028;
 gl_FragColor=vec4(col,1.);}`;

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn("scene shader", e); stageEl.classList.add("nogl"); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const k of ["tA", "tB", "uMix", "uTime", "uRain", "uHaze", "uFlash", "uWarm", "uWet", "uZoom", "uAsp", "uPar", "uBolt"]) U[k] = gl.getUniformLocation(prog, k);
  gl.uniform1i(U.tA, 0); gl.uniform1i(U.tB, 1);

  // ── Platten laden (Zielstufe zuerst, dann der Rest im Hintergrund) ──
  const tex = [], ready = [];
  const retina = (window.devicePixelRatio || 1) > 1.4 && Math.max(innerWidth, innerHeight) > 900;
  function makeTex(img) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function load(i) {
    return new Promise((res) => {
      const img = new Image(); img.crossOrigin = "anonymous"; img.decoding = "async";
      img.onload = () => { try { tex[i] = makeTex(img); ready[i] = true; } catch (e) { console.warn("plate", i, e); } res(); };
      img.onerror = () => { console.warn("plate missing", NAMES[i]); res(); };
      img.src = `${base}${NAMES[i]}${retina ? "@2x" : ""}.webp${ver ? "?v=" + ver : ""}`;
    });
  }

  // ── Zustand ──
  let target = +(stageEl.getAttribute("data-stage") || 0), shown = -1, from = -1, mix = 1, mixStart = 0;
  const cur = { rain: 1, haze: .5, warm: 0, wet: 1 };
  let flash = 0, nextBolt = 1.2, bolt = [0.7, 0.3], asp = 1, t0 = performance.now(), last = t0, frames = 0, fps = 60, fpsMark = t0;
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  window.__setStage = (n) => { target = Math.max(0, Math.min(4, n | 0)); };

  function resize() {
    const cap = (navigator.hardwareConcurrency || 4) <= 4 ? 1.25 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    asp = w / Math.max(1, h);
  }
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { par.tx = (e.clientX / innerWidth - .5) * -0.012; par.ty = (e.clientY / innerHeight - .5) * 0.008; } }, { passive: true });
  addEventListener("deviceorientation", (e) => { if (e.gamma != null && e.beta != null) { par.tx = Math.max(-1, Math.min(1, e.gamma / 30)) * -0.012; par.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * 0.008; } }, { passive: true });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    if (++frames % 30 === 0) { fps = fps * .6 + (30000 / Math.max(1, now - fpsMark)) * .4; fpsMark = now; }
    // Stufenwechsel, sobald die Zielplatte geladen ist; sonst Zwischenstufe in Zielrichtung
    if (shown !== target && mix >= 1) {
      let k = target;
      if (!ready[k] && shown >= 0) { const dir = target > shown ? 1 : -1; k = shown + dir; while (k !== target && !ready[k]) k += dir; }
      if (ready[k] && k !== shown) {
        from = shown < 0 ? k : shown; shown = k; mix = from === shown ? 1 : 0; mixStart = now;
        stageEl.classList.add("gl-ready");
      }
    }
    if (shown < 0) return;
    if (mix < 1) { const e = Math.min(1, (now - mixStart) / 1700); mix = e < .5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2; }
    // Wetter weich nachziehen (zeitbasiert, unabhaengig von der Bildrate)
    const w = W[shown], k = 1 - Math.exp(-dt * 1.4);
    for (const key of ["rain", "haze", "warm", "wet"]) cur[key] += (w[key] - cur[key]) * k;
    // Blitze: Poisson-artig, gelegentlich Doppelschlag
    if (w.bolt > 0 && t > nextBolt) {
      flash = 0.85 + Math.random() * .35; bolt = [0.45 + Math.random() * .5, 0.15 + Math.random() * .3];
      nextBolt = t + (Math.random() < .3 ? 0.12 + Math.random() * .1 : -Math.log(1 - Math.random()) / w.bolt + 0.8);
    }
    flash *= Math.exp(-dt * 9);
    par.x += (par.tx - par.x) * (1 - Math.exp(-dt * 3)); par.y += (par.ty - par.y) * (1 - Math.exp(-dt * 3));
    const zoom = 1.045 + Math.min(1, t / 90) * .04 + Math.sin(t * .11) * .004;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[from] || tex[shown]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[shown]);
    gl.uniform1f(U.uMix, mix); gl.uniform1f(U.uTime, t); gl.uniform1f(U.uRain, cur.rain); gl.uniform1f(U.uHaze, cur.haze);
    gl.uniform1f(U.uFlash, flash); gl.uniform1f(U.uWarm, cur.warm); gl.uniform1f(U.uWet, cur.wet); gl.uniform1f(U.uZoom, zoom);
    gl.uniform1f(U.uAsp, asp); gl.uniform2f(U.uPar, par.x + Math.sin(t * .07) * .002, par.y + Math.cos(t * .09) * .0015); gl.uniform2f(U.uBolt, bolt[0], bolt[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  window.__sceneDebug = () => ({ v: 2, shown, target, mix: +mix.toFixed(2), ready: NAMES.filter((_, i) => ready[i]), fps: Math.round(fps),
    w: { rain: +cur.rain.toFixed(2), haze: +cur.haze.toFixed(2), warm: +cur.warm.toFixed(2), wet: +cur.wet.toFixed(2) }, flash: +flash.toFixed(2), size: [canvas.width, canvas.height] });

  resize();
  load(target).then(async () => { requestAnimationFrame(frame); for (const i of [0, 1, 2, 3, 4]) if (!ready[i]) await load(i); });
  setTimeout(() => { if (!ready[target]) console.warn("plates slow", base); }, 6000);
})();
