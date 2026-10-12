document.addEventListener('DOMContentLoaded', function () {
  var ids = ['pw-rate', 'pw-cur', 'pw-speed', 'pw-overhead', 'pw-words', 'pw-target'];
  var el = {};
  ids.forEach(function (id) { el[id] = document.getElementById(id); });
  var hint = document.getElementById('pw-hint');
  var numbers = document.getElementById('pw-numbers');
  var eff = document.getElementById('pw-eff');
  var raw = document.getElementById('pw-raw');
  var need = document.getElementById('pw-need');
  var proj = document.getElementById('pw-proj');
  var verdict = document.getElementById('pw-verdict');
  if (!el['pw-rate'] || !hint || !numbers || !eff || !raw || !need || !proj || !verdict) { return; }

  function num(s) {
    var t = String(s == null ? '' : s).replace(/\s/g, '').replace(',', '.');
    if (t === '') { return NaN; }
    var n = Number(t);
    return isFinite(n) ? n : NaN;
  }

  function money(v, cur) {
    return cur + v.toFixed(2);
  }

  function fmtHours(h) {
    var totalMin = Math.round(h * 60);
    var hh = Math.floor(totalMin / 60);
    var mm = totalMin % 60;
    return hh + ' h ' + (mm < 10 ? '0' : '') + mm + ' min';
  }

  function showHint(msg) {
    hint.textContent = msg;
    numbers.style.display = 'none';
  }

  function calc() {
    var cur = (el['pw-cur'].value || '').trim().slice(0, 4);
    var rate = num(el['pw-rate'].value);
    var speed = num(el['pw-speed'].value);
    var over = num(el['pw-overhead'].value);
    var words = num(el['pw-words'].value);
    var target = num(el['pw-target'].value);

    if (isNaN(rate) || rate <= 0) { showHint('Enter your rate per word as a number above zero, for example 0.12.'); return; }
    if (isNaN(speed) || speed <= 0) { showHint('Enter how many words you translate per hour, for example 450.'); return; }
    if (isNaN(over) || over < 0 || over > 300) { showHint('Enter the extra unbilled time as a percentage between 0 and 300, for example 20.'); return; }
    if (isNaN(words) || words <= 0) { showHint('Enter the project size in words, for example 3000.'); return; }
    if (isNaN(target) || target <= 0) { showHint('Enter a target hourly rate above zero, for example 40.'); return; }

    hint.textContent = '';
    numbers.style.display = 'block';

    var factor = 1 + over / 100;
    var rawHourly = rate * speed;
    var effHourly = rawHourly / factor;
    var needRate = target * factor / speed;

    var fee = words * rate;
    var transHours = words / speed;
    var totalHours = transHours * factor;

    eff.textContent = money(effHourly, cur) + ' / hour';
    raw.textContent = money(rawHourly, cur) + ' / hour';
    need.textContent = cur + needRate.toFixed(4) + ' / word';
    proj.textContent = words.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' words = ' +
      money(fee, cur) + ' for about ' + fmtHours(totalHours) + ' in total (' + fmtHours(transHours) + ' translating).';

    var strong = verdict.querySelector('strong');
    var diff = effHourly - target;
    var msg;
    if (Math.abs(diff) < 0.005) {
      msg = 'You land right on your target hourly rate.';
    } else if (diff > 0) {
      msg = 'You are ' + money(diff, cur) + ' per hour above your target.';
    } else {
      msg = 'You are ' + money(-diff, cur) + ' per hour below your target. A rate of ' + cur + needRate.toFixed(4) + ' per word would close the gap.';
    }
    if (strong) { strong.textContent = msg; }
  }

  var form = document.getElementById('pw-form');
  if (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); });
  }

  ids.forEach(function (id) {
    if (el[id]) {
      el[id].addEventListener('input', calc);
      el[id].addEventListener('change', calc);
    }
  });
  calc();
});
