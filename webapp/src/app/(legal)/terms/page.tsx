import type { Metadata } from "next";
import { fetchPublishedLegalPolicy } from "@/lib/api/publicLegal";
import { LegalPolicyDocument } from "@/features/legal";
import { LegalPolicyUnavailable } from "@/features/legal";

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchPublishedLegalPolicy("terms");
  if (!data) return { title: "Terms of Service — Syntax Stories" };
  return {
    title: `${data.title} — Syntax Stories`,
    description: data.summary || "Terms of Service",
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const data = await fetchPublishedLegalPolicy("terms");
  if (!data) return <LegalPolicyUnavailable title="Terms of Service" />;
  return <LegalPolicyDocument data={data} />;
}
