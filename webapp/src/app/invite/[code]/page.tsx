"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { writePendingReferralCode } from "@/lib/referral/referralCode";

/**
 * Stores the referral code for signup and sends the visitor to the home page.
 */
export default function InviteLandingPage() {
  const params = useParams();
  const code =
    typeof params?.code === "string" ? decodeURIComponent(params.code) : "";

  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed) {
      globalThis.location?.replace("/");
      return;
    }
    writePendingReferralCode(trimmed.toUpperCase());
    globalThis.location?.replace("/");
  }, [code]);

  return (
    <p
      style={{
        padding: 24,
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      Taking you to Syntax Stories…
    </p>
  );
}
