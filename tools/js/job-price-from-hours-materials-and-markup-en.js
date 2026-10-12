document.addEventListener('DOMContentLoaded', function () {
  var ids = ['hours', 'people', 'rate', 'materials', 'markup', 'fixed', 'tax', 'cur'];
  var defaults = { hours: '6', people: '1', rate: '45', materials: '120', markup: '15', fixed: '25', tax: '0', cur: '$' };
  var el = {};
  ids.forEach(function (k) { el[k] = document.getElementById('jp-' + k); });
  var out = {
    total: document.getElementById('jp-total'),
    note: document.getElementById('jp-total-note'),
    labour: document.getElementById('jp-labour'),
    mat: document.getElementById('jp-mat'),
    fix: document.getElementById('jp-fix'),
    sub: document.getElementById('jp-sub'),
    taxamt: document.getElementById('jp-taxamt'),
    markupamt: document.getElementById('jp-markupamt'),
    perhour: document.getElementById('jp-perhour')
  };
  var hint = document.getElementById('jp-hint');
  var reset = document.getElementById('jp-reset');
  if (!el.hours || !out.total || !hint) { return; }

  function num(s) {
    var t = String(s == null ? '' : s).replace(/\s/g, '').replace(',', '.');
    if (t === '') { return NaN; }
    if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(t)) { return NaN; }
    var n = parseFloat(t);
    return isFinite(n) ? n : NaN;
  }

  function setText(node, txt, strong) {
    if (!node) { return; }
    node.textContent = '';
    if (strong) {
      var s = document.createElement('strong');
      s.textContent = txt;
      node.appendChild(s);
    } else {
      node.textContent = txt;
    }
  }

  function clearAll(msg) {
    setText(out.total, '-', false);
    setText(out.note, '', false);
    ['labour', 'mat', 'fix', 'sub', 'taxamt', 'markupamt', 'perhour'].forEach(function (k) { setText(out[k], '-', true); });
    hint.textContent = msg;
  }

  function calc() {
    var cur = (el.cur.value || '').trim().slice(0, 3);
    function money(v) {
      var r = (Math.round(v * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return cur + r;
    }
    var fields = [
      ['hours', 'hours on the job', 0, 1000],
      ['people', 'number of people', 1, 3],
      ['rate', 'hourly rate', 0, 100000],
      ['materials', 'materials cost', 0, 10000000],
      ['markup', 'markup percentage', 0, 1000],
      ['fixed', 'call-out fee', 0, 10000000],
      ['tax', 'tax percentage', 0, 100]
    ];
    var v = {};
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var n = num(el[f[0]].value);
      if (isNaN(n)) { clearAll('Please enter a number for ' + f[1] + ' (use 0 if it does not apply).'); return; }
      if (n < f[2] || n > f[3]) {
        clearAll('Please enter a value for ' + f[1] + ' between ' + f[2] + ' and ' + f[3] + '.');
        return;
      }
      v[f[0]] = n;
    }
    v.people = Math.round(v.people);
    hint.textContent = '';

    var labour = v.hours * v.people * v.rate;
    var markupAmt = v.materials * v.markup / 100;
    var mat = v.materials + markupAmt;
    var sub = labour + mat + v.fixed;
    var taxAmt = sub * v.tax / 100;
    var total = sub + taxAmt;
    var jobHours = v.hours * v.people;

    setText(out.total, money(total), false);
    setText(out.note, v.tax > 0 ? 'Including ' + v.tax + '% tax' : 'No tax added', false);
    setText(out.labour, money(labour), true);
    setText(out.mat, money(mat), true);
    setText(out.fix, money(v.fixed), true);
    setText(out.sub, money(sub), true);
    setText(out.taxamt, money(taxAmt), true);
    setText(out.markupamt, money(markupAmt), true);
    setText(out.perhour, jobHours > 0 ? money(sub / jobHours) : '-', true);
  }

  ids.forEach(function (k) {
    el[k].addEventListener('input', calc);
    el[k].addEventListener('change', calc);
  });
  if (reset) {
    reset.addEventListener('click', function () {
      ids.forEach(function (k) { el[k].value = defaults[k]; });
      calc();
    });
  }
  calc();
});
