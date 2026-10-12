(function () {
  'use strict';

  function init() {
    var $ = function (id) { return document.getElementById(id); };
    var el = {
      stock: $('dsl-stock'), mode: $('dsl-mode'), daily: $('dsl-daily'), month: $('dsl-month'),
      lead: $('dsl-lead'), safety: $('dsl-safety'), weeks: $('dsl-weeks'),
      dailyWrap: $('dsl-daily-wrap'), monthWrap: $('dsl-month-wrap'),
      hint: $('dsl-hint'), days: $('dsl-days'), runout: $('dsl-runout'),
      reorder: $('dsl-reorder'), qty: $('dsl-qty'), rop: $('dsl-rop'), status: $('dsl-status')
    };
    for (var k in el) { if (!el[k]) { return; } }

    function num(input) {
      var s = String(input.value).replace(/\s/g, '').replace(',', '.');
      if (s === '') { return NaN; }
      var n = Number(s);
      return isFinite(n) ? n : NaN;
    }

    function fmt(n, digits) {
      return n.toLocaleString('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
    }

    function addDays(base, n) {
      return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
    }

    function fmtDate(d) {
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }

    function clear(msg) {
      el.hint.textContent = msg;
      el.days.textContent = '–';
      el.runout.textContent = '–';
      el.reorder.textContent = '–';
      el.qty.textContent = '–';
      el.rop.textContent = '–';
      el.status.textContent = '';
    }

    function calc() {
      var useMonth = el.mode.value === 'month';
      el.dailyWrap.hidden = useMonth;
      el.monthWrap.hidden = !useMonth;

      var stock = num(el.stock);
      var lead = num(el.lead);
      var safety = num(el.safety);
      var weeks = num(el.weeks);
      var daily = useMonth ? num(el.month) / 30 : num(el.daily);

      if (isNaN(stock) || stock < 0) { return clear('Please enter your current stock as a number, 0 or more.'); }
      if (isNaN(daily) || daily < 0) { return clear(useMonth ? 'Please enter the units sold in the last 30 days (0 or more).' : 'Please enter your average daily sales (0 or more).'); }
      if (isNaN(lead) || lead < 0) { return clear('Please enter the supplier lead time in days (0 or more).'); }
      if (isNaN(safety) || safety < 0) { return clear('Please enter safety days (0 or more).'); }
      if (isNaN(weeks) || weeks <= 0) { return clear('Please enter how many weeks the order should cover (more than 0).'); }
      if (stock > 1e9 || daily > 1e9 || lead > 3650 || safety > 3650 || weeks > 520) {
        return clear('One of the numbers looks very large. Please check it.');
      }
      if (daily === 0) {
        return clear('With no sales, your stock lasts indefinitely. Enter a sales speed above 0 to see dates.');
      }

      el.hint.textContent = '';
      var today = new Date();
      var daysLeft = stock / daily;
      var wholeDays = Math.floor(daysLeft);
      if (wholeDays > 36500) { return clear('That stock would last over 100 years. Please check your numbers.'); }
      var runOut = addDays(today, wholeDays);
      var buffer = lead + safety;
      var reorderIn = Math.floor(daysLeft - buffer);
      var reorderDate = addDays(today, reorderIn);
      var qty = Math.ceil(daily * 7 * weeks);
      var rop = Math.ceil(daily * buffer);

      el.days.textContent = fmt(Math.round(daysLeft * 10) / 10, 1) + ' days';
      el.runout.textContent = fmtDate(runOut);
      el.reorder.textContent = reorderIn < 0 ? 'Now' : fmtDate(reorderDate);
      el.qty.textContent = fmt(qty, 0) + ' units';
      el.rop.textContent = fmt(rop, 0) + ' units';

      if (reorderIn < 0) {
        var late = -reorderIn;
        var gap = lead - daysLeft;
        var msg = 'Your reorder date is ' + fmt(late, 0) + (late === 1 ? ' day' : ' days') + ' past. Order as soon as you can.';
        if (gap > 0) {
          msg += ' If sales stay steady, you may be out of stock for about ' + fmt(Math.ceil(gap), 0) + ' days before the delivery arrives.';
        } else {
          msg += ' Your safety buffer is being used, but you should not run out before the delivery arrives.';
        }
        el.status.textContent = msg;
      } else if (reorderIn === 0) {
        el.status.textContent = 'Today is your latest reorder date.';
      } else {
        el.status.textContent = 'You have ' + fmt(reorderIn, 0) + (reorderIn === 1 ? ' day' : ' days') + ' before you need to place the order.';
      }
    }

    $('dsl-form').addEventListener('submit', function (e) { e.preventDefault(); });

    var ids = [el.stock, el.mode, el.daily, el.month, el.lead, el.safety, el.weeks];
    for (var i = 0; i < ids.length; i++) {
      ids[i].addEventListener('input', calc);
      ids[i].addEventListener('change', calc);
    }
    calc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
