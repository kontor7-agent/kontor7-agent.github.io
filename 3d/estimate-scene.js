// LeadCatch Anfrage-Szene v3 „Film“ (Ersteller 16.10.: eigener Higgsfield-Clip, nur aus Prompt erzeugt).
// Ein 5-s-Clip – Sturm → Regen → goldene Stunde → Sonne, Haus bleibt identisch – wird mit jeder Antwort
// ein Stück weitergespielt (nicht gesprungen): Stufe n = Zeitmarke MARKS[n]. Zurück = Sprung zur Marke.
// Schnittstelle wie v1/v2: window.__setStage(n), Klasse gl-ready auf #stage, window.__sceneDebug().
(() => {
  const stageEl = document.getElementById("stage");
  const v = document.getElementById("hv");
  if (!stageEl || !v) return;
  const base = stageEl.getAttribute("data-video") || "/3d/video/";
  const ver = stageEl.getAttribute("data-v") || "";
  const q = Math.max(innerWidth, innerHeight) * (devicePixelRatio || 1) > 1500 ? "1080" : "720";
  v.src = `${base}house-${q}.mp4${ver ? "?v=" + ver : ""}`;
  v.muted = true; v.playsInline = true; v.preload = "auto";
  let dur = 5.1, target = +(stageEl.getAttribute("data-stage") || 0), goal = 0, playing = false, ready = false;
  const marks = () => [0, 0.26, 0.52, 0.78, 0.985].map((f) => f * dur);
  const stop = () => { v.pause(); playing = false; };
  function go() {
    if (!ready) return;
    const m = marks()[target];
    if (m < v.currentTime - 0.05) { stop(); v.currentTime = m; goal = m; return; }  // zurück = Sprung
    if (m <= v.currentTime + 0.03) return;
    goal = m;
    if (!playing) { playing = true; v.play().catch(() => { v.currentTime = goal; playing = false; }); }
  }
  function tick() {
    requestAnimationFrame(tick);
    if (playing && v.currentTime >= goal - 0.04) { stop(); if (goal < dur - 0.1) v.currentTime = goal; }
  }
  v.addEventListener("loadedmetadata", () => { dur = v.duration || dur; });
  v.addEventListener("canplay", () => { if (ready) return; ready = true; stageEl.classList.add("gl-ready"); go(); }, { once: false });
  v.addEventListener("ended", () => { playing = false; });
  v.addEventListener("error", () => { stageEl.classList.add("nogl"); });
  window.__setStage = (n) => { target = Math.max(0, Math.min(4, n | 0)); go(); };
  window.__sceneDebug = () => ({ v: 3, target, t: +v.currentTime.toFixed(2), dur: +dur.toFixed(2), goal: +goal.toFixed(2), playing, ready, q, size: [v.videoWidth, v.videoHeight] });
  requestAnimationFrame(tick);
  v.load();
})();
