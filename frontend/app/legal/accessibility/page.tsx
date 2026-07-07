import LegalLayout from '../../../components/LegalLayout';

export const metadata = { title: 'Accessibilité — RéussirTCF' };

export default function AccessibilityPage() {
  return (
    <LegalLayout
      title="Accessibilité"
      subtitle="RéussirTCF s'engage à rendre son service accessible à tous"
      icon="♿"
      lastUpdated="13 juin 2026"
    >
      <div className="space-y-10 text-slate-700 text-sm leading-relaxed">

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <p className="text-indigo-800 font-medium">
            RéussirTCF s'engage à rendre sa plateforme accessible aux personnes en situation de handicap, conformément aux <strong>Règles pour l'accessibilité des contenus Web (WCAG) 2.1 niveau AA</strong> et aux exigences de la <strong>Loi canadienne sur l'accessibilité</strong>.
          </p>
        </div>

        <Section title="1. Notre engagement">
          <p>Nous croyons que chaque membre de la diaspora camerounaise devrait pouvoir accéder à la préparation TCF Canada, quelles que soient ses capacités. L'accessibilité numérique est une priorité dans notre développement.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {[
              { icon: '⌨️', title: 'Navigation clavier', desc: 'Tous les éléments interactifs sont accessibles au clavier (Tab, Enter, Échap, flèches)' },
              { icon: '🔊', title: 'Lecteurs d\'écran', desc: 'Compatible avec NVDA, JAWS, VoiceOver (macOS/iOS) et TalkBack (Android)' },
              { icon: '🎨', title: 'Contraste des couleurs', desc: 'Ratio de contraste minimum 4.5:1 pour tous les textes (norme WCAG AA)' },
              { icon: '📝', title: 'Alternatives textuelles', desc: 'Toutes les images et icônes ont des attributs alt ou aria-label descriptifs' },
              { icon: '🔤', title: 'Taille des textes', desc: 'Textes redimensionnables jusqu\'à 200% sans perte de contenu ni de fonctionnalité' },
              { icon: '🎬', title: 'Contenus animés', desc: 'Les animations respectent prefers-reduced-motion. Possibilité de les désactiver.' },
            ].map(item => (
              <div key={item.title} className="flex gap-3 bg-slate-50 rounded-xl p-4">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <div className="font-bold text-slate-800">{item.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="2. Niveau de conformité WCAG 2.1">
          <p>Notre objectif est d'atteindre le niveau <strong>AA</strong> des WCAG 2.1. Voici notre état de conformité actuel :</p>
          <div className="space-y-2 mt-4">
            {[
              { criterion: 'Perceptible', status: 'Conforme', items: ['Textes alternatifs (1.1)', 'Sous-titres (1.2 — en cours)', 'Adaptable (1.3)', 'Distinguable (1.4)'], color: 'emerald' },
              { criterion: 'Utilisable', status: 'Conforme', items: ['Accessible au clavier (2.1)', 'Suffisamment de temps (2.2)', 'Crises et réactions physiques (2.3)', 'Navigable (2.4)'], color: 'emerald' },
              { criterion: 'Compréhensible', status: 'Partiellement conforme', items: ['Lisible (3.1)', 'Prévisible (3.2)', 'Aide à la saisie (3.3 — en cours)'], color: 'amber' },
              { criterion: 'Robuste', status: 'Conforme', items: ['Compatible (4.1)'], color: 'emerald' },
            ].map(item => (
              <div key={item.criterion} className={`border-l-4 ${item.color === 'emerald' ? 'border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-amber-50'} rounded-r-xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-black text-slate-800">{item.criterion}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${item.color === 'emerald' ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.items.map(i => <span key={i} className="text-xs text-slate-600 bg-white rounded-full px-2 py-0.5 border border-slate-200">{i}</span>)}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="3. Technologies assistives testées">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            {[
              { name: 'VoiceOver', platform: 'macOS / iOS', icon: '🍎' },
              { name: 'NVDA', platform: 'Windows', icon: '🪟' },
              { name: 'JAWS', platform: 'Windows', icon: '🪟' },
              { name: 'TalkBack', platform: 'Android', icon: '🤖' },
            ].map(t => (
              <div key={t.name} className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-xl mb-1">{t.icon}</div>
                <div className="font-bold text-slate-800 text-sm">{t.name}</div>
                <div className="text-xs text-slate-400">{t.platform}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="4. Contenus non accessibles">
          <p>Certains contenus ne sont pas encore entièrement conformes. Voici les points identifiés et nos plans d'amélioration :</p>
          <div className="space-y-3 mt-3">
            {[
              { issue: 'Sous-titres pour les exercices audio (CO)', plan: 'Ajout de transcriptions textuelles — prévu Q3 2026' },
              { issue: 'Formulaire de rapport de bug — amélioration aide à la saisie', plan: 'Messages d\'erreur plus descriptifs — prévu Q2 2026' },
              { issue: 'Animations framer-motion sans option de réduction de mouvement', plan: 'Détection prefers-reduced-motion — en cours' },
            ].map(item => (
              <div key={item.issue} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-500">⚠️</span>
                  <span className="font-semibold text-slate-800 text-sm">{item.issue}</span>
                </div>
                <div className="text-xs text-indigo-600 ml-6">🗓 {item.plan}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="5. Signaler un problème d'accessibilité">
          <p>Si vous rencontrez un obstacle lors de l'utilisation de RéussirTCF, nous souhaitons le corriger rapidement. Contactez-nous :</p>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mt-3">
            <div className="space-y-2">
              <div>📧 <a href="mailto:accessibility@reussir-tcf.ca" className="text-indigo-700 font-bold hover:underline">accessibility@reussir-tcf.ca</a></div>
              <div>📋 <a href="/legal/report" className="text-indigo-700 hover:underline">Formulaire de signalement en ligne</a></div>
              <p className="text-xs text-slate-500 mt-2">Nous nous engageons à répondre sous <strong>5 jours ouvrables</strong> et à corriger les problèmes critiques d'accessibilité sous <strong>30 jours</strong>.</p>
            </div>
          </div>
        </Section>

        <Section title="6. Procédure officielle">
          <p>Si votre demande n'a pas reçu de réponse satisfaisante, vous pouvez contacter le <strong>Commissariat à l'accessibilité du Canada</strong> :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Site : accessibilite.canada.ca</li>
            <li>Téléphone : 1-800-903-9988</li>
          </ul>
        </Section>

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
