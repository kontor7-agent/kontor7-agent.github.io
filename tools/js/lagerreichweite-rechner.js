document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var ids = ['bestand', 'absatz', 'lieferzeit', 'sicherheit', 'wochen'];
  var defaults = { bestand: '120', absatz: '4', lieferzeit: '10', sicherheit: '5', wochen: '4' };
  var el = {};
  ids.forEach(function (k) { el[k] = document.getElementById('lr-' + k); });
  var out = {
    box: document.getElementById('lr-output'),
    hint: document.getElementById('lr-hint'),
    reichweite: document.getElementById('lr-reichweite'),
    ausverkauft: document.getElementById('lr-ausverkauft'),
    termin: document.getElementById('lr-bestelltermin'),
    status: document.getElementById('lr-status'),
    menge: document.getElementById('lr-menge'),
    mengeLabel: document.getElementById('lr-menge-label'),
    mengeInfo: document.getElementById('lr-menge-info')
  };
  if (!out.box || !el.bestand) { return; }

  function parseNum(s) {
    if (typeof s !== 'string') { return NaN; }
    var t = s.replace(/\s/g, '');
    if (t === '') { return NaN; }
    if (t.indexOf(',') !== -1) { t = t.replace(/\./g, '').replace(',', '.'); }
    if (!/^\d+(\.\d+)?$/.test(t)) { return NaN; }
    var n = parseFloat(t);
    return isFinite(n) ? n : NaN;
  }

  function fmt(n, digits) {
    return n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: digits });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function fmtDate(d) {
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function showHint(msg) {
    out.hint.textContent = msg;
    out.hint.style.display = '';
    out.box.style.display = 'none';
  }

  function calc() {
    var bestand = parseNum(el.bestand.value);
    var absatz = parseNum(el.absatz.value);
    var lief = parseNum(el.lieferzeit.value);
    var sich = parseNum(el.sicherheit.value);
    var wochen = parseNum(el.wochen.value);

    if (isNaN(bestand)) { return showHint('Bitte gib deinen aktuellen Bestand als Zahl ein, zum Beispiel 120.'); }
    if (isNaN(absatz) || absatz <= 0) { return showHint('Bitte gib einen Tagesabsatz größer als 0 ein, zum Beispiel 2,5.'); }
    if (isNaN(lief)) { return showHint('Bitte gib die Lieferzeit in Tagen ein, zum Beispiel 10.'); }
    if (isNaN(sich)) { return showHint('Bitte gib die Sicherheitstage ein, zum Beispiel 5 (oder 0).'); }
    if (isNaN(wochen) || wochen < 1 || wochen > 52) { return showHint('Bitte gib für den Bestellvorschlag eine Wochenzahl zwischen 1 und 52 ein.'); }
    if (bestand > 1e9 || absatz > 1e9 || lief > 3650 || sich > 3650) { return showHint('Die Werte sind sehr groß. Bitte prüfe deine Eingaben.'); }

    out.hint.style.display = 'none';
    out.hint.textContent = '';
    out.box.style.display = '';

    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    var reich = bestand / absatz;
    out.reichweite.textContent = fmt(reich, 1) + ' Tage';

    if (reich > 3650) {
      out.ausverkauft.textContent = 'in mehr als 10 Jahren';
      out.termin.textContent = 'aktuell nicht nötig';
      out.status.textContent = 'Dein Bestand reicht sehr lange.';
    } else {
      var tage = Math.floor(reich);
      var soldOut = addDays(today, tage);
      var puffer = Math.ceil(lief + sich);
      var order = addDays(soldOut, -puffer);
      out.ausverkauft.textContent = fmtDate(soldOut);
      out.termin.textContent = fmtDate(order);
      var diff = Math.round((order.getTime() - today.getTime()) / 86400000);
      if (diff < 0) {
        out.status.textContent = 'Dieser Termin ist schon vorbei. Am besten bestellst du heute, sonst wird es knapp.';
      } else if (diff === 0) {
        out.status.textContent = 'Das ist heute. Jetzt ist ein guter Moment zum Bestellen.';
      } else {
        out.status.textContent = 'Das sind noch ' + fmt(diff, 0) + (diff === 1 ? ' Tag' : ' Tage') + ' ab heute (' + fmtDate(today) + ').';
      }
    }

    // Bestellung heute: Bedarf bis Lieferung + Sicherheit + gewünschte Wochen, abzüglich Bestand
    var bedarf = absatz * (lief + sich + 7 * wochen);
    var menge = Math.max(0, Math.ceil(bedarf - bestand - 1e-9));
    out.mengeLabel.textContent = 'Bestellvorschlag für ' + fmt(wochen, 0) + (wochen === 1 ? ' Woche' : ' Wochen');
    out.menge.textContent = fmt(menge, 0) + ' Stück';
    if (menge === 0) {
      out.mengeInfo.textContent = 'Dein Bestand deckt Lieferzeit, Sicherheit und diese Wochen bereits ab.';
    } else {
      out.mengeInfo.textContent = 'Gerechnet bei Bestellung heute: Bedarf in Lieferzeit, Sicherheitstagen und ' +
        fmt(wochen, 0) + (wochen === 1 ? ' Woche' : ' Wochen') + ' (' + fmt(Math.ceil(bedarf), 0) + ' Stück) minus aktueller Bestand.';
    }
  }

  ids.forEach(function (k) {
    el[k].addEventListener('input', calc);
    el[k].addEventListener('change', calc);
  });

  var reset = document.getElementById('lr-reset');
  if (reset) {
    reset.addEventListener('click', function () {
      ids.forEach(function (k) { el[k].value = defaults[k]; });
      calc();
    });
  }
  var form = document.getElementById('lr-form');
  if (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); });
  }

  calc();
});
