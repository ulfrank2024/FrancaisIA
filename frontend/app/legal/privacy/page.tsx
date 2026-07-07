import LegalLayout from '../../../components/LegalLayout';

export const metadata = { title: 'Politique de confidentialité — RéussirTCF' };

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      subtitle="Comment nous collectons, utilisons et protégeons vos données personnelles"
      icon="🔒"
      lastUpdated="13 juin 2026"
    >
      <div className="space-y-10 text-slate-700 text-sm leading-relaxed">

        <section>
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6">
            <p className="text-indigo-800 font-medium">
              RéussirTCF s'engage à protéger la vie privée de ses utilisateurs. Cette politique explique quelles données nous collectons, pourquoi, et comment vous pouvez exercer vos droits. Elle s'applique à tous les utilisateurs de la plateforme <strong>reussir-tcf.ca</strong>.
            </p>
          </div>
        </section>

        <Section title="1. Responsable du traitement">
          <p>
            <strong>RéussirTCF Inc.</strong><br />
            Montréal, Québec, Canada<br />
            Email : <a href="mailto:privacy@reussir-tcf.ca" className="text-indigo-600 hover:underline">privacy@reussir-tcf.ca</a>
          </p>
        </Section>

        <Section title="2. Données collectées">
          <SubSection title="2.1 Données de compte (via Clerk)">
            <p>Lors de votre inscription, nous collectons :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Adresse email</li>
              <li>Nom complet (facultatif)</li>
              <li>Photo de profil (si connexion via Google ou autre fournisseur)</li>
              <li>Identifiant unique Clerk (généré automatiquement)</li>
            </ul>
          </SubSection>
          <SubSection title="2.2 Données de progression">
            <p>Pendant votre utilisation de la plateforme, nous enregistrons :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Scores obtenus par section TCF (CO, CE, EE, EO)</li>
              <li>Historique des sessions de pratique</li>
              <li>Durée de chaque session</li>
              <li>Objectif d'immigration sélectionné lors de l'onboarding</li>
            </ul>
          </SubSection>
          <SubSection title="2.3 Données techniques">
            <ul className="list-disc pl-5 space-y-1">
              <li>Adresse IP (pour la sécurité et la limitation du débit)</li>
              <li>Type de navigateur et système d'exploitation</li>
              <li>Pages visitées et durée de visite</li>
              <li>Données de cookies (voir section 7)</li>
            </ul>
          </SubSection>
        </Section>

        <Section title="3. Utilisation des données">
          <p>Nous utilisons vos données pour :</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {[
              { icon: '🎯', text: 'Personnaliser votre parcours de préparation TCF' },
              { icon: '📊', text: 'Afficher votre tableau de bord de progression' },
              { icon: '🤖', text: 'Alimenter Sophie IA avec le contexte de vos erreurs' },
              { icon: '🔐', text: 'Sécuriser votre compte et prévenir les fraudes' },
              { icon: '📧', text: 'Envoyer des notifications relatives à votre compte (avec votre accord)' },
              { icon: '⚖️', text: 'Respecter nos obligations légales au Canada' },
            ].map(item => (
              <div key={item.icon} className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <span className="text-sm text-slate-600">{item.text}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="4. Partage des données">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
            <p className="text-emerald-800 font-semibold">✅ Nous ne vendons jamais vos données personnelles à des tiers.</p>
          </div>
          <p>Nous partageons vos données uniquement avec :</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Clerk</strong> — Fournisseur d'authentification (USA, conforme SOC 2 Type II)</li>
            <li><strong>Anthropic</strong> — Vos réponses EE/EO sont transmises à l'API Claude pour correction. Anthropic ne conserve pas ces données au-delà du traitement.</li>
            <li><strong>Hébergeur cloud</strong> — Données stockées sur serveurs sécurisés au Canada</li>
            <li><strong>Autorités légales</strong> — Uniquement si requis par la loi canadienne</li>
          </ul>
        </Section>

        <Section title="5. Base légale du traitement (LPRPDE / Loi 25)">
          <p>Nous traitons vos données sur les bases suivantes :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Consentement</strong> — Pour les communications marketing et les cookies non essentiels</li>
            <li><strong>Exécution du contrat</strong> — Pour fournir le service de préparation TCF</li>
            <li><strong>Intérêt légitime</strong> — Pour la sécurité et la prévention des fraudes</li>
            <li><strong>Obligation légale</strong> — Pour répondre aux demandes des autorités canadiennes</li>
          </ul>
        </Section>

        <Section title="6. Vos droits">
          <p>Conformément à la <strong>Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE)</strong> et à la <strong>Loi 25</strong> (Québec), vous avez le droit de :</p>
          <div className="space-y-2 mt-3">
            {[
              { right: 'Accès', desc: 'Obtenir une copie de toutes vos données personnelles' },
              { right: 'Rectification', desc: 'Corriger des informations inexactes' },
              { right: 'Suppression', desc: 'Supprimer votre compte et toutes vos données (délai : 30 jours)' },
              { right: 'Portabilité', desc: 'Recevoir vos données dans un format structuré (JSON/CSV)' },
              { right: 'Opposition', desc: 'Vous opposer à certains traitements (marketing, profilage)' },
            ].map(item => (
              <div key={item.right} className="flex gap-3 bg-slate-50 rounded-xl p-3">
                <span className="font-bold text-indigo-700 min-w-[100px]">{item.right}</span>
                <span className="text-slate-600 text-sm">{item.desc}</span>
              </div>
            ))}
          </div>
          <p className="mt-3">Pour exercer vos droits, écrivez à <a href="mailto:privacy@reussir-tcf.ca" className="text-indigo-600 hover:underline">privacy@reussir-tcf.ca</a>. Nous répondons dans un délai de <strong>30 jours</strong>.</p>
        </Section>

        <Section title="7. Cookies">
          <p>Nous utilisons les types de cookies suivants :</p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-3 rounded-tl-xl font-bold text-slate-700">Type</th>
                  <th className="text-left p-3 font-bold text-slate-700">Finalité</th>
                  <th className="text-left p-3 rounded-tr-xl font-bold text-slate-700">Durée</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: 'Essentiels', purpose: 'Session Clerk, sécurité CSRF', duration: 'Session' },
                  { type: 'Fonctionnels', purpose: 'Préférences langue, thème', duration: '1 an' },
                  { type: 'Analytiques', purpose: 'Statistiques de visite anonymisées', duration: '2 ans' },
                  { type: 'Marketing', purpose: 'Publicités ciblées (désactivé par défaut)', duration: '6 mois' },
                ].map((row, i) => (
                  <tr key={row.type} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-3 font-medium text-slate-800">{row.type}</td>
                    <td className="p-3 text-slate-600">{row.purpose}</td>
                    <td className="p-3 text-slate-500">{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="8. Conservation des données">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Données de compte</strong> — Conservées pendant la durée du compte + 1 an après suppression</li>
            <li><strong>Données de progression</strong> — Conservées pendant la durée du compte</li>
            <li><strong>Données de paiement</strong> — Conservées 7 ans (obligation fiscale canadienne)</li>
            <li><strong>Logs techniques</strong> — 90 jours maximum</li>
          </ul>
        </Section>

        <Section title="9. Sécurité">
          <p>Nous protégeons vos données par :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Chiffrement TLS 1.3 pour toutes les communications</li>
            <li>Hachage des mots de passe avec bcrypt (délégué à Clerk)</li>
            <li>Tokens JWT à durée limitée (authentification)</li>
            <li>Rate limiting sur toutes les API</li>
            <li>Accès aux bases de données restreint par IP et VPN</li>
          </ul>
        </Section>

        <Section title="10. Modifications de cette politique">
          <p>Nous pouvons mettre à jour cette politique. En cas de modification substantielle, nous vous informerons par email 30 jours avant l'entrée en vigueur. La poursuite de l'utilisation du service constitue votre acceptation.</p>
        </Section>

        <div className="bg-slate-900 text-white rounded-2xl p-6 text-center">
          <p className="font-bold mb-2">Questions sur vos données personnelles ?</p>
          <a href="mailto:privacy@reussir-tcf.ca" className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">
            privacy@reussir-tcf.ca
          </a>
          <p className="text-slate-400 text-xs mt-2">Réponse garantie sous 30 jours ouvrables</p>
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
