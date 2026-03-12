// Service Worker for Web Push — S&T Phone
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'S&T Phone', body: event.data.text() }; }

  const isCall = data.tag === 'incoming-call' || data.type === 'incoming_call';
  const title = data.title || 'S&T Phone';
  const options = {
    body: data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'st-push',
    renotify: true,
    requireInteraction: isCall, // keep call notification visible until user acts
    data: { url: data.url || '/', type: data.type, payload: data.payload },
    vibrate: isCall ? [300, 100, 300, 100, 300] : (data.vibrate || [200, 100, 200]),
    actions: isCall ? [
      { action: 'answer', title: 'Answer' },
      { action: 'decline', title: 'Decline' },
    ] : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const action = event.action;

  if (action === 'decline') return; // just dismiss

  // Focus/open the app and pass the event via postMessage
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0];
        client.focus();
        if (notifData.type === 'incoming_call' || action === 'answer') {
          client.postMessage({ type: 'incoming_call', payload: notifData.payload });
        }
        return;
      }
      return clients.openWindow(notifData.url || '/');
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
