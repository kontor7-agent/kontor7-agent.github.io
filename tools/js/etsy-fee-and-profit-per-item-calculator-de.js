document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var ids = ['price', 'shipIn', 'vat', 'qty', 'material', 'shipOut', 'minutes', 'wage',
    'target', 'tfee', 'pfee', 'pfix', 'lfee', 'ads'];
  var el = {};
  for (var i = 0; i < ids.length; i++) {
    el[ids[i]] = document.getElementById(ids[i]);
    if (!el[ids[i]]) { return; }
  }
  function $(id) { return document.getElementById(id); }

  var eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  var pct = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function parse(v) {
    var s = String(v).replace(/\s/g, '').replace(/€/g, '');
    if (s === '') { return NaN; }
    if (s.indexOf(',') !== -1) { s = s.replace(/\./g, '').replace(',', '.'); }
    if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) { return NaN; }
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function money(n) { return eur.format(Math.abs(n) < 0.005 ? 0 : n); }
  function set(id, text) { $(id).textContent = text; }

  function showHint(msg) {
    var h = $('hint');
    h.textContent = msg;
    h.style.display = 'block';
    var keys = ['r-profit', 'r-after', 'r-margin', 'r-minprice', 'r-month',
      't-gross', 't-vat', 't-fees', 't-mat', 't-ship', 't-labor'];
    for (var k = 0; k < keys.length; k++) { set(keys[k], '–'); }
    set('r-minnote', '');
    $('r-verdict').firstChild.textContent = '';
  }

  var labels = {
    price: 'Verkaufspreis', shipIn: 'Versand der Kundschaft', qty: 'Verkäufe pro Monat',
    material: 'Material', shipOut: 'Porto und Verpackung', minutes: 'Arbeitszeit',
    wage: 'Stundenlohn', target: 'Wunschgewinn', tfee: 'Transaktionsgebühr',
    pfee: 'Zahlungsgebühr', pfix: 'feste Zahlungsgebühr', lfee: 'Angebotsgebühr', ads: 'Werbegebühr'
  };

  function calc() {
    var v = {};
    var names = Object.keys(labels);
    for (var i = 0; i < names.length; i++) {
      var raw = el[names[i]].value;
      var n = parse(raw);
      if (isNaN(n)) {
        showHint('Bitte gib bei „' + labels[names[i]] + '“ eine Zahl ein, zum Beispiel 12,50.');
        return;
      }
      if (n < 0) {
        showHint('Bei „' + labels[names[i]] + '“ ist kein negativer Wert möglich.');
        return;
      }
      v[names[i]] = n;
    }
    if (v.price <= 0) { showHint('Bitte gib einen Verkaufspreis größer als 0 ein.'); return; }
    var feePct = v.tfee + v.pfee + v.ads;
    if (feePct >= 60) { showHint('Die Prozent-Gebühren ergeben zusammen ' + pct.format(feePct) + ' %. Bitte prüfe die Werte.'); return; }

    var vatRate = parseFloat(el.vat.value);
    if (isNaN(vatRate)) { vatRate = 0; }
    var f = feePct / 100;
    var fixed = v.pfix + v.lfee;
    var gross = v.price + v.shipIn;
    var net = gross / (1 + vatRate / 100);
    var vatAmt = gross - net;
    var fees = gross * f + fixed;
    var labor = (v.minutes / 60) * v.wage;
    var costs = v.material + v.shipOut;

    var profit = net - fees - costs;
    var after = profit - labor;
    var margin = net > 0 ? (after / net) * 100 : 0;

    var factor = 1 / (1 + vatRate / 100) - f;
    var needed = null;
    if (factor > 0.05) {
      needed = (v.target + fixed + costs + labor) / factor - v.shipIn;
    }

    $('hint').style.display = 'none';
    set('r-profit', money(profit));
    set('r-after', money(after));
    set('r-margin', pct.format(margin) + ' %');
    set('r-month', money(after * v.qty));
    if (needed !== null) {
      if (needed < 0) { needed = 0; }
      set('r-minprice', money(needed));
      set('r-minnote', 'Verkaufspreis (brutto, ohne Versand), bei dem nach Gebühren, Kosten und deinem Lohn noch ' +
        money(v.target) + ' pro Stück übrig bleiben.');
    } else {
      set('r-minprice', '–');
      set('r-minnote', 'Mit diesen Gebühren lässt sich kein Preis berechnen. Bitte prüfe die Werte.');
    }

    set('t-gross', money(gross));
    set('t-vat', '− ' + money(vatAmt));
    set('t-fees', '− ' + money(fees));
    set('t-mat', '− ' + money(v.material));
    set('t-ship', '− ' + money(v.shipOut));
    set('t-labor', '− ' + money(labor));

    var verdict;
    if (after < 0) {
      verdict = 'Nach Lohn bleibt ein Minus von ' + money(-after) + ' pro Stück. Du zahlst hier drauf. Ein höherer Preis oder weniger Zeit pro Stück würde helfen.';
    } else if (after < v.target) {
      verdict = 'Dein Lohn ist gedeckt, dein Wunschgewinn von ' + money(v.target) + ' aber noch nicht.';
    } else {
      verdict = 'Gebühren, Kosten und dein Lohn sind gedeckt, und dein Wunschgewinn ist erreicht.';
    }
    $('r-verdict').firstChild.textContent = verdict;
  }

  for (var j = 0; j < ids.length; j++) {
    el[ids[j]].addEventListener('input', calc);
    el[ids[j]].addEventListener('change', calc);
  }
  calc();
});
