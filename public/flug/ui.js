/* UI für den Flug-Kalender-Generator. Verdrahtet das Formular mit FlugPlan,
 * rendert Kalendervorschau + Liste und erzeugt die .ics-Datei.
 * Kein Framework, kein Build. */
(function () {
  'use strict';

  var FP = window.FlugPlan;
  var $ = function (id) { return document.getElementById(id); };
  var PRESET_KEYS = ['se', 'gw', 'bd', 'bl', 'gc', 'bc', 'bf'];

  var state = FP.withDefaults({});
  var baseline = FP.baselineFor(state.ft, state.sp);
  var selected = null;          // { leg, key } des angeklickten Blocks
  var view = 'cal';
  var plan = null;
  var urlTimer = null;

  /* ---------------- Feld-Bindung ---------------- */
  var els = {};                 // key -> input/select
  var segs = {};                // key -> container

  function isNum(key) { return typeof FP.DEFAULTS[key] === 'number'; }

  function collect() {
    Object.keys(FP.DEFAULTS).forEach(function (k) {
      var el = $('f_' + k);
      if (el) els[k] = el;
      var seg = document.querySelector('[data-seg="' + k + '"]');
      if (seg) segs[k] = seg;
    });
  }

  function readField(k) {
    var el = els[k];
    if (!el) return state[k];
    if (el.type === 'checkbox') return el.checked ? 1 : 0;
    if (isNum(k)) {
      var v = parseFloat(el.value);
      return isNaN(v) ? FP.DEFAULTS[k] : v;
    }
    return el.value;
  }

  function writeFields() {
    Object.keys(els).forEach(function (k) {
      var el = els[k];
      if (el.type === 'checkbox') el.checked = !!state[k];
      else el.value = state[k] === null || state[k] === undefined ? '' : state[k];
    });
    Object.keys(segs).forEach(function (k) {
      Array.prototype.forEach.call(segs[k].querySelectorAll('button'), function (b) {
        var val = isNum(k) ? parseFloat(b.dataset.val) : b.dataset.val;
        b.setAttribute('aria-pressed', String(val === state[k]));
      });
    });
    syncDecor();
  }

  /* Kleinkram, der von State-Werten abhängt. */
  function syncDecor() {
    document.querySelectorAll('.check').forEach(function (l) {
      var inp = l.querySelector('input');
      if (inp) l.classList.toggle('on', inp.checked);
    });
    var park = $('parkField');
    if (park) park.style.display = state.tm === 'car' ? '' : 'none';
    var ret = $('retFields');
    if (ret) ret.hidden = !state.rt;
    $('presetName').textContent = FP.PRESET_LABEL[state.ft] || '';

    var hints = {
      bg: state.bg
        ? 'Check-in/Bag-Drop wird eingeplant — der Schalter schließt ' + state.bc + ' min vor Abflug.'
        : 'Kein Gepäckschalter: du gehst direkt zur Sicherheitskontrolle.',
      oc: state.oc
        ? 'Bordkarte ist schon auf dem Handy.'
        : 'Erinnerung 24 h vor Abflug wird eingeplant.',
      sp: (FP.SPEEDS[state.sp] || {}).hint || ''
    };
    Object.keys(hints).forEach(function (k) {
      var el = document.querySelector('[data-hint="' + k + '"]');
      if (el) el.textContent = hints[k];
    });

    var dp = FP.airportLabel(state.dp), ar = FP.airportLabel(state.ar);
    $('dpTzHint').textContent = dp ? dp + ' · ' + state.dtz : '';
    $('arTzHint').textContent = ar ? ar + ' · ' + state.atz : '';
  }

  /* Flugtyp/Timing geändert: Presetwerte nachziehen, aber Handeingaben behalten. */
  function applyBaseline() {
    var next = FP.baselineFor(state.ft, state.sp);
    PRESET_KEYS.forEach(function (k) {
      if (state[k] === baseline[k]) state[k] = next[k];
    });
    baseline = next;
  }

  function onFieldChange(k) {
    var before = { ft: state.ft, sp: state.sp };
    state[k] = readField(k);
    if (k === 'ft' || k === 'sp') applyBaseline();
    if (k === 'dp' || k === 'ar') autoTimezone(k);
    if (before.ft !== state.ft || before.sp !== state.sp || k === 'dp' || k === 'ar') writeFields();
    else syncDecor();
    render();
  }

  function setValue(k, v) {
    state[k] = v;
    if (k === 'ft' || k === 'sp') applyBaseline();
    writeFields();
    render();
  }

  /* Flughafen-Code erkannt → Zeitzone übernehmen. */
  function autoTimezone(k) {
    var raw = (state[k] || '').trim();
    var m = /^([A-Za-z]{3})\b/.exec(raw);
    if (!m) return;
    var a = FP.AIRPORT_BY_IATA[m[1].toUpperCase()];
    if (!a) return;
    var tzKey = k === 'dp' ? 'dtz' : 'atz';
    state[tzKey] = a.tz;
    if (els[tzKey]) ensureTzOption(els[tzKey], a.tz);
  }

  /* ---------------- Auswahllisten ---------------- */
  function fillAirports() {
    var dl = $('airports');
    var frag = document.createDocumentFragment();
    FP.AIRPORTS.forEach(function (a) {
      var o = document.createElement('option');
      o.value = a.iata;
      o.label = a.iata + ' — ' + a.name;
      o.textContent = a.name;
      frag.appendChild(o);
    });
    dl.appendChild(frag);
  }

  function ensureTzOption(sel, tz) {
    if (!tz) return;
    if (!Array.prototype.some.call(sel.options, function (o) { return o.value === tz; })) {
      var o = document.createElement('option');
      o.value = tz; o.textContent = tz;
      sel.insertBefore(o, sel.firstChild);
    }
    sel.value = tz;
  }

  function fillTimezones() {
    var zones = [];
    try { zones = Intl.supportedValuesOf('timeZone'); } catch (e) { zones = []; }
    if (!zones.length) {
      var seen = {};
      FP.AIRPORTS.forEach(function (a) { seen[a.tz] = 1; });
      zones = Object.keys(seen).sort();
    }
    ['dtz', 'atz'].forEach(function (k) {
      var sel = els[k];
      if (!sel) return;
      var frag = document.createDocumentFragment();
      zones.forEach(function (z) {
        var o = document.createElement('option');
        o.value = z; o.textContent = z;
        frag.appendChild(o);
      });
      sel.appendChild(frag);
    });
  }

  /* ---------------- Persistenz ---------------- */
  function loadFromUrl() {
    var m = /[#&]s=([A-Za-z0-9_-]+)/.exec(location.hash || '');
    if (!m) return null;
    return FP.decodeState(m[1]);
  }

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem('flug.state');
      return raw ? FP.withDefaults(JSON.parse(raw)) : null;
    } catch (e) { return null; }
  }

  function persist() {
    try { localStorage.setItem('flug.state', JSON.stringify(state)); } catch (e) { /* egal */ }
  }

  function deepLink() {
    return location.origin + location.pathname + '#s=' + FP.encodeState(state);
  }

  function pushUrl() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(function () {
      try { history.replaceState(null, '', '#s=' + FP.encodeState(state)); } catch (e) { /* egal */ }
      persist();
    }, 350);
  }

  /* ---------------- Beschriftungen ---------------- */
  var SHORT = {
    docs: 'Reisecheck', pack: 'Koffer packen', oci: 'Online-Check-in',
    travel: 'Anreise', park: 'Parken & Terminal', bagdrop: 'Gepäckabgabe',
    security: 'Security', buffer: 'Puffer & Gateweg', boarding: 'Boarding', flight: 'Flug'
  };

  /* Regler, die direkt am angeklickten Block hängen. */
  var KNOBS = {
    travel: [{ k: 'tmin', r: 'rtmin', label: 'Fahrtzeit', min: 0, max: 240, step: 5, unit: 'min' }],
    park: [{ k: 'pk', r: 'rpk', label: 'Parken & Weg', min: 0, max: 90, step: 5, unit: 'min' }],
    bagdrop: [
      { k: 'bd', label: 'Dauer am Schalter', min: 5, max: 120, step: 5, unit: 'min' },
      { k: 'bc', label: 'Schalter schließt vor Abflug', min: 15, max: 180, step: 5, unit: 'min' }
    ],
    security: [{ k: 'se', label: 'Kontrolle', min: 5, max: 120, step: 5, unit: 'min' }],
    buffer: [
      { k: 'bf', label: 'Puffer', min: 0, max: 180, step: 5, unit: 'min' },
      { k: 'gw', label: 'Weg zum Gate', min: 0, max: 60, step: 5, unit: 'min' }
    ],
    boarding: [
      { k: 'bl', label: 'Boarding startet vor Abflug', min: 15, max: 120, step: 5, unit: 'min' },
      { k: 'gc', label: 'Gate schließt vor Abflug', min: 0, max: 60, step: 5, unit: 'min' }
    ],
    pack: [{ k: 'epackm', label: 'Dauer', min: 15, max: 300, step: 15, unit: 'min' }],
    docs: [{ k: 'edocd', label: 'Tage vor Abflug', min: 1, max: 21, step: 1, unit: 'Tage' }]
  };

  /* ---------------- Rendering ---------------- */
  function render(opts) {
    opts = opts || {};
    plan = FP.computePlan(state, deepLink());
    pushUrl();

    var ok = plan.ok && plan.events.length > 0;
    $('btnIcs').disabled = !ok;
    $('deepLink').value = deepLink();

    renderKpis(ok);
    renderWarnings();
    renderCalendar(ok);
    renderList(ok);
    // Beim Ziehen an einem Regler den Inspector nicht neu aufbauen — sonst
    // verliert der Slider den Griff. Nur die Zeitzeile wird nachgezogen.
    if (opts.keepInspector) refreshInspectorTimes();
    else renderInspector();

    $('calView').hidden = view !== 'cal';
    $('timeline').hidden = view !== 'list';
    document.querySelectorAll('#viewTabs button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.view === view));
    });
  }

  function renderKpis(ok) {
    var box = $('kpis');
    if (!ok) {
      box.hidden = true;
      $('planSub').textContent = plan.warnings[0] || 'Trag links Datum und Abflugzeit ein.';
      return;
    }
    var s = plan.summary;
    box.hidden = false;
    box.innerHTML = [
      kpi(FP.fmtTime(s.travelStart, s.tz), 'Losfahren'),
      kpi(FP.fmtTime(s.terminalIn, s.tz), 'Im Terminal'),
      kpi(FP.fmtTime(s.gateClose, s.tz), 'Gate schließt'),
      kpi(FP.fmtDuration(s.doorToGate), 'Tür bis Abflug')
    ].join('');
    $('planSub').textContent = (s.flightNo ? s.flightNo + ' · ' : '') + s.from + ' → ' + s.to +
      ' · ' + FP.fmtDate(s.std, s.tz) + ' · ' + plan.events.length + ' Termine';
  }

  function kpi(v, l) {
    return '<div class="kpi"><div class="v">' + esc(v) + '</div><div class="l">' + esc(l) + '</div></div>';
  }

  function renderWarnings() {
    var box = $('warnings');
    box.innerHTML = (plan.warnings || []).map(function (w) {
      var bad = /zu spät|Vergangenheit|vor dem Hinflug/.test(w);
      return '<div class="warn' + (bad ? ' bad' : '') + '">' + esc(w) + '</div>';
    }).join('');
  }

  /* --- Kalendervorschau --- */
  function dayKey(ts, tz) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(ts));
  }
  function minutesOfDay(ts, tz) {
    var p = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(new Date(ts)).split(':');
    return (+p[0]) * 60 + (+p[1]);
  }
  function dayStartUtc(key, tz) {
    var p = key.split('-');
    return FP.zonedToUtc(+p[0], +p[1], +p[2], 0, 0, tz);
  }

  function renderCalendar(ok) {
    var wrap = $('calwrap'), empty = $('calEmpty');
    if (!ok) {
      wrap.hidden = true;
      empty.hidden = false;
      return;
    }
    wrap.hidden = false;
    empty.hidden = true;

    // Events in Tagesstücke zerlegen (Ortszeit des jeweiligen Fluges).
    // Lange Flüge werden gestaucht dargestellt, sonst schrumpft die
    // Vorbereitungskette — um die es hier ja geht — auf ein paar Pixel.
    var CAP = 150;
    var days = {}, order = [], capped = false;
    plan.events.forEach(function (e) {
      if (e.key === 'flight' && (e.end - e.start) > CAP * 60000) {
        var k0 = dayKey(e.start, e.tz), f0 = minutesOfDay(e.start, e.tz);
        if (!days[k0]) { days[k0] = []; order.push(k0); }
        days[k0].push({ ev: e, from: f0, to: Math.min(24 * 60, f0 + CAP), part: false, cut: true });
        capped = true;
        return;
      }
      var cursor = e.start;
      var guard = 0;
      while (cursor < e.end && guard++ < 6) {
        var key = dayKey(cursor, e.tz);
        var start0 = dayStartUtc(key, e.tz);
        var next0 = start0 + 24 * 3600000;
        // DST-sicher: nächsten Tagesanfang aus dem Datum ableiten
        next0 = dayStartUtc(dayKey(start0 + 26 * 3600000, e.tz), e.tz);
        var segEnd = Math.min(e.end, next0);
        if (!days[key]) { days[key] = []; order.push(key); }
        days[key].push({
          ev: e,
          from: minutesOfDay(cursor, e.tz),
          to: minutesOfDay(cursor, e.tz) + Math.round((segEnd - cursor) / 60000),
          part: cursor > e.start
        });
        cursor = segEnd;
      }
    });
    order.sort();

    var minM = 24 * 60, maxM = 0;
    order.forEach(function (k) {
      days[k].forEach(function (b) {
        minM = Math.min(minM, b.from);
        maxM = Math.max(maxM, Math.min(b.to, 24 * 60));
      });
    });
    minM = Math.max(0, Math.floor((minM - 30) / 60) * 60);
    maxM = Math.min(24 * 60, Math.ceil((maxM + 30) / 60) * 60);
    if (maxM - minM < 360) maxM = Math.min(24 * 60, minM + 360);

    var hours = (maxM - minM) / 60;
    var pxH = Math.max(30, Math.min(58, Math.round(640 / hours)));
    var PAD = 9;
    var height = hours * pxH + PAD * 2;

    // Kopfzeile
    var head = '<div class="gutter"></div>';
    order.forEach(function (k) {
      var ts = dayStartUtc(k, plan.events[0].tz) + 12 * 3600000;
      var d = new Date(k + 'T12:00:00Z');
      head += '<div class="dh">' +
        new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'UTC' }).format(d) +
        '<b>' + new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(d) +
        '</b></div>';
      void ts;
    });
    $('calhead').innerHTML = head;

    // Stundenraster
    var gutter = '<div class="gutter" style="height:' + height + 'px">';
    for (var m = minM; m <= maxM; m += 60) {
      gutter += '<span style="top:' + (PAD + (m - minM) / 60 * pxH) + 'px">' +
        String(Math.floor((m / 60) % 24)).padStart(2, '0') + '</span>';
    }
    gutter += '</div>';

    var body = gutter;
    order.forEach(function (k) {
      var col = '<div class="daycol" style="height:' + height + 'px">';
      for (var mm = minM; mm <= maxM; mm += 30) {
        col += '<div class="hline' + (mm % 60 ? ' half' : '') + '" style="top:' +
          (PAD + (mm - minM) / 60 * pxH) + 'px"></div>';
      }
      lanes(days[k]).forEach(function (b) {
        var top = PAD + (Math.max(minM, b.from) - minM) / 60 * pxH;
        var h = Math.max(13, (Math.min(maxM, b.to) - Math.max(minM, b.from)) / 60 * pxH - 2);
        var e = b.ev;
        var cls = 'cev';
        if (e.key === 'flight') cls += ' flight';
        if (e.key === 'buffer' || e.key === 'oci' || e.key === 'docs') cls += ' soft';
        if (h < 26) cls += ' tiny';
        if (selected && selected.key === e.key && selected.leg === e.leg) cls += ' sel';
        var w = 100 / b.lanes, left = b.lane * w;
        col += '<button type="button" class="' + cls + '" data-leg="' + e.leg + '" data-key="' + e.key + '"' +
          ' style="top:' + top + 'px;height:' + h + 'px;left:calc(' + left + '% + 3px);width:calc(' + w + '% - 6px)"' +
          ' title="' + esc(e.title) + '">' +
          '<b>' + esc(label(e)) + (b.part ? ' (Forts.)' : '') + '</b>' +
          '<span class="ct">' + FP.fmtTime(e.start, e.tz) + '–' + FP.fmtTime(e.end, e.tz) + '</span>' +
          '</button>';
      });
      col += '</div>';
      body += col;
    });
    $('calbody').innerHTML = body;

    // Ohne eigenes Zutun auf den Abflugtag scrollen — die Vorbereitungstage
    // davor sind auf schmalen Schirmen sonst das Erste, was man sieht.
    var sc = document.querySelector('.calscroll');
    if (sc && !sc.dataset.userScrolled) {
      var mainDay = null;
      plan.events.forEach(function (e) {
        if (mainDay === null && e.leg === 'o' && (e.key === 'travel' || e.key === 'flight')) {
          mainDay = dayKey(e.start, e.tz);
        }
      });
      var idx = order.indexOf(mainDay);
      var cols = $('calbody').querySelectorAll('.daycol');
      if (idx >= 0 && cols[idx]) {
        sc._auto = true;                       // das eigene Scrollen nicht als Nutzeraktion werten
        sc.scrollLeft = Math.max(0, cols[idx].offsetLeft - 46);
      }
    }

    var zones = {};
    plan.events.forEach(function (e) { zones[e.tz] = 1; });
    $('callegend').textContent = 'Ortszeit ' + Object.keys(zones).join(' · ') +
      ' · Block antippen, um Dauer zu ändern' +
      (capped ? ' · Flugdauer verkürzt dargestellt' : '') +
      (order.length > 4 ? ' · seitlich scrollen für weitere Tage' : '');
  }

  /* Überlappende Blöcke nebeneinander legen. */
  function lanes(blocks) {
    blocks.sort(function (a, b) { return a.from - b.from || a.to - b.to; });
    var open = [];
    blocks.forEach(function (b) {
      open = open.filter(function (o) { return o.to > b.from; });
      var used = {};
      open.forEach(function (o) { used[o.lane] = 1; });
      var i = 0;
      while (used[i]) i++;
      b.lane = i;
      open.push(b);
      var n = Math.max.apply(null, open.map(function (o) { return o.lane; })) + 1;
      open.forEach(function (o) { o.lanes = Math.max(o.lanes || 1, n); });
      b.lanes = Math.max(b.lanes || 1, n);
    });
    blocks.forEach(function (b) { b.lanes = b.lanes || 1; });
    return blocks;
  }

  function label(e) {
    var base = e.key === 'flight' ? flightLabel(e) : (SHORT[e.key] || e.key);
    return (e.leg === 'r' ? '↩ ' : '') + base;
  }
  function flightLabel(e) {
    var m = /^(?:Hin|Rück)flug\s+([A-Z0-9]+):/.exec(e.title);
    return m ? 'Flug ' + m[1] : 'Flug';
  }

  /* --- Listenansicht --- */
  function renderList(ok) {
    var box = $('timeline');
    if (!ok) {
      box.innerHTML = '<div class="empty"><span class="big">Noch nichts zu tun</span>' +
        'Sobald Abflugdatum und -zeit stehen, erscheint hier die komplette Kette.</div>';
      return;
    }
    var html = '', lastDay = '', prevEnd = null;
    plan.events.forEach(function (e) {
      var dk = dayKey(e.start, e.tz);
      if (dk !== lastDay) {
        html += '<div class="day">' + esc(FP.fmtDate(e.start, e.tz)) + '</div>';
        lastDay = dk;
        prevEnd = null;
      }
      if (prevEnd !== null && e.start - prevEnd > 5 * 60000) {
        html += '<div class="gap">↕ ' + FP.fmtDuration(e.start - prevEnd) + ' Wartezeit</div>';
      }
      var why = (e.desc.split('\n')[0] || '');
      html += '<div class="ev' + (['travel', 'boarding', 'flight', 'bagdrop'].indexOf(e.key) >= 0 ? ' major' : '') + '">' +
        '<div class="time">' + FP.fmtTime(e.start, e.tz) + '<br><span class="to">' +
          FP.fmtTime(e.end, e.tz) + '</span></div>' +
        '<div class="body"><div class="t">' + esc(e.title) + '</div>' +
        '<div class="meta">' + FP.fmtDuration(e.end - e.start) +
          (e.location ? ' · ' + esc(e.location) : '') + '</div>' +
        '<div class="why">' + esc(why) + '</div></div></div>';
      prevEnd = Math.max(prevEnd || 0, e.end);
    });
    box.innerHTML = html;
  }

  /* --- Inspector unter dem Kalender --- */
  function renderInspector() {
    var box = $('inspector');
    if (!selected || !plan || !plan.ok) { box.innerHTML = ''; return; }
    var e = currentEvent();
    if (!e) { box.innerHTML = ''; selected = null; return; }

    var knobs = (KNOBS[e.key] || []).map(function (def) {
      var key = (e.leg === 'r' && def.r) ? def.r : def.k;
      return '<div class="knob"><label for="knob_' + key + '">' + esc(def.label) + '</label>' +
        '<div class="kr"><input type="range" id="knob_' + key + '" data-knob="' + key + '" ' +
        'min="' + def.min + '" max="' + def.max + '" step="' + def.step + '" value="' + state[key] + '">' +
        '<span class="kv" data-kv="' + key + '">' + state[key] + ' ' + def.unit + '</span></div></div>';
    }).join('');

    var extra = '';
    if (e.key === 'flight') extra = '<p class="note" style="margin-top:10px">Flugzeiten kommen aus Abschnitt 01.</p>';
    if (e.key === 'oci') extra = '<p class="note" style="margin-top:10px">Fester Termin: 24 h vor Abflug.</p>';

    box.innerHTML = '<div class="insp"><div class="ih"><h3>' + esc(e.title) + '</h3>' +
      '<button class="close" type="button" data-close="1" aria-label="Schließen">✕</button></div>' +
      '<div class="when">' + FP.fmtDateShort(e.start, e.tz) + ' · ' + FP.fmtTime(e.start, e.tz) + '–' +
        FP.fmtTime(e.end, e.tz) + ' · ' + FP.fmtDuration(e.end - e.start) +
        (e.key === 'flight' && e.tzEnd !== e.tz && !e.estimated
          ? ' · Ankunft ' + FP.fmtTime(e.end, e.tzEnd) + ' Ortszeit' : '') + '</div>' +
      '<div class="why">' + esc(e.desc.split('\n\nPlan ändern')[0]) + '</div>' +
      (knobs ? '<div class="knobs">' + knobs + '</div>' : '') + extra + '</div>';
  }

  function currentEvent() {
    var found = null;
    if (!selected || !plan || !plan.ok) return null;
    plan.events.forEach(function (x) {
      if (x.key === selected.key && x.leg === selected.leg) found = x;
    });
    return found;
  }

  function refreshInspectorTimes() {
    var e = currentEvent(), el = document.querySelector('.insp .when');
    if (!e || !el) return;
    el.textContent = FP.fmtDateShort(e.start, e.tz) + ' · ' + FP.fmtTime(e.start, e.tz) + '–' +
      FP.fmtTime(e.end, e.tz) + ' · ' + FP.fmtDuration(e.end - e.start);
    var why = document.querySelector('.insp .why');
    if (why) why.textContent = e.desc.split('\n\nPlan ändern')[0];
  }

  /* ---------------- ICS ---------------- */
  function downloadIcs() {
    if (!plan || !plan.ok) return;
    var tripId = FP.tripIdFor(state);
    var seqKey = 'flug.seq.' + tripId;
    var seq = 0;
    try { seq = parseInt(localStorage.getItem(seqKey) || '0', 10) + 1; } catch (e) { seq = 1; }
    try { localStorage.setItem(seqKey, String(seq)); } catch (e) { /* egal */ }

    var s = plan.summary;
    var ics = FP.buildICS(plan, {
      tripId: tripId,
      sequence: seq,
      deepLink: deepLink(),
      calName: 'Flug ' + (s.flightNo || (s.from + ' → ' + s.to))
    });
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = FP.fileNameFor(state);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);

    $('seqNote').textContent = 'Version ' + seq + ' erzeugt (' + plan.events.length + ' Termine). ' +
      (seq > 1 ? 'Gleiche Termin-IDs wie vorher — Kalender aktualisieren die Einträge meist, statt sie zu doppeln.'
               : 'Beim nächsten Download mit gleichem Flug wird daraus ein Update.');
    toast('Kalenderdatei erzeugt');
  }

  /* ---------------- Helfer ---------------- */
  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function example() {
    var d = new Date(Date.now() + 21 * 86400000);
    var iso = d.toISOString().slice(0, 10);
    var back = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10);
    state = FP.withDefaults({
      fn: 'EW252', dp: 'CGN', ar: 'TFS', dtz: 'Europe/Berlin', atz: 'Atlantic/Canary',
      dd: iso, dt: '13:10', at: '17:55', ft: 'schengen', sp: 'normal',
      bg: 1, oc: 0, tm: 'transit', tmin: 60, hm: 'Düsseldorf-Bilk',
      rt: 1, rfn: 'EW253', rdd: back, rdt: '18:40', rat: '23:20', rtm: 'taxi', rtmin: 45,
      rhm: 'Ferienwohnung Costa Adeje'
    });
    baseline = FP.baselineFor(state.ft, state.sp);
    ['dtz', 'atz'].forEach(function (k) { if (els[k]) ensureTzOption(els[k], state[k]); });
    writeFields();
    render();
  }

  /* ---------------- Init ---------------- */
  function init() {
    collect();
    fillAirports();
    fillTimezones();

    var loaded = loadFromUrl() || loadFromStorage();
    if (loaded) state = loaded;
    else {
      try { state.dtz = state.atz = Intl.DateTimeFormat().resolvedOptions().timeZone || state.dtz; }
      catch (e) { /* Default bleibt */ }
    }
    baseline = FP.baselineFor(state.ft, state.sp);
    ['dtz', 'atz'].forEach(function (k) { if (els[k]) ensureTzOption(els[k], state[k]); });
    writeFields();

    Object.keys(els).forEach(function (k) {
      var el = els[k];
      var evt = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date' || el.type === 'time')
        ? 'change' : 'input';
      el.addEventListener(evt, function () { onFieldChange(k); });
      if (evt === 'input') el.addEventListener('change', function () { onFieldChange(k); });
    });

    Object.keys(segs).forEach(function (k) {
      segs[k].addEventListener('click', function (ev) {
        var b = ev.target.closest('button[data-val]');
        if (!b) return;
        setValue(k, isNum(k) ? parseFloat(b.dataset.val) : b.dataset.val);
      });
    });

    var scroller = document.querySelector('.calscroll');
    if (scroller) {
      scroller.addEventListener('scroll', function () {
        if (scroller._auto) { scroller._auto = false; return; }
        if (scroller.scrollLeft > 0) scroller.dataset.userScrolled = '1';
      }, { passive: true });
    }

    $('calbody').addEventListener('click', function (ev) {
      var b = ev.target.closest('.cev');
      if (!b) return;
      if (selected && selected.key === b.dataset.key && selected.leg === b.dataset.leg) selected = null;
      else selected = { key: b.dataset.key, leg: b.dataset.leg };
      render();
      var insp = document.querySelector('.insp');
      if (insp) insp.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    $('inspector').addEventListener('input', function (ev) {
      var r = ev.target.closest('[data-knob]');
      if (!r) return;
      var k = r.dataset.knob;
      state[k] = parseFloat(r.value);
      if (PRESET_KEYS.indexOf(k) >= 0) baseline[k] = -1;   // gilt ab jetzt als handjustiert
      var kv = document.querySelector('[data-kv="' + k + '"]');
      if (kv) kv.textContent = kv.textContent.replace(/^[\d.]+/, String(state[k]));
      if (els[k]) els[k].value = state[k];
      render({ keepInspector: true });
    });

    $('inspector').addEventListener('click', function (ev) {
      if (ev.target.closest('[data-close]')) { selected = null; render(); }
    });

    $('viewTabs').addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-view]');
      if (!b) return;
      view = b.dataset.view;
      render();
    });

    $('btnIcs').addEventListener('click', downloadIcs);

    $('btnCopy').addEventListener('click', function () {
      var link = deepLink();
      var done = function () { toast('Deep-Link kopiert'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(done, fallback);
      } else fallback();
      function fallback() {
        var inp = $('deepLink');
        inp.select(); inp.setSelectionRange(0, 99999);
        try { document.execCommand('copy'); done(); } catch (e) { toast('Kopieren nicht möglich'); }
      }
    });

    $('btnPreset').addEventListener('click', function () {
      var next = FP.baselineFor(state.ft, state.sp);
      PRESET_KEYS.forEach(function (k) { state[k] = next[k]; });
      baseline = next;
      writeFields();
      render();
      toast('Zeiten auf ' + FP.PRESET_LABEL[state.ft] + ' zurückgesetzt');
    });

    $('btnReset').addEventListener('click', function () {
      if (!confirm('Alle Eingaben verwerfen?')) return;
      state = FP.withDefaults({});
      try { state.dtz = state.atz = Intl.DateTimeFormat().resolvedOptions().timeZone || state.dtz; } catch (e) {}
      baseline = FP.baselineFor(state.ft, state.sp);
      selected = null;
      ['dtz', 'atz'].forEach(function (k) { if (els[k]) ensureTzOption(els[k], state[k]); });
      writeFields();
      try { localStorage.removeItem('flug.state'); } catch (e) {}
      render();
    });

    var ex = document.createElement('button');
    ex.type = 'button';
    ex.className = 'btn ghost small';
    ex.textContent = 'Beispiel laden';
    ex.style.marginTop = '14px';
    ex.addEventListener('click', example);
    $('calEmpty').appendChild(document.createElement('br'));
    $('calEmpty').appendChild(ex);

    window.addEventListener('hashchange', function () {
      var st = loadFromUrl();
      if (!st) return;
      if (FP.encodeState(st) === FP.encodeState(state)) return;
      state = st;
      baseline = FP.baselineFor(state.ft, state.sp);
      ['dtz', 'atz'].forEach(function (k) { if (els[k]) ensureTzOption(els[k], state[k]); });
      writeFields();
      render();
    });

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
