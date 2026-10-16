'use client';

import React, { useState } from 'react';
import { INGREDIENTS } from '@/data/ingredients';
import { AISLE_LABELS } from '@/lib/grocery';
import { MetroAisle, ProductPreferenceStatus, ProductPreferencesMap } from '@/types';
import { 
  Heart, 
  Ban, 
  Search, 
  Database, 
  Sparkles, 
  ExternalLink, 
  RefreshCw,
  RotateCcw,
  Check
} from 'lucide-react';

interface ProductPreferencesViewProps {
  preferences: ProductPreferencesMap;
  isDark: boolean;
  onUpdatePreference: (ingredientId: string, status: ProductPreferenceStatus) => void;
  onResetAllPreferences: () => void;
  onApplyPreferencesToPlan: () => void;
}

export const ProductPreferencesView: React.FC<ProductPreferencesViewProps> = ({
  preferences,
  isDark,
  onUpdatePreference,
  onResetAllPreferences,
  onApplyPreferencesToPlan,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAisle, setSelectedAisle] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'liked' | 'disliked' | 'neutral'>('all');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const allIngredients = Object.values(INGREDIENTS);

  // Compteurs
  const likedCount = allIngredients.filter((i) => preferences[i.id] === 'liked').length;
  const dislikedCount = allIngredients.filter((i) => preferences[i.id] === 'disliked').length;
  const neutralCount = allIngredients.length - likedCount - dislikedCount;

  // Filtrage
  const filteredIngredients = allIngredients.filter((item) => {
    // 1. Recherche texte
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.packaging.label.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Rayon
    if (selectedAisle !== 'all' && item.aisle !== selectedAisle) return false;

    // 3. Statut
    const currentStatus = preferences[item.id] || 'neutral';
    if (selectedFilter !== 'all' && currentStatus !== selectedFilter) return false;

    return true;
  });

  const handleSelectPreference = (id: string, newStatus: ProductPreferenceStatus, name: string) => {
    onUpdatePreference(id, newStatus);
    const label =
      newStatus === 'liked'
        ? `"${name}" ajouté à vos produits favoris (sauvegardé en BDD)`
        : newStatus === 'disliked'
        ? `"${name}" exclu de vos achats et banni des recettes (sauvegardé en BDD)`
        : `"${name}" réinitialisé à neutre`;
    setSaveToast(label);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const cardGlassClass = isDark ? 'liquid-glass' : 'liquid-glass-light';

  return (
    <div className="space-y-8">
      {/* Toast de confirmation SQLite */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-2xl border border-stone-800 dark:border-white text-xs font-mono font-medium">
            <Database className="w-4 h-4 text-stone-400 dark:text-stone-600" />
            <span>{saveToast}</span>
          </div>
        </div>
      )}

      {/* En-tête Éditorial */}
      <div className={`rounded-3xl p-6 sm:p-8 transition-all border ${cardGlassClass}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-700 dark:text-stone-300 font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Base de Données SQLite Locale
              </span>
              <span className="text-stone-400 text-xs">•</span>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                data/food_planner.sqlite
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-900 dark:text-white">
              Gestionnaire de <span className="italic font-light">Préférences Produits</span>
            </h1>

            <p className="text-sm text-stone-600 dark:text-stone-400 mt-2 max-w-2xl font-sans leading-relaxed">
              Choisissez précisément les produits que vous aimez acheter et ceux que vous refusez d'acheter. Les recettes intégrant vos produits exclus sont <strong>strictement bannies</strong>, tandis que vos favoris sont priorisés. Tout est persisté dans votre base de données locale.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onApplyPreferencesToPlan}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-all border active:scale-95 font-semibold ${
                isDark
                  ? 'bg-white text-stone-950 hover:bg-stone-200 border-white'
                  : 'bg-stone-900 text-stone-50 hover:bg-stone-800 border-stone-900 shadow-xs'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser le menu</span>
            </button>

            {(likedCount > 0 || dislikedCount > 0) && (
              <button
                onClick={onResetAllPreferences}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
                title="Réinitialiser toutes les préférences à neutre"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {/* Baromètre de Préférences */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-stone-200/60 dark:border-white/10">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedFilter === 'all'
                ? isDark
                  ? 'bg-white/10 border-white/20'
                  : 'bg-stone-100 border-stone-300'
                : isDark
                ? 'bg-white/[0.02] border-white/5'
                : 'bg-white border-stone-200'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">
              Total Catalogue
            </div>
            <div className="font-mono tabular-nums text-2xl font-light text-stone-900 dark:text-white mt-0.5">
              {allIngredients.length}
            </div>
          </button>

          <button
            onClick={() => setSelectedFilter('liked')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedFilter === 'liked'
                ? isDark
                  ? 'bg-white/15 border-white/30 ring-1 ring-white/20'
                  : 'bg-stone-900 text-white border-stone-900 shadow-sm'
                : isDark
                ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                : 'bg-white border-stone-200 shadow-xs hover:border-stone-300'
            }`}
          >
            <div
              className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 font-semibold ${
                selectedFilter === 'liked' && !isDark
                  ? 'text-stone-200'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              <Heart
                className={`w-3 h-3 ${
                  selectedFilter === 'liked' && !isDark
                    ? 'text-white fill-white'
                    : 'text-stone-900 dark:text-stone-100 fill-stone-900 dark:fill-stone-100'
                }`}
              />{' '}
              J'aime acheter
            </div>
            <div
              className={`font-mono tabular-nums text-2xl font-medium mt-0.5 ${
                selectedFilter === 'liked' && !isDark
                  ? 'text-white'
                  : 'text-stone-950 dark:text-white'
              }`}
            >
              {likedCount}
            </div>
          </button>

          <button
            onClick={() => setSelectedFilter('disliked')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedFilter === 'disliked'
                ? isDark
                  ? 'bg-white/15 border-white/30 ring-1 ring-white/20'
                  : 'bg-stone-900 text-white border-stone-900 shadow-sm'
                : isDark
                ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                : 'bg-white border-stone-200 shadow-xs hover:border-stone-300'
            }`}
          >
            <div
              className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 font-semibold ${
                selectedFilter === 'disliked' && !isDark
                  ? 'text-stone-200'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              <Ban
                className={`w-3 h-3 ${
                  selectedFilter === 'disliked' && !isDark
                    ? 'text-white'
                    : 'text-stone-700 dark:text-stone-300'
                }`}
              />{' '}
              Ne pas acheter
            </div>
            <div
              className={`font-mono tabular-nums text-2xl font-medium mt-0.5 ${
                selectedFilter === 'disliked' && !isDark
                  ? 'text-white'
                  : 'text-stone-950 dark:text-white'
              }`}
            >
              {dislikedCount}
            </div>
          </button>

          <button
            onClick={() => setSelectedFilter('neutral')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedFilter === 'neutral'
                ? isDark
                  ? 'bg-white/10 border-white/20'
                  : 'bg-stone-100 border-stone-300'
                : isDark
                ? 'bg-white/[0.02] border-white/5'
                : 'bg-white border-stone-200'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">
              Non spécifiés
            </div>
            <div className="font-mono tabular-nums text-2xl font-light text-stone-600 dark:text-stone-300 mt-0.5">
              {neutralCount}
            </div>
          </button>
        </div>
      </div>

      {/* Barre de Recherche et Rayons */}
      <div
        className={`p-4 rounded-3xl border space-y-3 ${
          isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-stone-200 shadow-xs'
        }`}
      >
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un produit... (ex: bœuf haché, avoine, saumon, yogourt, cheddar)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
            }`}
          />
        </div>

        {/* Filtres par Rayons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
          <button
            onClick={() => setSelectedAisle('all')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              selectedAisle === 'all'
                ? isDark
                  ? 'bg-white text-stone-950 font-bold'
                  : 'bg-stone-900 text-stone-50 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Tous les rayons
          </button>
          {Object.entries(AISLE_LABELS).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setSelectedAisle(key)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                selectedAisle === key
                  ? isDark
                    ? 'bg-white text-stone-950 font-bold'
                    : 'bg-stone-900 text-stone-50 font-bold'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              {meta.title}
            </button>
          ))}
        </div>
      </div>

      {/* Grille des Produits du Catalogue */}
      {filteredIngredients.length === 0 ? (
        <div className={`text-center py-12 rounded-3xl border ${cardGlassClass}`}>
          <Ban className="w-8 h-8 text-stone-400 mx-auto mb-2 opacity-60" />
          <p className="text-stone-500 text-xs font-mono uppercase tracking-wider">
            Aucun produit ne correspond à ces critères
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredIngredients.map((item) => {
            const currentStatus = preferences[item.id] || 'neutral';
            const isLiked = currentStatus === 'liked';
            const isDisliked = currentStatus === 'disliked';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                  isLiked
                    ? isDark
                      ? 'bg-white/[0.06] border-white/30 ring-1 ring-white/10'
                      : 'bg-white border-stone-800 ring-1 ring-stone-800 shadow-xs'
                    : isDisliked
                    ? 'opacity-60 grayscale bg-stone-100/50 dark:bg-black/30 border-stone-300/60 dark:border-white/5'
                    : isDark
                    ? 'bg-white/[0.02] border-white/5 hover:border-white/15'
                    : 'bg-white border-stone-200/90 hover:border-stone-300 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start gap-3">
                    {/* Photo du produit */}
                    {item.imageUrl && (
                      <div
                        className={`w-14 h-14 rounded-2xl overflow-hidden shrink-0 border relative ${
                          isDark ? 'border-white/10 bg-black/40' : 'border-stone-200 bg-stone-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                          {AISLE_LABELS[item.aisle]?.title || item.aisle}
                        </span>
                        {item.packaging.isMoiMemberPrice && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-white/20 font-semibold">
                            Moi
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-sm font-medium text-stone-900 dark:text-white mt-0.5 leading-snug">
                        {item.name}
                      </h3>

                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-sans">
                        {item.packaging.label}
                      </div>

                      <div className="flex items-baseline gap-2 mt-1.5 font-mono text-xs">
                        <span className="font-semibold text-stone-950 dark:text-white">
                          {item.packaging.exactPriceMetro.toFixed(2)} $
                        </span>
                        {item.packaging.unitPriceLabel && (
                          <span className="text-[11px] text-stone-500 dark:text-stone-400">
                            ({item.packaging.unitPriceLabel})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sélecteur de Préférence 3-États */}
                <div className="mt-4 pt-3 border-t border-stone-200/50 dark:border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {/* Bouton J'aime */}
                    <button
                      onClick={() =>
                        handleSelectPreference(item.id, isLiked ? 'neutral' : 'liked', item.name)
                      }
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
                        isLiked
                          ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-bold shadow-xs'
                          : isDark
                          ? 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                      }`}
                      title={isLiked ? 'Retirer des favoris' : 'Marquer comme produit aimé'}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isLiked ? 'fill-current text-white dark:text-stone-950' : 'text-stone-500'
                        }`}
                      />
                      <span>J'aime</span>
                    </button>

                    {/* Bouton Ne pas acheter */}
                    <button
                      onClick={() =>
                        handleSelectPreference(item.id, isDisliked ? 'neutral' : 'disliked', item.name)
                      }
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
                        isDisliked
                          ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-bold shadow-xs'
                          : isDark
                          ? 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                      }`}
                      title={isDisliked ? 'Réautoriser ce produit' : 'Bannir ce produit de vos achats et recettes'}
                    >
                      <Ban className={`w-3.5 h-3.5 ${isDisliked ? 'text-white dark:text-stone-950' : 'text-stone-500'}`} />
                      <span>Exclure</span>
                    </button>
                  </div>

                  {item.metroProductUrl && (
                    <a
                      href={item.metroProductUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
                      title="Fiche officielle Metro.ca"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
