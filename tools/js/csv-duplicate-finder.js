(function () {
  'use strict';
  var MAX_ROWS = 50000;
  var MAX_GROUPS_SHOWN = 50;

  function init() {
    var $ = function (id) { return document.getElementById(id); };
    var elFile = $('csv-file'), elInfo = $('csv-fileinfo'), elDelim = $('csv-delim'),
      elDelimInfo = $('csv-delim-info'), elHeader = $('csv-header'), elTrim = $('csv-trim'),
      elCase = $('csv-case'), elCols = $('csv-cols'), elHint = $('csv-hint'),
      elTotal = $('csv-total'), elDups = $('csv-dups'), elGroups = $('csv-groups'),
      elUnique = $('csv-unique'), elBtn = $('csv-download'), elList = $('csv-list');
    if (!elFile || !elList) { return; }

    var state = { text: null, name: 'data', delim: ',', rows: [], truncated: false, keep: [], width: 0 };

    function detect(text) {
      var counts = { ',': 0, ';': 0, '\t': 0 };
      var inQ = false, lines = 0;
      for (var i = 0; i < text.length && lines < 5; i++) {
        var c = text.charAt(i);
        if (c === '"') { inQ = !inQ; }
        else if (!inQ) {
          if (c === '\n') { lines++; }
          else if (counts.hasOwnProperty(c)) { counts[c]++; }
        }
      }
      var best = ',', max = 0;
      [',', ';', '\t'].forEach(function (d) { if (counts[d] > max) { max = counts[d]; best = d; } });
      return best;
    }

    function parse(text, d) {
      var rows = [], row = [], field = '', inQ = false, truncated = false;
      var limit = MAX_ROWS + (elHeader.checked ? 1 : 0);
      var n = text.length;
      for (var i = 0; i < n; i++) {
        var c = text.charAt(i);
        if (inQ) {
          if (c === '"') {
            if (text.charAt(i + 1) === '"') { field += '"'; i++; }
            else { inQ = false; }
          } else { field += c; }
        } else if (c === '"') {
          inQ = true;
        } else if (c === d) {
          row.push(field); field = '';
        } else if (c === '\n' || c === '\r') {
          if (c === '\r' && text.charAt(i + 1) === '\n') { i++; }
          row.push(field); field = '';
          if (!(row.length === 1 && row[0] === '')) { rows.push(row); }
          row = [];
          if (rows.length >= limit) { truncated = i < n - 1 && text.slice(i + 1).replace(/[\r\n]/g, '') !== ''; break; }
        } else { field += c; }
      }
      if (rows.length < limit && (field !== '' || row.length > 0)) {
        row.push(field);
        if (!(row.length === 1 && row[0] === '')) { rows.push(row); }
      }
      return { rows: rows, truncated: truncated };
    }

    function csvField(v, d) {
      if (v.indexOf('"') !== -1 || v.indexOf(d) !== -1 || v.indexOf('\n') !== -1 || v.indexOf('\r') !== -1) {
        return '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    }

    function delimName(d) { return d === '\t' ? 'tab' : d === ';' ? 'semicolon' : 'comma'; }

    function hint(msg) { elHint.textContent = msg || ''; }

    function resetResults() {
      elTotal.textContent = elDups.textContent = elGroups.textContent = elUnique.textContent = '–';
      elBtn.disabled = true;
      state.keep = [];
      while (elList.firstChild) { elList.removeChild(elList.firstChild); }
      var p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Nothing to show yet.';
      elList.appendChild(p);
    }

    function dataRows() { return elHeader.checked ? state.rows.slice(1) : state.rows; }

    function buildCols() {
      while (elCols.firstChild) { elCols.removeChild(elCols.firstChild); }
      if (!state.rows.length) {
        var s = document.createElement('span'); s.className = 'muted'; s.textContent = 'Load a file to see its columns.';
        elCols.appendChild(s); return;
      }
      var w = 0;
      state.rows.forEach(function (r) { if (r.length > w) { w = r.length; } });
      state.width = w;
      for (var i = 0; i < w; i++) {
        var name = elHeader.checked && state.rows[0][i] ? state.rows[0][i] : 'Column ' + (i + 1);
        var lab = document.createElement('label');
        var cb = document.createElement('input');
        cb.type = 'checkbox'; cb.checked = true; cb.value = String(i);
        cb.addEventListener('change', analyse);
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(' ' + name));
        elCols.appendChild(lab);
      }
    }

    function selectedCols() {
      var out = [];
      var boxes = elCols.querySelectorAll('input[type=checkbox]');
      for (var i = 0; i < boxes.length; i++) { if (boxes[i].checked) { out.push(parseInt(boxes[i].value, 10)); } }
      return out;
    }

    function norm(v) {
      if (v === undefined) { v = ''; }
      if (elTrim.checked) { v = v.trim(); }
      if (elCase.checked) { v = v.toLowerCase(); }
      return v;
    }

    function analyse() {
      if (state.text === null) { resetResults(); return; }
      var rows = dataRows();
      if (!rows.length) { hint('No data rows found. Check the delimiter and the header setting.'); resetResults(); return; }
      var cols = selectedCols();
      if (!cols.length) { hint('Tick at least one key column to compare rows.'); resetResults(); return; }
      hint(state.truncated ? 'Your file has more than 50,000 data rows. Only the first 50,000 were read, so the download will not contain the rest.' : '');

      var map = new Map(), order = [];
      var keep = [], dupCount = 0;
      for (var i = 0; i < rows.length; i++) {
        var parts = [];
        for (var j = 0; j < cols.length; j++) { parts.push(norm(rows[i][cols[j]])); }
        var key = parts.join('\u0001');
        var g = map.get(key);
        if (!g) { g = { rows: [i], parts: parts }; map.set(key, g); keep.push(i); }
        else { g.rows.push(i); dupCount++; if (g.rows.length === 2) { order.push(g); } }
      }
      state.keep = keep;
      elTotal.textContent = rows.length.toLocaleString('en-US');
      elDups.textContent = dupCount.toLocaleString('en-US');
      elGroups.textContent = order.length.toLocaleString('en-US');
      elUnique.textContent = keep.length.toLocaleString('en-US');
      elBtn.disabled = false;

      while (elList.firstChild) { elList.removeChild(elList.firstChild); }
      if (!order.length) {
        var ok = document.createElement('p'); ok.textContent = 'No duplicates found with these settings.';
        elList.appendChild(ok); return;
      }
      var table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.95em;';
      var thead = document.createElement('thead'), hr = document.createElement('tr');
      ['Matching values', 'Times', 'File lines'].forEach(function (t) {
        var th = document.createElement('th'); th.scope = 'col'; th.textContent = t;
        th.style.cssText = 'text-align:left;padding:6px;border-bottom:2px solid #ccc;'; hr.appendChild(th);
      });
      thead.appendChild(hr); table.appendChild(thead);
      var tb = document.createElement('tbody');
      var offset = elHeader.checked ? 2 : 1;
      order.slice(0, MAX_GROUPS_SHOWN).forEach(function (g) {
        var tr = document.createElement('tr');
        var shown = g.parts.map(function (p) { return p === '' ? '(empty)' : p; }).join(' | ');
        if (shown.length > 120) { shown = shown.slice(0, 117) + '...'; }
        var lines = g.rows.slice(0, 10).map(function (r) { return r + offset; }).join(', ');
        if (g.rows.length > 10) { lines += ', ...'; }
        [shown, String(g.rows.length), lines].forEach(function (t) {
          var td = document.createElement('td'); td.textContent = t;
          td.style.cssText = 'padding:6px;border-bottom:1px solid #ddd;vertical-align:top;word-break:break-word;';
          tr.appendChild(td);
        });
        tb.appendChild(tr);
      });
      table.appendChild(tb); elList.appendChild(table);
      if (order.length > MAX_GROUPS_SHOWN) {
        var more = document.createElement('p'); more.className = 'muted';
        more.textContent = 'Showing the first ' + MAX_GROUPS_SHOWN + ' of ' + order.length.toLocaleString('en-US') + ' groups. The download covers all of them.';
        elList.appendChild(more);
      }
    }

    function reparse() {
      if (state.text === null) { return; }
      var d = elDelim.value === 'auto' ? detect(state.text) : elDelim.value;
      state.delim = d;
      elDelimInfo.textContent = (elDelim.value === 'auto' ? 'Detected: ' : 'Using: ') + delimName(d);
      var res = parse(state.text, d);
      state.rows = res.rows; state.truncated = res.truncated;
      if (!state.rows.length) { hint('This file looks empty.'); buildCols(); resetResults(); return; }
      buildCols();
      analyse();
    }

    elFile.addEventListener('change', function () {
      var f = elFile.files && elFile.files[0];
      if (!f) { return; }
      if (f.size > 100 * 1024 * 1024) { hint('This file is very large (over 100 MB). Please use a smaller file.'); return; }
      var rd = new FileReader();
      rd.onload = function () {
        var t = String(rd.result || '');
        if (t.charCodeAt(0) === 0xFEFF) { t = t.slice(1); }
        state.text = t; state.name = f.name.replace(/\.[^.]*$/, '') || 'data';
        elInfo.textContent = f.name + ' (' + Math.max(1, Math.round(f.size / 1024)).toLocaleString('en-US') + ' KB)';
        reparse();
      };
      rd.onerror = function () { hint('Sorry, that file could not be read. Please try another one.'); };
      rd.readAsText(f);
    });

    elDelim.addEventListener('change', reparse);
    elHeader.addEventListener('change', reparse);
    elTrim.addEventListener('change', analyse);
    elCase.addEventListener('change', analyse);

    elBtn.addEventListener('click', function () {
      if (state.text === null || !state.keep.length) { return; }
      var d = state.delim, rows = dataRows(), w = state.width, out = [];
      function line(r) {
        var cells = [];
        for (var k = 0; k < w; k++) { cells.push(csvField(r[k] === undefined ? '' : r[k], d)); }
        return cells.join(d);
      }
      if (elHeader.checked) { out.push(line(state.rows[0])); }
      for (var i = 0; i < state.keep.length; i++) { out.push(line(rows[state.keep[i]])); }
      var blob = new Blob(['﻿' + out.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = state.name + '-deduplicated.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
