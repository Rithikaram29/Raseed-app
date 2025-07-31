import app from "./firebase";

// Analytics (client only)
export const initAnalytics = async () => {
  if (typeof window === "undefined") return;

  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (await isSupported()) {
    const analytics = getAnalytics(app);
    console.log("Analytics initialized");
    return analytics;
  }
};

// Messaging (client only)
export const initMessaging = async () => {
  if (typeof window === "undefined") return;

  const { getMessaging, getToken, isSupported } = await import(
    "firebase/messaging"
  );

  if (await isSupported()) {
    try {
      const messaging = getMessaging(app);

      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        console.log("Notification permission granted.");
        const token = await getToken(messaging, {
          vapidKey:
            "BHxM5WvI6N2Ed3Okk5lxXUNk1X7M7MudXVdOLdG2JqUkhCPUT6spT05R7yG6qxZuKyBhpAXNPsFZcgRyLGFI3QU", // Required
        });

        if (!token) {
          console.log(
            "No registration token available. Request permission to generate one.",
          );
          return;
        }

        console.log("FCM registration token:", token);
        return token;
      }
    } catch (error) {
      console.log(error);
    }
  }
};
