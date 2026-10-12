document.addEventListener('DOMContentLoaded', function () {
  var $ = function (id) { return document.getElementById(id); };
  var avgEl = $('rop-avg'), leadEl = $('rop-lead'), stockEl = $('rop-stock');
  var sdEl = $('rop-safety-days'), maxEl = $('rop-max');
  var daysWrap = $('rop-days-wrap'), maxWrap = $('rop-max-wrap');
  var hint = $('rop-hint');
  var outSafety = $('rop-out-safety'), outRop = $('rop-out-rop'), outDays = $('rop-out-days');
  var status = $('rop-status'), detail = $('rop-detail');
  if (!avgEl || !leadEl || !stockEl || !outRop) { return; }

  function num(el) {
    var s = String(el.value).trim().replace(',', '.');
    if (s === '') { return NaN; }
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function fmt(n, d) {
    return n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  }
  function method() {
    return $('rop-m-max').checked ? 'max' : 'days';
  }
  function clear(msg) {
    hint.textContent = msg;
    outSafety.textContent = '–';
    outRop.textContent = '–';
    outDays.textContent = '–';
    status.textContent = '';
    detail.textContent = '';
  }

  function calc() {
    var m = method();
    daysWrap.hidden = (m !== 'days');
    maxWrap.hidden = (m !== 'max');

    var avg = num(avgEl), lead = num(leadEl), stock = num(stockEl);
    if (isNaN(avg) || avg <= 0) { clear('Please enter average daily sales greater than 0.'); return; }
    if (isNaN(lead) || lead < 0) { clear('Please enter a lead time of 0 days or more.'); return; }
    if (isNaN(stock) || stock < 0) { clear('Please enter your current stock (0 or more).'); return; }

    var safety;
    if (m === 'days') {
      var sd = num(sdEl);
      if (isNaN(sd) || sd < 0) { clear('Please enter safety days of 0 or more.'); return; }
      safety = avg * sd;
    } else {
      var mx = num(maxEl);
      if (isNaN(mx) || mx < 0) { clear('Please enter your max daily sales (0 or more).'); return; }
      if (mx < avg) { clear('Max daily sales should be at least your average daily sales.'); return; }
      safety = (mx - avg) * lead;
    }

    var rop = avg * lead + safety;
    var left = stock / avg;
    var safetyR = Math.ceil(safety - 1e-9);
    var ropR = Math.ceil(rop - 1e-9);

    hint.textContent = '';
    outSafety.textContent = fmt(safetyR, 0);
    outRop.textContent = fmt(ropR, 0);
    outDays.textContent = fmt(left, 1);

    if (stock <= ropR) {
      status.textContent = 'Time to reorder now: your stock is at or below the reorder point.';
      var short = left < lead
        ? ' At this pace stock runs out in about ' + fmt(left, 1) + ' days, before a new order arrives (' + fmt(lead, 1) + ' days), so a gap is likely unless you speed things up.'
        : ' Stock should last until a new order arrives, but your safety buffer is already being used.';
      detail.textContent = 'You are ' + fmt(ropR - stock, 0) + ' units below the reorder point.' + short;
    } else {
      var until = (stock - rop) / avg;
      status.textContent = 'Stock is healthy. Reorder in about ' + fmt(until, 1) + ' days.';
      detail.textContent = 'Reorder point = average daily sales x lead time + safety stock. Numbers are rounded up to whole units.';
    }
  }

  var inputs = [avgEl, leadEl, stockEl, sdEl, maxEl, $('rop-m-days'), $('rop-m-max')];
  inputs.forEach(function (el) {
    if (!el) { return; }
    el.addEventListener('input', calc);
    el.addEventListener('change', calc);
  });
  calc();
});
