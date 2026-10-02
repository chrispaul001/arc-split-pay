import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { registerPushToken } from "@/lib/push.functions";

const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID as string | undefined;
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY as string | undefined;
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY as string | undefined) ?? "",
  projectId: (import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID as string | undefined) ?? "",
  appId: appId ?? "",
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushResult =
  | { status: "registered" }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" | "no-session" | "failed" };

const sessionFor = (address: string) => localStorage.getItem(`coindecc:session:${address.toLowerCase()}`);

/** Call from a click handler. Registers this device for the wallet's push alerts. */
export async function enablePush(address: string): Promise<PushResult> {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !appId || !vapidKey || !firebaseConfig.messagingSenderId)
    return { status: "not-configured" };
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported())) return { status: "unsupported" };
  if (window.top !== window.self) return { status: "open-in-new-tab" };
  const session = sessionFor(address);
  if (!session) return { status: "no-session" };
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };
  try {
    const query = new URLSearchParams(firebaseConfig).toString();
    const serviceWorkerRegistration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
    if (!token) return { status: "denied" };
    await registerPushToken({ data: { token: session, pushToken: token } });
    // Foreground tabs already show in-app toasts; swallow duplicate foreground pushes.
    onMessage(messaging, () => {});
    localStorage.setItem(`coindecc:push:${address.toLowerCase()}`, "1");
    return { status: "registered" };
  } catch {
    return { status: "failed" };
  }
}

export const pushEnabled = (address: string) => localStorage.getItem(`coindecc:push:${address.toLowerCase()}`) === "1";

export const PUSH_COPY: Record<Exclude<PushResult["status"], "registered">, string> = {
  "not-configured": "Push alerts aren't available yet. Please try again later.",
  unsupported: "This browser doesn't support push alerts.",
  "open-in-new-tab": "Open CoindeccPay in its own tab to turn on push alerts.",
  denied: "Notifications are blocked. Allow them in your browser's site settings.",
  "no-session": "Sign the wallet message first, then try again.",
  failed: "Couldn't turn on push alerts. Please try again.",
};
