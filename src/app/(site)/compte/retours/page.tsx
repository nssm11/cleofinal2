import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, returnRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { formatDT } from "@/lib/money";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { PackageIcon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes retours" };

const STATUS_LABELS: Record<string, { label: string; tone: "neutral" | "accent" | "warning" | "success" | "error" }> = {
  pending: { label: "Nouvelle", tone: "accent" },
  in_review: { label: "En cours", tone: "warning" },
  awaiting_customer: { label: "En attente de votre réponse", tone: "warning" },
  approved: { label: "Approuvée", tone: "success" },
  rejected: { label: "Refusée", tone: "error" },
  completed: { label: "Terminée", tone: "success" },
};

export default async function ReturnsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/compte/retours");
  const returns = await db.query.returnRequests.findMany({
    where: eq(returnRequests.userId, user.id),
    orderBy: desc(returnRequests.createdAt),
    with: {
      order: true,
      orderItem: true,
    },
  });

  if (!returns.length) {
    return (
      <EmptyState
        icon={<PackageIcon size={28} />}
        title="Aucun retour en cours"
        description="Vous pouvez demander un retour depuis le détail d'une commande livrée ou expédiée."
        action={{ href: "/compte/commandes", label: "Voir mes commandes" }}
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow mb-3">Mes retours</p>
        <h1 className="font-display text-display-md text-ink">Suivi de vos retours</h1>
        <p className="mt-2 text-sm text-muted">
          Notre équipe traite les demandes sous 24 h ouvrées.
        </p>
      </div>
      <div className="border-y border-stone">
        {returns.map((r) => {
          const s = STATUS_LABELS[r.status] ?? STATUS_LABELS.pending;
          return (
            <div key={r.id} className="border-b border-stone/60 py-6 last:border-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <p className="font-display text-lg italic text-ink">{r.number}</p>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
                <p className="text-xs text-muted">Demandé le {formatDate(r.createdAt)}</p>
              </div>
              {r.order && (
                <p className="text-xs text-muted-2">
                  Commande{" "}
                  <Link href={`/compte/commandes/${r.order.number}`} className="text-ink underline underline-offset-4">
                    {r.order.number}
                  </Link>
                </p>
              )}
              {r.orderItem && (
                <div className="mt-3 flex items-start gap-4">
                  <p className="text-sm text-charcoal">{r.orderItem.name}</p>
                </div>
              )}
              <p className="mt-2 text-sm text-muted"><span className="font-medium text-charcoal">Motif&nbsp;:</span> {r.reason}</p>
              {r.message && <p className="mt-2 text-sm text-muted italic">&laquo;&nbsp;{r.message}&nbsp;&raquo;</p>}
              {r.staffNote && (
                <div className="mt-4 border-l-2 border-champagne bg-cream p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-champagne-2">Réponse de l&apos;équipe</p>
                  <p className="mt-2 text-sm text-charcoal">{r.staffNote}</p>
                </div>
              )}
              {r.order && (
                <p className="mt-3 text-xs text-muted-2">Montant de la commande : {formatDT(r.order.totalMillimes)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
