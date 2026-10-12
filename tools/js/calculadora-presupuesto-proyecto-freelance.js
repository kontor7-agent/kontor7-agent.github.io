document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('cpp-form');
  if (!form) { return; }
  var cont = $('cpp-tareas');
  var rowCount = 0;

  // Convierte texto con coma o punto decimal. Vacío = 0. Inválido = NaN.
  function num(str) {
    var s = String(str == null ? '' : str).replace(/[\s €$]/g, '');
    if (s === '') { return 0; }
    if (s.indexOf(',') !== -1) { s = s.replace(/\./g, '').replace(',', '.'); }
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) { s = s.replace(/\./g, ''); }
    if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) { return NaN; }
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function group(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function fmt(n, dec) {
    var neg = n < 0;
    var s = Math.abs(n).toFixed(dec);
    var p = s.split('.');
    var out = group(p[0]) + (p[1] ? ',' + p[1] : '');
    return (neg ? '-' : '') + out;
  }
  function money(n) {
    var cur = $('cpp-moneda').value === '$' ? '$' : '€';
    var t = fmt(n, 2);
    return cur === '$' ? '$' + t : t + ' €';
  }
  function hours(n) { return fmt(Math.round(n * 100) / 100, 2).replace(/,00$/, '').replace(/(,\d)0$/, '$1') + ' h'; }
  function pct(n) { return fmt(Math.round(n * 10) / 10, 1).replace(/,0$/, '') + ' %'; }

  function today() {
    var d = new Date();
    var dd = ('0' + d.getDate()).slice(-2);
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    return dd + '/' + mm + '/' + d.getFullYear();
  }

  function addRow(name, h) {
    rowCount++;
    var row = document.createElement('div');
    row.className = 'cpp-fila';
    row.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';

    var n = document.createElement('input');
    n.type = 'text';
    n.className = 'cpp-nombre';
    n.value = name;
    n.setAttribute('aria-label', 'Nombre de la tarea ' + rowCount);
    n.style.cssText = 'flex:2 1 180px;min-width:0;padding:8px;box-sizing:border-box';

    var i = document.createElement('input');
    i.type = 'text';
    i.setAttribute('inputmode', 'decimal');
    i.className = 'cpp-horas';
    i.value = h;
    i.setAttribute('aria-label', 'Horas de la tarea ' + rowCount);
    i.style.cssText = 'flex:0 1 90px;min-width:0;padding:8px;box-sizing:border-box';

    var u = document.createElement('span');
    u.className = 'muted';
    u.textContent = 'h';

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn cpp-quitar';
    b.textContent = 'Quitar';
    b.setAttribute('aria-label', 'Quitar la tarea ' + rowCount);

    row.appendChild(n); row.appendChild(i); row.appendChild(u); row.appendChild(b);
    cont.appendChild(row);
  }

  var lastSummary = '';

  function setText(id, t) { $(id).textContent = t; }

  function clearResults(msg) {
    setText('cpp-aviso', msg);
    ['cpp-precio', 'cpp-anticipo-imp', 'cpp-real', 'cpp-d-horas', 'cpp-d-trabajo',
      'cpp-d-margen', 'cpp-d-fijos', 'cpp-d-total'].forEach(function (id) { setText(id, '–'); });
    setText('cpp-resto', ' ');
    setText('cpp-real-nota', ' ');
    $('cpp-resumen').value = '';
    lastSummary = '';
  }

  function calc() {
    var rows = cont.querySelectorAll('.cpp-fila');
    var total = 0, bad = false, neg = false, lines = [];
    for (var k = 0; k < rows.length; k++) {
      var nm = rows[k].querySelector('.cpp-nombre').value.trim();
      var h = num(rows[k].querySelector('.cpp-horas').value);
      if (isNaN(h)) { bad = true; continue; }
      if (h < 0) { neg = true; continue; }
      total += h;
      if (h > 0) { lines.push('- ' + (nm || 'Tarea ' + (k + 1)) + ': ' + hours(h)); }
    }
    var rate = num($('cpp-tarifa').value);
    var margin = num($('cpp-margen').value);
    var fixed = num($('cpp-fijos').value);
    var over = num($('cpp-alarga').value);
    var dep = $('cpp-anticipo').value === '50' ? 50 : 30;

    if (bad || [rate, margin, fixed, over].some(isNaN)) {
      clearResults('Revisa los números: usa solo cifras, con coma o punto para los decimales (por ejemplo 12,5).');
      return;
    }
    if (neg || rate < 0 || margin < 0 || fixed < 0 || over < 0) {
      clearResults('Los valores no pueden ser negativos.');
      return;
    }
    if (margin > 300 || over > 500) {
      clearResults('El margen o el porcentaje de retraso parecen demasiado altos. Revisa que sean porcentajes.');
      return;
    }
    if (total <= 0) {
      clearResults('Añade las horas de al menos una tarea para ver el precio.');
      return;
    }
    if (rate <= 0) {
      clearResults('Indica tu tarifa por hora (mayor que 0) para calcular el precio.');
      return;
    }
    setText('cpp-aviso', '');

    var work = total * rate;
    var marginAmt = work * margin / 100;
    var price = work + marginAmt + fixed;
    var depAmt = price * dep / 100;
    var rest = price - depAmt;
    var realHours = total * (1 + over / 100);
    var realRate = (price - fixed) / realHours;
    var diff = (realRate / rate - 1) * 100;

    setText('cpp-precio', money(price));
    setText('cpp-anticipo-imp', money(depAmt));
    setText('cpp-resto', dep + ' % del total. Resto al entregar: ' + money(rest));
    setText('cpp-real', money(realRate) + '/h');
    setText('cpp-real-nota', 'Con ' + pct(over) + ' más de horas (' + hours(realHours) + ') y el mismo precio. ' +
      (diff < 0 ? 'Es un ' + pct(Math.abs(diff)) + ' menos que tu tarifa.' : 'Sigues por encima de tu tarifa.'));
    setText('cpp-d-horas', hours(total));
    setText('cpp-d-trabajo', money(work));
    setText('cpp-d-margen-l', 'Margen para cambios (' + pct(margin) + ')');
    setText('cpp-d-margen', money(marginAmt));
    setText('cpp-d-fijos', money(fixed));
    setText('cpp-d-total', money(price));

    var out = [];
    out.push('PRESUPUESTO DE PROYECTO – ' + today());
    out.push('');
    out.push('Tareas estimadas:');
    out = out.concat(lines);
    out.push('Total de horas: ' + hours(total));
    out.push('');
    out.push('Tarifa por hora: ' + money(rate));
    out.push('Trabajo: ' + money(work));
    out.push('Margen para cambios (' + pct(margin) + '): ' + money(marginAmt));
    out.push('Costes fijos: ' + money(fixed));
    out.push('PRECIO DEL PROYECTO: ' + money(price));
    out.push('');
    out.push('Anticipo (' + dep + ' %): ' + money(depAmt) + ' · Resto: ' + money(rest));
    out.push('Si se alarga un ' + pct(over) + ': tarifa real de ' + money(realRate) + '/h');
    out.push('');
    out.push('Estimación orientativa, impuestos no incluidos.');
    lastSummary = out.join('\n');
    $('cpp-resumen').value = lastSummary;
  }

  function flash(msg) {
    setText('cpp-copiado', msg);
    window.setTimeout(function () { setText('cpp-copiado', ''); }, 2500);
  }

  function copy() {
    if (!lastSummary) { flash('Primero completa el cálculo.'); return; }
    var ta = $('cpp-resumen');
    function fallback() {
      try {
        ta.focus(); ta.select();
        flash(document.execCommand('copy') ? 'Copiado.' : 'Selecciona el texto y cópialo con Ctrl+C.');
      } catch (e) { flash('Selecciona el texto y cópialo con Ctrl+C.'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastSummary).then(function () { flash('Copiado.'); }, fallback);
    } else { fallback(); }
  }

  addRow('Reunión inicial y briefing', '2');
  addRow('Diseño / desarrollo', '12');
  addRow('Revisiones y entrega', '4');

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('input', calc);
  form.addEventListener('change', calc);
  $('cpp-add').addEventListener('click', function () {
    addRow('', '');
    var ins = cont.querySelectorAll('.cpp-nombre');
    ins[ins.length - 1].focus();
    calc();
  });
  cont.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('cpp-quitar')) {
      var row = t.parentNode;
      if (cont.querySelectorAll('.cpp-fila').length > 1) { cont.removeChild(row); }
      else {
        row.querySelector('.cpp-nombre').value = '';
        row.querySelector('.cpp-horas').value = '';
      }
      calc();
    }
  });
  $('cpp-copiar').addEventListener('click', copy);

  calc();
});
