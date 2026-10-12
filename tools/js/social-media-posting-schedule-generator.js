document.addEventListener('DOMContentLoaded', function () {
  var root = document.getElementById('psg');
  if (!root) { return; }
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var startEl = document.getElementById('psg-start');
  var weeksEl = document.getElementById('psg-weeks');
  var hintEl = document.getElementById('psg-hint');
  var totalEl = document.getElementById('psg-total');
  var countEl = document.getElementById('psg-count');
  var endEl = document.getElementById('psg-end');
  var thead = document.getElementById('psg-thead');
  var tbody = document.getElementById('psg-tbody');
  var csvEl = document.getElementById('psg-csv');
  var copyBtn = document.getElementById('psg-copy');
  var copiedEl = document.getElementById('psg-copied');
  var boxes = root.querySelectorAll('input[type="checkbox"][data-name]');
  var cellStyle = 'border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top;';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function nice(d) { return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) { return null; }
    var y = +m[1], mo = +m[2], da = +m[3];
    var d = new Date(y, mo - 1, da);
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) { return null; }
    return d;
  }

  function wholeNumber(v, min, max) {
    var s = String(v).trim();
    if (!/^\d+$/.test(s)) { return null; }
    var n = parseInt(s, 10);
    return (n < min || n > max) ? null : n;
  }

  // default start: next Monday (or today if Monday)
  (function () {
    var t = new Date();
    var d = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    var add = (8 - d.getDay()) % 7;
    startEl.value = iso(addDays(d, add));
  })();

  function csvCell(s) {
    s = String(s);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function td(text, tag) {
    var c = document.createElement(tag || 'td');
    c.setAttribute('style', cellStyle);
    c.textContent = text;
    return c;
  }

  function reset(msg) {
    hintEl.textContent = msg || '';
    totalEl.textContent = '0';
    countEl.textContent = '0';
    endEl.textContent = '–';
    thead.textContent = '';
    tbody.textContent = '';
    csvEl.value = '';
    copiedEl.textContent = '';
  }

  function calc() {
    var start = parseDate(startEl.value);
    var weeks = wholeNumber(weeksEl.value, 1, 26);
    if (!start) { reset('Please pick a valid start date.'); return; }
    if (weeks === null) { reset('Please enter a whole number of weeks between 1 and 26.'); return; }

    var plats = [];
    var bad = null;
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (!b.checked) { continue; }
      var id = b.id.replace('psg-p-', '');
      var numEl = document.getElementById('psg-n-' + id);
      var n = numEl ? wholeNumber(numEl.value, 1, 14) : null;
      if (n === null) { bad = b.getAttribute('data-name'); break; }
      plats.push({ name: b.getAttribute('data-name'), n: n });
    }
    if (bad) { reset('Please enter 1 to 14 posts per week for ' + bad + '.'); return; }
    if (!plats.length) { reset('Select at least one platform to see your schedule.'); return; }

    hintEl.textContent = '';
    copiedEl.textContent = '';

    // schedule[p][w] = array of Date
    var total = 0, last = null;
    var rows = ['Platform,Week,Date,Weekday'];
    var sched = plats.map(function () { return []; });

    for (var w = 0; w < weeks; w++) {
      var wd = [];
      var ws = addDays(start, w * 7);
      for (var k = 0; k < 7; k++) {
        var d = addDays(ws, k);
        if (d.getDay() >= 1 && d.getDay() <= 5) { wd.push(d); }
      }
      for (var p = 0; p < plats.length; p++) {
        var cnt = plats[p].n, list = [];
        for (var j = 0; j < cnt; j++) {
          var idx = cnt <= 5 ? Math.floor((j + 0.5) * 5 / cnt) : Math.floor(j * 5 / cnt);
          if (idx > 4) { idx = 4; }
          var date = wd[idx];
          list.push(date);
          total++;
          if (!last || date > last) { last = date; }
          rows.push([csvCell(plats[p].name), w + 1, iso(date), DAYS[date.getDay()]].join(','));
        }
        sched[p].push(list);
      }
    }

    totalEl.textContent = String(total);
    countEl.textContent = String(plats.length);
    endEl.textContent = last ? nice(last) : '–';

    thead.textContent = '';
    tbody.textContent = '';
    var hr = document.createElement('tr');
    hr.appendChild(td('Week', 'th'));
    plats.forEach(function (pl) { hr.appendChild(td(pl.name + ' (' + pl.n + '/wk)', 'th')); });
    thead.appendChild(hr);
    for (var w2 = 0; w2 < weeks; w2++) {
      var tr = document.createElement('tr');
      tr.appendChild(td('Week ' + (w2 + 1) + ' (from ' + nice(addDays(start, w2 * 7)) + ')'));
      for (var p2 = 0; p2 < plats.length; p2++) {
        tr.appendChild(td(sched[p2][w2].map(nice).join(', ')));
      }
      tbody.appendChild(tr);
    }
    csvEl.value = rows.join('\n');
  }

  function fallbackCopy() {
    csvEl.focus();
    csvEl.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    copiedEl.textContent = ok ? 'Copied!' : 'Press Ctrl+C to copy the selected text.';
  }

  copyBtn.addEventListener('click', function () {
    if (!csvEl.value) { copiedEl.textContent = 'Nothing to copy yet.'; return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(csvEl.value).then(function () {
        copiedEl.textContent = 'Copied!';
      }, fallbackCopy);
    } else {
      fallbackCopy();
    }
  });

  root.addEventListener('input', calc);
  root.addEventListener('change', calc);
  calc();
});
