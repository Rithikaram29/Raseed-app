// ✅ COMPAT scripts only
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// ✅ NOT initializeApp — use compat global
firebase.initializeApp({
  apiKey: "AIzaSyD666KmnzlRrGKmqigMmo8POXJNnQhWcTI",
  authDomain: "raseed-app-dbbeb.firebaseapp.com",
  projectId: "raseed-app-dbbeb",
  storageBucket: "raseed-app-dbbeb.firebasestorage.app",
  messagingSenderId: "631440225521",
  appId: "1:631440225521:web:55d0f0a6d993531f152550",
  measurementId: "G-DY75ZBD70E",
});

// ✅ messaging compat object
const messaging = firebase.messaging();



messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message:", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "https://png.pngtree.com/png-clipart/20240318/original/pngtree-tree-forest-tree-png-image_14619746.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
  
});

// Manual Push Event (triggered from DevTools or other places)
self.addEventListener("push", function(event) {
  console.log("[Service Worker] Push Received.");
  
  const title = "Manual Push Test";
  const options = {
    body: "This was triggered from DevTools manually.",
    // icon: "/firebase-logo.png", // Optional: add an icon here
    
  };

  // Show the manual notification
  event.waitUntil(self.registration.showNotification(title, options));
});
