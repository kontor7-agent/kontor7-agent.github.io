(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  var DAY = 86400000;
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var RECORDATORIOS = [
    { nombre: 'Recordatorio amable', offset: 1, texto: 'Un mensaje breve y cordial: por si se les pasó.' },
    { nombre: 'Segundo aviso', offset: 7, texto: 'Adjunta de nuevo la factura y pregunta por una fecha de pago.' },
    { nombre: 'Aviso final', offset: 15, texto: 'Tono claro y tranquilo: indica los siguientes pasos que vas a dar.' }
  ];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function fmtFecha(ms) {
    var d = new Date(ms);
    return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
  }

  function nombreDia(ms) { return DIAS[new Date(ms).getUTCDay()]; }

  function hoyUTC() {
    var n = new Date();
    return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function isoHoy() {
    var n = new Date();
    return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate());
  }

  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 2000 || y > 2100) return null;
    var ms = Date.UTC(y, mo - 1, d);
    var chk = new Date(ms);
    if (chk.getUTCFullYear() !== y || chk.getUTCMonth() !== mo - 1 || chk.getUTCDate() !== d) return null;
    return ms;
  }

  function parseImporte(s) {
    s = (s || '').replace(/\s/g, '');
    if (s === '') return { vacio: true };
    if (!/^\d[\d.,]*$/.test(s)) return null;
    if (s.indexOf(',') !== -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if ((s.match(/\./g) || []).length > 1) {
      s = s.replace(/\./g, '');
    }
    var v = Number(s);
    if (!isFinite(v) || v < 0 || v > 1e12) return null;
    return { valor: v };
  }

  function fmtImporte(v, moneda) {
    var t = v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return t + ' ' + moneda;
  }

  function textoDias(n) {
    var a = Math.abs(n);
    return a + (a === 1 ? ' día' : ' días');
  }

  function estadoRelativo(diff) {
    if (diff === 0) return 'hoy';
    if (diff > 0) return 'en ' + textoDias(diff);
    return 'hace ' + textoDias(diff);
  }

  ready(function () {
    var el = {
      fecha: document.getElementById('cvf-fecha'),
      plazo: document.getElementById('cvf-plazo'),
      dias: document.getElementById('cvf-dias'),
      libreWrap: document.getElementById('cvf-libre-wrap'),
      importe: document.getElementById('cvf-importe'),
      moneda: document.getElementById('cvf-moneda'),
      hint: document.getElementById('cvf-hint'),
      salida: document.getElementById('cvf-salida'),
      vence: document.getElementById('cvf-vence'),
      semana: document.getElementById('cvf-semana'),
      estado: document.getElementById('cvf-estado'),
      importeTxt: document.getElementById('cvf-importe-txt'),
      lista: document.getElementById('cvf-lista'),
      finde: document.getElementById('cvf-aviso-finde')
    };
    for (var k in el) {
      if (!el[k]) return;
    }

    if (!el.fecha.value) el.fecha.value = isoHoy();

    function mostrarHint(msg) {
      el.hint.textContent = msg;
      el.salida.style.display = msg ? 'none' : '';
    }

    function calcular() {
      el.libreWrap.style.display = el.plazo.value === 'libre' ? '' : 'none';

      var inicio = parseISO(el.fecha.value);
      if (inicio === null) {
        mostrarHint('Introduce una fecha de factura válida (DD/MM/AAAA) para ver tu calendario.');
        return;
      }

      var plazo;
      if (el.plazo.value === 'libre') {
        var raw = (el.dias.value || '').trim();
        plazo = Number(raw);
        if (raw === '' || !isFinite(plazo) || plazo < 0 || plazo > 3650 || Math.floor(plazo) !== plazo) {
          mostrarHint('Escribe un plazo en días entero, entre 0 y 3650.');
          return;
        }
      } else {
        plazo = parseInt(el.plazo.value, 10);
        if (!isFinite(plazo)) {
          mostrarHint('Elige un plazo de pago.');
          return;
        }
      }

      var imp = parseImporte(el.importe.value);
      if (imp === null) {
        mostrarHint('El importe no se entiende. Usa solo números, por ejemplo 1.250,00 (o déjalo vacío).');
        return;
      }

      mostrarHint('');
      var moneda = el.moneda.value === '$' ? '$' : '€';
      var vence = inicio + plazo * DAY;
      var diff = Math.round((vence - hoyUTC()) / DAY);

      el.vence.textContent = fmtFecha(vence);
      el.semana.textContent = 'Cae en ' + nombreDia(vence) + ' · ' + plazo + (plazo === 1 ? ' día' : ' días') + ' desde la factura';

      if (diff > 0) {
        el.estado.textContent = 'Faltan ' + textoDias(diff);
      } else if (diff === 0) {
        el.estado.textContent = 'Vence hoy';
      } else {
        el.estado.textContent = 'Lleva ' + textoDias(diff) + ' de retraso';
      }

      if (imp.vacio) {
        el.importeTxt.textContent = '';
      } else {
        el.importeTxt.textContent = 'Importe pendiente: ' + fmtImporte(imp.valor, moneda);
      }

      while (el.lista.firstChild) el.lista.removeChild(el.lista.firstChild);
      var hayFinde = false;
      RECORDATORIOS.forEach(function (r) {
        var f = vence + r.offset * DAY;
        var d = new Date(f).getUTCDay();
        var finde = d === 0 || d === 6;
        if (finde) hayFinde = true;
        var rel = estadoRelativo(Math.round((f - hoyUTC()) / DAY));
        var li = document.createElement('li');
        li.style.marginBottom = '8px';
        var b = document.createElement('strong');
        b.textContent = r.nombre + ': ' + fmtFecha(f);
        li.appendChild(b);
        li.appendChild(document.createTextNode(' (' + nombreDia(f) + ', ' + rel + ')' + (finde ? ' *' : '')));
        li.appendChild(document.createElement('br'));
        var s = document.createElement('span');
        s.className = 'muted';
        s.textContent = r.texto;
        li.appendChild(s);
        el.lista.appendChild(li);
      });

      var notas = [];
      var dv = new Date(vence).getUTCDay();
      if (dv === 0 || dv === 6) notas.push('El vencimiento cae en fin de semana.');
      if (hayFinde) notas.push('* Esta fecha cae en fin de semana: quizá prefieras enviar el mensaje el lunes.');
      el.finde.textContent = notas.join(' ');
    }

    ['input', 'change'].forEach(function (ev) {
      el.fecha.addEventListener(ev, calcular);
      el.plazo.addEventListener(ev, calcular);
      el.dias.addEventListener(ev, calcular);
      el.importe.addEventListener(ev, calcular);
      el.moneda.addEventListener(ev, calcular);
    });

    calcular();
  });
})();
