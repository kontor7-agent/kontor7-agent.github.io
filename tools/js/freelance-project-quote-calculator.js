document.addEventListener('DOMContentLoaded', function () {
  var root = document.getElementById('pq-tool');
  if (!root) { return; }
  var $ = function (id) { return document.getElementById(id); };
  var rowsBox = $('pq-rows');

  function num(str) {
    var s = String(str == null ? '' : str).trim().replace(/\s/g, '');
    if (s === '') { return NaN; }
    if (s.indexOf(',') > -1 && s.indexOf('.') === -1) { s = s.replace(',', '.'); }
    else { s = s.replace(/,/g, ''); }
    if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) { return NaN; }
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function fmt(n, cur) {
    return cur + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtH(n) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }

  function clearResults(msg) {
    $('pq-hint').textContent = msg;
    ['pq-price', 'pq-deposit-out', 'pq-hours-out', 'pq-eff'].forEach(function (id) { $(id).textContent = '–'; });
    ['pq-balance', 'pq-base-hours', 'pq-eff-note'].forEach(function (id) { $(id).textContent = ''; });
    $('pq-summary').value = '';
  }

  function calc() {
    var cur = $('pq-currency').value.trim();
    var rate = num($('pq-rate').value);
    var buf = num($('pq-buffer').value);
    var fixed = num($('pq-fixed').value === '' ? '0' : $('pq-fixed').value);
    var over = num($('pq-overrun').value === '' ? '0' : $('pq-overrun').value);
    var dep = num($('pq-deposit').value === '' ? '0' : $('pq-deposit').value);

    var rows = rowsBox.querySelectorAll('.pq-row');
    var tasks = [];
    var base = 0;
    for (var i = 0; i < rows.length; i++) {
      var raw = rows[i].querySelector('.pq-hours').value;
      var h = num(raw === '' ? '0' : raw);
      if (isNaN(h) || h < 0) { return clearResults('Please enter hours as a number of 0 or more (task ' + (i + 1) + ').'); }
      var nm = rows[i].querySelector('.pq-name').value.trim() || ('Task ' + (i + 1));
      tasks.push({ name: nm, hours: h });
      base += h;
    }
    if (isNaN(rate) || rate <= 0) { return clearResults('Please enter an hourly rate above 0.'); }
    if (isNaN(buf) || buf < 0 || buf > 300) { return clearResults('Please enter a buffer between 0 and 300 %.'); }
    if (isNaN(fixed) || fixed < 0) { return clearResults('Please enter fixed costs as 0 or more.'); }
    if (isNaN(over) || over < 0 || over > 500) { return clearResults('Please enter an overrun between 0 and 500 %.'); }
    if (isNaN(dep) || dep < 0 || dep > 100) { return clearResults('Please enter a deposit between 0 and 100 %.'); }
    if (base <= 0) { return clearResults('Add at least one task with hours above 0 to see your price.'); }

    $('pq-hint').textContent = '';
    var planned = base * (1 + buf / 100);
    var labour = planned * rate;
    var price = labour + fixed;
    var deposit = price * dep / 100;
    var balance = price - deposit;
    var actualHours = planned * (1 + over / 100);
    var eff = labour / actualHours;

    $('pq-price').textContent = fmt(price, cur);
    $('pq-deposit-out').textContent = fmt(deposit, cur);
    $('pq-balance').textContent = 'Balance after deposit: ' + fmt(balance, cur);
    $('pq-hours-out').textContent = fmtH(planned) + ' h';
    $('pq-base-hours').textContent = fmtH(base) + ' h of tasks + ' + fmtH(buf) + ' % buffer';
    $('pq-eff').textContent = fmt(eff, cur) + ' / h';
    $('pq-eff-note').textContent = 'If the work takes ' + fmtH(actualHours) + ' h instead of ' + fmtH(planned) + ' h (fixed costs not counted as earnings)';

    var lines = [];
    lines.push('PROJECT QUOTE (estimate)');
    lines.push('');
    lines.push('Tasks:');
    tasks.forEach(function (t) { lines.push('- ' + t.name + ': ' + fmtH(t.hours) + ' h'); });
    lines.push('');
    lines.push('Estimated task hours: ' + fmtH(base) + ' h');
    lines.push('Buffer for revisions and unknowns: ' + fmtH(buf) + ' % (' + fmtH(planned) + ' h in total)');
    lines.push('Hourly rate: ' + fmt(rate, cur));
    lines.push('Work: ' + fmt(labour, cur));
    if (fixed > 0) { lines.push('Fixed costs: ' + fmt(fixed, cur)); }
    lines.push('PROJECT PRICE: ' + fmt(price, cur));
    lines.push('Deposit (' + fmtH(dep) + ' %): ' + fmt(deposit, cur));
    lines.push('Balance on delivery: ' + fmt(balance, cur));
    $('pq-summary').value = lines.join('\n');
  }

  function addRow() {
    var row = document.createElement('div');
    row.className = 'pq-row';
    row.setAttribute('style', 'display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem;align-items:center;');

    var name = document.createElement('input');
    name.type = 'text';
    name.className = 'pq-name';
    name.setAttribute('aria-label', 'Task name');
    name.setAttribute('style', 'flex:1 1 180px;min-width:0;padding:.5rem;box-sizing:border-box;');
    name.placeholder = 'New task';

    var hours = document.createElement('input');
    hours.type = 'text';
    hours.setAttribute('inputmode', 'decimal');
    hours.className = 'pq-hours';
    hours.setAttribute('aria-label', 'Estimated hours for this task');
    hours.setAttribute('style', 'width:90px;padding:.5rem;box-sizing:border-box;');
    hours.value = '2';

    var unit = document.createElement('span');
    unit.className = 'muted';
    unit.textContent = 'hours';

    var rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'btn pq-remove';
    rm.setAttribute('aria-label', 'Remove this task');
    rm.textContent = 'Remove';

    row.appendChild(name);
    row.appendChild(hours);
    row.appendChild(unit);
    row.appendChild(rm);
    rowsBox.appendChild(row);
    name.focus();
    calc();
  }

  $('pq-add').addEventListener('click', addRow);

  rowsBox.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('pq-remove')) {
      var row = t.closest('.pq-row');
      if (row) { rowsBox.removeChild(row); }
      calc();
    }
  });

  root.addEventListener('input', calc);
  root.addEventListener('change', calc);

  $('pq-copy').addEventListener('click', function () {
    var status = $('pq-copy-status');
    var ta = $('pq-summary');
    var text = ta.value;
    if (!text) { status.textContent = 'Nothing to copy yet – check your inputs.'; return; }
    function fallback() {
      try {
        ta.focus();
        ta.select();
        var ok = document.execCommand('copy');
        status.textContent = ok ? 'Copied.' : 'Press Ctrl+C to copy the selected text.';
      } catch (err) {
        status.textContent = 'Press Ctrl+C to copy the selected text.';
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        status.textContent = 'Copied.';
      }, fallback);
    } else {
      fallback();
    }
  });

  calc();
});
