document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var ids = ['words', 'price', 'speed', 'extra', 'target'];
  var el = {};
  ids.forEach(function (k) { el[k] = document.getElementById('wsr-' + k); });
  var out = {
    hint: document.getElementById('wsr-hint'),
    hourly: document.getElementById('wsr-hourly'),
    fee: document.getElementById('wsr-fee'),
    hours: document.getElementById('wsr-hours'),
    eff: document.getElementById('wsr-eff'),
    needed: document.getElementById('wsr-needed'),
    verdict: document.getElementById('wsr-verdict')
  };
  if (!el.words || !out.hourly) { return; }

  function fmt(n, min, max) {
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: min, maximumFractionDigits: max }).format(n);
  }
  function eur(n) { return fmt(n, 2, 2) + ' €'; }

  function parse(s) {
    s = String(s || '').replace(/\s/g, '').replace(/€/g, '');
    if (s === '') { return NaN; }
    if (s.indexOf(',') !== -1) { s = s.replace(/\./g, '').replace(',', '.'); }
    else if ((s.match(/\./g) || []).length > 1) { s = s.replace(/\./g, ''); }
    if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) { return NaN; }
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  function clear(msg) {
    out.hint.textContent = msg;
    out.hourly.textContent = '–';
    out.fee.textContent = '–';
    out.hours.textContent = '–';
    out.eff.textContent = '–';
    out.needed.textContent = '–';
    out.verdict.textContent = '';
  }

  function calc() {
    var words = parse(el.words.value);
    var price = parse(el.price.value);
    var speed = parse(el.speed.value);
    var extra = parse(el.extra.value);
    var target = parse(el.target.value);

    if (isNaN(words) || words <= 0) { clear('Bitte gib die Wortzahl als Zahl größer 0 ein, zum Beispiel 2000.'); return; }
    if (isNaN(price) || price < 0) { clear('Bitte gib deinen Wortpreis ein, zum Beispiel 0,12.'); return; }
    if (isNaN(speed) || speed <= 0) { clear('Bitte gib dein Tempo in Wörtern pro Stunde ein, zum Beispiel 400.'); return; }
    if (isNaN(extra) || extra < 0 || extra > 500) { clear('Bitte gib die Zusatzzeit in Prozent ein (0 bis 500), zum Beispiel 20.'); return; }
    if (isNaN(target) || target < 0) { clear('Bitte gib deinen Wunsch-Stundensatz ein, zum Beispiel 45.'); return; }

    out.hint.textContent = '';
    var hours = (words / speed) * (1 + extra / 100);
    var fee = words * price;
    var hourly = fee / hours;
    var eff = words / hours;
    var needed = target / eff;

    out.hourly.textContent = eur(hourly) + ' / Std.';
    out.fee.textContent = eur(fee);
    out.hours.textContent = fmt(hours, 1, 2) + ' Std.';
    out.eff.textContent = fmt(eff, 0, 0) + ' Wörter';
    out.needed.textContent = fmt(needed, 2, 4) + ' € / Wort';

    var diff = hourly - target;
    if (Math.abs(diff) < 0.005) {
      out.verdict.textContent = 'Du liegst genau bei deinem Wunsch-Stundensatz.';
    } else if (diff > 0) {
      out.verdict.textContent = 'Das sind ' + eur(diff) + ' pro Stunde über deinem Wunsch-Stundensatz. Schön.';
    } else {
      out.verdict.textContent = 'Das sind ' + eur(-diff) + ' pro Stunde unter deinem Wunsch-Stundensatz. Mit ' +
        fmt(needed, 2, 4) + ' € pro Wort kämst du auf ' + eur(target) + '.';
    }
  }

  ids.forEach(function (k) {
    el[k].addEventListener('input', calc);
    el[k].addEventListener('change', calc);
  });
  calc();
});
