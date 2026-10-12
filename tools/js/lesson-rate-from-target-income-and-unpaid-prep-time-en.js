document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('lrc-form');
  if (!form) { return; }
  function $(id) { return document.getElementById(id); }

  var fields = [
    { id: 'lrc-target', name: 'Monthly take-home', min: 0, max: 1000000 },
    { id: 'lrc-costs', name: 'Monthly business costs', min: 0, max: 1000000 },
    { id: 'lrc-tax', name: 'Tax set-aside', min: 0, max: 80 },
    { id: 'lrc-lessons', name: 'Lessons per week', min: 1, max: 100 },
    { id: 'lrc-len', name: 'Lesson length', min: 10, max: 480 },
    { id: 'lrc-prep', name: 'Prep time', min: 0, max: 480 },
    { id: 'lrc-admin', name: 'Admin time', min: 0, max: 240 },
    { id: 'lrc-off', name: 'Weeks off', min: 0, max: 51 },
    { id: 'lrc-cancel', name: 'Cancellations', min: 0, max: 80 }
  ];
  var outIds = ['lrc-rate', 'lrc-hour', 'lrc-real', 'lrc-hours', 'lrc-count', 'lrc-gross'];

  function clearOut() {
    for (var i = 0; i < outIds.length; i++) { $(outIds[i]).textContent = '-'; }
    $('lrc-note').textContent = '';
  }

  function money(n, cur) {
    var s = (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return cur + s;
  }

  function calc() {
    var v = {};
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var raw = $(f.id).value.replace(',', '.').trim();
      var n = raw === '' ? NaN : Number(raw);
      if (!isFinite(n)) {
        $('lrc-hint').textContent = 'Please enter a number for "' + f.name + '".';
        clearOut();
        return;
      }
      if (n < f.min || n > f.max) {
        $('lrc-hint').textContent = '"' + f.name + '" should be between ' + f.min + ' and ' + f.max + '.';
        clearOut();
        return;
      }
      v[f.id] = n;
    }
    var cur = $('lrc-cur').value.trim().slice(0, 3);

    var taxShare = v['lrc-tax'] / 100;
    var gross = v['lrc-costs'] + v['lrc-target'] / (1 - taxShare);
    var weeks = 52 - v['lrc-off'];
    var perMonth = v['lrc-lessons'] * weeks / 12 * (1 - v['lrc-cancel'] / 100);
    if (!(perMonth > 0)) {
      $('lrc-hint').textContent = 'With these numbers no paid lessons are left. Try fewer cancellations or weeks off.';
      clearOut();
      return;
    }
    var rate = gross / perMonth;
    var perHour = rate * 60 / v['lrc-len'];
    var minutesAll = v['lrc-len'] + v['lrc-prep'] + v['lrc-admin'];
    var realHourly = rate / (minutesAll / 60);
    var hoursWeek = v['lrc-lessons'] * minutesAll / 60;
    var noPrepRate = gross / perMonth;

    $('lrc-hint').textContent = '';
    $('lrc-rate').textContent = money(rate, cur);
    $('lrc-hour').textContent = money(perHour, cur);
    $('lrc-real').textContent = money(realHourly, cur);
    $('lrc-hours').textContent = (Math.round(hoursWeek * 10) / 10).toLocaleString() + ' h';
    $('lrc-count').textContent = (Math.round(perMonth * 10) / 10).toLocaleString();
    $('lrc-gross').textContent = money(gross, cur);

    var note = 'Of every ' + (Math.round(minutesAll)) + ' minutes you work per lesson, ' +
      Math.round(v['lrc-prep'] + v['lrc-admin']) + ' are unpaid. ';
    if (hoursWeek > 45) {
      note += 'That is a long week - consider a higher rate or fewer lessons.';
    } else {
      note += 'Quote this rate and the prep is already covered.';
    }
    void noPrepRate;
    $('lrc-note').textContent = note;
  }

  form.addEventListener('input', calc);
  form.addEventListener('change', calc);
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  calc();
});
