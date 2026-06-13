import LegalLayout from '../../../components/LegalLayout';

export const metadata = { title: 'Politique de remboursement — FrançaisIA' };

export default function RefundPage() {
  return (
    <LegalLayout
      title="Politique de remboursement"
      subtitle="Garantie satisfait ou remboursé — votre investissement est protégé"
      icon="💳"
      lastUpdated="13 juin 2026"
    >
      <div className="space-y-10 text-slate-700 text-sm leading-relaxed">

        {/* Garantie phare */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white text-center">
          <div className="text-5xl mb-3">🛡️</div>
          <h2 className="text-2xl font-black mb-2">Garantie satisfait ou remboursé</h2>
          <div className="text-5xl font-black my-4">14 jours</div>
          <p className="text-emerald-100 max-w-md mx-auto">
            Si vous n'êtes pas satisfait dans les 14 jours suivant votre premier paiement, nous vous remboursons intégralement — sans poser de questions.
          </p>
        </div>

        <Section title="1. Champ d'application">
          <p>Cette politique s'applique à tous les abonnements payants de FrançaisIA (plan Pro mensuel et plan Annuel). Elle ne s'applique pas au plan gratuit (qui ne génère aucun frais).</p>
        </Section>

        <Section title="2. Garantie 14 jours — Premier abonnement">
          <p>Pour votre <strong>premier abonnement</strong>, vous bénéficiez d'une garantie de remboursement complet sous 14 jours calendaires à compter de la date de premier paiement, sans condition et sans justification requise.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {[
              { icon: '✅', title: 'Remboursement complet', desc: '100% du montant payé, sans frais de traitement' },
              { icon: '⚡', title: 'Délai de traitement', desc: '5 à 10 jours ouvrables selon votre banque' },
              { icon: '🚫', title: 'Sans justification', desc: "Aucune raison n'est nécessaire dans les 14 jours" },
            ].map(item => (
              <div key={item.title} className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-bold text-slate-800 text-sm">{item.title}</div>
                <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="3. Remboursements au-delà de 14 jours">
          <p>Au-delà de la période de garantie initiale, les remboursements sont examinés au cas par cas. Nous considérons favorablement les demandes dans les situations suivantes :</p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li><strong>Problème technique documenté</strong> : Indisponibilité répétée du service (&gt;24h cumulative sur le mois facturé)</li>
            <li><strong>Double facturation</strong> : Erreur de facturation de notre part</li>
            <li><strong>Circonstances exceptionnelles</strong> : Maladie grave, décès dans la famille — sur justificatif</li>
          </ul>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
            <p className="text-amber-800 text-sm"><strong>⚠️ Non remboursables</strong> : Les renouvellements automatiques dont l'annulation n'a pas été effectuée dans les délais (voir section 5), et les périodes déjà utilisées au-delà de 14 jours.</p>
          </div>
        </Section>

        <Section title="4. Remboursements partiels">
          <p>Pour les abonnements annuels, si la demande est acceptée après 14 jours, nous calculons un remboursement au prorata des mois non utilisés, déduction faite des frais de traitement (5 CAD).</p>
          <div className="bg-slate-50 rounded-xl p-4 mt-3">
            <p className="font-medium text-slate-800 mb-2">Exemple de calcul :</p>
            <p className="text-slate-600">Abonnement annuel à 79,99 CAD payé le 1er janvier. Demande de remboursement le 1er avril (3 mois utilisés) :</p>
            <p className="mt-2 font-bold text-emerald-700">Remboursement = 79,99 × (9/12) − 5 = <span className="text-xl">54,99 CAD</span></p>
          </div>
        </Section>

        <Section title="5. Annulation vs Remboursement">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="text-left p-3 rounded-tl-xl">Action</th>
                  <th className="text-left p-3">Effet</th>
                  <th className="text-left p-3 rounded-tr-xl">Délai</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { action: 'Annulation', effect: "Arrêt du renouvellement automatique. Accès maintenu jusqu'à la fin de la période payée", delay: 'Immédiat' },
                  { action: 'Remboursement (14j)', effect: 'Remboursement complet + accès résilié immédiatement', delay: '5-10 jours' },
                  { action: 'Remboursement (au-delà)', effect: 'Examiné au cas par cas + accès résilié', delay: '10-15 jours' },
                ].map((row, i) => (
                  <tr key={row.action} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-3 font-bold text-slate-800">{row.action}</td>
                    <td className="p-3 text-slate-600">{row.effect}</td>
                    <td className="p-3 text-slate-500">{row.delay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="6. Méthodes de remboursement">
          <p>Le remboursement est effectué sur le même moyen de paiement utilisé lors de l'achat :</p>
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              { name: 'Visa / Mastercard', delay: '5-7 jours' },
              { name: 'PayPal', delay: '3-5 jours' },
              { name: 'Interac', delay: '3-5 jours' },
              { name: 'Orange Money', delay: '5-10 jours' },
              { name: 'MTN MoMo', delay: '5-10 jours' },
              { name: 'Wave', delay: '3-5 jours' },
            ].map(m => (
              <div key={m.name} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                <div className="text-xs text-slate-400">Délai : {m.delay}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="7. Comment demander un remboursement">
          <div className="space-y-3">
            {[
              { step: '1', text: 'Envoyez un email à refund@francaisIA.ca depuis l\'adresse de votre compte' },
              { step: '2', text: 'Indiquez : votre nom, la date de paiement, et votre identifiant de transaction' },
              { step: '3', text: 'Notre équipe vous répond sous 24h ouvrables' },
              { step: '4', text: 'Le remboursement est initié après validation (délai bancaire selon votre méthode de paiement)' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">{item.step}</div>
                <p className="text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <div className="bg-slate-900 text-white rounded-2xl p-6 text-center">
          <p className="font-bold mb-1">Demande de remboursement</p>
          <a href="mailto:refund@francaisIA.ca" className="text-emerald-400 hover:text-emerald-300 transition-colors font-bold text-lg">
            refund@francaisIA.ca
          </a>
          <p className="text-slate-400 text-xs mt-2">Réponse sous 24h ouvrables · Remboursement garanti 14 jours</p>
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
