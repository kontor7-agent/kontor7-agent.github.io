// LeadCatch Anfrage-Szene v3.1 „Film + Loops“ (Ersteller 16.10.: pro Zustand ein Loop desselben Hauses, der weiterläuft, solange die Frage steht).
// Zwei <video>: #hl = Zustands-Loop (loop-n.mp4, Start = Ende = exakter Frame aus dem Hauptclip an Marke n, lokal mit MiniMax H3 gerendert),
// #hv = Hauptclip (house-720/1080.mp4, Sturm → Sonne). Antwort: Hauptclip wird von Marke n bis Marke m gespielt (kurze Überblendung aus dem
// Loop), dann übernimmt Loop m. „Zurück“ springt. Fehlen die Loops (404), verhält sich die Szene wie v3 (Hauptclip hält am Frame).
// Schnittstelle unverändert: window.__setStage(n), Klasse gl-ready auf #stage, window.__sceneDebug().
(() => {
  const stageEl = document.getElementById("stage");
  const V = document.getElementById("hv"), L = document.getElementById("hl");
  if (!stageEl || !V) return;
  const base = stageEl.getAttribute("data-video") || "/3d/video/";
  const ver = stageEl.getAttribute("data-v") || "";
  // Datensparmodus / langsames Netz / reduzierte Bewegung (KUNDENREISE 2, 16.10.): kein Video, das Poster bleibt (Klasse nogl).
  // window.__setStage bleibt definiert, damit das Formular wie gewohnt weiterläuft; gl-ready wird nicht gesetzt.
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const slowNet = !!(conn && (conn.saveData || /^(slow-2g|2g|3g)$/.test(String(conn.effectiveType || ""))));
  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (slowNet || reduceMotion) {
    stageEl.classList.add("nogl");
    let target = +(stageEl.getAttribute("data-stage") || 0);
    window.__setStage = (n) => { target = Math.max(0, Math.min(4, n | 0)); };
    window.__sceneDebug = () => ({ v: 3.1, off: slowNet ? "slow-net" : "reduced-motion", target, shown: -1, mode: "off", loopsOk: false, loopN: -1, ready: false, q: null });
    return;
  }
  // Qualität nach CSS-Pixeln (nicht mal DPR): Handys bleiben bei 720p (KUNDENREISE 2: 1080p = 4,3 MB auf dem Handy)
  const q = Math.max(innerWidth, innerHeight) > 1100 ? "1080" : "720";
  const src = (n) => `${base}${n}.mp4${ver ? "?v=" + ver : ""}`;
  const FR = [0, 0.26, 0.52, 0.78, 0.985];
  let dur = 5.17, target = +(stageEl.getAttribute("data-stage") || 0), shown = -1, goal = -1, mode = "idle", loopsOk = !!L, loopN = -1, ready = false;
  const mark = (n) => FR[n] * dur;
  const on = (el, yes) => el && el.classList.toggle("on", yes);
  const warmed = new Set();
  const warm = (n) => { if (!loopsOk || n < 0 || n > 4 || warmed.has(n)) return; warmed.add(n); try { fetch(src("loop-" + n), { mode: "no-cors" }).catch(() => {}); } catch (e) { /* egal */ } };

  function showLoop(n) {
    if (!loopsOk) { on(V, true); mode = "idle"; shown = n; return; }
    if (loopN !== n) { loopN = n; L.src = src("loop-" + n); L.load(); }
    L.loop = true; mode = "loopwait";
    const start = () => {
      L.removeEventListener("canplay", start);
      if (loopN !== n) return;
      L.currentTime = 0;
      L.play().then(() => { on(L, true); on(V, false); mode = "idle"; shown = n; setTimeout(() => { if (mode === "idle") V.pause(); }, 400); warm(n + 1); })
        .catch(() => { loopsOk = false; on(V, true); on(L, false); mode = "idle"; shown = n; });
    };
    if (L.readyState >= 3) start(); else L.addEventListener("canplay", start);
  }
  function go() {
    if (!ready || target === shown || mode === "trans") return;
    if (shown < 0 || target < shown || !loopsOk && mode !== "idle") {  // Start oder Zurück: springen
      V.pause(); V.currentTime = mark(target); shown = target; on(V, true);
      if (loopsOk) showLoop(target); else mode = "idle";
      return;
    }
    // vorwärts: Hauptclip von Marke shown bis Marke target spielen, dann Loop target
    mode = "trans"; goal = mark(target);
    V.currentTime = mark(shown);
    const run = () => { V.removeEventListener("seeked", run); V.play().then(() => on(V, true)).catch(() => { V.currentTime = goal; finish(); }); };
    if (Math.abs(V.currentTime - mark(shown)) < 0.05) run(); else V.addEventListener("seeked", run);
  }
  function finish() {
    V.pause(); V.currentTime = goal; const n = target; shown = n; mode = "idle";
    if (loopsOk) showLoop(n); else on(V, true);
    if (target !== shown) go();
  }
  let heal = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (mode === "trans" && !V.paused && V.currentTime >= goal - 0.04) finish();
    // Selbstheilung (max. 1x/s): Browser pausieren stumme Videos gelegentlich von sich aus (Energiesparen, Tab verdeckt,
    // Test-Browser) - ein stehender Loop oder ein haengender Uebergang wird einfach wieder angestossen.
    if (now - heal > 1000 && !document.hidden) {
      heal = now;
      if (mode === "idle" && loopsOk && L && L.paused && L.readyState >= 2) L.play().catch(() => {});
      if (mode === "trans" && V.paused && V.currentTime < goal - 0.04) V.play().catch(() => { V.currentTime = goal; finish(); });
    }
  }
  V.addEventListener("loadedmetadata", () => { dur = V.duration || dur; });
  V.addEventListener("canplay", () => { if (ready) return; ready = true; stageEl.classList.add("gl-ready"); go(); });
  V.addEventListener("error", () => { stageEl.classList.add("nogl"); });
  if (L) {
    L.muted = true; L.playsInline = true; L.preload = "auto";
    L.addEventListener("error", () => { loopsOk = false; on(L, false); on(V, true); if (mode === "loopwait") mode = "idle"; });
  }
  V.muted = true; V.playsInline = true; V.preload = "auto"; V.src = src("house-" + q); V.load();
  window.__setStage = (n) => { target = Math.max(0, Math.min(4, n | 0)); go(); };
  window.__sceneDebug = () => ({ v: 3.1, target, shown, mode, loopsOk, loopN, t: +V.currentTime.toFixed(2), lt: L ? +L.currentTime.toFixed(2) : null, dur: +dur.toFixed(2), ready, q });
  requestAnimationFrame(tick);
  warm(target);
})();
