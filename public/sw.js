/* 
  Dummy service worker file to silence 404 errors in the terminal.
  This file is empty because the current application does not use service workers,
  but previous development sessions on localhost:3000 may have registered one.
*/
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    self.registration.unregister()
        .then(() => self.clients.matchAll())
        .then((clients) => {
            clients.forEach(client => client.navigate(client.url));
        });
});
