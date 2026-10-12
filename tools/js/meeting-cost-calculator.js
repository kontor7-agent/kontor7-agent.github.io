document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var el = {
    form: $('mc-form'), currency: $('mc-currency'), rate: $('mc-rate'), length: $('mc-length'),
    prep: $('mc-prep'), follow: $('mc-follow'), travel: $('mc-travel'), hint: $('mc-hint'),
    totalCost: $('mc-total-cost'), totalTime: $('mc-total-time'), callCost: $('mc-call-cost'),
    multiplier: $('mc-multiplier'), limit: $('mc-limit'), limitText: $('mc-limit-text'),
    clock: $('mc-clock'), liveCost: $('mc-live-cost'), toggle: $('mc-toggle'),
    reset: $('mc-reset'), liveNote: $('mc-live-note')
  };
  for (var k in el) { if (!el[k]) { return; } }

  var state = { valid: false, rate: 0 };
  var timer = { running: false, startedAt: 0, acc: 0, id: null };

  function readNum(input, max) {
    var raw = String(input.value).trim();
    if (raw === '') { return null; }
    var n = Number(raw.replace(',', '.'));
    if (!isFinite(n) || n < 0 || n > max) { return null; }
    return n;
  }

  function money(n) {
    var s;
    try {
      s = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
      s = n.toFixed(2);
    }
    return el.currency.value + s;
  }

  function hoursText(mins) {
    var h = Math.floor(mins / 60);
    var m = Math.round(mins - h * 60);
    if (m === 60) { h += 1; m = 0; }
    var parts = [];
    if (h > 0) { parts.push(h + (h === 1 ? ' hour' : ' hours')); }
    if (m > 0 || h === 0) { parts.push(m + ' min'); }
    return parts.join(' ');
  }

  function clearResults() {
    el.totalCost.textContent = '–';
    el.totalTime.textContent = '–';
    el.callCost.textContent = '–';
    el.multiplier.textContent = '–';
    el.limit.textContent = '–';
    el.limitText.textContent = '';
  }

  function calculate() {
    var rate = readNum(el.rate, 100000);
    var len = readNum(el.length, 1440);
    var prep = readNum(el.prep, 1440);
    var follow = readNum(el.follow, 1440);
    var travel = readNum(el.travel, 1440);

    if (rate === null || len === null || prep === null || follow === null || travel === null) {
      state.valid = false;
      state.rate = 0;
      el.hint.textContent = 'Please fill in every field with a number of 0 or more (rate up to 100,000, times up to 1,440 minutes).';
      clearResults();
      updateLive();
      return;
    }

    el.hint.textContent = '';
    state.valid = true;
    state.rate = rate;

    var overhead = prep + follow + travel;
    var total = len + overhead;
    var perMin = rate / 60;

    el.totalCost.textContent = money(total * perMin);
    el.totalTime.textContent = hoursText(total) + ' of your day, unpaid.';
    el.callCost.textContent = money(len * perMin);
    if (len > 0) {
      el.multiplier.textContent = (total / len).toFixed(1) + '×';
    } else {
      el.multiplier.textContent = '–';
    }

    // Rule of thumb: keep the whole unpaid package (call + prep + follow-up + travel) near one hour.
    var raw = Math.floor((60 - overhead) / 5) * 5;
    var limit = Math.min(45, Math.max(15, raw));
    el.limit.textContent = limit + ' minutes';

    var limitTotal = limit + overhead;
    var text = 'At ' + limit + ' minutes the whole thing costs you about ' + money(limitTotal * perMin) + '.';
    if (limit < len) {
      text += ' That is ' + money((len - limit) * perMin) + ' less than your current plan.';
    }
    if (overhead >= 45) {
      text += ' Your prep, follow-up and travel already take a lot of time. Try a video call or a shorter prep to keep the first chat light.';
    }
    text += ' You could say: “I’ve set aside ' + limit + ' minutes for us. That’s enough to see whether we’re a good fit.”';
    el.limitText.textContent = text;

    updateLive();
  }

  function elapsedMs() {
    return timer.acc + (timer.running ? Date.now() - timer.startedAt : 0);
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function updateLive() {
    var secs = Math.floor(elapsedMs() / 1000);
    var h = Math.floor(secs / 3600);
    var m = Math.floor((secs % 3600) / 60);
    var s = secs % 60;
    el.clock.textContent = (h > 0 ? h + ':' : '') + pad(m) + ':' + pad(s);
    if (state.valid) {
      el.liveCost.textContent = money((elapsedMs() / 3600000) * state.rate);
      el.liveNote.textContent = timer.running ? 'Counting at your hourly rate. This is the call only, without prep or travel.' : '';
    } else {
      el.liveCost.textContent = money(0);
      el.liveNote.textContent = 'Enter a valid hourly rate above to see the cost tick.';
    }
  }

  function tick() { updateLive(); }

  function start() {
    timer.running = true;
    timer.startedAt = Date.now();
    timer.id = window.setInterval(tick, 250);
    el.toggle.textContent = 'Stop timer';
    el.toggle.setAttribute('aria-pressed', 'true');
    updateLive();
  }

  function stop() {
    timer.acc = elapsedMs();
    timer.running = false;
    if (timer.id !== null) { window.clearInterval(timer.id); timer.id = null; }
    el.toggle.textContent = timer.acc > 0 ? 'Resume timer' : 'Start timer';
    el.toggle.setAttribute('aria-pressed', 'false');
    updateLive();
  }

  el.toggle.addEventListener('click', function () {
    if (timer.running) { stop(); } else { start(); }
  });

  el.reset.addEventListener('click', function () {
    if (timer.running) { stop(); }
    timer.acc = 0;
    el.toggle.textContent = 'Start timer';
    updateLive();
  });

  el.form.addEventListener('submit', function (e) { e.preventDefault(); });
  [el.rate, el.length, el.prep, el.follow, el.travel].forEach(function (inp) {
    inp.addEventListener('input', calculate);
    inp.addEventListener('change', calculate);
  });
  el.currency.addEventListener('change', calculate);

  calculate();
});
