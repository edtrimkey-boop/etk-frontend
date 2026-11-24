/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAd0HAZ6-hLPdnU3rMsghqWKBc0z6ca68w',
  authDomain: 'ed-trim-key.firebaseapp.com',
  projectId: 'ed-trim-key',
  storageBucket: 'ed-trim-key.firebasestorage.app',
  messagingSenderId: '1078045852332',
  appId: '1:1078045852332:web:95b0deb2bbe6a902069509',
  measurementId: 'G-3DD3QG763J',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('[SW] Background push received:', payload);
  // If payload only contains data (no notification object), display it manually
  if (!payload.notification && payload.data) {
    const title = payload.data.title || 'Ed-Trim Key Alert';
    const options = {
      body: payload.data.body || payload.data.message || '',
      icon: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/logo/apple-ETK-icon.png',
      badge: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/logo/apple-ETK-icon.png',
      data: { url: payload.data.url || '/dashboard' },
    };
    return self.registration.showNotification(title, options);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
