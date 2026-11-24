// Clipping Yogi API Configuration & Proxy Bridge for Vercel/Static Deployments
(function () {
  const isVercel = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('.pages.dev');
  let base = (localStorage.getItem('CLIPPING_YOGI_API_BASE') || '').replace(/\/+$/, '');

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
    if (base && typeof resource === 'string' && isApiRoute(resource)) {
      resource = base + resource;
    }
    return origFetch.call(this, resource, init);
  };

  // Intercept media sources and links
  const fixUrl = function (u) {
    if (base && typeof u === 'string' && (u.startsWith('/media/') || u.startsWith('/cover/') || u.startsWith('/text/'))) {
      return base + u;
    }
    return u;
  };

  try {
    const origSrcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (origSrcDesc && origSrcDesc.set) {
      Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        set: function (val) { return origSrcDesc.set.call(this, fixUrl(val)); },
        get: function () { return origSrcDesc.get.call(this); }
      });
    }
  } catch (e) {}

  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[href^="/media/"], a[href^="/cover/"], a[href^="/text/"]');
    if (a && base && !a.href.startsWith(base)) {
      a.href = base + a.getAttribute('href');
    }
  }, true);

  // Render backend connection UI for Vercel users
  function showApiBanner() {
    if (!isVercel && !window.location.search.includes('api_config=1')) return;
    window.addEventListener('DOMContentLoaded', function () {
      const bar = document.createElement('div');
      bar.id = 'render-backend-bar';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#170f24;border-bottom:1px solid #ff4ba5;color:#fbf6ff;padding:8px 16px;font:13px system-ui,sans-serif;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,0.6);';
      
      const statusText = base ? 'Connected to: <code style="color:#58e8f7">' + base + '</code>' : '⚠️ Render Backend not set yet. Enter your live Render URL:';
      bar.innerHTML = '<div>🔗 <b>Backend:</b> ' + statusText + '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
        '<input id="backend-url-input" type="url" placeholder="https://clippingyogi.onrender.com" value="' + (base || '') + '" style="background:#0c0814;border:1px solid #3c2a55;color:#fff;border-radius:6px;padding:5px 10px;font:12px monospace;width:260px;">' +
        '<button id="backend-url-save" style="background:#ff4ba5;color:#fff;border:0;border-radius:6px;padding:5px 12px;font:700 12px system-ui;cursor:pointer;">' + (base ? 'Update' : 'Connect') + '</button>' +
        (base ? '<button id="backend-url-clear" style="background:transparent;color:#a99db7;border:1px solid #3c2a55;border-radius:6px;padding:5px 10px;font:12px system-ui;cursor:pointer;">Reset</button>' : '') +
        '</div>';
      document.body.prepend(bar);
      document.body.style.paddingTop = '46px';

      document.getElementById('backend-url-save').onclick = function () {
        const val = document.getElementById('backend-url-input').value.trim();
        if (!val) { alert('Please enter your Render URL (e.g. https://clippingyogi.onrender.com)'); return; }
        window.setApiBase(val);
      };
      if (document.getElementById('backend-url-clear')) {
        document.getElementById('backend-url-clear').onclick = function () {
          window.setApiBase('');
        };
      }
    });
  }

  showApiBanner();
})();
