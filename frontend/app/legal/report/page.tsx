'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LegalLayout from '../../../components/LegalLayout';

const PROBLEM_TYPES = [
  { key: 'bug', label: '🐛 Bug technique', desc: 'Erreur, page bloquée, fonctionnalité qui ne marche pas' },
  { key: 'question', label: '❓ Contenu incorrect', desc: 'Question TCF erronée, mauvaise réponse, explication incorrecte' },
  { key: 'payment', label: '💳 Problème de paiement', desc: 'Facturation erronée, remboursement non reçu, abonnement bloqué' },
  { key: 'ai', label: '🤖 Sophie IA incorrecte', desc: 'Correction IA fausse, feedback non pertinent' },
  { key: 'account', label: '👤 Problème de compte', desc: 'Connexion impossible, données manquantes, profil incorrect' },
  { key: 'accessibility', label: '♿ Accessibilité', desc: 'Problème avec un lecteur d\'écran, navigation clavier, contraste' },
  { key: 'other', label: '📋 Autre', desc: 'Tout autre problème non listé' },
];

const SEVERITY = [
  { key: 'critical', label: '🔴 Critique', desc: 'Service inutilisable' },
  { key: 'high', label: '🟠 Élevé', desc: 'Fonctionnalité majeure affectée' },
  { key: 'medium', label: '🟡 Moyen', desc: 'Gêne mais je peux continuer' },
  { key: 'low', label: '🟢 Faible', desc: 'Problème mineur ou cosmétique' },
];

export default function ReportPage() {
  const [form, setForm] = useState({ type: '', severity: '', description: '', url: '', email: '', steps: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [ticketId] = useState(`FIA-${Math.floor(Math.random() * 90000) + 10000}`);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const categoryMap: Record<string, string> = {
        bug: 'bug', question: 'contenu', payment: 'paiement', ai: 'contenu',
        account: 'bug', accessibility: 'autre', other: 'autre',
      };
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category:    categoryMap[form.type] ?? 'autre',
          description: `[${form.type}/${form.severity}] ${form.description}\n\nÉtapes: ${form.steps}`,
          email:       form.email,
          url:         form.url,
        }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Écrivez directement à urgent@reussirtcf.ca');
    } finally {
      setSending(false);
    }
  }

  return (
    <LegalLayout
      title="Signaler un problème"
      subtitle="Aidez-nous à améliorer RéussirTCF — chaque rapport compte"
      icon="🚨"
      lastUpdated="13 juin 2026"
    >
      <div className="space-y-8">

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">⚡</span>
          <div>
            <p className="font-bold text-amber-800 text-sm">Problème urgent ?</p>
            <p className="text-amber-700 text-sm">Si votre problème est critique (service inutilisable, paiement erroné), contactez-nous directement sur <a href="mailto:urgent@reussirtcf.ca" className="underline font-bold">urgent@reussirtcf.ca</a> — réponse sous 4 heures.</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6 }}
                className="text-6xl mb-5"
              >
                ✅
              </motion.div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Rapport envoyé !</h3>
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-2 mb-4">
                <span className="text-sm font-bold text-indigo-700">Numéro de ticket :</span>
                <code className="text-indigo-900 font-black">{ticketId}</code>
              </div>
              <p className="text-slate-600 text-sm max-w-sm mx-auto">
                Notre équipe technique a été notifiée. Nous vous répondrons sous <strong>24-48h ouvrables</strong>.
              </p>
              {form.email && (
                <p className="text-slate-400 text-xs mt-2">Confirmation envoyée à <strong>{form.email}</strong></p>
              )}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => { setSent(false); setForm({ type: '', severity: '', description: '', url: '', email: '', steps: '' }); }}
                  className="text-sm border-2 border-slate-200 text-slate-700 font-bold px-6 py-3 rounded-xl hover:border-indigo-300 transition-colors"
                >
                  Signaler un autre problème
                </button>
                <a href="/" className="text-sm bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-center">
                  Retour à l'accueil
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="space-y-7"
            >

              {/* Type de problème */}
              <div>
                <label className="block text-sm font-black text-slate-900 mb-3">Type de problème *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PROBLEM_TYPES.map(pt => (
                    <button
                      key={pt.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: pt.key }))}
                      className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        form.type === pt.key
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-800">{pt.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{pt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sévérité */}
              <div>
                <label className="block text-sm font-black text-slate-900 mb-3">Niveau de gravité *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SEVERITY.map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, severity: s.key }))}
                      className={`text-left px-3 py-3 rounded-xl border-2 transition-all ${
                        form.severity === s.key
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-800">{s.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Description du problème *</label>
                <textarea
                  required
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez le problème en détail : qu'avez-vous fait, qu'avez-vous observé, qu'attendiez-vous ?"
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                />
              </div>

              {/* Étapes de reproduction */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Étapes pour reproduire le problème
                  <span className="text-slate-400 font-normal ml-1">(optionnel mais très utile)</span>
                </label>
                <textarea
                  value={form.steps}
                  onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                  placeholder="1. J'étais sur la page /practice/CO&#10;2. J'ai cliqué sur la réponse B&#10;3. La page s'est bloquée..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    URL de la page concernée
                    <span className="text-slate-400 font-normal ml-1">(optionnel)</span>
                  </label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://reussirtcf.ca/practice/CO"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Votre email
                    <span className="text-slate-400 font-normal ml-1">(pour le suivi)</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jean@email.com"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
              )}

              <motion.button
                type="submit"
                disabled={sending || !form.type || !form.severity || !form.description}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-black py-4 rounded-2xl shadow hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base"
              >
                {sending ? (
                  <><span className="animate-spin">⏳</span> Envoi du rapport...</>
                ) : (
                  <>🚨 Envoyer le rapport</>
                )}
              </motion.button>

              <p className="text-xs text-center text-slate-400">
                Votre rapport est traité sous 24-48h ouvrables · Un numéro de ticket vous sera attribué
              </p>

            </motion.form>
          )}
        </AnimatePresence>

      </div>
    </LegalLayout>
  );
}
