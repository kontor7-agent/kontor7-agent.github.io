document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var defaults = {
    'jp-hours': '6', 'jp-rate': '65', 'jp-buffer': '0', 'jp-material': '120',
    'jp-markup': '15', 'jp-travel': '25', 'jp-vat': '19'
  };
  var labels = {
    'jp-hours': 'Arbeitszeit', 'jp-rate': 'Stundenverrechnungssatz', 'jp-buffer': 'Zeitpuffer',
    'jp-material': 'Material', 'jp-markup': 'Materialaufschlag', 'jp-travel': 'Anfahrt',
    'jp-vat': 'Mehrwertsteuer'
  };
  var ids = Object.keys(defaults);

  var eur;
  try {
    eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  } catch (e) {
    eur = null;
  }
  function money(n) {
    if (eur) { return eur.format(n); }
    return n.toFixed(2).replace('.', ',') + ' €';
  }
  function num(n) {
    return (Math.round(n * 100) / 100).toString().replace('.', ',');
  }

  // Returns a number >= 0, or null if invalid. Empty = 0.
  function parse(raw) {
    var s = String(raw).replace(/\s/g, '').replace(/€|%/g, '');
    if (s === '') { return 0; }
    if (s.indexOf(',') !== -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    }
    if (!/^\d+(\.\d+)?$/.test(s)) { return null; }
    var v = parseFloat(s);
    if (!isFinite(v) || v < 0 || v > 1e9) { return null; }
    return v;
  }

  function setText(id, t) { $(id).textContent = t; }

  function showHint(msg) {
    var h = $('jp-hint');
    h.textContent = msg;
    h.style.display = 'block';
    $('jp-output').style.display = 'none';
  }

  function calculate() {
    var v = {};
    for (var i = 0; i < ids.length; i++) {
      var p = parse($(ids[i]).value);
      if (p === null) {
        showHint('Bitte prüfe das Feld „' + labels[ids[i]] + '“: Hier passt nur eine Zahl, z. B. 12,5.');
        return;
      }
      v[ids[i]] = p;
    }
    if (v['jp-vat'] > 100 || v['jp-buffer'] > 500 || v['jp-markup'] > 1000) {
      showHint('Ein Prozentwert wirkt ungewöhnlich hoch. Bitte prüfe Puffer, Aufschlag und Mehrwertsteuer.');
      return;
    }

    $('jp-hint').style.display = 'none';
    $('jp-output').style.display = 'block';

    var hoursEff = v['jp-hours'] * (1 + v['jp-buffer'] / 100);
    var labor = hoursEff * v['jp-rate'];
    var matMarkup = v['jp-material'] * v['jp-markup'] / 100;
    var matTotal = v['jp-material'] + matMarkup;
    var net = labor + matTotal + v['jp-travel'];
    var vat = net * v['jp-vat'] / 100;
    var gross = net + vat;

    setText('jp-gross', money(gross));
    setText('jp-net', money(net));
    setText('jp-hours-eff', num(hoursEff));
    setText('jp-labor', money(labor));
    setText('jp-mat-total', money(matTotal));
    setText('jp-mat-markup', money(matMarkup));
    setText('jp-travel-out', money(v['jp-travel']));
    setText('jp-vat-out', money(vat));
    setText('jp-per-hour', hoursEff > 0 ? money(net / hoursEff) : 'keine Stunden angegeben');
  }

  for (var i = 0; i < ids.length; i++) {
    $(ids[i]).addEventListener('input', calculate);
  }
  $('jp-form').addEventListener('submit', function (e) { e.preventDefault(); });
  $('jp-reset').addEventListener('click', function () {
    for (var j = 0; j < ids.length; j++) { $(ids[j]).value = defaults[ids[j]]; }
    calculate();
  });

  calculate();
});
