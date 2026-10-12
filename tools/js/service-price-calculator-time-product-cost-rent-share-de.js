document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var form = document.getElementById('calc');
  if (!form) { return; }

  var defaults = {
    wage: '25', minutes: '60', material: '6,50', rent: '400', fixed: '80',
    days: '20', hours: '5', buffer: '10', vat: '0'
  };
  var ids = Object.keys(defaults);
  var els = {};
  ids.forEach(function (id) { els[id] = document.getElementById(id); });

  function $(id) { return document.getElementById(id); }

  function parseNum(str) {
    var s = String(str === null || str === undefined ? '' : str).replace(/[\s€%]/g, '');
    if (s === '') { return NaN; }
    if (s.indexOf(',') !== -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if ((s.match(/\./g) || []).length > 1) {
      s = s.replace(/\./g, '');
    }
    if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) { return NaN; }
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function eur(n) {
    if (!isFinite(n)) { return '–'; }
    var fixed = (Math.round(n * 100) / 100).toFixed(2);
    var parts = fixed.split('.');
    var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return intPart + ',' + parts[1] + ' €';
  }

  function num(n, digits) {
    var f = n.toFixed(digits).split('.');
    var i = f[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return f.length > 1 ? i + ',' + f[1] : i;
  }

  var outIds = ['out-price', 'out-rounded', 'out-labor', 'out-material', 'out-fixed',
    'out-buffer', 'out-net', 'out-vat', 'out-hourly', 'out-count', 'out-revenue'];

  function clearOutputs() {
    outIds.forEach(function (id) { var e = $(id); if (e) { e.textContent = '–'; } });
  }

  function setText(id, text) {
    var e = $(id);
    if (e) { e.textContent = text; }
  }

  function showHint(msg) {
    setText('hint', msg);
  }

  function calculate() {
    var v = {};
    var labels = {
      wage: 'Stundenlohn', minutes: 'Dauer', material: 'Materialkosten', rent: 'Miete',
      fixed: 'Fixkosten', days: 'Arbeitstage', hours: 'Stunden pro Tag', buffer: 'Puffer'
    };
    var keys = Object.keys(labels);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      v[k] = parseNum(els[k] ? els[k].value : '');
      if (isNaN(v[k])) {
        clearOutputs();
        showHint('Bitte gib bei „' + labels[k] + '“ eine Zahl ein, z. B. 25 oder 6,50.');
        return;
      }
      if (v[k] < 0) {
        clearOutputs();
        showHint('Bei „' + labels[k] + '“ sind keine negativen Werte möglich.');
        return;
      }
    }
    if (v.minutes <= 0 || v.minutes > 1440) {
      clearOutputs();
      showHint('Die Dauer muss zwischen 1 und 1440 Minuten liegen.');
      return;
    }
    if (v.days < 1 || v.days > 31) {
      clearOutputs();
      showHint('Die Arbeitstage pro Monat müssen zwischen 1 und 31 liegen.');
      return;
    }
    if (v.hours <= 0 || v.hours > 24) {
      clearOutputs();
      showHint('Die zahlenden Stunden pro Tag müssen zwischen 0,5 und 24 liegen.');
      return;
    }
    if (v.buffer > 100) {
      clearOutputs();
      showHint('Der Puffer sollte zwischen 0 und 100 % liegen.');
      return;
    }

    var vatRate = parseNum(els.vat ? els.vat.value : '0');
    if (isNaN(vatRate) || vatRate < 0) { vatRate = 0; }

    var billableHours = v.days * v.hours;
    var hoursOfTreatment = v.minutes / 60;
    var fixedPerHour = (v.rent + v.fixed) / billableHours;

    var labor = v.wage * hoursOfTreatment;
    var fixedShare = fixedPerHour * hoursOfTreatment;
    var subtotal = labor + v.material + fixedShare;
    var bufferAmt = subtotal * (v.buffer / 100);
    var net = subtotal + bufferAmt;
    var vatAmt = net * (vatRate / 100);
    var gross = net + vatAmt;
    var rounded = Math.ceil(gross * 2 - 1e-9) / 2;

    var hourly = net / hoursOfTreatment;
    var count = billableHours / hoursOfTreatment;
    var revenue = count * net;

    if (!isFinite(gross) || !isFinite(rounded)) {
      clearOutputs();
      showHint('Mit diesen Werten lässt sich nichts berechnen. Bitte prüfe deine Eingaben.');
      return;
    }

    var note = '';
    if (v.wage === 0) {
      note = 'Hinweis: Mit 0 € Stundenlohn deckt der Preis nur deine Kosten, nicht deine Arbeit.';
    }
    showHint(note);

    var priceLabel = vatRate > 0 ? ' (brutto)' : '';
    setText('out-price', eur(gross) + priceLabel);
    setText('out-rounded', eur(rounded) + priceLabel);
    setText('out-labor', eur(labor));
    setText('out-material', eur(v.material));
    setText('out-fixed', eur(fixedShare));
    setText('out-buffer', eur(bufferAmt));
    setText('out-net', eur(net));
    setText('out-vat', vatRate > 0 ? eur(vatAmt) + ' (' + num(vatRate, 0) + ' %)' : 'keine ausgewiesen');
    setText('out-hourly', eur(hourly) + ' pro Stunde');
    setText('out-count', num(count, 1) + ' bei ' + num(billableHours, 1) + ' zahlenden Stunden');
    setText('out-revenue', eur(revenue));
  }

  ids.forEach(function (id) {
    var el = els[id];
    if (!el) { return; }
    el.addEventListener('input', calculate);
    el.addEventListener('change', calculate);
  });

  form.addEventListener('submit', function (e) { e.preventDefault(); });

  var reset = $('reset');
  if (reset) {
    reset.addEventListener('click', function () {
      ids.forEach(function (id) { if (els[id]) { els[id].value = defaults[id]; } });
      calculate();
    });
  }

  calculate();
});
