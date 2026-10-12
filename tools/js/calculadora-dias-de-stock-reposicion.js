(function () {
  'use strict';

  function init() {
    var $ = function (id) { return document.getElementById(id); };
    var form = $('stock-form');
    if (!form) { return; }

    var el = {
      stock: $('st-stock'), ventas: $('st-ventas'), plazo: $('st-plazo'), seg: $('st-seg'),
      semanas: $('st-semanas'), fecha: $('st-fecha'), coste: $('st-coste'), moneda: $('st-moneda'),
      hint: $('st-hint'), dias: $('st-r-dias'), rotura: $('st-r-rotura'), pedir: $('st-r-pedir'),
      pedirNota: $('st-r-pedir-nota'), cant: $('st-r-cant'), cantNota: $('st-r-cant-nota'),
      detalle: $('st-detalle'), reset: $('st-reset')
    };
    var defaults = { stock: '120', ventas: '4', plazo: '14', seg: '5', semanas: '6', coste: '', moneda: '€' };

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function toISO(d) {
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function fmtDate(d) {
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    }

    function addDays(d, n) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    }

    function fmtNum(n, max) {
      try {
        return new Intl.NumberFormat('es-ES', { maximumFractionDigits: max }).format(n);
      } catch (e) {
        return String(Math.round(n * 100) / 100).replace('.', ',');
      }
    }

    function parseNum(s) {
      if (s === null || s === undefined) { return NaN; }
      var t = String(s).replace(/\s/g, '').replace(',', '.');
      if (t === '' || !/^\d*\.?\d+$|^\d+\.$/.test(t)) { return NaN; }
      var v = parseFloat(t);
      return isFinite(v) ? v : NaN;
    }

    function parseDate(s) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
      if (!m) { return null; }
      var d = new Date(+m[1], +m[2] - 1, +m[3]);
      return isNaN(d.getTime()) ? null : d;
    }

    function clearResults() {
      el.dias.textContent = '–';
      el.rotura.textContent = '–';
      el.pedir.textContent = '–';
      el.cant.textContent = '–';
      el.pedirNota.textContent = '';
      el.cantNota.textContent = '';
      el.detalle.textContent = '';
    }

    function hint(msg) {
      el.hint.textContent = msg;
      clearResults();
    }

    function calc() {
      var stock = parseNum(el.stock.value);
      var ventas = parseNum(el.ventas.value);
      var plazo = parseNum(el.plazo.value);
      var seg = parseNum(el.seg.value);
      var sem = parseNum(el.semanas.value);
      var coste = el.coste.value.trim() === '' ? null : parseNum(el.coste.value);
      var sym = el.moneda.value === '$' ? '$' : '€';

      if (isNaN(stock)) { return hint('Escribe tu stock actual como número, por ejemplo 120 (0 si no te queda nada).'); }
      if (isNaN(ventas) || ventas <= 0) { return hint('Escribe cuántas unidades vendes al día de media (mayor que 0). Puedes usar coma, por ejemplo 2,5.'); }
      if (isNaN(plazo)) { return hint('Escribe el plazo del proveedor en días, por ejemplo 14.'); }
      if (isNaN(seg)) { return hint('Escribe los días de seguridad, por ejemplo 5 (o 0 si no quieres margen).'); }
      if (isNaN(sem)) { return hint('Escribe cuántas semanas quieres cubrir con el pedido, por ejemplo 6.'); }
      if (coste !== null && isNaN(coste)) { return hint('El coste por unidad no es un número válido. Déjalo vacío si no lo necesitas.'); }
      if (stock > 1e9 || ventas > 1e9 || plazo > 1000 || seg > 1000 || sem > 520) {
        return hint('Alguno de los valores es demasiado grande para un cálculo razonable. Revísalo.');
      }
      var start = parseDate(el.fecha.value);
      if (!start) { return hint('Elige una fecha de partida válida (DD/MM/AAAA).'); }

      el.hint.textContent = '';

      var daysLeft = stock / ventas;
      var lead = plazo + seg;
      var daysToOrder = daysLeft - lead;
      var qtyRaw = ventas * (lead + 7 * sem) - stock;
      var qty = Math.max(0, Math.ceil(qtyRaw - 1e-9));

      el.dias.textContent = fmtNum(daysLeft, 1) + ' días';

      if (daysLeft > 3650) {
        el.rotura.textContent = 'Más de 10 años';
      } else {
        el.rotura.textContent = fmtDate(addDays(start, Math.floor(daysLeft)));
      }

      if (daysToOrder > 3650) {
        el.pedir.textContent = 'Sin prisa';
        el.pedirNota.textContent = 'Tu stock aguanta mucho más que el plazo.';
      } else if (daysToOrder < 0) {
        el.pedir.textContent = 'Ya toca pedir';
        el.pedirNota.textContent = 'Debiste pedir hace ' + fmtNum(Math.ceil(-daysToOrder), 0) +
          ' día(s). Con el plazo y el margen elegidos, es probable que haya rotura antes de recibir el pedido.';
      } else {
        var dl = addDays(start, Math.floor(daysToOrder));
        el.pedir.textContent = fmtDate(dl);
        el.pedirNota.textContent = daysToOrder < 1 ? 'Es hoy o mañana: no lo dejes pasar.' : 'Faltan unos ' + fmtNum(Math.floor(daysToOrder), 0) + ' día(s).';
      }

      el.cant.textContent = fmtNum(qty, 0) + ' uds.';
      if (qty === 0) {
        el.cantNota.textContent = 'Con tu stock actual ya cubres el plazo, el margen y ' + fmtNum(sem, 1) + ' semana(s) más.';
      } else if (coste !== null) {
        el.cantNota.textContent = 'Inversión estimada: ' + fmtNum(qty * coste, 2) + ' ' + sym;
      } else {
        el.cantNota.textContent = 'Para cubrir ' + fmtNum(sem, 1) + ' semana(s) tras la llegada.';
      }

      el.detalle.textContent = 'Punto de pedido: ' + fmtNum(ventas * lead, 0) +
        ' uds. (ventas × (plazo + seguridad = ' + fmtNum(lead, 0) + ' días)). ' +
        'Cantidad = ventas diarias × (plazo + seguridad + ' + fmtNum(7 * sem, 0) + ' días) − stock actual.';
    }

    function reset() {
      el.stock.value = defaults.stock;
      el.ventas.value = defaults.ventas;
      el.plazo.value = defaults.plazo;
      el.seg.value = defaults.seg;
      el.semanas.value = defaults.semanas;
      el.coste.value = defaults.coste;
      el.moneda.value = defaults.moneda;
      el.fecha.value = toISO(new Date());
      calc();
    }

    el.fecha.value = toISO(new Date());

    ['stock', 'ventas', 'plazo', 'seg', 'semanas', 'coste', 'fecha'].forEach(function (k) {
      el[k].addEventListener('input', calc);
      el[k].addEventListener('change', calc);
    });
    el.moneda.addEventListener('change', calc);
    form.addEventListener('submit', function (e) { e.preventDefault(); calc(); });
    if (el.reset) { el.reset.addEventListener('click', reset); }

    calc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
