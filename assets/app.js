/* Brain Break Lab: one small script for every page.
   All content comes from activities.json and site-config.json.
   No frameworks, no build step, no external requests (except the
   embedded activities, and AdSense only if it is turned on). */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getJSON(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' returned ' + r.status);
      return r.json();
    });
  }

  // Storage can be blocked (private mode, school policies). Never let it break the page.
  var store = {
    get: function (key, fallback) {
      try {
        var v = window.localStorage.getItem(key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
    remove: function (key) {
      try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
  };

  var RECENT_KEY = 'bbl-recent';
  var RECENT_MAX = 6;

  function getRecent() {
    var v = store.get(RECENT_KEY, []);
    return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }) : [];
  }
  function addRecent(id) {
    var list = getRecent().filter(function (x) { return x !== id; });
    list.unshift(id);
    store.set(RECENT_KEY, list.slice(0, RECENT_MAX));
  }

  /* ---------- icons (inline SVG, no image requests) ---------- */
  var ICON = {
    computer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    tablet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    online: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    newtab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    keys: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>'
  };

  var DEVICE_NAMES = { computer: 'computer', tablet: 'tablet', phone: 'phone' };

  function listWords(arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  }

  function deviceIcons(a) {
    var devs = (a.devices || []).filter(function (d) { return DEVICE_NAMES[d]; });
    var label = 'Works on ' + listWords(devs.map(function (d) { return DEVICE_NAMES[d]; }));
    var html = '<span class="icons" role="img" aria-label="' + esc(label) + '" title="' + esc(label) + '">' +
      devs.map(function (d) { return ICON[d]; }).join('') + '</span>';
    var extra = '';
    if (a.needsSound) extra += '<span class="icons" role="img" aria-label="Needs sound" title="Needs sound or headphones"><span class="warn">' + ICON.sound + '</span></span>';
    if (a.hasOnline) extra += '<span class="icons" role="img" aria-label="Has online features" title="Has online features">' + ICON.online + '</span>';
    return html + extra;
  }

  function enabledOnly(list) {
    return (Array.isArray(list) ? list : []).filter(function (a) { return a && a.enabled === true; });
  }

  function showError(container, msg) {
    if (container) container.innerHTML = '<div class="empty"><p><strong>Something went wrong.</strong></p><p>' + esc(msg) + '</p></div>';
  }

  /* ---------- Home page ---------- */
  function initHome() {
    var grid = $('#grid'), chipsEl = $('#chips'), search = $('#search'), countEl = $('#count');
    var tabletBtn = $('#tablet-filter');
    // ./?tablet=1 (linked from the "use a computer" message) starts with the tablet filter on.
    var state = { q: '', cat: 'All', tablet: new URLSearchParams(location.search).get('tablet') === '1' };
    tabletBtn.setAttribute('aria-pressed', String(state.tablet));
    var all = [];

    getJSON('activities.json').then(function (data) {
      all = enabledOnly(data);
      buildChips();
      render();
      renderRecent();
    }).catch(function (e) { showError(grid, 'The list of activities could not be loaded. Try refreshing the page.'); console.warn(e); });

    getJSON('site-config.json').then(maybeLoadAds).catch(function () { /* ads stay off */ });

    function buildChips() {
      var cats = [];
      all.forEach(function (a) { if (cats.indexOf(a.category) === -1) cats.push(a.category); });
      cats.sort();
      chipsEl.innerHTML = ['All'].concat(cats).map(function (c) {
        return '<button type="button" class="chip" data-cat="' + esc(c) + '" aria-pressed="' + (c === state.cat) + '">' + esc(c) + '</button>';
      }).join('');
      chipsEl.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-cat]');
        if (!b) return;
        state.cat = b.getAttribute('data-cat');
        Array.prototype.forEach.call(chipsEl.querySelectorAll('button'), function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        render();
      });
    }

    tabletBtn.addEventListener('click', function () {
      state.tablet = !state.tablet;
      tabletBtn.setAttribute('aria-pressed', String(state.tablet));
      render();
    });

    search.addEventListener('input', function () { state.q = search.value.trim().toLowerCase(); render(); });

    function matches(a) {
      if (state.cat !== 'All' && a.category !== state.cat) return false;
      if (state.tablet && (a.devices || []).indexOf('tablet') === -1) return false;
      if (state.q) {
        var hay = (a.title + ' ' + a.description + ' ' + a.category).toLowerCase();
        if (hay.indexOf(state.q) === -1) return false;
      }
      return true;
    }

    function card(a) {
      return '<li class="card">' +
        '<div class="thumb"><img src="' + esc(a.thumbnail) + '" alt="' + esc('Screenshot of ' + a.title) + '" width="640" height="360" loading="lazy" decoding="async"></div>' +
        '<div class="card-body">' +
          '<div class="badges"><span class="badge" data-cat="' + esc(a.category) + '">' + esc(a.category) + '</span>' +
            (a.noTimer ? '<span class="badge badge-calm">No timer</span>' : '') + '</div>' +
          '<h3><a href="activity.html?id=' + encodeURIComponent(a.id) + '">' + esc(a.title) + '</a></h3>' +
          '<p>' + esc(a.description) + '</p>' +
          '<div class="card-meta"><div class="badges">' + deviceIcons(a) + '</div>' +
            '<span class="open-pill" aria-hidden="true">Open ' + ICON.arrow + '</span></div>' +
        '</div></li>';
    }

    function render() {
      var shown = all.filter(matches);
      grid.innerHTML = shown.map(card).join('');
      $('#empty').hidden = shown.length > 0;
      countEl.textContent = shown.length === 1 ? '1 activity' : shown.length + ' activities';
    }

    $('#clear-filters').addEventListener('click', function () {
      state.q = ''; search.value = ''; state.tablet = false; tabletBtn.setAttribute('aria-pressed', 'false');
      state.cat = 'All';
      Array.prototype.forEach.call(chipsEl.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-pressed', String(x.getAttribute('data-cat') === 'All'));
      });
      render();
      search.focus();
    });

    function renderRecent() {
      var section = $('#recent'), list = $('#recent-list');
      var byId = {};
      all.forEach(function (a) { byId[a.id] = a; });
      var items = getRecent().map(function (id) { return byId[id]; }).filter(Boolean);
      if (!items.length) { section.hidden = true; return; }
      list.innerHTML = items.map(function (a) {
        return '<li><a class="recent-item" href="activity.html?id=' + encodeURIComponent(a.id) + '">' +
          '<img src="' + esc(a.thumbnail) + '" alt="" width="640" height="360" loading="lazy" decoding="async"><span>' + esc(a.title) + '</span></a></li>';
      }).join('');
      section.hidden = false;
    }

    $('#recent-clear').addEventListener('click', function () {
      store.remove(RECENT_KEY);
      $('#recent').hidden = true;
      search.focus();
    });
  }

  /* ---------- Ads (off by default) ----------
     Only ever runs on the Home page, and only when site-config.json has
     ads.enabled === true and a client ID. Pupils are under 13, so requests are
     tagged as child-directed and non-personalised. One slot at most. */
  function maybeLoadAds(cfg) {
    var ads = cfg && cfg.ads;
    if (!ads || ads.enabled !== true || !/^ca-pub-\d+$/.test(ads.client || '')) return;
    var slot = $('#ad-slot');
    if (!slot) return;
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.requestNonPersonalizedAds = 1;
    window.adsbygoogle.push({ google_ad_client: ads.client, tag_for_child_directed_treatment: 1 });
    slot.innerHTML = '<div class="ad-label">Advertisement</div>' +
      '<ins class="adsbygoogle" style="display:block" data-ad-client="' + esc(ads.client) + '"' +
      (ads.slot ? ' data-ad-slot="' + esc(ads.slot) + '"' : '') +
      ' data-ad-format="auto" data-full-width-responsive="true" data-tag-for-child-directed-treatment="1"></ins>';
    slot.hidden = false;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ads.client);
    document.head.appendChild(s);
    window.adsbygoogle.push({});
  }

  /* ---------- Activity page ---------- */
  function isTouchOnly() {
    var fine = window.matchMedia && window.matchMedia('(any-pointer: fine)').matches;
    var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
    return touch && !fine;
  }

  function initActivity() {
    var root = $('#activity');
    var id = new URLSearchParams(location.search).get('id') || '';

    getJSON('activities.json').then(function (data) {
      var a = enabledOnly(data).filter(function (x) { return x.id === id; })[0];
      if (!a) {
        document.title = 'Activity not found · Brain Break Lab';
        root.innerHTML = '<div class="activity-top"><a class="btn btn-ghost" href="./">' + ICON.back + 'Back</a></div>' +
          '<div class="empty"><h1>That activity isn’t available</h1><p>It may have been switched off, or the link is wrong.</p><p><a class="btn" href="./">See all activities</a></p></div>';
        return;
      }
      render(a);
    }).catch(function (e) { showError(root, 'This activity could not be loaded. Try refreshing the page.'); console.warn(e); });

    function render(a) {
      document.title = a.title + ' · Brain Break Lab';
      var desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', a.description);
      addRecent(a.id);

      var blocked = a.pcOnly && isTouchOnly();
      var notes = [];
      if (a.pcOnly) notes.push(['computer', 'PC only: needs a keyboard and mouse.' + (a.controls.some(function (c) { return /pointer/i.test(c.how); }) ? ' Click inside to lock the mouse; press Esc to get it back.' : ''), true]);
      if (a.needsSound) notes.push(['sound', 'Needs sound. Use headphones in a quiet classroom.', true]);
      if (a.noTimer) notes.push(['clock', 'No timer: take as long as you like. Good for quiet time.', false]);
      if (a.hasOnline) notes.push(['online', a.onlineNote || 'Has online features.', true]);

      var stage = blocked
        ? '<div class="pc-only-box">' + ICON.computer + '<h2>Please use a computer for this one</h2>' +
            '<p>' + esc(a.title) + ' needs a keyboard and mouse, so it won’t work on a phone or tablet.</p>' +
            '<p><a class="btn" href="./?tablet=1">Find an activity that works on tablets</a></p></div>'
        : '<div class="stage-outer"><div class="stage" id="stage">' +
            '<iframe id="frame" title="' + esc(a.title) + '" src="' + esc(a.url) + '" allow="fullscreen; pointer-lock; gamepad; autoplay" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
            '<div class="stage-msg" id="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Loading ' + esc(a.title) + '…</p></div>' +
            '<div class="stage-msg" id="slow" hidden role="alert"><p><strong>This is taking a while.</strong></p>' +
              '<p>The network may be slow, or the activity may be blocked here.</p>' +
              '<p><a class="btn" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + ICON.newtab + 'Open it in a new tab</a></p>' +
              '<p><button type="button" class="link-btn" id="slow-dismiss" style="color:#fff">Keep waiting</button></p></div>' +
          '</div></div>' +
          '<div class="stage-tools"><p class="hint">Click inside the activity before using the keyboard.</p><div class="btns">' +
            '<button type="button" class="btn" id="fs-btn">' + ICON.full + 'Fullscreen</button>' +
            '<a class="btn btn-ghost" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + ICON.newtab + 'Open in new tab</a>' +
          '</div></div>';

      root.innerHTML =
        '<div class="activity-top">' +
          '<a class="btn btn-ghost" href="./">' + ICON.back + 'Back</a>' +
          '<h1>' + esc(a.title) + '</h1>' +
          '<span class="badge" data-cat="' + esc(a.category) + '">' + esc(a.category) + '</span>' +
        '</div>' + stage +
        '<div class="info-grid">' +
          '<section class="panel" aria-labelledby="about-h"><h2 id="about-h">About this activity</h2><p>' + esc(a.description) + '</p>' +
            '<div class="badges">' + deviceIcons(a) + '</div>' +
            (notes.length ? '<ul class="notes">' + notes.map(function (n) {
              return '<li class="' + (n[2] ? 'note-warn' : '') + '">' + ICON[n[0]] + '<span>' + esc(n[1]) + '</span></li>';
            }).join('') + '</ul>' : '') +
          '</section>' +
          '<section class="panel" aria-labelledby="controls-h"><h2 id="controls-h">Controls</h2>' +
            '<div class="table-wrap"><table><thead><tr><th scope="col">To do this</th><th scope="col">Use</th></tr></thead><tbody>' +
            (a.controls || []).map(function (c) { return '<tr><td>' + esc(c.action) + '</td><td>' + esc(c.how) + '</td></tr>'; }).join('') +
            '</tbody></table></div>' +
          '</section>' +
        '</div>';

      if (!blocked) wireStage();
    }

    function wireStage() {
      var frame = $('#frame'), loading = $('#loading'), slow = $('#slow'), stage = $('#stage');
      var loaded = false;
      frame.addEventListener('load', function () {
        loaded = true;
        loading.hidden = true;
        slow.hidden = true;
      });
      setTimeout(function () {
        if (!loaded) { loading.hidden = true; slow.hidden = false; }
      }, 10000);
      $('#slow-dismiss').addEventListener('click', function () { slow.hidden = true; if (!loaded) loading.hidden = false; });

      var fsBtn = $('#fs-btn');
      var canFs = document.fullscreenEnabled || document.webkitFullscreenEnabled;
      if (!canFs) { fsBtn.hidden = true; return; }
      fsBtn.addEventListener('click', function () {
        var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
        if (!req) return;
        try {
          var p = req.call(stage);
          if (p && p.then) p.then(function () { frame.focus(); }).catch(function () { /* user or browser refused */ });
          else frame.focus();
        } catch (e) { /* ignore */ }
      });
    }
  }

  /* ---------- Teacher page ---------- */
  function initTeachers() {
    getJSON('activities.json').then(function (data) {
      var list = enabledOnly(data);
      var li = function (a, extra) {
        return '<li><a href="activity.html?id=' + encodeURIComponent(a.id) + '">' + esc(a.title) + '</a>' + (extra ? ': ' + esc(extra) : '') + '</li>';
      };
      var fill = function (sel, items, fmt, none) {
        var el = $(sel);
        if (el) el.innerHTML = items.length ? items.map(fmt).join('') : '<li>' + esc(none) + '</li>';
      };
      $('#t-count').textContent = String(list.length);
      fill('#t-calm', list.filter(function (a) { return a.noTimer; }), function (a) { return li(a, a.description); }, 'None at the moment.');
      fill('#t-sound', list.filter(function (a) { return a.needsSound; }), function (a) { return li(a); }, 'None at the moment.');
      fill('#t-pc', list.filter(function (a) { return a.pcOnly; }), function (a) { return li(a); }, 'None at the moment.');
      fill('#t-tablet', list.filter(function (a) { return (a.devices || []).indexOf('tablet') !== -1; }), function (a) { return li(a); }, 'None at the moment.');
      fill('#t-online', list.filter(function (a) { return a.hasOnline; }), function (a) { return li(a, a.onlineNote); }, 'None at the moment.');

      var off = (Array.isArray(data) ? data : []).filter(function (a) { return a && a.enabled !== true; });
      fill('#t-off', off, function (a) { return '<li>' + esc(a.title) + (a.onlineNote ? ': ' + esc(a.onlineNote) : '') + '</li>'; }, 'None: every activity is switched on.');

      var hosts = [location.host || '(this site)'];
      list.forEach(function (a) {
        try { var h = new URL(a.url).host; if (hosts.indexOf(h) === -1) hosts.push(h); } catch (e) { /* skip */ }
      });
      $('#t-hosts').textContent = hosts.join('\n');
      $('#t-urls').textContent = list.map(function (a) { return a.url; }).join('\n');
      $('#t-table').innerHTML = list.map(function (a) {
        return '<tr><td>' + esc(a.title) + '</td><td>' + esc(a.category) + '</td><td>' + esc(listWords(a.devices || [])) + '</td>' +
          '<td>' + (a.noTimer ? 'Yes' : 'No') + '</td><td>' + (a.needsSound ? 'Yes' : 'No') + '</td><td>' + (a.hasOnline ? 'Yes' : 'No') + '</td>' +
          '<td style="word-break:break-all">' + esc(a.url) + '</td></tr>';
      }).join('');
    }).catch(function (e) { showError($('#t-error'), 'The activity list could not be loaded. Try refreshing the page.'); console.warn(e); });

    var copyBtn = $('#copy-urls');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var text = $('#t-hosts').textContent + '\n\n' + $('#t-urls').textContent;
      var done = function () { copyBtn.textContent = 'Copied'; setTimeout(function () { copyBtn.textContent = 'Copy the list'; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { copyBtn.textContent = 'Select the text above to copy it'; });
      } else { copyBtn.textContent = 'Select the text above to copy it'; }
    });
  }

  /* ---------- Privacy page ---------- */
  function initPrivacy() {
    getJSON('activities.json').then(function (data) {
      var list = enabledOnly(data).filter(function (a) { return a.hasOnline; });
      var el = $('#p-online');
      el.innerHTML = list.length ? list.map(function (a) {
        return '<li><strong>' + esc(a.title) + '</strong>: ' + esc(a.onlineNote) + '</li>';
      }).join('') : '<li>None of the switched-on activities have online features.</li>';
    }).catch(function () { $('#p-online').innerHTML = '<li>The list could not be loaded. Try refreshing the page.</li>'; });
  }

  /* ---------- start ---------- */
  var page = document.body.getAttribute('data-page');
  if (page === 'home') initHome();
  else if (page === 'activity') initActivity();
  else if (page === 'teachers') initTeachers();
  else if (page === 'privacy') initPrivacy();
})();
