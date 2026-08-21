/* Flugvorbereitung → .ics  ·  bartnick.eu/flug
 *
 * Reines Vanilla-JS, kein Build, keine Abhängigkeiten, keine Server.
 * Der komplette Fragebogen-State steckt im URL-Fragment (#s=...), damit
 * jeder erzeugte Termin einen Deep-Link zurück in das Formular tragen kann.
 *
 * Zeitrechnung: Eingaben sind Ortszeiten (IANA-Zeitzone). Intern wird alles
 * nach UTC gerechnet und im ICS als UTC (…Z) ausgegeben — so braucht die
 * Datei keine VTIMEZONE-Blöcke und zeigt in jedem Kalender die richtige Zeit.
 */
var FlugPlan = (function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Flughäfen (Vorschlagsdaten für Autovervollständigung + Zeitzone)
   * Format: "IATA|Name|IANA-Zeitzone"
   * ------------------------------------------------------------------ */
  var AIRPORTS = ('' +
    'FRA|Frankfurt|Europe/Berlin;MUC|München|Europe/Berlin;DUS|Düsseldorf|Europe/Berlin;' +
    'BER|Berlin Brandenburg|Europe/Berlin;HAM|Hamburg|Europe/Berlin;CGN|Köln/Bonn|Europe/Berlin;' +
    'STR|Stuttgart|Europe/Berlin;HAJ|Hannover|Europe/Berlin;NUE|Nürnberg|Europe/Berlin;' +
    'LEJ|Leipzig/Halle|Europe/Berlin;BRE|Bremen|Europe/Berlin;DTM|Dortmund|Europe/Berlin;' +
    'FMO|Münster/Osnabrück|Europe/Berlin;FKB|Karlsruhe/Baden-Baden|Europe/Berlin;' +
    'PAD|Paderborn/Lippstadt|Europe/Berlin;SCN|Saarbrücken|Europe/Berlin;FDH|Friedrichshafen|Europe/Berlin;' +
    'DRS|Dresden|Europe/Berlin;ERF|Erfurt/Weimar|Europe/Berlin;NRN|Weeze|Europe/Berlin;' +
    'VIE|Wien|Europe/Vienna;SZG|Salzburg|Europe/Vienna;INN|Innsbruck|Europe/Vienna;' +
    'GRZ|Graz|Europe/Vienna;LNZ|Linz|Europe/Vienna;KLU|Klagenfurt|Europe/Vienna;' +
    'ZRH|Zürich|Europe/Zurich;GVA|Genf|Europe/Zurich;BSL|Basel-Mulhouse|Europe/Zurich;' +
    'BRN|Bern|Europe/Zurich;LUG|Lugano|Europe/Zurich;' +
    'AMS|Amsterdam Schiphol|Europe/Amsterdam;EIN|Eindhoven|Europe/Amsterdam;RTM|Rotterdam|Europe/Amsterdam;' +
    'MST|Maastricht|Europe/Amsterdam;BRU|Brüssel|Europe/Brussels;CRL|Brüssel-Charleroi|Europe/Brussels;' +
    'ANR|Antwerpen|Europe/Brussels;LGG|Lüttich|Europe/Brussels;OST|Ostende|Europe/Brussels;' +
    'LUX|Luxemburg|Europe/Luxembourg;' +
    'LHR|London Heathrow|Europe/London;LGW|London Gatwick|Europe/London;STN|London Stansted|Europe/London;' +
    'LTN|London Luton|Europe/London;LCY|London City|Europe/London;MAN|Manchester|Europe/London;' +
    'BHX|Birmingham|Europe/London;EDI|Edinburgh|Europe/London;GLA|Glasgow|Europe/London;' +
    'BRS|Bristol|Europe/London;NCL|Newcastle|Europe/London;LPL|Liverpool|Europe/London;' +
    'BFS|Belfast|Europe/London;DUB|Dublin|Europe/Dublin;ORK|Cork|Europe/Dublin;SNN|Shannon|Europe/Dublin;' +
    'CDG|Paris Charles de Gaulle|Europe/Paris;ORY|Paris Orly|Europe/Paris;BVA|Paris Beauvais|Europe/Paris;' +
    'NCE|Nizza|Europe/Paris;LYS|Lyon|Europe/Paris;MRS|Marseille|Europe/Paris;TLS|Toulouse|Europe/Paris;' +
    'BOD|Bordeaux|Europe/Paris;NTE|Nantes|Europe/Paris;MPL|Montpellier|Europe/Paris;' +
    'SXB|Straßburg|Europe/Paris;LIL|Lille|Europe/Paris;AJA|Ajaccio|Europe/Paris;BIA|Bastia|Europe/Paris;' +
    'MAD|Madrid Barajas|Europe/Madrid;BCN|Barcelona|Europe/Madrid;AGP|Málaga|Europe/Madrid;' +
    'ALC|Alicante|Europe/Madrid;VLC|Valencia|Europe/Madrid;PMI|Palma de Mallorca|Europe/Madrid;' +
    'IBZ|Ibiza|Europe/Madrid;MAH|Menorca|Europe/Madrid;SVQ|Sevilla|Europe/Madrid;BIO|Bilbao|Europe/Madrid;' +
    'SCQ|Santiago de Compostela|Europe/Madrid;' +
    'TFS|Teneriffa Süd|Atlantic/Canary;TFN|Teneriffa Nord|Atlantic/Canary;LPA|Gran Canaria|Atlantic/Canary;' +
    'ACE|Lanzarote|Atlantic/Canary;FUE|Fuerteventura|Atlantic/Canary;SPC|La Palma|Atlantic/Canary;' +
    'LIS|Lissabon|Europe/Lisbon;OPO|Porto|Europe/Lisbon;FAO|Faro|Europe/Lisbon;' +
    'FNC|Madeira|Atlantic/Madeira;PDL|Ponta Delgada|Atlantic/Azores;' +
    'FCO|Rom Fiumicino|Europe/Rome;CIA|Rom Ciampino|Europe/Rome;MXP|Mailand Malpensa|Europe/Rome;' +
    'LIN|Mailand Linate|Europe/Rome;BGY|Bergamo|Europe/Rome;VCE|Venedig|Europe/Rome;TSF|Treviso|Europe/Rome;' +
    'NAP|Neapel|Europe/Rome;BLQ|Bologna|Europe/Rome;FLR|Florenz|Europe/Rome;PSA|Pisa|Europe/Rome;' +
    'TRN|Turin|Europe/Rome;CTA|Catania|Europe/Rome;PMO|Palermo|Europe/Rome;CAG|Cagliari|Europe/Rome;' +
    'OLB|Olbia|Europe/Rome;BRI|Bari|Europe/Rome;VRN|Verona|Europe/Rome;GOA|Genua|Europe/Rome;' +
    'CPH|Kopenhagen|Europe/Copenhagen;BLL|Billund|Europe/Copenhagen;AAL|Aalborg|Europe/Copenhagen;' +
    'ARN|Stockholm Arlanda|Europe/Stockholm;NYO|Stockholm Skavsta|Europe/Stockholm;' +
    'GOT|Göteborg|Europe/Stockholm;MMX|Malmö|Europe/Stockholm;' +
    'OSL|Oslo Gardermoen|Europe/Oslo;TRF|Oslo Torp|Europe/Oslo;BGO|Bergen|Europe/Oslo;' +
    'TRD|Trondheim|Europe/Oslo;SVG|Stavanger|Europe/Oslo;' +
    'HEL|Helsinki|Europe/Helsinki;TMP|Tampere|Europe/Helsinki;KEF|Reykjavík Keflavík|Atlantic/Reykjavik;' +
    'WAW|Warschau Chopin|Europe/Warsaw;WMI|Warschau Modlin|Europe/Warsaw;KRK|Krakau|Europe/Warsaw;' +
    'GDN|Danzig|Europe/Warsaw;WRO|Breslau|Europe/Warsaw;POZ|Posen|Europe/Warsaw;KTW|Kattowitz|Europe/Warsaw;' +
    'PRG|Prag|Europe/Prague;BUD|Budapest|Europe/Budapest;BTS|Bratislava|Europe/Bratislava;' +
    'OTP|Bukarest|Europe/Bucharest;SOF|Sofia|Europe/Sofia;VAR|Varna|Europe/Sofia;BOJ|Burgas|Europe/Sofia;' +
    'ZAG|Zagreb|Europe/Zagreb;SPU|Split|Europe/Zagreb;DBV|Dubrovnik|Europe/Zagreb;ZAD|Zadar|Europe/Zagreb;' +
    'RJK|Rijeka|Europe/Zagreb;LJU|Ljubljana|Europe/Ljubljana;BEG|Belgrad|Europe/Belgrade;' +
    'SJJ|Sarajevo|Europe/Sarajevo;TIA|Tirana|Europe/Tirane;SKP|Skopje|Europe/Skopje;' +
    'TLL|Tallinn|Europe/Tallinn;RIX|Riga|Europe/Riga;VNO|Vilnius|Europe/Vilnius;' +
    'ATH|Athen|Europe/Athens;SKG|Thessaloniki|Europe/Athens;HER|Heraklion|Europe/Athens;' +
    'CHQ|Chania|Europe/Athens;RHO|Rhodos|Europe/Athens;JTR|Santorin|Europe/Athens;JMK|Mykonos|Europe/Athens;' +
    'CFU|Korfu|Europe/Athens;KGS|Kos|Europe/Athens;ZTH|Zakynthos|Europe/Athens;' +
    'LCA|Larnaka|Asia/Nicosia;PFO|Paphos|Asia/Nicosia;MLA|Malta|Europe/Malta;' +
    'IST|Istanbul|Europe/Istanbul;SAW|Istanbul Sabiha Gökçen|Europe/Istanbul;AYT|Antalya|Europe/Istanbul;' +
    'ADB|Izmir|Europe/Istanbul;ESB|Ankara|Europe/Istanbul;DLM|Dalaman|Europe/Istanbul;BJV|Bodrum|Europe/Istanbul;' +
    'CAI|Kairo|Africa/Cairo;HRG|Hurghada|Africa/Cairo;SSH|Sharm El Sheikh|Africa/Cairo;' +
    'RAK|Marrakesch|Africa/Casablanca;CMN|Casablanca|Africa/Casablanca;AGA|Agadir|Africa/Casablanca;' +
    'TUN|Tunis|Africa/Tunis;DJE|Djerba|Africa/Tunis;' +
    'JNB|Johannesburg|Africa/Johannesburg;CPT|Kapstadt|Africa/Johannesburg;NBO|Nairobi|Africa/Nairobi;' +
    'DXB|Dubai|Asia/Dubai;AUH|Abu Dhabi|Asia/Dubai;DOH|Doha|Asia/Qatar;TLV|Tel Aviv|Asia/Jerusalem;' +
    'AMM|Amman|Asia/Amman;RUH|Riad|Asia/Riyadh;JED|Dschidda|Asia/Riyadh;' +
    'MRU|Mauritius|Indian/Mauritius;SEZ|Seychellen|Indian/Mahe;MLE|Malé|Indian/Maldives;' +
    'SIN|Singapur|Asia/Singapore;BKK|Bangkok Suvarnabhumi|Asia/Bangkok;DMK|Bangkok Don Mueang|Asia/Bangkok;' +
    'HKT|Phuket|Asia/Bangkok;HKG|Hongkong|Asia/Hong_Kong;NRT|Tokio Narita|Asia/Tokyo;' +
    'HND|Tokio Haneda|Asia/Tokyo;KIX|Osaka Kansai|Asia/Tokyo;ICN|Seoul Incheon|Asia/Seoul;' +
    'PEK|Peking Capital|Asia/Shanghai;PKX|Peking Daxing|Asia/Shanghai;PVG|Shanghai Pudong|Asia/Shanghai;' +
    'CAN|Guangzhou|Asia/Shanghai;TPE|Taipeh|Asia/Taipei;KUL|Kuala Lumpur|Asia/Kuala_Lumpur;' +
    'CGK|Jakarta|Asia/Jakarta;DPS|Bali Denpasar|Asia/Makassar;MNL|Manila|Asia/Manila;' +
    'DEL|Delhi|Asia/Kolkata;BOM|Mumbai|Asia/Kolkata;CMB|Colombo|Asia/Colombo;' +
    'SGN|Ho-Chi-Minh-Stadt|Asia/Ho_Chi_Minh;HAN|Hanoi|Asia/Ho_Chi_Minh;' +
    'JFK|New York JFK|America/New_York;EWR|Newark|America/New_York;LGA|New York LaGuardia|America/New_York;' +
    'BOS|Boston|America/New_York;PHL|Philadelphia|America/New_York;IAD|Washington Dulles|America/New_York;' +
    'DCA|Washington Reagan|America/New_York;BWI|Baltimore|America/New_York;ATL|Atlanta|America/New_York;' +
    'MIA|Miami|America/New_York;FLL|Fort Lauderdale|America/New_York;MCO|Orlando|America/New_York;' +
    'TPA|Tampa|America/New_York;CLT|Charlotte|America/New_York;DTW|Detroit|America/New_York;' +
    'ORD|Chicago O\u2019Hare|America/Chicago;MDW|Chicago Midway|America/Chicago;' +
    'MSP|Minneapolis|America/Chicago;STL|St. Louis|America/Chicago;IAH|Houston|America/Chicago;' +
    'DFW|Dallas/Fort Worth|America/Chicago;AUS|Austin|America/Chicago;' +
    'DEN|Denver|America/Denver;SLC|Salt Lake City|America/Denver;PHX|Phoenix|America/Phoenix;' +
    'LAS|Las Vegas|America/Los_Angeles;LAX|Los Angeles|America/Los_Angeles;' +
    'SFO|San Francisco|America/Los_Angeles;SJC|San José|America/Los_Angeles;OAK|Oakland|America/Los_Angeles;' +
    'SAN|San Diego|America/Los_Angeles;SEA|Seattle|America/Los_Angeles;PDX|Portland|America/Los_Angeles;' +
    'HNL|Honolulu|Pacific/Honolulu;ANC|Anchorage|America/Anchorage;' +
    'YYZ|Toronto|America/Toronto;YUL|Montreal|America/Toronto;YOW|Ottawa|America/Toronto;' +
    'YVR|Vancouver|America/Vancouver;YYC|Calgary|America/Edmonton;YEG|Edmonton|America/Edmonton;' +
    'YHZ|Halifax|America/Halifax;' +
    'MEX|Mexiko-Stadt|America/Mexico_City;CUN|Cancún|America/Cancun;GDL|Guadalajara|America/Mexico_City;' +
    'GRU|São Paulo|America/Sao_Paulo;GIG|Rio de Janeiro|America/Sao_Paulo;BSB|Brasília|America/Sao_Paulo;' +
    'EZE|Buenos Aires Ezeiza|America/Argentina/Buenos_Aires;AEP|Buenos Aires Aeroparque|America/Argentina/Buenos_Aires;' +
    'SCL|Santiago de Chile|America/Santiago;LIM|Lima|America/Lima;BOG|Bogotá|America/Bogota;' +
    'UIO|Quito|America/Guayaquil;PTY|Panama-Stadt|America/Panama;HAV|Havanna|America/Havana;' +
    'PUJ|Punta Cana|America/Santo_Domingo;SDQ|Santo Domingo|America/Santo_Domingo;' +
    'MBJ|Montego Bay|America/Jamaica;BGI|Barbados|America/Barbados;CUR|Curaçao|America/Curacao;' +
    'SJU|San Juan|America/Puerto_Rico;NAS|Nassau|America/Nassau;' +
    'SYD|Sydney|Australia/Sydney;MEL|Melbourne|Australia/Melbourne;BNE|Brisbane|Australia/Brisbane;' +
    'CNS|Cairns|Australia/Brisbane;PER|Perth|Australia/Perth;ADL|Adelaide|Australia/Adelaide;' +
    'AKL|Auckland|Pacific/Auckland;CHC|Christchurch|Pacific/Auckland;NAN|Nadi|Pacific/Fiji'
  ).split(';').map(function (row) {
    var p = row.split('|');
    return { iata: p[0], name: p[1], tz: p[2] };
  });

  var AIRPORT_BY_IATA = {};
  AIRPORTS.forEach(function (a) { AIRPORT_BY_IATA[a.iata] = a; });

  /* ------------------------------------------------------------------ *
   * Zeitzonen-Mathematik
   * ------------------------------------------------------------------ */
  var _dtfCache = {};
  function partsFormatter(tz) {
    if (!_dtfCache[tz]) {
      _dtfCache[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
    return _dtfCache[tz];
  }

  /** UTC-Offset (Minuten) der Zone tz zum Zeitpunkt utcMs. */
  function tzOffsetMinutes(utcMs, tz) {
    var p = {};
    partsFormatter(tz).formatToParts(new Date(utcMs)).forEach(function (x) { p[x.type] = x.value; });
    var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return (asUTC - utcMs) / 60000;
  }

  /** Ortszeit in einer IANA-Zone → UTC-Timestamp (ms). */
  function zonedToUtc(y, m, d, hh, mm, tz) {
    var naive = Date.UTC(y, m - 1, d, hh, mm, 0);
    var ts = naive - tzOffsetMinutes(naive, tz) * 60000;
    // Zweiter Durchlauf fängt DST-Sprünge am Eingabetag ab.
    return naive - tzOffsetMinutes(ts, tz) * 60000;
  }

  /** "2026-09-12" + "13:10" + Zone → UTC-Timestamp, oder null. */
  function parseLocal(dateStr, timeStr, tz, dayShift) {
    if (!dateStr || !timeStr) return null;
    var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    var t = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
    if (!d || !t) return null;
    return zonedToUtc(+d[1], +d[2], +d[3] + (dayShift || 0), +t[1], +t[2], tz);
  }

  function fmtTime(ts, tz) {
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: tz, hour: '2-digit', minute: '2-digit'
    }).format(new Date(ts));
  }
  function fmtDate(ts, tz) {
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: tz, weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date(ts));
  }
  function fmtDateShort(ts, tz) {
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: tz, day: '2-digit', month: '2-digit'
    }).format(new Date(ts));
  }
  function fmtDuration(ms) {
    var min = Math.round(ms / 60000);
    var h = Math.floor(min / 60), m = min % 60;
    if (h && m) return h + ' h ' + m + ' min';
    if (h) return h + ' h';
    return m + ' min';
  }

  /* ------------------------------------------------------------------ *
   * State-Schema — kurze Keys, damit der Deep-Link kurz bleibt.
   * ------------------------------------------------------------------ */
  var DEFAULTS = {
    // Flug
    fn: '', dp: '', dtz: 'Europe/Berlin', ar: '', atz: 'Europe/Berlin',
    dd: '', dt: '', at: '', ft: 'schengen', sp: 'normal',
    // Reiseprofil
    bg: 1, oc: 0, pr: 0, kd: 0,
    // Anreise
    tm: 'car', tmin: 45, tdep: '', pk: 20, hm: '',
    // Flughafen-Zeiten (aus dem Flugtyp vorbelegt, überschreibbar)
    se: 30, gw: 15, bd: 25, bl: 40, gc: 15, bc: 45, bf: 30,
    // Vorbereitung
    edoc: 1, edocd: 3, epack: 1, epackt: '19:00', epackm: 90, eoci: 1,
    // Erinnerungen (Minuten vorher, -1 = aus)
    alTravel: 30, alGen: 15,
    // Rückflug
    rt: 0, rfn: '', rdd: '', rdt: '', rat: '', rtmin: 60, rtm: 'taxi',
    rtdep: '', rpk: 0, rhm: ''
  };

  var PRESETS = {
    schengen: { se: 30, gw: 15, bd: 25, bl: 40, gc: 15, bc: 45, bf: 30 },
    intl:     { se: 40, gw: 20, bd: 30, bl: 45, gc: 20, bc: 60, bf: 40 },
    long:     { se: 45, gw: 25, bd: 35, bl: 50, gc: 20, bc: 75, bf: 40 }
  };
  /* Wie knapp willst du da sein? Wirkt auf den Puffer vor dem Gate. */
  var SPEEDS = {
    tight:   { bf: 10, label: 'Auf Kante', hint: 'Nur 10 min Reserve — nichts darf schiefgehen.' },
    normal:  { bf: null, label: 'Normal', hint: 'Puffer laut Flugtyp — der übliche Kompromiss.' },
    relaxed: { bf: 30, label: 'Entspannt', hint: 'Eine halbe Stunde extra: Kaffee, Duty-Free, Verspätungen.' }
  };
  var PRESET_LABEL = {
    schengen: 'Inland / Schengen',
    intl: 'International (außerhalb Schengen)',
    long: 'Interkontinental / Langstrecke'
  };
  var MODE_LABEL = {
    car: 'Auto', taxi: 'Taxi / Fahrdienst', transit: 'ÖPNV / Bahn',
    walk: 'zu Fuß / Fahrrad', other: 'Transfer'
  };

  /** Basiswerte für einen Flugtyp: Defaults + Preset der Flughafen-Zeiten. */
  function baselineFor(ft, sp) {
    var b = {}, k;
    for (k in DEFAULTS) b[k] = DEFAULTS[k];
    var p = PRESETS[ft] || PRESETS.schengen;
    for (k in p) b[k] = p[k];
    var speed = SPEEDS[sp] || SPEEDS.normal;
    if (speed.bf !== null && speed.bf !== undefined) {
      b.bf = (sp === 'relaxed') ? p.bf + speed.bf : speed.bf;
    }
    return b;
  }

  /**
   * Fehlende Felder auffüllen. Die Flughafen-Zeiten (se/gw/bd/bl/gc/bc/bf) kommen
   * aus dem Preset des Flugtyps, sofern der State sie nicht ausdrücklich setzt —
   * so liefert auch ein Deep-Link, der nur `ft` enthält, die richtigen Zeiten.
   */
  function withDefaults(state) {
    var st = state || {};
    var s = baselineFor(st.ft || DEFAULTS.ft, st.sp || DEFAULTS.sp);
    for (var j in st) {
      if (j in DEFAULTS && st[j] !== undefined && st[j] !== null && st[j] !== '') s[j] = st[j];
    }
    // Leere Strings für Textfelder bleiben erlaubt.
    for (var t in st) if (t in DEFAULTS && typeof DEFAULTS[t] === 'string' && st[t] === '') s[t] = '';
    return s;
  }

  /* ------------------------------------------------------------------ *
   * Deep-Link-Kodierung: nur Abweichungen vom Default, base64url im Fragment
   * ------------------------------------------------------------------ */
  function b64urlEncode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(s) {
    var b = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var bin = atob(b), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encodeState(state) {
    var base = baselineFor(state && state.ft ? state.ft : DEFAULTS.ft,
                           state && state.sp ? state.sp : DEFAULTS.sp);
    var diff = {};
    for (var k in DEFAULTS) {
      if (state[k] !== undefined && state[k] !== base[k] && state[k] !== '') diff[k] = state[k];
    }
    return b64urlEncode(JSON.stringify(diff));
  }
  function decodeState(payload) {
    try { return withDefaults(JSON.parse(b64urlDecode(payload))); }
    catch (e) { return null; }
  }

  /* ------------------------------------------------------------------ *
   * Planung: rückwärts vom planmäßigen Abflug (STD)
   * ------------------------------------------------------------------ */
  function airportLabel(raw) {
    var m = /^([A-Za-z]{3})\b/.exec((raw || '').trim());
    if (m) {
      var a = AIRPORT_BY_IATA[m[1].toUpperCase()];
      if (a) return a.name + ' (' + a.iata + ')';
    }
    return (raw || '').trim();
  }

  var MIN = 60000;

  /**
   * Baut die Terminkette für einen Flugabschnitt.
   * leg = { key, label, flightNo, from, to, tz, arrTz, std, sta,
   *         travelMin, travelMode, fixedDep, parkMin, origin }
   */
  function buildLeg(s, leg, warn) {
    var ev = [];
    var std = leg.std;
    var isReturn = leg.key === 'r';
    var secMin = Math.max(10, s.se + (s.kd ? 10 : 0) - (s.pr ? 10 : 0));

    var gateClose = std - s.gc * MIN;
    var boardStart = std - s.bl * MIN;
    var securityEnd = boardStart - s.gw * MIN - s.bf * MIN;
    var securityStart = securityEnd - secMin * MIN;

    var bagStart = null, bagEnd = null, bagClose = std - s.bc * MIN;
    var terminalIn = securityStart;
    if (s.bg) {
      bagEnd = Math.min(securityStart, bagClose);
      bagStart = bagEnd - s.bd * MIN;
      terminalIn = bagStart;
    }

    var parkMin = leg.parkMin || 0;
    var parkStart = terminalIn - parkMin * MIN;
    var travelEnd = parkStart;
    var travelStart = travelEnd - leg.travelMin * MIN;
    var slack = 0;

    if (leg.fixedDep) {
      // Feste Abfahrt (z. B. gebuchter Zug). Normalfall ist der Flugtag selbst;
      // der Vortag kommt nur bei einem frühen Flug in Frage — und auch nur, wenn
      // die Wartezeit halbwegs plausibel bleibt (Nachtzug, nicht 22 Stunden).
      var sameDay = parseLocal(leg.depDate, leg.fixedDep, leg.tz, 0);
      var prevDay = parseLocal(leg.depDate, leg.fixedDep, leg.tz, -1);
      var chosen = sameDay;
      if (sameDay !== null && sameDay + leg.travelMin * MIN > parkStart &&
          prevDay !== null && parkStart - (prevDay + leg.travelMin * MIN) <= 12 * 60 * MIN) {
        chosen = prevDay;
      }
      if (chosen === null) chosen = sameDay || prevDay;
      travelStart = chosen;
      travelEnd = travelStart + leg.travelMin * MIN;
      slack = parkStart - travelEnd;
      if (slack < 0) {
        warn.push('Abfahrt um ' + leg.fixedDep + ' ist ' + fmtDuration(-slack) +
          ' zu spät für den geplanten Ablauf' + (isReturn ? ' (Rückflug)' : '') +
          ' — früher losfahren oder Puffer kürzen.');
      } else if (slack > 45 * MIN) {
        warn.push('Mit der Abfahrt um ' + leg.fixedDep + ' bist du ' + fmtDuration(slack) +
          ' früher am Flughafen als nötig' + (isReturn ? ' (Rückflug)' : '') + ' — eingeplant als Wartezeit.');
      }
      parkStart = travelEnd + Math.max(0, slack);
    }

    var deep = leg.deepLink;
    function why(text) { return text; }
    function desc(lines) {
      var out = lines.filter(function (l) { return l !== null && l !== undefined && l !== false; }).join('\n');
      if (deep) out += '\n\nPlan ändern / neu erzeugen:\n' + deep;
      return out;
    }

    var route = leg.from + ' → ' + leg.to;
    var fno = leg.flightNo ? leg.flightNo : route;
    var pre = isReturn ? 'Rückflug' : 'Hinflug';

    // --- Vorbereitung -------------------------------------------------
    if (!isReturn && s.edoc) {
      var docStart = parseLocal(leg.depDate, '19:00', leg.tz, -Math.max(1, s.edocd));
      if (docStart !== null) ev.push({
        key: 'docs', start: docStart, end: docStart + 20 * MIN, tz: leg.tz,
        title: 'Reisecheck: Dokumente & Buchung — ' + route,
        location: '', alarm: 0,
        desc: desc([
          'Warum jetzt: ' + Math.max(1, s.edocd) + ' Tage vor Abflug bleibt noch Zeit, wenn etwas fehlt.',
          '',
          'Checkliste:',
          '· Ausweis/Reisepass gültig (viele Ziele: 6 Monate über das Reisedatum hinaus)',
          '· Visum / Einreiseformular / ESTA nötig?',
          '· Buchungsbestätigung + Sitzplatz + Gepäck gebucht?',
          '· Reiseversicherung, Impf-/Gesundheitsnachweise',
          '· Mietwagen, Transfer, erste Unterkunft bestätigt?',
          leg.flightNo ? '· Flugstatus prüfen: ' + leg.flightNo : null
        ])
      });
    }

    if (s.epack) {
      var packShift = -1;
      var packStart = parseLocal(leg.depDate, s.epackt || '19:00', leg.tz, packShift);
      // Wenn die Anreise schon am Vorabend startet, einen Tag weiter nach vorne.
      while (packStart !== null && packStart + (s.epackm * MIN) > travelStart && packShift > -4) {
        packShift--;
        packStart = parseLocal(leg.depDate, s.epackt || '19:00', leg.tz, packShift);
      }
      if (packStart !== null) ev.push({
        key: 'pack', start: packStart, end: packStart + Math.max(15, s.epackm) * MIN, tz: leg.tz,
        title: (isReturn ? 'Rückreise packen' : 'Koffer packen') + ' — ' + route,
        location: leg.origin || '', alarm: 30,
        desc: desc([
          'Warum jetzt: am Abflugtag ist dafür keine Zeit — Abfahrt ist um ' +
            fmtTime(travelStart, leg.tz) + '.',
          '',
          s.bg ? '· Aufgabegepäck: Gewichtslimit prüfen, Kofferwaage' : '· Nur Handgepäck: Maße & Gewicht der Airline prüfen',
          '· Flüssigkeiten ≤ 100 ml in den 1-Liter-Beutel (Handgepäck)',
          '· Powerbank, E-Zigarette, Ersatzakkus → immer ins Handgepäck',
          '· Medikamente, Ladekabel, Kopfhörer, Adapter griffbereit',
          '· Wertsachen und Dokumente nicht in den aufgegebenen Koffer',
          s.bg ? '· Kofferschloss & Adressanhänger' : null
        ])
      });
    }

    if (!s.oc && s.eoci) {
      var ociStart = std - 24 * 60 * MIN;
      ev.push({
        key: 'oci', start: ociStart, end: ociStart + 15 * MIN, tz: leg.tz,
        title: 'Online-Check-in ' + (leg.flightNo ? leg.flightNo : route), location: '', alarm: 0,
        desc: desc([
          'Warum jetzt: der Check-in öffnet bei den meisten Airlines 24 h vor Abflug — früh = freie Sitzplatzwahl.',
          '',
          '· Bordkarte ins Handy-Wallet legen (offline verfügbar!)',
          '· Sitzplatz prüfen',
          s.bg ? '· Aufgabegepäck trotzdem am Schalter/Bag-Drop abgeben' : '· Kein Aufgabegepäck — direkt zur Sicherheitskontrolle',
          '· Bordkarte zusätzlich als PDF/Screenshot speichern'
        ])
      });
    }

    // --- Abflugtag ----------------------------------------------------
    var travelTitle = (isReturn ? 'Rückreise: ' : '') + 'Anreise ' + leg.from +
      ' (' + (MODE_LABEL[leg.travelMode] || 'Transfer') + ')';
    ev.push({
      key: 'travel', start: travelStart, end: travelEnd, tz: leg.tz,
      title: travelTitle, location: leg.origin || '', alarm: s.alTravel,
      desc: desc([
        'Warum jetzt: ' + fmtDuration(leg.travelMin * MIN) + ' Fahrtzeit, damit du um ' +
          fmtTime(terminalIn, leg.tz) + ' im Terminal stehst.',
        'Ziel: ' + leg.from + ' · Abflug ' + (leg.flightNo ? leg.flightNo + ' ' : '') +
          'um ' + fmtTime(std, leg.tz) + ' Uhr.',
        leg.fixedDep ? 'Feste Abfahrt: ' + leg.fixedDep + ' Uhr.' : null,
        slack > 0 ? 'Reserve nach Ankunft: ' + fmtDuration(slack) + '.' : null,
        '',
        leg.travelMode === 'car' ? '· Tank/Ladung, Verkehrslage, Parkplatz reserviert?' : null,
        leg.travelMode === 'transit' ? '· Verbindung + Alternative im Blick, Ticket geladen' : null,
        leg.travelMode === 'taxi' ? '· Taxi/Fahrdienst vorbestellt' : null,
        '· Vor dem Losfahren: Ausweis, Bordkarte, Geldbeutel, Schlüssel, Ladegerät'
      ])
    });

    if (parkMin > 0) {
      ev.push({
        key: 'park', start: parkStart, end: parkStart + parkMin * MIN, tz: leg.tz,
        title: 'Parken & Weg zum Terminal — ' + leg.from, location: leg.from, alarm: -1,
        desc: desc([
          'Warum: Parkplatz suchen, Shuttle abwarten und zum Terminal laufen dauert erfahrungsgemäß ' +
            parkMin + ' min.',
          '· Parkdeck/Reihe fotografieren',
          '· Parkticket ins Handgepäck'
        ])
      });
    }

    if (s.bg) {
      ev.push({
        key: 'bagdrop', start: bagStart, end: bagEnd, tz: leg.tz,
        title: (s.oc ? 'Gepäckabgabe (Bag Drop)' : 'Check-in & Gepäckabgabe') +
          (leg.flightNo ? ' — ' + leg.flightNo : ''),
        location: leg.from, alarm: s.alGen,
        desc: desc([
          'Warum jetzt: der Schalter schließt um ' + fmtTime(bagClose, leg.tz) + ' Uhr (' +
            s.bc + ' min vor Abflug). Eingeplant sind ' + s.bd + ' min für Schlange + Abgabe.',
          s.oc ? '· Online-Check-in ist erledigt → Bag-Drop-Schalter suchen' :
                 '· Check-in-Schalter der Airline suchen (Anzeigetafel)',
          '· Ausweis/Pass + Bordkarte bereithalten',
          '· Gewicht kontrollieren, Sperrgepäck ggf. am Sperrgepäckschalter',
          '· Gepäckabschnitt aufbewahren'
        ])
      });
    }

    ev.push({
      key: 'security', start: securityStart, end: securityEnd, tz: leg.tz,
      title: 'Sicherheitskontrolle' + (s.ft === 'long' || s.ft === 'intl' ? ' & Passkontrolle' : '') +
        ' — ' + leg.from,
      location: leg.from, alarm: s.alGen,
      desc: desc([
        'Warum ' + secMin + ' min: ' + s.se + ' min Basis für ' + PRESET_LABEL[s.ft] +
          (s.kd ? ' +10 min mit Kindern' : '') + (s.pr ? ' −10 min Fast Lane/Priority' : '') + '.',
        'Danach ' + s.gw + ' min Weg zum Gate und ' + s.bf + ' min Puffer bis zum Boarding.',
        '',
        '· Flüssigkeiten & Elektronik nach Vorgabe rausnehmen',
        '· Jacke, Gürtel, Uhr, Taschen leeren',
        s.pr ? '· Fast Lane / Priority Security nutzen' : null,
        (s.ft === 'long' || s.ft === 'intl') ? '· Passkontrolle einplanen (Ausreise)' : null
      ])
    });

    if (s.bf > 0) {
      ev.push({
        key: 'buffer', start: securityEnd, end: boardStart, tz: leg.tz,
        title: 'Puffer & Weg zum Gate — ' + leg.from, location: leg.from, alarm: -1,
        desc: desc([
          'Warum: ' + s.bf + ' min Reserve für Verspätungen, Gate-Wechsel, Kaffee, Wasser kaufen, Toilette.',
          'Danach ' + s.gw + ' min Fußweg zum Gate.',
          '· Gate auf der Anzeige prüfen (ändert sich oft!)',
          '· Wasserflasche nach der Kontrolle auffüllen/kaufen',
          '· Handy laden'
        ])
      });
    }

    ev.push({
      key: 'boarding', start: boardStart, end: gateClose, tz: leg.tz,
      title: 'Boarding ' + (leg.flightNo || route) + ' — Gate schließt ' + fmtTime(gateClose, leg.tz),
      location: leg.from, alarm: 10,
      desc: desc([
        'Warum: Boarding startet typischerweise ' + s.bl + ' min vor Abflug, das Gate schließt ' +
          s.gc + ' min vor Abflug (' + fmtTime(gateClose, leg.tz) + ' Uhr). Wer später kommt, fliegt nicht mit.',
        '· Am Gate sein, Bordkarte + Ausweis in der Hand',
        '· Handgepäck-Maße beachten, ggf. Gate-Abgabe'
      ])
    });

    var flightDesc = [
      'Abflug ' + fmtTime(std, leg.tz) + ' Uhr (' + leg.tz + ')',
      leg.sta ? 'Ankunft ' + fmtTime(leg.sta, leg.arrTz) + ' Uhr (' + leg.arrTz + ')' : null,
      leg.sta ? 'Flugzeit: ' + fmtDuration(leg.sta - std) : null,
      leg.flightNo ? 'Flug: ' + leg.flightNo : null
    ];
    ev.push({
      key: 'flight', start: std, end: leg.sta || (std + 2 * 60 * MIN), tz: leg.tz,
      tzEnd: leg.arrTz, estimated: !leg.sta,
      title: pre + (leg.flightNo ? ' ' + leg.flightNo : '') + ': ' + route,
      location: leg.from, alarm: -1, desc: desc(flightDesc)
    });

    // Legkennung an jedem Event: sie bildet zusammen mit dem key die stabile UID.
    ev.forEach(function (e) { e.leg = leg.key; });

    return { events: ev, travelStart: travelStart, terminalIn: terminalIn, gateClose: gateClose };
  }

  /**
   * computePlan(state) → { ok, events, warnings, summary }
   */
  function computePlan(input, deepLink) {
    var s = withDefaults(input);
    var warnings = [], events = [], summary = null;

    var std = parseLocal(s.dd, s.dt, s.dtz);
    if (std === null) {
      return { ok: false, events: [], warnings: ['Abflugdatum und Abflugzeit fehlen noch.'], summary: null };
    }

    var from = airportLabel(s.dp) || 'Abflughafen';
    var to = airportLabel(s.ar) || 'Ziel';

    var sta = null;
    if (s.at) {
      sta = parseLocal(s.dd, s.at, s.atz);
      if (sta !== null && sta <= std) sta = parseLocal(s.dd, s.at, s.atz, 1);
      if (sta !== null && sta - std > 22 * 60 * MIN) {
        warnings.push('Die berechnete Flugzeit ist über 22 Stunden — Ankunftszeit oder Ziel-Zeitzone prüfen.');
      }
    }

    if (!s.at) {
      warnings.push('Ohne Ankunftszeit wird der Flug mit 2 Stunden angesetzt — Ankunft eintragen für den echten Block.');
    }

    var out = buildLeg(s, {
      key: 'o', flightNo: (s.fn || '').trim(), from: from, to: to,
      tz: s.dtz, arrTz: s.atz, std: std, sta: sta, depDate: s.dd,
      travelMin: Math.max(0, +s.tmin || 0), travelMode: s.tm,
      fixedDep: s.tdep, parkMin: (s.tm === 'car' ? Math.max(0, +s.pk || 0) : 0),
      origin: s.hm, deepLink: deepLink
    }, warnings);
    events = events.concat(out.events);

    if (std < Date.now()) warnings.push('Das Abflugdatum liegt in der Vergangenheit.');
    var depHour = +new Intl.DateTimeFormat('en-GB', { timeZone: s.dtz, hour: '2-digit', hourCycle: 'h23' })
      .format(new Date(out.travelStart));
    if (depHour < 5) {
      warnings.push('Losfahren um ' + fmtTime(out.travelStart, s.dtz) +
        ' Uhr — bei so früher Abfahrt lohnt eine Hotelnacht am Flughafen oder ein vorbestelltes Taxi.');
    }

    if (s.rt) {
      var rstd = parseLocal(s.rdd, s.rdt, s.atz);
      if (rstd === null) {
        warnings.push('Rückflug ist aktiviert, aber Datum/Zeit fehlen — der Rückflug wurde nicht eingeplant.');
      } else {
        var rsta = null;
        if (s.rat) {
          rsta = parseLocal(s.rdd, s.rat, s.dtz);
          if (rsta !== null && rsta <= rstd) rsta = parseLocal(s.rdd, s.rat, s.dtz, 1);
        }
        if (rstd < std) warnings.push('Der Rückflug liegt vor dem Hinflug — Datum prüfen.');
        var ret = buildLeg(s, {
          key: 'r', flightNo: (s.rfn || '').trim(), from: to, to: from,
          tz: s.atz, arrTz: s.dtz, std: rstd, sta: rsta, depDate: s.rdd,
          travelMin: Math.max(0, +s.rtmin || 0), travelMode: s.rtm,
          fixedDep: s.rtdep, parkMin: (s.rtm === 'car' ? Math.max(0, +s.rpk || 0) : 0),
          origin: s.rhm, deepLink: deepLink
        }, warnings);
        events = events.concat(ret.events);
      }
    }

    events.sort(function (a, b) { return a.start - b.start; });

    summary = {
      std: std, sta: sta, tz: s.dtz, arrTz: s.atz, from: from, to: to,
      flightNo: (s.fn || '').trim(),
      travelStart: out.travelStart, terminalIn: out.terminalIn, gateClose: out.gateClose,
      doorToGate: std - out.travelStart,
      airportTime: std - out.terminalIn,
      count: events.length
    };

    return { ok: true, events: events, warnings: warnings, summary: summary };
  }

  /* ------------------------------------------------------------------ *
   * ICS
   * ------------------------------------------------------------------ */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function icsUtc(ts) {
    var d = new Date(ts);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }
  function esc(text) {
    return String(text == null ? '' : text)
      .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
      .replace(/\r\n|\n|\r/g, '\\n');
  }
  /** RFC 5545 Zeilenumbruch bei 75 Oktetts, ohne Multibyte-Zeichen zu zerschneiden. */
  function fold(line) {
    var enc = new TextEncoder();
    if (enc.encode(line).length <= 75) return line;
    var out = '', cur = '', bytes = 0, limit = 75;
    var chars = Array.from(line);
    for (var i = 0; i < chars.length; i++) {
      var b = enc.encode(chars[i]).length;
      if (bytes + b > limit) {
        out += (out ? '\r\n ' : '') + cur;
        cur = ''; bytes = 0; limit = 74; // Folgezeilen tragen ein führendes Leerzeichen
      }
      cur += chars[i]; bytes += b;
    }
    if (cur) out += (out ? '\r\n ' : '') + cur;
    return out;
  }
  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /**
   * buildICS(plan, opts) → String
   * opts: { tripId, sequence, deepLink, now }
   */
  function buildICS(plan, opts) {
    opts = opts || {};
    var now = opts.now || Date.now();
    var seq = opts.sequence || 0;
    var trip = opts.tripId || 'trip';
    var L = [];
    function push(line) { L.push(fold(line)); }

    push('BEGIN:VCALENDAR');
    push('VERSION:2.0');
    push('PRODID:-//bartnick.eu//Flugvorbereitung//DE');
    push('CALSCALE:GREGORIAN');
    push('METHOD:PUBLISH');
    push('X-WR-CALNAME:' + esc(opts.calName || 'Flugvorbereitung'));

    plan.events.forEach(function (e) {
      push('BEGIN:VEVENT');
      // Stabile UID: gleicher Flug + gleicher Termintyp = gleiche UID. Ein erneuter
      // Import mit höherer SEQUENCE aktualisiert damit den Termin, statt ihn zu doppeln.
      push('UID:' + trip + '-' + (e.leg || 'o') + '-' + e.key + '@bartnick.eu');
      push('DTSTAMP:' + icsUtc(now));
      push('SEQUENCE:' + seq);
      push('DTSTART:' + icsUtc(e.start));
      push('DTEND:' + icsUtc(e.end));
      push('SUMMARY:' + esc(e.title));
      push('DESCRIPTION:' + esc(e.desc));
      if (e.location) push('LOCATION:' + esc(e.location));
      if (opts.deepLink) push('URL:' + opts.deepLink);
      push('CATEGORIES:Reise');
      push('TRANSP:OPAQUE');
      push('STATUS:CONFIRMED');
      if (e.alarm !== undefined && e.alarm !== null && e.alarm >= 0) {
        push('BEGIN:VALARM');
        push('ACTION:DISPLAY');
        push('DESCRIPTION:' + esc(e.title));
        push('TRIGGER:' + (e.alarm === 0 ? '-PT0M' : '-PT' + e.alarm + 'M'));
        push('END:VALARM');
      }
      push('END:VEVENT');
    });

    push('END:VCALENDAR');
    return L.join('\r\n') + '\r\n';
  }

  function tripIdFor(state) {
    var s = withDefaults(state);
    return 'fp' + hash([s.fn, s.dd, s.dt, s.dp, s.ar, s.rdd, s.rdt].join('|'));
  }

  function fileNameFor(state) {
    var s = withDefaults(state);
    var base = (s.fn || (s.dp + '-' + s.ar) || 'flug').replace(/[^A-Za-z0-9_-]+/g, '');
    return ('flug-' + (base || 'plan') + '-' + (s.dd || '')).replace(/-+$/, '') + '.ics';
  }

  var api = {
    AIRPORTS: AIRPORTS, AIRPORT_BY_IATA: AIRPORT_BY_IATA,
    DEFAULTS: DEFAULTS, PRESETS: PRESETS, PRESET_LABEL: PRESET_LABEL, MODE_LABEL: MODE_LABEL,
    SPEEDS: SPEEDS, baselineFor: baselineFor,
    withDefaults: withDefaults, computePlan: computePlan, buildICS: buildICS,
    encodeState: encodeState, decodeState: decodeState,
    zonedToUtc: zonedToUtc, tzOffsetMinutes: tzOffsetMinutes, parseLocal: parseLocal,
    fmtTime: fmtTime, fmtDate: fmtDate, fmtDateShort: fmtDateShort, fmtDuration: fmtDuration,
    airportLabel: airportLabel, tripIdFor: tripIdFor, fileNameFor: fileNameFor, hash: hash
  };
  return api;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = FlugPlan;
