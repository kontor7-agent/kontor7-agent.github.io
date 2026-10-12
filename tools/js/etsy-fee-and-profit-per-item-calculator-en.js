document.addEventListener('DOMContentLoaded', function () {
  var ids = ['price', 'shipcharged', 'material', 'packaging', 'shipcost', 'minutes', 'hourly',
    'target', 'listing', 'txpct', 'paypct', 'payfix', 'adspct'];
  var el = {};
  ids.concat(['calc', 'hint', 'profit', 'margin', 'fees', 'breakeven', 'suggest', 'detail']).forEach(function (id) {
    el[id] = document.getElementById(id);
  });
  if (!el.calc) { return; }

  function money(n) {
    var sign = n < 0 ? '-' : '';
    return sign + '$' + Math.abs(n).toFixed(2);
  }

  function read(id) {
    var raw = String(el[id].value).trim().replace(',', '.');
    if (raw === '') { return NaN; }
    var v = Number(raw);
    return isFinite(v) ? v : NaN;
  }

  function clear(msg) {
    el.hint.textContent = msg;
    ['profit', 'margin', 'fees', 'breakeven', 'suggest'].forEach(function (id) { el[id].textContent = '–'; });
    el.detail.textContent = '';
  }

  function calc() {
    var v = {};
    for (var i = 0; i < ids.length; i++) {
      v[ids[i]] = read(ids[i]);
      if (isNaN(v[ids[i]]) || v[ids[i]] < 0) {
        clear('Please enter a number of 0 or more in every field.');
        return;
      }
    }
    if (v.price <= 0) { clear('Enter the item price to see your result.'); return; }
    var rate = (v.txpct + v.paypct + v.adspct) / 100;
    if (rate >= 1) { clear('The percentage fees add up to 100% or more. Please check them.'); return; }
    el.hint.textContent = '';

    var revenue = v.price + v.shipcharged;
    var fees = revenue * rate + v.payfix + v.listing;
    var labor = v.minutes / 60 * v.hourly;
    var costs = v.material + v.packaging + v.shipcost + labor;
    var profit = revenue - fees - costs;
    var margin = profit / revenue * 100;

    var fixedAll = v.payfix + v.listing + costs;
    var breakeven = fixedAll / (1 - rate) - v.shipcharged;
    var m = v.target / 100;
    var suggest = null;
    if (1 - rate - m > 0) { suggest = fixedAll / (1 - rate - m) - v.shipcharged; }

    el.profit.textContent = money(profit);
    el.margin.textContent = margin.toFixed(1) + '%';
    el.fees.textContent = money(fees);
    el.breakeven.textContent = breakeven > 0 ? money(breakeven) : money(0);
    if (suggest === null) {
      el.suggest.textContent = 'n/a';
      el.hint.textContent = 'Your fees and target margin together reach 100% or more, so no price can reach that target.';
    } else {
      el.suggest.textContent = money(Math.max(suggest, 0));
    }

    var txt = 'Per sale: ' + money(revenue) + ' paid by buyer (item plus shipping) minus ' + money(fees) +
      ' fees, ' + money(v.material + v.packaging) + ' materials and packaging, ' + money(v.shipcost) +
      ' postage and ' + money(labor) + ' for your time.';
    if (profit < 0) { txt += ' At this price you pay to make this sale.'; }
    el.detail.textContent = txt;
  }

  ids.forEach(function (id) { el[id].addEventListener('input', calc); });
  el.calc.addEventListener('submit', function (e) { e.preventDefault(); });
  calc();
});
