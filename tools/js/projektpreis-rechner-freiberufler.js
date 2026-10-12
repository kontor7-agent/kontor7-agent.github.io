document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('ppr-form');
  var rowsEl = $('ppr-rows');
  if (!form || !rowsEl) { return; }

  var eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  var num = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

  function parse(str) {
    var s = String(str == null ? '' : str).replace(/[\s€%]/g, '');
    if (s === '') { return null; }
    if (s.indexOf(',') !== -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
    if (!/^\d+(\.\d+)?$/.test(s)) { return NaN; }
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }
  function today() {
    var d = new Date();
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
  }
  function money(n) { return eur.format(Math.round(n * 100) / 100); }

  function renumber() {
    var rows = rowsEl.querySelectorAll('.ppr-row');
    for (var i = 0; i < rows.length; i++) {
      var n = i + 1;
      rows[i].querySelector('.ppr-name').setAttribute('aria-label', 'Aufgabe ' + n + ': Bezeichnung');
      rows[i].querySelector('.ppr-hours').setAttribute('aria-label', 'Aufgabe ' + n + ': geschätzte Stunden');
      rows[i].querySelector('.ppr-remove').setAttribute('aria-label', 'Aufgabe ' + n + ' entfernen');
    }
  }

  function addRow() {
    var row = document.createElement('div');
    row.className = 'ppr-row';
    row.setAttribute('style', 'display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem;align-items:center;');
    var name = document.createElement('input');
    name.type = 'text';
    name.className = 'ppr-name';
    name.maxLength = 80;
    name.setAttribute('style', 'flex:1 1 200px;min-width:0;padding:.6rem;font-size:1rem;');
    var hours = document.createElement('input');
    hours.type = 'text';
    hours.className = 'ppr-hours';
    hours.setAttribute('inputmode', 'decimal');
    hours.value = '0';
    hours.setAttribute('style', 'flex:0 0 90px;width:90px;padding:.6rem;font-size:1rem;');
    var unit = document.createElement('span');
    unit.className = 'muted';
    unit.textContent = 'Std.';
    var rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'btn ppr-remove';
    rm.setAttribute('data-action', 'remove');
    rm.textContent = 'Entfernen';
    row.appendChild(name);
    row.appendChild(hours);
    row.appendChild(unit);
    row.appendChild(rm);
    rowsEl.appendChild(row);
    renumber();
    name.focus();
  }

  function setText(id, t) { var e = $(id); if (e) { e.textContent = t; } }

  function clearResults(hint) {
    setText('ppr-hint', hint);
    setText('ppr-total', '–');
    setText('ppr-depositval', '–');
    setText('ppr-rest', '');
    setText('ppr-effective', '–');
    setText('ppr-effnote', '');
    setText('ppr-breakdown', '');
    $('ppr-summary').value = '';
  }

  function calc() {
    var rate = parse($('ppr-rate').value);
    var buf = parse($('ppr-buffer').value);
    var fixed = parse($('ppr-fixed').value);
    var extra = parse($('ppr-extra').value);
    var depPct = parseInt($('ppr-deposit').value, 10) === 30 ? 30 : 50;
    if (buf === null) { buf = 0; }
    if (fixed === null) { fixed = 0; }
    if (extra === null) { extra = 0; }

    var rows = rowsEl.querySelectorAll('.ppr-row');
    var tasks = [];
    var total = 0;
    var i;
    for (i = 0; i < rows.length; i++) {
      var h = parse(rows[i].querySelector('.ppr-hours').value);
      if (h !== null && (isNaN(h) || h > 10000)) {
        clearResults('Bitte gib bei Aufgabe ' + (i + 1) + ' die Stunden als Zahl ein, zum Beispiel 4 oder 2,5.');
        return;
      }
      h = h === null ? 0 : h;
      var nm = rows[i].querySelector('.ppr-name').value.trim() || ('Aufgabe ' + (i + 1));
      tasks.push({ name: nm, hours: h });
      total += h;
    }
    if (rate === null || isNaN(rate) || rate <= 0 || rate > 100000) {
      clearResults('Bitte gib deinen Stundensatz als Zahl größer als 0 ein, zum Beispiel 75 oder 82,50.');
      return;
    }
    if (isNaN(buf) || buf > 500) {
      clearResults('Bitte gib den Puffer in Prozent ein, zum Beispiel 15.');
      return;
    }
    if (isNaN(fixed) || fixed > 10000000) {
      clearResults('Bitte gib die Fixkosten als Betrag in Euro ein, zum Beispiel 120 oder 0.');
      return;
    }
    if (isNaN(extra) || extra > 1000) {
      clearResults('Bitte gib den Mehraufwand in Prozent ein, zum Beispiel 30.');
      return;
    }
    if (total <= 0) {
      clearResults('Trag bei mindestens einer Aufgabe geschätzte Stunden ein, dann rechne ich los.');
      return;
    }

    var bufHours = total * buf / 100;
    var hoursWithBuf = total + bufHours;
    var work = hoursWithBuf * rate;
    var price = work + fixed;
    var deposit = price * depPct / 100;
    var rest = price - deposit;
    // Honorar (ohne durchgereichte Fixkosten) geteilt durch tatsächlich geleistete Stunden
    var actualHours = total * (1 + extra / 100);
    var eff = work / actualHours;

    setText('ppr-hint', '');
    setText('ppr-total', money(price));
    setText('ppr-depositval', money(deposit));
    setText('ppr-rest', depPct + ' % von ' + money(price) + '. Rest: ' + money(rest));
    setText('ppr-effective', money(eff) + ' pro Std.');
    var cmp;
    if (eff >= rate) {
      cmp = 'Dein Puffer deckt diesen Mehraufwand ab: Du bleibst bei oder über ' + money(rate) + '.';
    } else {
      cmp = 'Das liegt ' + money(rate - eff) + ' unter deinem Stundensatz von ' + money(rate) + '.';
    }
    setText('ppr-effnote', 'Bei ' + num.format(extra) + ' % mehr Zeit (' + num.format(actualHours) + ' statt ' + num.format(total) + ' Std.). ' + cmp);
    setText('ppr-breakdown', num.format(total) + ' Std. + ' + num.format(buf) + ' % Puffer (' + num.format(bufHours) + ' Std.) = ' + num.format(hoursWithBuf) + ' Std. × ' + money(rate) + ' = ' + money(work) + '; plus Fixkosten ' + money(fixed) + '.');

    var lines = [];
    lines.push('Angebot (Schätzung), Stand: ' + today());
    lines.push('');
    lines.push('Leistungen:');
    for (i = 0; i < tasks.length; i++) {
      if (tasks[i].hours > 0) {
        lines.push('- ' + tasks[i].name + ': ' + num.format(tasks[i].hours) + ' Std.');
      }
    }
    lines.push('');
    lines.push('Stunden gesamt: ' + num.format(total));
    lines.push('Puffer für Korrekturen (' + num.format(buf) + ' %): ' + num.format(bufHours) + ' Std.');
    lines.push('Stundensatz: ' + money(rate));
    lines.push('Honorar: ' + money(work));
    if (fixed > 0) { lines.push('Fixkosten: ' + money(fixed)); }
    lines.push('');
    lines.push('Angebotspreis netto: ' + money(price));
    lines.push('Anzahlung (' + depPct + ' %) bei Beauftragung: ' + money(deposit));
    lines.push('Restbetrag nach Abnahme: ' + money(rest));
    lines.push('');
    lines.push('Alle Beträge netto, zuzüglich gesetzlicher Umsatzsteuer, falls sie anfällt.');
    $('ppr-summary').value = lines.join('\n');
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', calc);
  form.addEventListener('change', calc);

  rowsEl.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-action') === 'remove') {
      var row = t.closest('.ppr-row');
      if (row && rowsEl.querySelectorAll('.ppr-row').length > 1) {
        rowsEl.removeChild(row);
        renumber();
        calc();
      } else if (row) {
        row.querySelector('.ppr-hours').value = '0';
        row.querySelector('.ppr-name').value = '';
        calc();
      }
    }
  });

  $('ppr-add').addEventListener('click', function () { addRow(); calc(); });

  $('ppr-copy').addEventListener('click', function () {
    var ta = $('ppr-summary');
    var status = $('ppr-copystatus');
    if (!ta.value) { status.textContent = 'Noch nichts zu kopieren. Bitte erst die Eingaben ergänzen.'; return; }
    function ok() { status.textContent = 'Kopiert.'; }
    function fallback() {
      ta.focus();
      ta.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (err) { done = false; }
      status.textContent = done ? 'Kopiert.' : 'Bitte markiere den Text und kopiere ihn mit Strg+C.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(ok, fallback);
    } else {
      fallback();
    }
  });

  renumber();
  calc();
});
