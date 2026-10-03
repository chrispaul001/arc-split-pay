import { initializeApp, getApps } from "firebase/app";
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { registerPushToken, removePushToken } from "@/lib/push.functions";

const appId = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"] as string | undefined;
const vapidKey = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"] as string | undefined;
const firebaseConfig = {
  apiKey: (import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] as string | undefined) ?? "",
  projectId: (import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] as string | undefined) ?? "",
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
    localStorage.setItem(`coindecc:push:${address.toLowerCase()}`, token);
    return { status: "registered" };
  } catch {
    return { status: "failed" };
  }
}

export const pushEnabled = (address: string) => localStorage.getItem(`coindecc:push:${address.toLowerCase()}`) !== null;

/** Turns alerts off for this device: removes the saved token and unsubscribes. */
export async function disablePush(address: string) {
  const key = `coindecc:push:${address.toLowerCase()}`;
  const pushToken = localStorage.getItem(key);
  localStorage.removeItem(key);
  const session = sessionFor(address);
  try {
    if (pushToken && pushToken.length >= 20 && session) await removePushToken({ data: { token: session, pushToken } });
    const app = getApps()[0];
    if (app) await deleteToken(getMessaging(app));
  } catch { /* already removed */ }
}

export type PushState = "active" | "blocked" | "off" | "unsupported";
export function pushState(address: string): PushState {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return pushEnabled(address) && Notification.permission === "granted" ? "active" : "off";
}

export const PUSH_COPY: Record<Exclude<PushResult["status"], "registered">, string> = {
  "not-configured": "Push alerts aren't available yet. Please try again later.",
  unsupported: "This browser doesn't support push alerts.",
  "open-in-new-tab": "Open CoindeccPay in its own tab to turn on push alerts.",
  denied: "Notifications are blocked. Allow them in your browser's site settings.",
  "no-session": "Approve the sign-in message in your wallet to turn on alerts.",
  failed: "Couldn't turn on push alerts. Please try again.",
};
