document.addEventListener('DOMContentLoaded', function () {
  var $ = function (id) { return document.getElementById(id); };
  var invEl = $('idp-invoice-date'), termsEl = $('idp-terms'), customEl = $('idp-custom'),
      customWrap = $('idp-custom-wrap'), todayEl = $('idp-today'), hint = $('idp-hint'),
      out = $('idp-output'), reset = $('idp-reset');
  if (!invEl || !termsEl || !todayEl || !out) { return; }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var OFFSETS = [3, 10, 17];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toIso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) { return null; }
    var y = +m[1], mo = +m[2], da = +m[3];
    if (y < 1900 || y > 2200) { return null; }
    var d = new Date(y, mo - 1, da, 12, 0, 0);
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) { return null; }
    return d;
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0); }
  function diffDays(a, b) {
    var ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((ua - ub) / 86400000);
  }
  function fmt(d) { return DAYS[d.getDay()].slice(0, 3) + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function plural(n) { return n + (Math.abs(n) === 1 ? ' day' : ' days'); }
  function set(id, t) { var e = $(id); if (e) { e.textContent = t; } }

  function timing(date, today) {
    var n = diffDays(date, today);
    if (n === 0) { return 'Today'; }
    if (n > 0) { return 'In ' + plural(n); }
    return plural(-n) + ' ago';
  }

  function showHint(msg) {
    hint.textContent = msg;
    hint.hidden = false;
    out.hidden = true;
  }

  function update() {
    var isCustom = termsEl.value === 'custom';
    customWrap.hidden = !isCustom;

    var inv = parse(invEl.value);
    if (!inv) { showHint('Please enter a valid invoice date to see your due date.'); return; }
    var today = parse(todayEl.value);
    if (!today) { showHint('Please enter a valid date to compare with, or press "Reset to today".'); return; }

    var days;
    if (isCustom) {
      var raw = String(customEl.value).trim();
      days = Number(raw);
      if (raw === '' || !isFinite(days) || days < 0 || days > 365 || Math.floor(days) !== days) {
        showHint('Please enter a whole number of days between 0 and 365 for the custom payment term.');
        return;
      }
    } else {
      days = parseInt(termsEl.value, 10);
      if (!isFinite(days)) { showHint('Please choose a payment term.'); return; }
    }

    hint.hidden = true;
    out.hidden = false;

    var due = addDays(inv, days);
    set('idp-due', fmt(due));
    var dow = due.getDay();
    set('idp-weekday', (dow === 0 || dow === 6)
      ? 'This falls on a weekend, so payment may only arrive on the next business day.'
      : 'Invoice date plus ' + plural(days) + '.');

    var left = diffDays(due, today);
    if (left > 0) {
      set('idp-status', plural(left) + ' left');
      set('idp-status-note', 'Payment is not yet due.');
    } else if (left === 0) {
      set('idp-status', 'Due today');
      set('idp-status-note', 'Payment is expected today.');
    } else {
      set('idp-status', plural(-left) + ' overdue');
      set('idp-status-note', 'Payment was due on ' + fmt(due) + '.');
    }

    for (var i = 0; i < 3; i++) {
      var r = addDays(due, OFFSETS[i]);
      set('idp-r' + (i + 1), fmt(r));
      set('idp-r' + (i + 1) + 'n', timing(r, today) + ' (due date + ' + OFFSETS[i] + ')');
    }
  }

  function init() {
    var t = toIso(new Date());
    invEl.value = t;
    todayEl.value = t;
    termsEl.value = '30';
    customEl.value = '21';
    update();
  }

  ['input', 'change'].forEach(function (ev) {
    invEl.addEventListener(ev, update);
    termsEl.addEventListener(ev, update);
    customEl.addEventListener(ev, update);
    todayEl.addEventListener(ev, update);
  });
  $('idp-form').addEventListener('submit', function (e) { e.preventDefault(); });
  if (reset) { reset.addEventListener('click', init); }

  init();
});
