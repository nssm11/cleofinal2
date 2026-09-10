"use client";
import { useActionState } from "react";
import { Field } from "@/components/ui/primitives";
import { createTicketAction } from "@/actions/shop";

const TYPES = [
  { value: "product_question", label: "Question produit" },
  { value: "pharmacist_advice", label: "Conseil pharmacien" },
  { value: "order", label: "Commande" },
  { value: "delivery", label: "Livraison" },
  { value: "damaged_product", label: "Produit endommagé" },
  { value: "return_request", label: "Retour / échange" },
  { value: "complaint", label: "Réclamation" },
  { value: "other", label: "Autre" },
] as const;

export function ContactForm() {
  const [state, action, pending] = useActionState(createTicketAction, null);
  if (state?.ok) return (
    <div className="border border-stone bg-cream p-6">
      <p className="font-display text-display-sm text-ink">Message envoyé</p>
      <p className="mt-2 text-sm text-muted">{state.message}</p>
    </div>
  );
  const err = (k: string) => (state && !state.ok ? state.fieldErrors?.[k] : undefined);
  return (
    <form action={action} className="space-y-4 border border-stone bg-cream p-6">
      <p className="eyebrow">Nous écrire</p>
      <Field label="Type de demande">
        <select name="type" className="field" defaultValue="other">
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom" error={err("name")}><input name="name" required className="field" /></Field>
        <Field label="E-mail" error={err("email")}><input name="email" type="email" required className="field" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sujet" error={err("subject")}><input name="subject" required className="field" /></Field>
        <Field label="N° de commande (facultatif)"><input name="orderNumber" placeholder="CL-…" className="field" /></Field>
      </div>
      <Field label="Message" error={err("message")}>
        <textarea name="message" rows={5} required className="field" />
      </Field>
      {state && !state.ok && <p className="text-xs text-error" role="alert">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full sm:w-auto">{pending ? "Envoi…" : "Envoyer"}</button>
    </form>
  );
}
