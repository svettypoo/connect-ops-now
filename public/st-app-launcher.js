/**
 * S&T Properties — Universal App Launcher (9-dot grid)
 * Drop this script into any app to get a top-right app switcher.
 * Zero dependencies. Self-contained. Works on any framework.
 */
(function () {
  if (window.__ST_APP_LAUNCHER__) return;
  window.__ST_APP_LAUNCHER__ = true;

  const APPS = [
    { name: 'Phone',        url: 'https://phone.stproperties.com',          color: '#0EA5E9', icon: 'phone' },
    { name: 'Birthday',     url: 'https://birthday.stproperties.com',       color: '#F59E0B', icon: 'cake' },
    { name: 'Concierge',    url: 'https://concierge.stproperties.com',      color: '#8B5CF6', icon: 'concierge' },
    { name: 'Timekeeping',  url: 'https://timekeeping.stproperties.com',    color: '#06B6D4', icon: 'clock' },
    { name: 'Projects',     url: 'https://projects.stproperties.com',       color: '#10B981', icon: 'folder' },
    { name: 'Parking',      url: 'https://parking.stproperties.com/admin',  color: '#EF4444', icon: 'car' },
    { name: 'Chat',         url: 'https://chat.stproperties.com',           color: '#EC4899', icon: 'chat' },
    { name: 'Mail',         url: 'https://mail.stproperties.com/SOGo/',     color: '#6366F1', icon: 'mail' },
    { name: 'Hotel',        url: 'https://frontdesk.stproperties.com',      color: '#F97316', icon: 'hotel' },
  ];

  const ICONS = {
    phone: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>',
    cake: '<path d="M20 21v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/>',
    concierge: '<path d="M2 18a1 1 0 001 1h18a1 1 0 001-1v-2a1 1 0 00-1-1H3a1 1 0 00-1 1v2z"/><path d="M20 15a8 8 0 10-16 0"/><path d="M12 4v3"/><circle cx="12" cy="4" r="1"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    folder: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10H8s-2.7.6-4.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 10l1.5-4.5A2 2 0 018.4 4h7.2a2 2 0 011.9 1.5L19 10"/>',
    chat: '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>',
    hotel: '<path d="M18 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2z"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  };

  function isCurrent(url) {
    try { return new URL(url).hostname === location.hostname; } catch { return false; }
  }

  function makeSVG(key, size) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[key] || '') + '</svg>';
  }

  // --- Inject styles ---
  var style = document.createElement('style');
  style.textContent = [
    '#st-launcher-btn{position:fixed;top:12px;right:12px;z-index:2147483646;width:40px;height:40px;border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:rgba(30,30,40,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 2px 12px rgba(0,0,0,0.3);transition:all .2s}',
    '#st-launcher-btn:hover{background:rgba(50,50,65,0.95);transform:scale(1.08)}',
    '#st-launcher-btn.st-active{background:rgba(50,50,65,0.95)}',
    '#st-launcher-dots{display:grid;grid-template-columns:repeat(3,5px);gap:3px}',
    '#st-launcher-dots span{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.85)}',
    '#st-launcher-panel{position:fixed;top:58px;right:12px;z-index:2147483646;width:280px;background:rgba(20,20,30,0.96);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-radius:14px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 8px 32px rgba(0,0,0,0.5);padding:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;opacity:0;transform:scale(0.92) translateY(-8px);pointer-events:none;transition:all .2s cubic-bezier(.4,0,.2,1)}',
    '#st-launcher-panel.st-open{opacity:1;transform:scale(1) translateY(0);pointer-events:auto}',
    '.st-app-tile{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border-radius:10px;text-decoration:none;color:rgba(255,255,255,0.8);transition:all .15s;border:none;background:none;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
    '.st-app-tile:hover{background:rgba(255,255,255,0.08);color:#fff}',
    '.st-app-tile.st-current{background:rgba(255,255,255,0.06);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,0.12)}',
    '.st-app-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff}',
    '.st-app-name{font-size:11px;font-weight:500;text-align:center;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px}',
  ].join('\n');
  document.head.appendChild(style);

  // --- Build button ---
  var btn = document.createElement('button');
  btn.id = 'st-launcher-btn';
  btn.title = 'S&T Apps';
  btn.innerHTML = '<div id="st-launcher-dots">' + Array(9).fill('<span></span>').join('') + '</div>';

  // --- Build panel ---
  var panel = document.createElement('div');
  panel.id = 'st-launcher-panel';
  APPS.forEach(function (app) {
    var a = document.createElement('a');
    a.className = 'st-app-tile' + (isCurrent(app.url) ? ' st-current' : '');
    a.href = app.url;
    a.target = isCurrent(app.url) ? '_self' : '_blank';
    a.rel = 'noopener';
    a.innerHTML =
      '<div class="st-app-icon" style="background:' + app.color + '">' + makeSVG(app.icon, 20) + '</div>' +
      '<span class="st-app-name">' + app.name + '</span>';
    panel.appendChild(a);
  });

  // --- Toggle logic ---
  var open = false;
  function toggle() {
    open = !open;
    panel.classList.toggle('st-open', open);
    btn.classList.toggle('st-active', open);
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
  document.addEventListener('click', function (e) {
    if (open && !panel.contains(e.target)) { open = false; panel.classList.remove('st-open'); btn.classList.remove('st-active'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) { open = false; panel.classList.remove('st-open'); btn.classList.remove('st-active'); }
  });

  // --- Mount ---
  document.body.appendChild(btn);
  document.body.appendChild(panel);
})();
