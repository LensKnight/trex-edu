self.addEventListener('push', function (event) {
  let title = 'New Notification 📢';
  let body = 'You have a new message!';
  let link = '/';

  if (event.data) {
    try {
      // Pehle JSON parse karne ki koshish karein (Backend API payload ke liye)
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
      link = data.link || link;
    } catch (e) {
      // Agar DevTools se direct Plain Text aayega toh yahan handle hoga
      body = event.data.text();
    }
  }

  const options = {
    body: body,
    icon: '/mvmlogo.png', // Aapke public folder ka exact icon path[cite: 1]
    badge: '/mvmlogo.png',
    data: { url: link },
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.warn('Notification display error:', err);
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});