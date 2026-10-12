(function () {
  'use strict';

  function init() {
    var ids = ['worked', 'billable', 'admin', 'sales', 'learning', 'income', 'days', 'weeks', 'extra'];
    var el = {};
    ids.forEach(function (id) { el[id] = document.getElementById('bhu-' + id); });
    var cur = document.getElementById('bhu-currency');
    var hint = document.getElementById('bhu-hint');
    var outUtil = document.getElementById('bhu-util');
    var outRateB = document.getElementById('bhu-rate-billable');
    var outRateA = document.getElementById('bhu-rate-all');
    var outExtra = document.getElementById('bhu-extra-year');
    var split = document.getElementById('bhu-split');
    if (!cur || !hint || !outUtil || !outRateB || !outRateA || !outExtra || !split) { return; }
    for (var i = 0; i < ids.length; i++) { if (!el[ids[i]]) { return; } }

    function num(input) {
      var raw = String(input.value).replace(',', '.').trim();
      if (raw === '') { return NaN; }
      var v = Number(raw);
      return isFinite(v) ? v : NaN;
    }

    function money(v) {
      var s = cur.value || '$';
      var r = Math.round(v);
      return s + r.toLocaleString('en-US');
    }

    function money2(v) {
      var s = cur.value || '$';
      return s + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function clear(msg) {
      hint.textContent = msg;
      outUtil.textContent = '–';
      outRateB.textContent = '–';
      outRateA.textContent = '–';
      outExtra.textContent = '–';
      split.textContent = '';
    }

    function calc() {
      var v = {};
      for (var i = 0; i < ids.length; i++) { v[ids[i]] = num(el[ids[i]]); }
      for (var k = 0; k < ids.length; k++) {
        if (isNaN(v[ids[k]])) { clear('Please fill in every field with a number to see your result.'); return; }
        if (v[ids[k]] < 0) { clear('Numbers can’t be negative. Please check your entries.'); return; }
      }
      if (v.worked <= 0) { clear('Enter the hours you work in a typical week (more than 0).'); return; }
      if (v.worked > 168) { clear('A week has 168 hours. Please check your total hours.'); return; }
      if (v.days < 1 || v.days > 7) { clear('Working days per week should be between 1 and 7.'); return; }
      if (v.weeks < 1 || v.weeks > 52) { clear('Working weeks per year should be between 1 and 52.'); return; }
      if (v.extra > 24) { clear('Extra hours per day can’t be more than 24.'); return; }

      var used = v.billable + v.admin + v.sales + v.learning;
      var note = '';
      if (v.billable > v.worked) {
        clear('Your billable hours are higher than your total hours. Please check both.');
        return;
      }
      if (used > v.worked + 0.001) {
        note = 'Your billable, admin, sales and learning hours add up to ' + fmt(used) +
          ', which is more than your ' + fmt(v.worked) + ' total hours. The split is shown as entered.';
      }

      var util = v.billable / v.worked * 100;
      outUtil.textContent = util.toFixed(1) + '%';
      outRateA.textContent = money2(v.income / v.worked) + '/h';

      if (v.billable > 0) {
        var rateB = v.income / v.billable;
        outRateB.textContent = money2(rateB) + '/h';
        var perYear = rateB * v.extra * v.days * v.weeks;
        outExtra.textContent = money(perYear);
        if (v.extra !== 1) {
          // label stays generic; hint carries the exact assumption
        }
        note = (note ? note + ' ' : '') + 'Extra-hour estimate: ' + fmt(v.extra) + ' h × ' + fmt(v.days) +
          ' days × ' + fmt(v.weeks) + ' weeks at ' + money2(rateB) + '/h.';
      } else {
        outRateB.textContent = '–';
        outExtra.textContent = '–';
        note = (note ? note + ' ' : '') + 'Add some billable hours to see your rate per billable hour and the extra-hour estimate.';
      }
      hint.textContent = note;

      var other = v.worked - used;
      var text = 'Of ' + fmt(v.worked) + ' hours: ' + fmt(v.billable) + ' billable, ' + fmt(v.admin) + ' admin, ' +
        fmt(v.sales) + ' sales, ' + fmt(v.learning) + ' learning';
      if (other > 0.001) { text += ', ' + fmt(other) + ' unaccounted for'; }
      split.textContent = text + '.';
    }

    function fmt(n) {
      return String(Math.round(n * 100) / 100);
    }

    ids.forEach(function (id) { el[id].addEventListener('input', calc); });
    cur.addEventListener('change', calc);
    var form = document.getElementById('bhu-form');
    if (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); calc(); });
    }
    calc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
