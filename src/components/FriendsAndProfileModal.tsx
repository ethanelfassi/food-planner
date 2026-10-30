'use client';

import React, { useState } from 'react';
import {
  UserAccount,
  Friendship,
  SharedGroceryGroup,
  UserCustomizationSettings,
} from '@/types';
import {
  X,
  Users,
  UserPlus,
  Copy,
  Check,
  ShoppingBag,
  Trash2,
  Settings,
  LogOut,
  Share2,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';

interface FriendsAndProfileModalProps {
  isOpen: boolean;
  isDark: boolean;
  currentUser: UserAccount;
  friends: UserAccount[];
  incomingRequests: Friendship[];
  outgoingRequests: Friendship[];
  sharedGroceryGroups: SharedGroceryGroup[];
  userSettings: UserCustomizationSettings;
  onClose: () => void;
  onSendFriendRequest: (target: string) => Promise<{ ok: boolean; message?: string; error?: string }>;
  onRespondFriendRequest: (friendshipId: string, accept: boolean) => Promise<void>;
  onRemoveFriend: (friendId: string) => Promise<void>;
  onCreateJointGroceryWithFriend: (friendIds: string[], groupName?: string) => Promise<void>;
  onUpdateSettings: (newSettings: Partial<UserCustomizationSettings>) => Promise<void>;
  onUpdateProfile: (name: string, newPassword?: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export const FriendsAndProfileModal: React.FC<FriendsAndProfileModalProps> = ({
  isOpen,
  isDark,
  currentUser,
  friends,
  incomingRequests,
  outgoingRequests,
  sharedGroceryGroups,
  userSettings,
  onClose,
  onSendFriendRequest,
  onRespondFriendRequest,
  onRemoveFriend,
  onCreateJointGroceryWithFriend,
  onUpdateSettings,
  onUpdateProfile,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'profile'>('friends');
  const [friendSearchInput, setFriendSearchInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Profile & Settings form state
  const [displayName, setDisplayName] = useState(currentUser.name);
  const [newPassword, setNewPassword] = useState('');
  const [goalName, setGoalName] = useState(userSettings.goalName || 'Objectif personnel');
  const [calories, setCalories] = useState(userSettings.targetCalories);
  const [protein, setProtein] = useState(userSettings.targetProtein);
  const [carbs, setCarbs] = useState(userSettings.targetCarbs);
  const [fat, setFat] = useState(userSettings.targetFat);
  const [budget, setBudget] = useState(userSettings.targetWeeklyBudget);

  if (!isOpen) return null;

  const inviteIdentifier = currentUser.username || currentUser.id;

  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}/?invite=${encodeURIComponent(inviteIdentifier)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendSearchInput.trim()) return;
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await onSendFriendRequest(friendSearchInput.trim());
      if (res.ok) {
        setStatusMessage({ type: 'success', text: res.message || "Demande d'ami envoyée !" });
        setFriendSearchInput('');
      } else {
        setStatusMessage({ type: 'error', text: res.error || "Impossible d'ajouter cet ami." });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erreur réseau.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfileAndGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);
    try {
      if (displayName.trim() !== currentUser.name || newPassword.trim()) {
        await onUpdateProfile(displayName.trim(), newPassword.trim() || undefined);
        setNewPassword('');
      }
      await onUpdateSettings({
        goalName,
        targetCalories: Number(calories) || 2200,
        targetProtein: Number(protein) || 140,
        targetCarbs: Number(carbs) || 240,
        targetFat: Number(fat) || 70,
        targetWeeklyBudget: Number(budget) || 120,
      });
      setStatusMessage({ type: 'success', text: 'Profil et objectifs mis à jour avec succès !' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erreur lors de la sauvegarde.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${
          isDark ? 'bg-[#121215] border-white/15 text-stone-100' : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-white/10 bg-white/[0.02]' : 'border-stone-200 bg-stone-50/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950 flex items-center justify-center font-bold text-sm">
              {currentUser.avatarInitials}
            </div>
            <div>
              <div className="font-semibold text-base flex items-center gap-2">
                {currentUser.name}
                <span className="text-xs font-mono text-stone-500">
                  @{currentUser.username || currentUser.id}
                </span>
              </div>
              <div className="text-xs text-stone-500">
                {friends.length} ami{friends.length > 1 ? 's' : ''} connecté{friends.length > 1 ? 's' : ''} •{' '}
                {sharedGroceryGroups.length} course{sharedGroceryGroups.length > 1 ? 's' : ''} jointe
                {sharedGroceryGroups.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`grid grid-cols-2 p-1.5 mx-6 mt-4 rounded-2xl border ${
            isDark ? 'bg-black/40 border-white/10' : 'bg-stone-100 border-stone-200'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('friends');
              setStatusMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'friends'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Mes Amis & Invitations
            {incomingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-stone-950 font-bold">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setStatusMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Mon Profil & Objectifs
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-300'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {activeTab === 'friends' ? (
            <>
              {/* Lien d'invitation */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDark ? 'bg-white/[0.03] border-white/10' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                    Lien d’invitation
                  </div>
                  <div className="text-base font-mono font-bold tracking-tight mt-0.5">
                    @{currentUser.username || currentUser.id}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Partagez votre lien d’invitation pour que vos amis puissent se connecter avec vous.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="px-4 py-2 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Lien copié !' : "Copier mon lien d'invitation"}
                  </button>
                </div>
              </div>

              {/* Ajouter un ami */}
              <form onSubmit={handleAddFriend} className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-500">
                  Ajouter un ami (par son pseudo @pseudo)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={friendSearchInput}
                    onChange={(e) => setFriendSearchInput(e.target.value)}
                    placeholder="Ex: @alex"
                    className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none ${
                      isDark
                        ? 'bg-black/40 border-white/15 text-white focus:border-white/40'
                        : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-900'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !friendSearchInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
                <p className="text-[11px] text-stone-500">
                  Entrez le pseudo de votre ami (avec ou sans @) pour lui envoyer une demande d'ami.
                </p>
              </form>

              {/* Demandes d'amis reçues */}
              {incomingRequests.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                    Demandes d’amis reçues ({incomingRequests.length})
                  </h4>
                  <div className="space-y-2">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                          isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50/60 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950 flex items-center justify-center font-bold text-xs">
                            {req.friend.avatarInitials}
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{req.friend.name}</div>
                            <div className="text-xs font-mono text-stone-500">
                              @{req.friend.username || req.friend.id}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onRespondFriendRequest(req.id, true)}
                            className="px-3 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 text-xs font-semibold cursor-pointer"
                          >
                            Accepter
                          </button>
                          <button
                            type="button"
                            onClick={() => onRespondFriendRequest(req.id, false)}
                            className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-white/15 text-xs text-stone-600 dark:text-stone-400 cursor-pointer"
                          >
                            Refuser
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Liste des amis acceptés */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-mono uppercase tracking-wider text-stone-500">
                  Mes Amis ({friends.length})
                </h4>

                {friends.length === 0 ? (
                  <div
                    className={`p-6 rounded-2xl border text-center ${
                      isDark ? 'border-white/10 bg-white/[0.01]' : 'border-stone-200 bg-stone-50/50'
                    }`}
                  >
                    <Users className="w-6 h-6 mx-auto mb-2 text-stone-400" />
                    <div className="text-sm font-medium">Aucun ami pour le moment</div>
                    <p className="text-xs text-stone-500 mt-1">
                      Ajoutez un ami ci-dessus pour pouvoir créer une course jointe et partager vos recettes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                          isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-stone-200/90'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950 flex items-center justify-center font-bold text-xs shrink-0">
                            {friend.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{friend.name}</div>
                            <div className="text-xs font-mono text-stone-500 truncate">
                              @{friend.username || friend.id}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await onCreateJointGroceryWithFriend([friend.id]);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
                            title="Créer ou ouvrir une course jointe avec cet ami"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Course jointe
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveFriend(friend.id)}
                            className="p-2 rounded-xl border border-stone-200 dark:border-white/10 text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Retirer cet ami"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Demandes envoyées en attente */}
              {outgoingRequests.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-stone-500">
                    Demandes envoyées en attente ({outgoingRequests.length})
                  </h4>
                  <div className="space-y-1.5">
                    {outgoingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 flex items-center justify-between text-xs text-stone-500"
                      >
                        <span>
                          {req.friend.name} (@{req.friend.username || req.friend.id})
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3 h-3" /> En attente
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSaveProfileAndGoals} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-stone-500 mb-1">
                    Nom affiché
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                      isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-stone-500 mb-1">
                    Nouveau mot de passe (optionnel)
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Laisser vide pour ne pas changer"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm ${
                        isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-stone-500 mb-1">
                  Intitulé de votre objectif
                </label>
                <div className="relative">
                  <Sparkles className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm ${
                      isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1">
                    Calories / jour
                  </label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-mono ${
                      isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1">
                    Protéines (g)
                  </label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-mono ${
                      isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1">
                    Glucides (g)
                  </label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-mono ${
                      isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1">
                    Lipides (g)
                  </label>
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-mono ${
                      isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                    }`}
                  />
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1">
                    Budget Épicerie Hebdomadaire ($ CAD)
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-mono ${
                      isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-300'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {submitting ? 'Sauvegarde...' : 'Enregistrer mes objectifs'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
