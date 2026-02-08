const CACHE_NAME = 'recycling-bot-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/logo.svg',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.ico'
];

// Install Service Worker
self.addEventListener('install', (e) => {
    self.skipWaiting(); // Force new service worker to activate immediately
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Service Worker
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim(); // Take control of all clients immediately
        })
    );
});

// Fetch Event
self.addEventListener('fetch', (e) => {
    // Try to serve from cache first
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
