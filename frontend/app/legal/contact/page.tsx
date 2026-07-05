'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LegalLayout from '../../../components/LegalLayout';

const SUBJECTS = [
  'Mon compte / connexion',
  'Abonnement et paiement',
  'Problème technique',
  'Contenu TCF incorrect',
  'Demande de remboursement',
  'Question sur mon score',
  'Partenariat',
  'Autre',
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Réessayez ou écrivez à support@reussirtcf.ca');
    } finally {
      setSending(false);
    }
  }

  return (
    <LegalLayout
      title="Contact & Support"
      subtitle="Notre équipe répond sous 24h ouvrables — nous sommes là pour vous aider"
      icon="💬"
      lastUpdated="13 juin 2026"
    >
      <div className="space-y-10">

        {/* Canaux de contact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '📧', title: 'Email', value: 'support@reussirtcf.ca', sub: 'Réponse sous 24h ouvrables', color: 'bg-indigo-50 border-indigo-100' },
            { icon: '💬', title: 'WhatsApp', value: '+1 (514) 000-0000', sub: 'Lun–Ven · 9h–18h EST', color: 'bg-green-50 border-green-100' },
            { icon: '🌍', title: 'Communauté', value: 'Groupe Facebook', sub: 'Diaspora Camerounaise TCF', color: 'bg-sky-50 border-sky-100' },
          ].map(c => (
            <div key={c.title} className={`${c.color} border rounded-2xl p-5 text-center`}>
              <div className="text-3xl mb-2">{c.icon}</div>
              <div className="font-black text-slate-800">{c.title}</div>
              <div className="text-sm text-indigo-700 font-semibold mt-1">{c.value}</div>
              <div className="text-xs text-slate-500 mt-1">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Temps de réponse */}
        <div className="bg-slate-50 rounded-2xl p-5">
          <h3 className="font-black text-slate-800 mb-3">⏱ Temps de réponse garanti</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { type: 'Problème critique', delay: '< 4 heures', color: 'text-red-600', desc: 'Connexion impossible, paiement échoué' },
              { type: 'Question standard', delay: '< 24 heures', color: 'text-amber-600', desc: 'Compte, abonnement, questions TCF' },
              { type: 'Demande générale', delay: '< 48 heures', color: 'text-emerald-600', desc: 'Partenariat, suggestions, feedback' },
            ].map(item => (
              <div key={item.type} className="bg-white rounded-xl p-3 border border-slate-200">
                <div className={`font-black text-lg ${item.color}`}>{item.delay}</div>
                <div className="font-semibold text-slate-800 text-sm">{item.type}</div>
                <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulaire */}
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-6 pb-2 border-b border-slate-100">Envoyer un message</h2>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-10 text-center"
              >
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-black text-emerald-800 mb-2">Message envoyé !</h3>
                <p className="text-emerald-700">Notre équipe vous répondra à <strong>{form.email}</strong> sous 24h ouvrables.</p>
                <button
                  onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                  className="mt-6 text-sm text-emerald-700 underline hover:no-underline"
                >
                  Envoyer un autre message
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nom complet *</label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jean-Baptiste Mbarga"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Email *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="jean@email.com"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Sujet *</label>
                  <select
                    required
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                  >
                    <option value="">Choisir un sujet...</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Message *</label>
                  <textarea
                    required
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Décrivez votre demande en détail..."
                    rows={6}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={sending}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-black py-4 rounded-2xl shadow hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {sending ? <><span className="animate-spin">⏳</span> Envoi en cours...</> : '📤 Envoyer le message'}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* FAQ rapide */}
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-5 pb-2 border-b border-slate-100">Questions fréquentes</h2>
          <div className="space-y-3">
            {[
              { q: 'Comment annuler mon abonnement ?', a: 'Dans votre compte → Paramètres → Abonnement → Annuler. L\'accès reste actif jusqu\'à la fin de la période payée.' },
              { q: 'Mes résultats TCF sur la plateforme sont-ils officiels ?', a: 'Non. RéussirTCF propose une estimation entraînante. Seul le test officiel TCF Canada (France Éducation International) est reconnu par IRCC.' },
              { q: 'Comment obtenir mon remboursement sous 14 jours ?', a: 'Envoyez un email à refund@reussirtcf.ca avec votre nom et la date de paiement. Traitement sous 5-10 jours ouvrables.' },
              { q: 'Sophie IA utilise-t-elle mes données pour s\'entraîner ?', a: 'Non. Vos textes envoyés à Sophie sont traités par l\'API Claude (Anthropic) uniquement pour la correction, sans stockage permanent.' },
            ].map(item => (
              <details key={item.q} className="group bg-slate-50 border border-slate-200 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-semibold text-slate-800 text-sm list-none">
                  {item.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600">{item.a}</div>
              </details>
            ))}
          </div>
        </div>

      </div>
    </LegalLayout>
  );
}
