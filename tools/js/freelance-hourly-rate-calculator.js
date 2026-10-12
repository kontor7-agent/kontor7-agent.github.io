document.addEventListener('DOMContentLoaded', function () {
  var $ = function (id) { return document.getElementById(id); };
  var ids = ['cur', 'takehome', 'costs', 'tax', 'weeksoff', 'hours', 'billable'];
  var out = ['r-hourly', 'r-day', 'r-month', 'd-year', 'd-bph', 'd-byear', 'd-weeks'];

  function num(id) {
    var v = $(id).value;
    if (v === null || String(v).trim() === '') return NaN;
    var n = Number(v);
    return isFinite(n) ? n : NaN;
  }

  function clear(msg) {
    out.forEach(function (o) { $(o).textContent = '–'; });
    $('hint').textContent = msg;
  }

  function calculate() {
    var cur = $('cur').value || '';
    var take = num('takehome'), costs = num('costs'), tax = num('tax');
    var off = num('weeksoff'), hours = num('hours'), share = num('billable');

    if (isNaN(take) || isNaN(costs) || isNaN(tax) || isNaN(off) || isNaN(hours) || isNaN(share)) {
      return clear('Please fill in every field with a number.');
    }
    if (take < 0 || costs < 0) return clear('Take-home and costs cannot be negative.');
    if (tax < 0 || tax > 90) return clear('Tax set-aside should be between 0 and 90 %.');
    if (off < 0 || off > 51) return clear('Weeks off should be between 0 and 51.');
    if (hours <= 0 || hours > 80) return clear('Working hours per week should be between 1 and 80.');
    if (share <= 0 || share > 100) return clear('Billable share should be between 1 and 100 %.');

    var weeks = 52 - off;
    var profit = take / (1 - tax / 100);
    var revenue = profit + costs;
    var bph = hours * share / 100;
    var byear = bph * weeks;
    if (!(byear > 0) || !isFinite(revenue)) return clear('These numbers do not produce a result. Please check your inputs.');

    var hourly = revenue / byear;
    var day = hourly * bph / 5;
    var month = revenue / 12;

    var money = function (n, d) {
      return cur + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    };
    var plain = function (n, d) {
      return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    };

    $('hint').textContent = '';
    $('r-hourly').textContent = money(hourly, 2);
    $('r-day').textContent = money(day, 0);
    $('r-month').textContent = money(month, 0);
    $('d-year').textContent = money(revenue, 0);
    $('d-bph').textContent = plain(bph, 1);
    $('d-byear').textContent = plain(byear, 0);
    $('d-weeks').textContent = plain(weeks, 0);
  }

  ids.forEach(function (id) {
    $(id).addEventListener('input', calculate);
    $(id).addEventListener('change', calculate);
  });
  $('calc').addEventListener('submit', function (e) { e.preventDefault(); });
  calculate();
});
