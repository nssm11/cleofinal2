import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/account/auth-forms";
import { AuthShell } from "@/components/account/auth-shell";
export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };
export default async function InscriptionPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next && next.startsWith("/") ? next : "/compte");
  return (
    <AuthShell kicker="Nouvelle cliente" title={<>Rejoindre la <em className="text-champagne-2">maison Cléopâtre</em></>}>
      <RegisterForm next={next} />
    </AuthShell>
  );
}
