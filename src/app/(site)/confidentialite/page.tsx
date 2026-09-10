import type { Metadata } from "next";
import { Breadcrumbs, PageHeader } from "@/components/ui/primitives";
export const metadata: Metadata = { title: "Politique de confidentialité" };
const S = [
  ["Données collectées", "Nom, e-mail, téléphone, adresse de livraison, historique de commandes. Aucune donnée bancaire n'est stockée sur nos serveurs."],
  ["Finalités", "Traitement et livraison des commandes, service client, et — avec votre accord — envoi de notre Journal mensuel."],
  ["Conservation", "Les données de commande sont conservées 10 ans à des fins comptables ; les données de compte jusqu'à suppression du compte."],
  ["Vos droits", "Conformément à la loi organique n° 2004-63, vous disposez d'un droit d'accès, de rectification et de suppression. Écrivez-nous via la page Aide."],
  ["Cookies", "Nous utilisons uniquement des cookies strictement nécessaires (session, panier). Aucun traceur publicitaire tiers."],
];
export default function ConfidentialitePage() {
  return (
    <div className="container-lux py-section-sm">
      <Breadcrumbs items={[{ label: "Confidentialité" }]} />
      <div className="mt-8">
        <PageHeader eyebrow="Confidentialité" title="Politique de confidentialité" />
      </div>
      <div className="mx-auto max-w-2xl space-y-8 py-14">
        {S.map(([t, b]) => (
          <section key={t}>
            <h2 className="text-[15px] text-ink">{t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-charcoal">{b}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
