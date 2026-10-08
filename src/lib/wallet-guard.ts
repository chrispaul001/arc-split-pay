/** Wallet request safety net: 35s timeout per wallet prompt + manual cancel. */
export const WALLET_TIMEOUT_MS = 35_000;
export const WALLET_TIMEOUT_MESSAGE = "Wallet response timed out. Please check your wallet app or try again.";

export class WalletTimeoutError extends Error {
  constructor() { super(WALLET_TIMEOUT_MESSAGE); this.name = "WalletTimeoutError"; }
}
export class WalletCancelledError extends Error {
  constructor() { super("Cancelled"); this.name = "WalletCancelledError"; }
}

export const isCancelled = (e: unknown) => e instanceof WalletCancelledError;
export const isTimeout = (e: unknown) => e instanceof WalletTimeoutError;

/**
 * One guarded run. `wallet()` races a wallet prompt against a 35s timer and the
 * cancel signal; `wait()` races chain waits against cancel only. Timers always clear.
 */
export function createWalletRun() {
  let cancelReject: ((e: Error) => void) | null = null;
  const cancelled = new Promise<never>((_, reject) => { cancelReject = reject; });
  cancelled.catch(() => {});
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const race = <T,>(p: Promise<T>, timeoutMs?: number): Promise<T> => {
    const contenders: Promise<T>[] = [p, cancelled];
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs) {
      contenders.push(new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new WalletTimeoutError()), timeoutMs);
        timers.add(timer);
      }));
    }
    return Promise.race(contenders).finally(() => { if (timer) { clearTimeout(timer); timers.delete(timer); } });
  };

  return {
    wallet: <T,>(p: Promise<T>) => race(p, WALLET_TIMEOUT_MS),
    wait: <T,>(p: Promise<T>) => race(p),
    cancel: () => cancelReject?.(new WalletCancelledError()),
    dispose: () => { timers.forEach(clearTimeout); timers.clear(); },
  };
}

export type WalletRun = ReturnType<typeof createWalletRun>;

export const isMobileDevice = () =>
  typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

/** MetaMask universal link — wakes the app (or opens this page in its dapp browser). */
export const metaMaskWakeLink = () => "https://metamask.app.link/";
export const metaMaskDappLink = () =>
  typeof window === "undefined" ? "https://metamask.app.link/" :
  `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}`;
