(function () {
  'use strict';

  function init() {
    var ids = ['net', 'exp', 'tax', 'weeks', 'hours', 'bill'];
    var el = {};
    ids.forEach(function (k) { el[k] = document.getElementById('tt-' + k); });
    var cur = document.getElementById('tt-currency');
    var hint = document.getElementById('tt-hint');
    var nums = document.getElementById('tt-numbers');
    var outH = document.getElementById('tt-hourly');
    var outD = document.getElementById('tt-daily');
    var outM = document.getElementById('tt-monthly');
    var detail = document.getElementById('tt-detail');
    if (!cur || !hint || !nums || !outH || !outD || !outM || !detail) { return; }
    for (var i = 0; i < ids.length; i++) { if (!el[ids[i]]) { return; } }

    function parse(s) {
      s = String(s).replace(/\s/g, '').replace(/[€$]/g, '');
      if (s === '') { return NaN; }
      if (s.indexOf(',') !== -1) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
        s = s.replace(/\./g, '');
      }
      if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) { return NaN; }
      var n = parseFloat(s);
      return isFinite(n) ? n : NaN;
    }

    function fmt(n, dec) {
      var s;
      try {
        s = new Intl.NumberFormat('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: true }).format(n);
      } catch (e) {
        s = n.toFixed(dec).replace('.', ',');
      }
      return s;
    }

    function money(n, dec) {
      var sym = cur.value === '$' ? '$' : '€';
      return fmt(n, dec) + ' ' + sym;
    }

    function showHint(msg) {
      hint.textContent = msg;
      hint.style.display = 'block';
      nums.style.opacity = '0.35';
      outH.textContent = '–';
      outD.textContent = '–';
      outM.textContent = '–';
      detail.textContent = '';
    }

    function calc() {
      var net = parse(el.net.value);
      var exp = parse(el.exp.value);
      var tax = parse(el.tax.value);
      var weeks = parse(el.weeks.value);
      var hours = parse(el.hours.value);
      var bill = parse(el.bill.value);

      if (isNaN(net) || net <= 0) { return showHint('Escribe el ingreso neto anual que quieres (un número mayor que 0, por ejemplo 30000).'); }
      if (isNaN(exp) || exp < 0) { return showHint('Escribe tus gastos anuales del negocio (puede ser 0).'); }
      if (isNaN(tax) || tax < 0 || tax > 90) { return showHint('El % para impuestos debe estar entre 0 y 90.'); }
      if (isNaN(weeks) || weeks < 0 || weeks > 51) { return showHint('Las semanas sin trabajar deben estar entre 0 y 51.'); }
      if (isNaN(hours) || hours <= 0 || hours > 80) { return showHint('Las horas de trabajo por semana deben estar entre 1 y 80.'); }
      if (isNaN(bill) || bill <= 0 || bill > 100) { return showHint('El % de horas facturables debe estar entre 1 y 100.'); }

      var revenue = net / (1 - tax / 100) + exp;
      var workWeeks = 52 - weeks;
      var billableYear = workWeeks * hours * (bill / 100);
      if (!isFinite(revenue) || !isFinite(billableYear) || billableYear <= 0) {
        return showHint('Con estos datos no se puede calcular. Revisa las semanas y las horas.');
      }
      var hourly = revenue / billableYear;
      var billableDay = hours * (bill / 100) / 5;
      var daily = hourly * billableDay;
      var monthly = revenue / 12;

      hint.style.display = 'none';
      nums.style.opacity = '1';
      outH.textContent = money(hourly, 2);
      outD.textContent = money(daily, 0);
      outM.textContent = money(monthly, 0);
      detail.textContent = 'Necesitas facturar unos ' + money(revenue, 0) + ' al año, con unas ' +
        fmt(billableYear, 0) + ' horas facturables (' + fmt(workWeeks, 0) + ' semanas de trabajo). ' +
        'La tarifa por día supone ' + fmt(billableDay, 1) + ' horas facturables al día, con 5 días de trabajo por semana.';
    }

    ids.forEach(function (k) {
      el[k].addEventListener('input', calc);
      el[k].addEventListener('change', calc);
    });
    cur.addEventListener('change', calc);
    calc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
