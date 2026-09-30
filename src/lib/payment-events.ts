/** Persist a confirmed payment until the wallet's merchant feed can pick it up. */
import { recordTx } from "@/lib/tx-history";
import { COINDECC_PAY_ADDRESS } from "@/lib/web3";
export type SettledPayment = { hash: `0x${string}`; sender: `0x${string}`; amount: number };
export const paymentQueueKey = (address: string) => `coindecc:payments:${address.toLowerCase()}`;

export function readPayments(address: string): SettledPayment[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(paymentQueueKey(address)) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((p): p is SettledPayment =>
      p && typeof p.hash === "string" && /^0x[a-f0-9]{64}$/i.test(p.hash) &&
      typeof p.sender === "string" && /^0x[a-f0-9]{40}$/i.test(p.sender) &&
      typeof p.amount === "number" && Number.isFinite(p.amount) && p.amount > 0);
  } catch { return []; }
}

export function recordPayment(payment: SettledPayment) {
  recordTx({ hash: payment.hash, kind: "payment", from: payment.sender, to: COINDECC_PAY_ADDRESS, amount: payment.amount, label: "CoindeccPay checkout" });
  const payments = readPayments(payment.sender);
  try {
    localStorage.setItem(paymentQueueKey(payment.sender), JSON.stringify(
      [payment, ...payments.filter((p) => p.hash.toLowerCase() !== payment.hash.toLowerCase())].slice(0, 50),
    ));
  } catch { /* in-memory event still reaches an open dashboard */ }
  window.dispatchEvent(new CustomEvent<SettledPayment>("coindecc:payment-settled", { detail: payment }));
}