// Clipping Yogi API Configuration & Proxy Bridge for Vercel/Static Deployments
(function () {
  const isVercel = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('.pages.dev') || window.location.hostname.includes('github.io');
  
  const DEFAULT_BACKEND = 'https://clippingyogi-1.onrender.com';

  // Support setting backend via query parameter (?backend=https://... or ?api=https://...)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const qBase = urlParams.get('backend') || urlParams.get('api');
    if (qBase) {
      const clean = qBase.trim().replace(/\/+$/, '');
      if (clean) localStorage.setItem('CLIPPING_YOGI_API_BASE', clean);
      else localStorage.removeItem('CLIPPING_YOGI_API_BASE');
    }
  } catch (e) {}

  // If old suspended URL was saved, update to active clippingyogi-1.onrender.com
  let stored = (localStorage.getItem('CLIPPING_YOGI_API_BASE') || '').trim();
  if (stored === 'https://clippingyogi.onrender.com' || stored === 'http://clippingyogi.onrender.com') {
    stored = DEFAULT_BACKEND;
    localStorage.setItem('CLIPPING_YOGI_API_BASE', DEFAULT_BACKEND);
  }

  let base = (stored || (isVercel ? DEFAULT_BACKEND : '')).replace(/\/+$/, '');

  // Fetch backend URL configured in Vercel environment variables (if any)
  if (isVercel && !stored) {
    origFetch('/api/config')
      .then(r => r.ok ? r.json() : null)
      .then(cfg => {
        if (cfg && cfg.backend && cfg.backend !== base) {
          base = cfg.backend.trim().replace(/\/+$/, '');
          const input = document.getElementById('backend-url-input');
          if (input) input.value = base;
          const code = document.getElementById('backend-status-code');
          if (code) code.textContent = base;
        }
      })
      .catch(() => {});
  }

  window.getApiBase = function () { return base; };
  window.setApiBase = function (url) {
    base = url ? url.trim().replace(/\/+$/, '') : '';
    if (base) localStorage.setItem('CLIPPING_YOGI_API_BASE', base);
    else localStorage.removeItem('CLIPPING_YOGI_API_BASE');
    location.reload();
  };

  const isApiRoute = function (url) {
    if (typeof url !== 'string' || !url.startsWith('/')) return false;
    if (url.startsWith('/assets/')) return false;
    return !/\.(html|css|js|svg|png|jpg|ico|webmanifest)($|\?)/i.test(url);
  };

  // Intercept fetch
  const origFetch = window.fetch;
  window.fetch = function (resource, init) {
    let path = '';
    let isApi = false;
    if (typeof resource === 'string') {
      path = resource;
      isApi = isApiRoute(path);
      if (base && isApi) {
        resource = base + resource;
      }
    } else if (resource && typeof resource.url === 'string') {
      path = resource.url;
      try {
        const u = new URL(path, window.location.href);
        path = u.pathname;
      } catch (e) {}
      isApi = isApiRoute(path);
      if (base && isApi) {
        resource = new Request(base + path, resource);
      }
    }

    // On static deployments (like Vercel), relative API requests will return 404 HTML
    // ("The page could not be found"), throwing "Unexpected token 'T'... is not valid JSON".
    // Intercept and throw a clear descriptive error instead.
    if (isVercel && !base && isApi) {
      return Promise.reject(new Error(
        'Backend is not connected. This web app requires a running Clipping Yogi backend server. Enter your live backend URL in the bar at the top.'
      ));
    }

    return origFetch.call(this, resource, init);
  };

  // Intercept media sources, preview images, and links
  const fixUrl = function (u) {
    if (base && typeof u === 'string' && (
      u.startsWith('/media/') ||
      u.startsWith('/preview/') ||
      u.startsWith('/cover/') ||
      u.startsWith('/text/') ||
      u.startsWith('/vision/')
    )) {
      return base + u;
    }
    return u;
  };

  function hookSrc(proto) {
    try {
      const origSrcDesc = Object.getOwnPropertyDescriptor(proto, 'src');
      if (origSrcDesc && origSrcDesc.set) {
        Object.defineProperty(proto, 'src', {
          set: function (val) { return origSrcDesc.set.call(this, fixUrl(val)); },
          get: function () { return origSrcDesc.get.call(this); }
        });
      }
    } catch (e) {}
  }
  hookSrc(HTMLMediaElement.prototype);
  hookSrc(HTMLImageElement.prototype);

  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[href^="/media/"], a[href^="/cover/"], a[href^="/text/"], a[href^="/preview/"]');
    if (a && base && !a.href.startsWith(base)) {
      a.href = base + a.getAttribute('href');
    }
  }, true);

  // Render backend connection UI for Vercel/Static users
  function showApiBanner() {
    if (!isVercel && !window.location.search.includes('api_config=1')) return;

    const render = function () {
      if (document.getElementById('render-backend-bar')) return;
      const bar = document.createElement('div');
      bar.id = 'render-backend-bar';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#151020;border-bottom:1px solid #ff4ba5;color:#fbf6ff;padding:8px 16px;font:13px system-ui,sans-serif;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,0.6);';
      
      const statusIcon = base ? '🟡' : '⚠️';
      const statusText = base 
        ? 'Backend: <code id="backend-status-code" style="color:#58e8f7">' + base + '</code> <span id="backend-health-badge" style="font-size:11px;padding:2px 6px;border-radius:4px;background:#2a1f3d;color:#d4fb58">Checking…</span>'
        : '⚠️ <b>Backend not connected:</b> Enter your live backend URL to process videos:';
      
      bar.innerHTML = '<div style="display:flex;align-items:center;gap:6px;"><span>🔗</span> <div>' + statusText + '</div></div>' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
        '<input id="backend-url-input" type="url" placeholder="https://clippingyogi-1.onrender.com or http://localhost:8770" value="' + (base || '') + '" style="background:#0c0814;border:1px solid #3c2a55;color:#fff;border-radius:6px;padding:5px 10px;font:12px monospace;width:290px;">' +
        '<button id="backend-url-save" style="background:#ff4ba5;color:#fff;border:0;border-radius:6px;padding:5px 12px;font:700 12px system-ui;cursor:pointer;">' + (base ? 'Update' : 'Connect') + '</button>' +
        (base ? '<button id="backend-url-clear" style="background:transparent;color:#a99db7;border:1px solid #3c2a55;border-radius:6px;padding:5px 10px;font:12px system-ui;cursor:pointer;">Disconnect</button>' : '') +
        '<button id="backend-help-btn" style="background:transparent;color:#58e8f7;border:1px solid #58e8f7;border-radius:6px;padding:5px 8px;font:12px system-ui;cursor:pointer;" title="How to connect backend">Help ℹ️</button>' +
        '</div>';

      const helpModal = document.createElement('div');
      helpModal.id = 'backend-help-modal';
      helpModal.style.cssText = 'display:none;position:fixed;top:54px;right:16px;z-index:999999;background:#1a1426;border:1px solid #58e8f7;border-radius:8px;padding:16px;max-width:440px;color:#fbf6ff;box-shadow:0 8px 32px rgba(0,0,0,0.8);font:13px/1.5 system-ui,sans-serif;';
      helpModal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><b style="color:#58e8f7;font-size:14px;">How to connect Clipping Yogi Backend</b><button id="backend-help-close" style="background:transparent;border:0;color:#aaa;cursor:pointer;font-size:16px;">&times;</button></div>' +
        '<p style="margin:4px 0 8px;color:#ddd;">Vercel only hosts the frontend UI. Video downloading (yt-dlp) and rendering (FFmpeg) require a backend server:</p>' +
        '<div style="background:#0c0814;padding:8px 10px;border-radius:6px;margin-bottom:8px;">' +
        '<b style="color:#ff4ba5;">Option 1: Deploy to Render / Railway (Cloud)</b><br>' +
        '<span style="font-size:12px;color:#bbb;">Deploy this repository on Render using the included <code>Dockerfile</code>. Paste your live Render URL above (e.g. <code>https://clippingyogi-1.onrender.com</code>).</span>' +
        '</div>' +
        '<div style="background:#0c0814;padding:8px 10px;border-radius:6px;">' +
        '<b style="color:#d4fb58;">Option 2: Run Locally (Desktop)</b><br>' +
        '<span style="font-size:12px;color:#bbb;">Run <code>clipping yogi.bat</code> or <code>python app.py</code> on your computer, then enter <code>http://localhost:8770</code> here, or open <code>http://localhost:8770</code> directly.</span>' +
        '</div>';

      document.body.prepend(bar);
      document.body.appendChild(helpModal);
      document.body.style.paddingTop = '50px';

      const helpBtn = document.getElementById('backend-help-btn');
      const helpClose = document.getElementById('backend-help-close');
      if (helpBtn) helpBtn.onclick = function () { helpModal.style.display = helpModal.style.display === 'none' ? 'block' : 'none'; };
      if (helpClose) helpClose.onclick = function () { helpModal.style.display = 'none'; };

      document.getElementById('backend-url-save').onclick = async function () {
        const val = document.getElementById('backend-url-input').value.trim();
        if (!val) { alert('Please enter your backend URL (e.g. https://clippingyogi.onrender.com or http://localhost:8770)'); return; }
        const clean = val.replace(/\/+$/, '');
        
        const saveBtn = document.getElementById('backend-url-save');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Testing…';

        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 6000);
          const r = await origFetch(clean + '/healthz', { signal: ctrl.signal, cache: 'no-store' });
          clearTimeout(tid);
          if (r.status === 503) {
            alert('Warning: The backend at ' + clean + ' returned 503 Service Unavailable (it may be suspended on Render). Saving URL anyway.');
          }
        } catch (e) {
          if (!confirm('Could not reach ' + clean + ' right now (' + (e.message || 'offline') + '). Save anyway?')) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Connect';
            return;
          }
        }
        window.setApiBase(clean);
      };

      if (document.getElementById('backend-url-clear')) {
        document.getElementById('backend-url-clear').onclick = function () {
          window.setApiBase('');
        };
      }

      // Check health of backend if set
      if (base) {
        const badge = document.getElementById('backend-health-badge');
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 7000);
        origFetch(base + '/healthz', { signal: ctrl.signal, cache: 'no-store' })
          .then(async function (res) {
            clearTimeout(tid);
            if (res.ok) {
              if (badge) {
                badge.textContent = '● Online';
                badge.style.color = '#d4fb58';
                badge.style.background = '#1b381a';
              }
            } else if (res.status === 503) {
              if (badge) {
                badge.textContent = '● Suspended (503)';
                badge.style.color = '#ff6b6b';
                badge.style.background = '#3d1616';
                badge.title = 'Service suspended on Render. Unsuspend it in your Render dashboard.';
              }
            } else {
              if (badge) {
                badge.textContent = '● Error ' + res.status;
                badge.style.color = '#ffa500';
              }
            }
          })
          .catch(function (err) {
            clearTimeout(tid);
            if (badge) {
              badge.textContent = '● Offline / Unreachable';
              badge.style.color = '#ff6b6b';
              badge.style.background = '#3d1616';
              badge.title = err.message || 'Cannot connect to backend';
            }
          });
      }
    };

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }

  showApiBanner();
})();
