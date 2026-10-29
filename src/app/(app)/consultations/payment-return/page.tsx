import type { Metadata } from "next";
import { Suspense } from "react";

import { PaymentReturn } from "@/components/consultations/payment-return";

export const metadata: Metadata = { title: "Payment" };

/** Cashfree's return URL (CASHFREE_RETURN_URL on the backend should point here). */
export default function PaymentReturnPage() {
  return (
    <Suspense>
      <PaymentReturn />
    </Suspense>
  );
}
