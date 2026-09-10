"use client";
import { useActionState, useState } from "react";
import { Field } from "@/components/ui/primitives";
import { createReturnRequestAction } from "@/actions/shop";
import type { ActionResult } from "@/lib/api";

const REASONS = [
  "Produit ne me convient pas",
  "Produit endommagé",
  "Produit reçu par erreur",
  "Effets indésirables",
  "Changement d'avis",
  "Autre",
];

export function ReturnForm({ orderId, items }: { orderId: number; items: { id: number; name: string; quantity: number }[] }) {
  const [state, action, pending] = useActionState<ActionResult<{ id: number; number: string }>, FormData>(createReturnRequestAction as any, null as any);
  const [selected, setSelected] = useState<number | null>(items[0]?.id ?? null);

  if (state?.ok) {
    return (
      <div className="border border-stone bg-cream p-5">
        <p className="font-display text-lg italic text-ink">Demande envoyée</p>
        <p className="mt-2 text-sm text-muted">{state.message}</p>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-champagne-2">Référence : {state.data?.number}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 border border-stone bg-cream p-5">
      <p className="eyebrow text-champagne-2">Demander un retour</p>
      <input type="hidden" name="orderId" value={orderId} />
      <Field label="Article à retourner">
        <select name="orderItemId" required value={selected ?? ""} onChange={(e) => setSelected(Number(e.target.value))} className="field">
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.name} (×{i.quantity})</option>
          ))}
        </select>
      </Field>
      <Field label="Motif">
        <select name="reason" required className="field">
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Détails (facultatif)">
        <textarea name="message" rows={3} className="field" placeholder="Décrivez le problème…" />
      </Field>
      {state && !state.ok && <p className="text-xs text-error" role="alert">{state.error}</p>}
      <button disabled={pending} className="btn-secondary">
        {pending ? "Envoi…" : "Envoyer la demande"}
      </button>
    </form>
  );
}
