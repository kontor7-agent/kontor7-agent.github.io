document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ids = ['cur', 'pay', 'tax', 'rent', 'fixed', 'days', 'hours', 'util', 'min', 'buf', 'prod'];
  if (!$('spc-form')) { return; }
  $('spc-form').addEventListener('submit', function (e) { e.preventDefault(); });

  function num(id) {
    var raw = String($('spc-' + id).value).trim().replace(',', '.');
    if (raw === '') { return NaN; }
    var v = Number(raw);
    return isFinite(v) ? v : NaN;
  }

  function setText(id, t) { $(id).textContent = t; }

  function clear() {
    ['spc-price', 'spc-rate', 'spc-b-pay', 'spc-b-rent', 'spc-b-prod', 'spc-bh', 'spc-be', 'spc-n']
      .forEach(function (id) { setText(id, '–'); });
  }

  function hint(msg) {
    var h = $('spc-hint');
    if (msg) { h.textContent = msg; h.hidden = false; } else { h.textContent = ''; h.hidden = true; }
  }

  function recalc() {
    var cur = $('spc-cur').value || '$';
    function money(v) {
      var s;
      try { s = v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
      catch (e) { s = v.toFixed(2); }
      return cur + s;
    }
    var v = {};
    var keys = ['pay', 'tax', 'rent', 'fixed', 'days', 'hours', 'util', 'min', 'buf', 'prod'];
    for (var i = 0; i < keys.length; i++) {
      v[keys[i]] = num(keys[i]);
      if (isNaN(v[keys[i]])) {
        clear();
        hint('Please fill in every field with a number. Empty fields are not counted.');
        return;
      }
      if (v[keys[i]] < 0) {
        clear();
        hint('Please use zero or positive numbers only.');
        return;
      }
    }
    if (v.tax >= 90) { clear(); hint('The tax share should be below 90%.'); return; }
    if (v.days > 31) { clear(); hint('A month has at most 31 working days.'); return; }
    if (v.hours > 24) { clear(); hint('A day has at most 24 hours.'); return; }
    if (v.util > 100 || v.util < 1) { clear(); hint('Booked share should be between 1% and 100%.'); return; }
    if (v.min + v.buf <= 0) { clear(); hint('Enter how many minutes the service takes.'); return; }
    var bookable = v.days * v.hours * (v.util / 100);
    if (bookable <= 0) { clear(); hint('Add working days and hours so we can work out your bookable time.'); return; }

    hint('');
    var gross = v.pay / (1 - v.tax / 100);
    var costs = v.rent + v.fixed;
    var rate = (gross + costs) / bookable;
    var hrs = (v.min + v.buf) / 60;
    var payPart = (gross / bookable) * hrs;
    var rentPart = (costs / bookable) * hrs;
    var price = payPart + rentPart + v.prod;
    var breakEven = rentPart + v.prod;

    setText('spc-price', money(price));
    setText('spc-rate', money(rate) + ' per hour');
    setText('spc-b-pay', money(payPart));
    setText('spc-b-rent', money(rentPart));
    setText('spc-b-prod', money(v.prod));
    setText('spc-bh', (Math.round(bookable * 10) / 10).toString() + ' h');
    setText('spc-be', money(breakEven));
    var n = price > 0 ? Math.ceil((gross + costs) / (price - v.prod)) : 0;
    setText('spc-n', (isFinite(n) && n > 0) ? String(n) : '–');
  }

  ids.forEach(function (id) {
    var el = $('spc-' + id);
    if (!el) { return; }
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
  });
  recalc();
});
