import LegalLayout from '../../../components/LegalLayout';

export const metadata = { title: "Conditions d'utilisation — FrançaisIA" };

export default function TermsPage() {
  return (
    <LegalLayout
      title="Conditions d'utilisation"
      subtitle="Les règles qui régissent l'utilisation de la plateforme FrançaisIA"
      icon="📋"
      lastUpdated="13 juin 2026"
    >
      <div className="space-y-10 text-slate-700 text-sm leading-relaxed">

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-amber-800 font-medium">
            En créant un compte sur FrançaisIA, vous acceptez ces conditions dans leur intégralité. Si vous n'êtes pas d'accord, veuillez ne pas utiliser le service.
          </p>
        </div>

        <Section title="1. Description du service">
          <p>
            FrançaisIA est une plateforme d'apprentissage en ligne qui propose une préparation aux 4 compétences du test TCF Canada (Compréhension Orale, Compréhension Écrite, Expression Écrite, Expression Orale) via un tuteur IA nommé Sophie.
          </p>
          <p className="mt-3">
            Le service comprend : des exercices QCM, des corrections IA de textes écrits, des simulations d'examen complet, et un suivi de progression personnalisé.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mt-3">
            <p className="text-slate-600 font-medium">⚠️ FrançaisIA n'est pas affilié à France Éducation International (FEI), organisateur officiel du TCF Canada. Nous sommes un service de préparation indépendant.</p>
          </div>
        </Section>

        <Section title="2. Inscription et compte">
          <ul className="list-disc pl-5 space-y-2">
            <li>Vous devez avoir <strong>au moins 16 ans</strong> pour créer un compte</li>
            <li>Vous êtes responsable de la confidentialité de vos identifiants de connexion</li>
            <li>Un seul compte par personne est autorisé</li>
            <li>Vous devez fournir des informations exactes lors de l'inscription</li>
            <li>Vous êtes responsable de toute activité effectuée depuis votre compte</li>
          </ul>
        </Section>

        <Section title="3. Abonnements et paiement">
          <SubSection title="3.1 Plans disponibles">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              {[
                { plan: 'Gratuit', price: '0$/mois', features: ['5 sessions/mois', 'CO et CE uniquement', 'Tableau de bord basique'] },
                { plan: 'Pro', price: '9,99$/mois', features: ['Sessions illimitées', '4 compétences', 'Sophie IA complète', 'Examens simulés'] },
                { plan: 'Annuel', price: '79,99$/an', features: ['Tout le plan Pro', '-33% de réduction', 'Support prioritaire'] },
              ].map(p => (
                <div key={p.plan} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="font-black text-slate-900">{p.plan}</div>
                  <div className="text-indigo-600 font-bold text-lg">{p.price}</div>
                  <ul className="mt-2 space-y-1">
                    {p.features.map(f => <li key={f} className="text-xs text-slate-500">✓ {f}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </SubSection>
          <SubSection title="3.2 Renouvellement automatique">
            <p>Les abonnements sont renouvelés automatiquement à la fin de chaque période. Vous pouvez annuler à tout moment depuis votre profil, au moins 24h avant le renouvellement.</p>
          </SubSection>
          <SubSection title="3.3 Taxes">
            <p>Les prix indiqués sont en dollars canadiens (CAD). Les taxes applicables (TPS/TVQ) sont ajoutées au moment du paiement selon votre province de résidence.</p>
          </SubSection>
        </Section>

        <Section title="4. Propriété intellectuelle">
          <p>Tous les contenus de la plateforme (questions TCF, textes, corrections IA, design, logo, code) sont la propriété exclusive de FrançaisIA Inc. ou de ses partenaires, et sont protégés par le droit d'auteur canadien.</p>
          <p className="mt-3">Il vous est <strong>interdit de</strong> :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Copier, reproduire ou redistribuer les questions et contenus</li>
            <li>Utiliser des robots ou scripts pour extraire des données (scraping)</li>
            <li>Vendre ou louer l'accès à votre compte</li>
            <li>Contourner les mesures de sécurité de la plateforme</li>
          </ul>
        </Section>

        <Section title="5. Comportement acceptable">
          <p>En utilisant FrançaisIA, vous vous engagez à :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Utiliser le service à des fins légales et personnelles uniquement</li>
            <li>Ne pas soumettre de contenu offensant, haineux ou illégal dans les exercices d'expression</li>
            <li>Ne pas tenter de contourner les limites d'utilisation du plan gratuit</li>
            <li>Ne pas partager votre compte avec d'autres personnes</li>
          </ul>
        </Section>

        <Section title="6. Disponibilité du service">
          <p>Nous nous efforçons de maintenir une disponibilité de <strong>99,5%</strong> par mois. Des maintenances planifiées peuvent survenir, annoncées 48h à l'avance par email. FrançaisIA ne saurait être tenu responsable des interruptions dues à des facteurs hors de notre contrôle (pannes réseau, force majeure).</p>
        </Section>

        <Section title="7. Limitation de responsabilité">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p>FrançaisIA est un outil de <strong>préparation</strong> au TCF Canada. Nous ne garantissons pas un score spécifique à l'examen officiel.</p>
            <p>La responsabilité maximale de FrançaisIA Inc. est limitée au montant payé pour l'abonnement au cours des 3 derniers mois.</p>
            <p>Nous déclinons toute responsabilité pour les décisions d'immigration basées sur les estimations de score de la plateforme.</p>
          </div>
        </Section>

        <Section title="8. Résiliation">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Par vous</strong> : Vous pouvez supprimer votre compte à tout moment depuis Paramètres &gt; Compte &gt; Supprimer mon compte</li>
            <li><strong>Par FrançaisIA</strong> : Nous pouvons suspendre ou résilier votre compte en cas de violation des présentes conditions, sans préavis</li>
            <li>Après résiliation, vos données sont supprimées conformément à notre politique de confidentialité</li>
          </ul>
        </Section>

        <Section title="9. Modifications">
          <p>FrançaisIA se réserve le droit de modifier ces conditions. Toute modification sera notifiée par email 30 jours avant son entrée en vigueur. La poursuite de l'utilisation vaut acceptation.</p>
        </Section>

        <Section title="10. Droit applicable">
          <p>Ces conditions sont régies par les lois de la province de <strong>Québec</strong> et les lois fédérales du <strong>Canada</strong>. Tout litige sera soumis à la compétence exclusive des tribunaux de Montréal, Québec.</p>
        </Section>

        <div className="bg-slate-900 text-white rounded-2xl p-6 text-center">
          <p className="font-bold mb-2">Des questions sur nos conditions ?</p>
          <a href="mailto:legal@francaisIA.ca" className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">
            legal@francaisIA.ca
          </a>
        </div>

      </div>
    </LegalLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-black text-slate-900 mb-4 pb-2 border-b border-slate-100">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold text-slate-800 mb-2">{title}</h3>
      {children}
    </div>
  );
}
