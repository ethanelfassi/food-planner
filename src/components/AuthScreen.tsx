'use client';

import React, { useState } from 'react';
import {
  UserAccount,
  UserCustomizationSettings,
  DEFAULT_USER_SETTINGS,
  Friendship,
  SharedGroceryGroup,
} from '@/types';
import {
  Sparkles,
  UserPlus,
  LogIn,
  ArrowRight,
  Lock,
  Mail,
  AtSign,
  User,
  Flame,
  Dumbbell,
  DollarSign,
  Users,
  Check,
  Sun,
  Moon,
} from 'lucide-react';

interface AuthScreenProps {
  isDark: boolean;
  demoAccounts?: UserAccount[];
  initialInviteCode?: string;
  onToggleTheme: () => void;
  onAuthenticated: (payload: {
    user: UserAccount;
    friends: UserAccount[];
    incomingRequests: Friendship[];
    outgoingRequests: Friendship[];
    sharedGroceryGroups: SharedGroceryGroup[];
  }) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  isDark,
  demoAccounts = [],
  initialInviteCode = '',
  onToggleTheme,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialInviteCode ? 'register' : 'login');
  const [step, setStep] = useState<1 | 2>(1);

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInviteCode);

  // Onboarding Macros & Budget state
  const [goalName, setGoalName] = useState('Prise de masse / Forme');
  const [targetCalories, setTargetCalories] = useState(2400);
  const [targetProtein, setTargetProtein] = useState(150);
  const [targetCarbs, setTargetCarbs] = useState(260);
  const [targetFat, setTargetFat] = useState(75);
  const [targetWeeklyBudget, setTargetWeeklyBudget] = useState(120);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          identifier: loginIdentifier,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        throw new Error(data.error || 'Identifiants invalides.');
      }
      onAuthenticated(data);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (accountId: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quick_login',
          accountId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        throw new Error(data.error || 'Impossible de charger ce compte.');
      }
      onAuthenticated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!regUsername.trim() || regUsername.trim().length < 2) {
        setError('Choisissez un @pseudo d’au moins 2 caractères.');
        return;
      }
      if (!regPassword || regPassword.length < 4) {
        setError('Le mot de passe doit contenir au moins 4 caractères.');
        return;
      }
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      const settings: Partial<UserCustomizationSettings> = {
        ...DEFAULT_USER_SETTINGS,
        goalName,
        targetCalories: Number(targetCalories) || 2400,
        targetProtein: Number(targetProtein) || 150,
        targetCarbs: Number(targetCarbs) || 260,
        targetFat: Number(targetFat) || 75,
        targetWeeklyBudget: Number(targetWeeklyBudget) || 120,
      };

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          username: regUsername,
          name: regName || regUsername,
          email: regEmail,
          password: regPassword,
          inviteCode: inviteCode.trim() || undefined,
          settings,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        throw new Error(data.error || "Erreur lors de l'inscription.");
      }
      onAuthenticated(data);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: 'muscle' | 'balanced' | 'cut') => {
    if (preset === 'muscle') {
      setGoalName('Prise de masse athlétique');
      setTargetCalories(3050);
      setTargetProtein(165);
      setTargetCarbs(390);
      setTargetFat(90);
      setTargetWeeklyBudget(135);
    } else if (preset === 'balanced') {
      setGoalName('Alimentation équilibrée & tonique');
      setTargetCalories(2000);
      setTargetProtein(100);
      setTargetCarbs(230);
      setTargetFat(65);
      setTargetWeeklyBudget(100);
    } else {
      setGoalName('Sèche & Définition');
      setTargetCalories(1850);
      setTargetProtein(160);
      setTargetCarbs(160);
      setTargetFat(55);
      setTargetWeeklyBudget(110);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors ${
        isDark ? 'bg-[#09090B] text-stone-100' : 'bg-[#FAF8F5] text-stone-900'
      }`}
    >
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-950 text-white dark:bg-white dark:text-stone-950 flex items-center justify-center font-serif text-xl font-bold shadow-xs">
            M
          </div>
          <div>
            <span className="text-lg font-serif tracking-tight font-medium">
              Metro<span className="italic font-normal text-stone-500">Opti</span>Meal
            </span>
            <span className="ml-2 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-stone-200/80 dark:bg-white/10 text-stone-700 dark:text-stone-300">
              Social & Public
            </span>
          </div>
        </div>

        <button
          onClick={onToggleTheme}
          className={`p-2.5 rounded-full border transition-all ${
            isDark
              ? 'border-white/15 bg-white/5 text-stone-200 hover:bg-white/10'
              : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
          }`}
          title="Changer le thème"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono uppercase tracking-wider bg-stone-900/5 dark:bg-white/5 border-stone-300 dark:border-white/10 text-stone-700 dark:text-stone-300">
              <Sparkles className="w-3.5 h-3.5" />
              Planification nutritionnelle & Courses entre amis
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif font-medium tracking-tight leading-[1.12]">
              Planifiez vos repas.{' '}
              <span className="italic font-normal text-stone-500 dark:text-stone-400">
                Faites vos courses à plusieurs.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 leading-relaxed max-w-xl">
              Chaque compte possède son propre menu hebdomadaire, ses objectifs de macros et son livre de recettes.
              Ajoutez vos amis ou votre partenaire pour fusionner automatiquement vos listes d’épicerie Metro et calculer la part exacte de chacun au centime près.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-stone-200/80 shadow-2xs'
                }`}
              >
                <Flame className="w-4 h-4 mb-2 text-stone-500" />
                <div className="text-xs font-semibold">Menu 100% Personnel</div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Calories, protéines et préférences adaptés à votre propre profil.
                </p>
              </div>

              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-stone-200/80 shadow-2xs'
                }`}
              >
                <Users className="w-4 h-4 mb-2 text-stone-500" />
                <div className="text-xs font-semibold">Système d’Amis</div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Ajoutez vos proches par @pseudo et partagez vos courses et recettes.
                </p>
              </div>

              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-stone-200/80 shadow-2xs'
                }`}
              >
                <DollarSign className="w-4 h-4 mb-2 text-stone-500" />
                <div className="text-xs font-semibold">Courses Jointes</div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Panier Metro commun synchronisé avec répartition équitable des coûts.
                </p>
              </div>
            </div>
          </div>

          {/* Right Auth Card */}
          <div className="lg:col-span-6">
            <div
              className={`p-6 sm:p-8 rounded-3xl border transition-all ${
                isDark
                  ? 'bg-[#121215] border-white/10 shadow-2xl'
                  : 'bg-white border-stone-200/90 shadow-xl'
              }`}
            >
              {/* Mode Switcher */}
              <div
                className={`grid grid-cols-2 p-1 rounded-2xl border mb-6 ${
                  isDark ? 'bg-black/40 border-white/10' : 'bg-stone-100 border-stone-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    mode === 'login'
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Se connecter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setStep(1);
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    mode === 'register'
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Créer un compte
                </button>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-medium">
                  {error}
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                      Pseudo (@) ou Courriel
                    </label>
                    <div className="relative">
                      <AtSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Votre pseudo ou adresse courriel"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                          isDark
                            ? 'bg-black/40 border-white/15 text-white focus:border-white/40'
                            : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                          isDark
                            ? 'bg-black/40 border-white/15 text-white focus:border-white/40'
                            : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-900'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Connexion en cours...' : 'Accéder à mon espace'}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Accès rapide aux comptes existants pour faciliter le test */}
                  {demoAccounts.length > 0 && (
                    <div className="pt-5 mt-5 border-t border-stone-200 dark:border-white/10">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2.5">
                        Accès rapide (Comptes existants migrés)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {demoAccounts.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            disabled={loading}
                            onClick={() => handleQuickDemoLogin(acc.id)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isDark
                                ? 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10'
                                : 'bg-stone-50 hover:bg-stone-100 border-stone-200/80'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950 flex items-center justify-center text-xs font-bold shrink-0">
                              {acc.avatarInitials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{acc.name}</div>
                              <div className="text-[10px] font-mono text-stone-500 truncate">
                                @{acc.username || acc.id}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {step === 1 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                            Prénom / Nom affiché
                          </label>
                          <div className="relative">
                            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                              type="text"
                              required
                              value={regName}
                              onChange={(e) => setRegName(e.target.value)}
                              placeholder="Ex: Thomas"
                              className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm outline-none ${
                                isDark
                                  ? 'bg-black/40 border-white/15 text-white'
                                  : 'bg-stone-50 border-stone-300 text-stone-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                            Pseudo unique (@)
                          </label>
                          <div className="relative">
                            <AtSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                              type="text"
                              required
                              value={regUsername}
                              onChange={(e) =>
                                setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))
                              }
                              placeholder="thomas_mtl"
                              className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm font-mono outline-none ${
                                isDark
                                  ? 'bg-black/40 border-white/15 text-white'
                                  : 'bg-stone-50 border-stone-300 text-stone-900'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                          Courriel (optionnel)
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                          <input
                            type="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="thomas@exemple.com"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none ${
                              isDark
                                ? 'bg-black/40 border-white/15 text-white'
                                : 'bg-stone-50 border-stone-300 text-stone-900'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                          Mot de passe
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                          <input
                            type="password"
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Minimum 4 caractères"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none ${
                              isDark
                                ? 'bg-black/40 border-white/15 text-white'
                                : 'bg-stone-50 border-stone-300 text-stone-900'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                          Pseudo d’un ami qui vous a invité (optionnel)
                        </label>
                        <div className="relative">
                          <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                          <input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            placeholder="Ex: @alex"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono outline-none ${
                              isDark
                                ? 'bg-black/40 border-white/15 text-white'
                                : 'bg-stone-50 border-stone-300 text-stone-900'
                            }`}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Continuer vers mes objectifs nutritionnels
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
                          Étape 2/2 • Vos Objectifs Personnels
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs underline text-stone-500 hover:text-stone-800 dark:hover:text-white"
                        >
                          Retour
                        </button>
                      </div>

                      {/* Presets */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => applyPreset('muscle')}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            targetCalories === 3050
                              ? 'border-stone-900 dark:border-white bg-stone-900/5 dark:bg-white/10 font-semibold'
                              : 'border-stone-200 dark:border-white/10 opacity-75'
                          }`}
                        >
                          <div>💪 Masse</div>
                          <div className="text-[10px] font-mono text-stone-500">3050 kcal</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('balanced')}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            targetCalories === 2000
                              ? 'border-stone-900 dark:border-white bg-stone-900/5 dark:bg-white/10 font-semibold'
                              : 'border-stone-200 dark:border-white/10 opacity-75'
                          }`}
                        >
                          <div>⚖️ Équilibré</div>
                          <div className="text-[10px] font-mono text-stone-500">2000 kcal</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('cut')}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            targetCalories === 1850
                              ? 'border-stone-900 dark:border-white bg-stone-900/5 dark:bg-white/10 font-semibold'
                              : 'border-stone-200 dark:border-white/10 opacity-75'
                          }`}
                        >
                          <div>🔥 Sèche</div>
                          <div className="text-[10px] font-mono text-stone-500">1850 kcal</div>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1">
                            Calories / jour
                          </label>
                          <input
                            type="number"
                            value={targetCalories}
                            onChange={(e) => setTargetCalories(Number(e.target.value))}
                            className={`w-full px-3 py-2 rounded-xl border text-sm font-mono ${
                              isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1">
                            Protéines (g/j)
                          </label>
                          <input
                            type="number"
                            value={targetProtein}
                            onChange={(e) => setTargetProtein(Number(e.target.value))}
                            className={`w-full px-3 py-2 rounded-xl border text-sm font-mono ${
                              isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1">
                            Glucides (g/j)
                          </label>
                          <input
                            type="number"
                            value={targetCarbs}
                            onChange={(e) => setTargetCarbs(Number(e.target.value))}
                            className={`w-full px-3 py-2 rounded-xl border text-sm font-mono ${
                              isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1">
                            Budget ($ CAD / sem.)
                          </label>
                          <input
                            type="number"
                            value={targetWeeklyBudget}
                            onChange={(e) => setTargetWeeklyBudget(Number(e.target.value))}
                            className={`w-full px-3 py-2 rounded-xl border text-sm font-mono ${
                              isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                            }`}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        {loading ? 'Création de votre espace...' : 'Créer mon compte et générer mon menu'}
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto px-6 py-4 text-center text-xs text-stone-500 font-mono">
        FoodPlanner • Plateforme multi-comptes avec courses jointes entre amis
      </footer>
    </div>
  );
};
