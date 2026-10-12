document.addEventListener('DOMContentLoaded', function () {
  var ids = ['target', 'fixed', 'reserve', 'hours', 'length', 'prep', 'post', 'off', 'cancel'];
  var el = {};
  ids.forEach(function (k) { el[k] = document.getElementById('lr-' + k); });
  var out = document.getElementById('lr-out');
  var hint = document.getElementById('lr-hint');
  if (!el.target || !out || !hint) { return; }

  function num(s) {
    var t = String(s == null ? '' : s).replace(/[\s€%]/g, '');
    if (t === '') { return NaN; }
    if (t.indexOf(',') !== -1) { t = t.replace(/\./g, '').replace(',', '.'); }
    if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(t)) { return NaN; }
    return parseFloat(t);
  }
  function eur(x) {
    return x.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function dec(x, d) {
    return x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function set(id, txt) {
    var n = document.getElementById(id);
    if (n) { n.textContent = txt; }
  }
  function fail(msg) {
    hint.textContent = msg;
    hint.style.display = 'block';
    out.style.display = 'none';
  }

  function calc() {
    var v = {};
    for (var i = 0; i < ids.length; i++) {
      v[ids[i]] = num(el[ids[i]].value);
      if (!isFinite(v[ids[i]])) {
        fail('Bitte trage in allen Feldern eine Zahl ein, z. B. 2500 oder 12,5.');
        return;
      }
      if (v[ids[i]] < 0) {
        fail('Bitte nutze keine negativen Zahlen.');
        return;
      }
    }
    if (v.target <= 0) { fail('Dein Wunsch-Einkommen muss größer als 0 sein.'); return; }
    if (v.hours <= 0 || v.hours > 80) { fail('Bitte gib Arbeitsstunden pro Woche zwischen 1 und 80 an.'); return; }
    if (v.length <= 0) { fail('Die Unterrichtseinheit muss länger als 0 Minuten dauern.'); return; }
    if (v.reserve >= 90) { fail('Die Rücklage muss unter 90 % liegen.'); return; }
    if (v.cancel >= 90) { fail('Die Ausfallquote muss unter 90 % liegen.'); return; }
    if (v.off >= 52) { fail('Wochen ohne Unterricht müssen unter 52 liegen.'); return; }

    var weeks = 52 - v.off;
    var totalMin = v.length + v.prep + v.post;
    var perWeek = v.hours * 60 / totalMin;
    var paidYear = perWeek * weeks * (1 - v.cancel / 100);
    var grossMonth = (v.target + v.fixed) / (1 - v.reserve / 100);
    var grossYear = grossMonth * 12;
    if (!(paidYear > 0) || !isFinite(paidYear)) { fail('Mit diesen Angaben bleiben keine bezahlten Einheiten übrig. Bitte prüfe die Werte.'); return; }

    var rate = grossYear / paidYear;
    var rate60 = rate * 60 / v.length;
    var perWorkHour = rate * 60 / totalMin;

    var naivePerWeek = v.hours * 60 / v.length;
    var naiveRate = grossYear / (naivePerWeek * weeks * (1 - v.cancel / 100));

    if (!isFinite(rate) || !isFinite(naiveRate)) { fail('Das Ergebnis lässt sich mit diesen Angaben nicht berechnen.'); return; }

    hint.style.display = 'none';
    out.style.display = 'block';
    set('lr-rate', eur(rate));
    set('lr-rate60', eur(rate60));
    set('lr-real', eur(perWorkHour));
    set('lr-gross', eur(grossMonth));
    set('lr-lessons', dec(perWeek * (1 - v.cancel / 100), 1));
    set('lr-total', dec(totalMin, 0) + ' Minuten');
    var diff = rate - naiveRate;
    var cmp = document.getElementById('lr-compare');
    if (cmp) {
      if (v.prep + v.post > 0) {
        cmp.textContent = 'Würdest du die unbezahlte Zeit vergessen und alle ' + dec(v.hours, 1).replace(/,0$/, '') +
          ' Wochenstunden als Unterricht rechnen, käme nur ' + eur(naiveRate) + ' heraus. Das sind ' +
          eur(diff) + ' weniger pro Einheit, als du wirklich brauchst.';
      } else {
        cmp.textContent = '';
      }
    }
  }

  ids.forEach(function (k) {
    el[k].addEventListener('input', calc);
    el[k].addEventListener('change', calc);
  });
  var form = document.getElementById('lr-form');
  if (form) { form.addEventListener('submit', function (e) { e.preventDefault(); calc(); }); }
  calc();
});
