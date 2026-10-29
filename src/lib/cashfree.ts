/**
 * Cashfree Checkout (JS SDK v3), loaded on demand from Cashfree's CDN so no npm package is needed.
 * https://www.cashfree.com/docs/payments/online/web/redirect
 */
const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

interface CashfreeCheckoutResult {
  error?: { message?: string };
  redirect?: boolean;
}
interface CashfreeInstance {
  checkout(options: { paymentSessionId: string; redirectTarget?: "_self" | "_blank" | "_top" }): Promise<CashfreeCheckoutResult>;
}
type CashfreeFactory = (options: { mode: "sandbox" | "production" }) => CashfreeInstance;

declare global {
  interface Window {
    Cashfree?: CashfreeFactory;
  }
}

let loading: Promise<CashfreeFactory> | null = null;

function loadSdk(): Promise<CashfreeFactory> {
  if (window.Cashfree) return Promise.resolve(window.Cashfree);
  loading ??= new Promise<CashfreeFactory>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => (window.Cashfree ? resolve(window.Cashfree) : reject(new Error("Payment SDK failed to start.")));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Couldn't load the payment page. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Sends the browser to Cashfree's hosted checkout; it returns to the backend's return URL. */
export async function openCashfreeCheckout(paymentSessionId: string, mode: "sandbox" | "production") {
  const Cashfree = await loadSdk();
  const result = await Cashfree({ mode }).checkout({ paymentSessionId, redirectTarget: "_self" });
  if (result?.error) throw new Error(result.error.message || "Payment couldn't be started.");
}
