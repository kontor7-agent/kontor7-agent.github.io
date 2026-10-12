document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var DAY = 86400000;
  var WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  var elRe = $('zr-rechnungsdatum'), elHeute = $('zr-heute'), elZiel = $('zr-ziel');
  var elFrei = $('zr-frei'), elFreiBox = $('zr-frei-box');
  var elEr = $('zr-erinnerung'), elM1 = $('zr-mahn1'), elM2 = $('zr-mahn2');
  if (!elRe || !elHeute || !elZiel) { return; }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function toIso(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function parseIso(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) { return null; }
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1900 || y > 2200) { return null; }
    var ms = Date.UTC(y, mo - 1, d);
    var chk = new Date(ms);
    if (chk.getUTCFullYear() !== y || chk.getUTCMonth() !== mo - 1 || chk.getUTCDate() !== d) { return null; }
    return ms;
  }

  function fmt(ms) {
    var d = new Date(ms);
    return WOCHENTAGE[d.getUTCDay()] + ', ' + pad(d.getUTCDate()) + '.' + pad(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear();
  }

  function parseDays(el) {
    var raw = String(el.value).trim().replace(',', '.');
    if (raw === '') { return null; }
    var n = Number(raw);
    if (!isFinite(n) || n < 0 || n > 365 || Math.floor(n) !== n) { return null; }
    return n;
  }

  function plural(n, einz, mehr) { return n + ' ' + (n === 1 ? einz : mehr); }

  function rel(diff) {
    if (diff > 0) { return 'in ' + plural(diff, 'Tag', 'Tagen'); }
    if (diff < 0) { return 'vor ' + plural(-diff, 'Tag', 'Tagen'); }
    return 'heute';
  }

  function setText(id, t) { var e = $(id); if (e) { e.textContent = t; } }

  function showHint(msg) {
    var h = $('zr-hinweis'), c = $('zr-ergebnis-inhalt');
    if (msg) {
      h.textContent = msg;
      h.hidden = false;
      c.hidden = true;
    } else {
      h.textContent = '';
      h.hidden = true;
      c.hidden = false;
    }
  }

  function calc() {
    elFreiBox.hidden = elZiel.value !== 'frei';

    var re = parseIso(elRe.value);
    var heute = parseIso(elHeute.value);
    if (re === null) { showHint('Bitte ein gültiges Rechnungsdatum eingeben.'); return; }
    if (heute === null) { showHint('Bitte ein gültiges heutiges Datum (Stichtag) eingeben.'); return; }

    var ziel = elZiel.value === 'frei' ? parseDays(elFrei) : Number(elZiel.value);
    if (ziel === null) { showHint('Bitte das Zahlungsziel als ganze Zahl von 0 bis 365 Tagen eingeben.'); return; }
    var er = parseDays(elEr), m1 = parseDays(elM1), m2 = parseDays(elM2);
    if (er === null || m1 === null || m2 === null) {
      showHint('Bitte bei den Fristen für Erinnerung und Mahnungen ganze Zahlen von 0 bis 365 Tagen eingeben.');
      return;
    }

    showHint('');
    var faellig = re + ziel * DAY;
    var dEr = faellig + er * DAY;
    var dM1 = dEr + m1 * DAY;
    var dM2 = dM1 + m2 * DAY;
    var diff = Math.round((faellig - heute) / DAY);

    setText('zr-faellig', fmt(faellig));
    var st = $('zr-status');
    st.textContent = '';
    var strong = document.createElement('strong');
    if (diff > 0) { strong.textContent = 'Noch ' + plural(diff, 'Tag', 'Tage') + ' bis zur Fälligkeit.'; }
    else if (diff === 0) { strong.textContent = 'Die Rechnung ist heute fällig.'; }
    else { strong.textContent = plural(-diff, 'Tag', 'Tage') + ' überfällig.'; }
    st.appendChild(strong);

    setText('zr-d-erinnerung', fmt(dEr));
    setText('zr-r-erinnerung', rel(Math.round((dEr - heute) / DAY)));
    setText('zr-d-mahn1', fmt(dM1));
    setText('zr-r-mahn1', rel(Math.round((dM1 - heute) / DAY)));
    setText('zr-d-mahn2', fmt(dM2));
    setText('zr-r-mahn2', rel(Math.round((dM2 - heute) / DAY)));

    var v;
    if (heute < re) {
      v = 'Das Stichtagsdatum liegt vor dem Rechnungsdatum – die Termine gelten ab dem Rechnungsdatum.';
    } else if (heute <= faellig) {
      v = 'Vorschlag: Bis zum ' + fmt(faellig) + ' abwarten. Ist dann noch kein Zahlungseingang da, die Zahlungserinnerung am ' + fmt(dEr) + ' versenden.';
    } else if (heute <= dEr) {
      v = 'Vorschlag: Zahlungseingang prüfen und die Zahlungserinnerung spätestens am ' + fmt(dEr) + ' versenden.';
    } else if (heute <= dM1) {
      v = 'Vorschlag: Falls die Zahlungserinnerung schon raus ist, die 1. Mahnung am ' + fmt(dM1) + ' versenden – sonst jetzt zuerst die Erinnerung schicken.';
    } else if (heute <= dM2) {
      v = 'Vorschlag: Die 2. Mahnung ist für den ' + fmt(dM2) + ' vorgesehen, sofern die 1. Mahnung versandt wurde und keine Zahlung eingegangen ist.';
    } else {
      v = 'Alle geplanten Termine sind verstrichen. Wie es weitergeht (z. B. Inkasso oder gerichtliches Mahnverfahren), sollten Sie mit fachkundiger Beratung klären.';
    }
    setText('zr-vorschlag', v);
  }

  var heuteIso = toIso(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  if (!elRe.value) { elRe.value = heuteIso; }
  if (!elHeute.value) { elHeute.value = heuteIso; }

  [elRe, elHeute, elZiel, elFrei, elEr, elM1, elM2].forEach(function (el) {
    el.addEventListener('input', calc);
    el.addEventListener('change', calc);
  });
  calc();
});
