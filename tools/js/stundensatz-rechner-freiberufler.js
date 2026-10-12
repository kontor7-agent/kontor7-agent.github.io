document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var ids = ['netto', 'kosten', 'steuer', 'urlaub', 'feiertage', 'wochenstunden', 'tage', 'anteil'];
  var el = {};
  ids.forEach(function (k) { el[k] = document.getElementById('shr-' + k); });
  var hint = document.getElementById('shr-hint');
  var outH = document.getElementById('shr-out-stunde');
  var outT = document.getElementById('shr-out-tag');
  var outM = document.getElementById('shr-out-monat');
  var details = document.getElementById('shr-details');
  var resetBtn = document.getElementById('shr-reset');
  if (!hint || !outH || !outT || !outM || !details) { return; }
  for (var i = 0; i < ids.length; i++) { if (!el[ids[i]]) { return; } }

  var defaults = {};
  ids.forEach(function (k) { defaults[k] = el[k].value; });

  var eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
  var eur0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var num1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

  function parseDe(s) {
    var t = String(s).replace(/[\s€% ]/g, '');
    if (t === '') { return NaN; }
    if (t.indexOf(',') !== -1) {
      t = t.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
      t = t.replace(/\./g, '');
    }
    if (!/^\d+(\.\d+)?$/.test(t)) { return NaN; }
    var n = parseFloat(t);
    return isFinite(n) ? n : NaN;
  }

  function clearOut() {
    outH.textContent = '–';
    outT.textContent = '–';
    outM.textContent = '–';
    details.textContent = '';
  }

  function addDetail(text) {
    var li = document.createElement('li');
    li.textContent = text;
    details.appendChild(li);
  }

  function fail(msg) {
    hint.textContent = msg;
    clearOut();
  }

  function calc() {
    var v = {};
    var labels = {
      netto: 'Wunsch-Nettoeinkommen', kosten: 'Betriebskosten', steuer: 'Steuer-Rücklage',
      urlaub: 'Urlaub und Krankheit', feiertage: 'Feiertage', wochenstunden: 'Arbeitsstunden pro Woche',
      tage: 'Arbeitstage pro Woche', anteil: 'Anteil abrechenbarer Stunden'
    };
    for (var i = 0; i < ids.length; i++) {
      var k = ids[i];
      v[k] = parseDe(el[k].value);
      if (isNaN(v[k])) {
        return fail('Bitte gib bei „' + labels[k] + '“ eine gültige Zahl ein, z. B. 1.500 oder 12,5.');
      }
    }
    if (v.steuer >= 90) { return fail('Die Steuer-Rücklage muss unter 90 % liegen.'); }
    if (v.anteil <= 0 || v.anteil > 100) { return fail('Der Anteil abrechenbarer Stunden muss zwischen 1 und 100 % liegen.'); }
    if (v.tage < 1 || v.tage > 7) { return fail('Arbeitstage pro Woche: bitte einen Wert zwischen 1 und 7 eingeben.'); }
    if (v.wochenstunden <= 0 || v.wochenstunden > 80) { return fail('Arbeitsstunden pro Woche: bitte einen Wert zwischen 1 und 80 eingeben.'); }

    var wochen = 52 - v.urlaub - v.feiertage / v.tage;
    if (wochen < 1) { return fail('Bei so viel Urlaub, Krankheit und Feiertagen bleibt kaum Arbeitszeit übrig. Bitte prüfe die Wochen.'); }

    var gewinn = v.netto / (1 - v.steuer / 100);
    var umsatz = gewinn + v.kosten;
    var stundenArbeit = wochen * v.wochenstunden;
    var stundenAbr = stundenArbeit * (v.anteil / 100);
    if (stundenAbr <= 0) { return fail('Es bleiben keine abrechenbaren Stunden übrig. Bitte prüfe deine Eingaben.'); }

    var satz = umsatz / stundenAbr;
    var tag = satz * (v.wochenstunden / v.tage);
    var monat = umsatz / 12;
    if (!isFinite(satz) || !isFinite(tag) || !isFinite(monat)) { return fail('Mit diesen Werten lässt sich nichts berechnen. Bitte prüfe die Eingaben.'); }

    hint.textContent = '';
    outH.textContent = eur.format(satz);
    outT.textContent = eur.format(tag);
    outM.textContent = eur0.format(monat);

    details.textContent = '';
    addDetail('Nötiger Gewinn vor Steuer-Rücklage: ' + eur0.format(gewinn) + ' pro Jahr');
    addDetail('Nötiger Jahresumsatz inkl. Betriebskosten: ' + eur0.format(umsatz));
    addDetail('Arbeitswochen pro Jahr: ' + num1.format(wochen) + ' (' + num1.format(stundenArbeit) + ' Std.)');
    addDetail('Abrechenbare Stunden pro Jahr: ' + num1.format(stundenAbr));
    addDetail('Tagessatz = Stundensatz × ' + num1.format(v.wochenstunden / v.tage) + ' Std. pro Arbeitstag');
  }

  ids.forEach(function (k) { el[k].addEventListener('input', calc); });
  document.getElementById('shr-form').addEventListener('submit', function (e) { e.preventDefault(); });
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      ids.forEach(function (k) { el[k].value = defaults[k]; });
      calc();
    });
  }
  calc();
});
