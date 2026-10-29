'use client';

import React, { useState } from 'react';
import { ProductPreferenceStatus, ProductPreferencesMap, Recipe, UserAccount } from '@/types';
import { INGREDIENTS } from '@/data/ingredients';
import { X, Clock, Flame, Dumbbell, Sparkles, Heart, Ban, Pencil, Share2, Check } from 'lucide-react';

interface RecipeModalProps {
  recipe: Recipe | null;
  preferences?: ProductPreferencesMap;
  friends?: UserAccount[];
  isDark: boolean;
  onClose: () => void;
  onUpdatePreference?: (ingredientId: string, status: ProductPreferenceStatus) => void;
  onEditCustomRecipe?: (recipe: Recipe) => void;
  onShareRecipeWithFriend?: (recipe: Recipe, friendId: string) => Promise<void>;
}

const RecipeModalComponent: React.FC<RecipeModalProps> = ({ 
  recipe, 
  preferences = {}, 
  friends = [],
  isDark, 
  onClose,
  onUpdatePreference,
  onEditCustomRecipe,
  onShareRecipeWithFriend
}) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [sharedFeedback, setSharedFeedback] = useState<string | null>(null);

  if (!recipe) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 animate-in fade-in duration-150 mb-safe sm:mb-0">
      <div
        className={`rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border flex flex-col ${
          isDark
            ? 'liquid-glass text-stone-100 border-white/15'
            : 'liquid-glass-light text-stone-900 border-stone-300'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          className={`p-4 sm:p-7 border-b flex items-start justify-between sticky top-0 z-10 ${
            isDark ? 'border-white/10 bg-[#0B0C0E]/98' : 'border-stone-200 bg-[#F7F7F6]/98'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap font-mono text-[10px] uppercase tracking-widest">
              <span className="px-2.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 font-semibold">
                {recipe.mealType === 'dejeuner' && 'Déjeuner Sportif'}
                {recipe.mealType === 'souper' && 'Souper & Dîner (2 portions)'}
                {recipe.mealType === 'collation' && 'Collation Sportive'}
                {recipe.mealType === 'diner' && 'Dîner'}
              </span>
              {recipe.isCustom && (
                <span className="px-2.5 py-0.5 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-bold">
                  Recette Personnalisée
                </span>
              )}
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1 font-sans">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min total
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-stone-900 dark:text-white leading-snug">
              {recipe.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0 relative">
            {friends.length > 0 && onShareRecipeWithFriend && (
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-white/20 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors font-medium cursor-pointer"
                  title="Envoyer une copie de cette recette à un ami"
                >
                  {sharedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{sharedFeedback || 'Partager'}</span>
                </button>
                {showShareMenu && (
                  <div
                    className={`absolute right-0 mt-2 w-52 rounded-2xl border p-2 shadow-xl z-20 ${
                      isDark ? 'bg-stone-950 border-white/15 text-white' : 'bg-white border-stone-200 text-stone-900'
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 px-2 py-1">
                      Envoyer à un ami :
                    </div>
                    {friends.map((f) => (
                      <button
                        key={f.id}
                        onClick={async () => {
                          setShowShareMenu(false);
                          await onShareRecipeWithFriend(recipe, f.id);
                          setSharedFeedback(`Envoyé à ${f.name}`);
                          setTimeout(() => setSharedFeedback(null), 2500);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs hover:bg-stone-100 dark:hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-5 h-5 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950 flex items-center justify-center text-[10px] font-bold">
                          {f.avatarInitials}
                        </span>
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {recipe.isCustom && onEditCustomRecipe && (
              <button
                onClick={() => {
                  onClose();
                  onEditCustomRecipe(recipe);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-white/20 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors font-medium"
                title="Modifier cette recette"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modifier</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-500/10 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* Macros Bar Minimalist */}
          <div
            className={`grid grid-cols-4 gap-2.5 p-4 rounded-2xl border text-center font-mono ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-white border-stone-200 shadow-xs'
            }`}
          >
            <div>
              <div className="text-stone-600 dark:text-stone-400 text-[10px] uppercase tracking-wider mb-1 flex items-center justify-center gap-1 font-medium">
                <Flame className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Cals
              </div>
              <div className="text-lg font-medium tabular-nums text-stone-900 dark:text-stone-100">
                {recipe.caloriesPerServing} <span className="text-[10px] font-sans">kcal</span>
              </div>
            </div>
            <div>
              <div className="text-stone-600 dark:text-stone-400 text-[10px] uppercase tracking-wider mb-1 flex items-center justify-center gap-1 font-medium">
                <Dumbbell className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Prot
              </div>
              <div className="text-lg font-semibold tabular-nums text-stone-950 dark:text-white">
                {recipe.proteinPerServing} <span className="text-[10px] font-sans">g</span>
              </div>
            </div>
            <div>
              <div className="text-stone-600 dark:text-stone-400 text-[10px] uppercase tracking-wider mb-1 font-medium">Glucides</div>
              <div className="text-lg font-medium tabular-nums text-stone-900 dark:text-stone-200">
                {recipe.carbsPerServing} <span className="text-[10px] font-sans">g</span>
              </div>
            </div>
            <div>
              <div className="text-stone-600 dark:text-stone-400 text-[10px] uppercase tracking-wider mb-1 font-medium">Lipides</div>
              <div className="text-lg font-medium tabular-nums text-stone-800 dark:text-stone-300">
                {recipe.fatPerServing} <span className="text-[10px] font-sans">g</span>
              </div>
            </div>
          </div>

          {/* Ingrédients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg font-normal text-stone-900 dark:text-white flex items-center gap-2">
                Ingrédients{' '}
                <span className="font-sans text-xs text-stone-600 dark:text-stone-400 font-normal">
                  {recipe.servings > 1 ? `(${recipe.servings} portions - souper + dîner)` : '(1 portion)'}
                </span>
              </h3>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm font-sans">
              {recipe.ingredients.map((item, index) => {
                const ingMeta = INGREDIENTS[item.ingredientId];
                return (
                  <li
                    key={index}
                    className={`flex items-start justify-between p-3 rounded-2xl border ${
                      isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-stone-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-stone-900 dark:text-stone-200">
                          {ingMeta ? ingMeta.name : item.ingredientId}
                        </span>
                        {preferences[item.ingredientId] === 'liked' && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-semibold">
                            Favori
                          </span>
                        )}
                        {preferences[item.ingredientId] === 'disliked' && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold">
                            Exclu
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-xs text-stone-600 dark:text-stone-400 italic mt-0.5">{item.notes}</p>
                      )}
                      {ingMeta?.macrosPer100g && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono text-stone-500 dark:text-stone-400">
                          <span className="font-semibold text-stone-800 dark:text-stone-200">🔥 {ingMeta.macrosPer100g.calories} kcal</span>
                          <span>•</span>
                          <span className="font-semibold text-stone-800 dark:text-stone-200">🥩 {ingMeta.macrosPer100g.protein}g P</span>
                          <span>•</span>
                          <span>🌾 {ingMeta.macrosPer100g.carbs}g G</span>
                          <span>•</span>
                          <span>🥑 {ingMeta.macrosPer100g.fat}g L</span>
                          <span className="text-[9px] text-stone-400">/ 100g</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-white/20">
                        {item.quantity} {item.unit}
                      </span>
                      {onUpdatePreference && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => {
                              const cur = preferences[item.ingredientId] || 'neutral';
                              onUpdatePreference(item.ingredientId, cur === 'liked' ? 'neutral' : 'liked');
                            }}
                            className={`p-1 rounded-lg border transition-all ${
                              preferences[item.ingredientId] === 'liked'
                                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 border-stone-900 dark:border-white'
                                : 'text-stone-400 hover:text-stone-900 dark:hover:text-white border-transparent'
                            }`}
                            title="Aimer ce produit"
                          >
                            <Heart
                              className={`w-3 h-3 ${
                                preferences[item.ingredientId] === 'liked'
                                  ? 'fill-current text-white dark:text-stone-950'
                                  : ''
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => {
                              const cur = preferences[item.ingredientId] || 'neutral';
                              onUpdatePreference(item.ingredientId, cur === 'disliked' ? 'neutral' : 'disliked');
                            }}
                            className={`p-1 rounded-lg border transition-all ${
                              preferences[item.ingredientId] === 'disliked'
                                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 border-stone-900 dark:border-white shadow-xs'
                                : 'text-stone-400 hover:text-stone-900 dark:hover:text-white border-transparent'
                            }`}
                            title="Exclure ce produit"
                          >
                            <Ban
                              className={`w-3 h-3 ${
                                preferences[item.ingredientId] === 'disliked'
                                  ? 'text-white dark:text-stone-950'
                                  : ''
                              }`}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="font-serif text-lg font-normal text-stone-900 dark:text-white mb-3">
              Instructions de Préparation
            </h3>
            <ol className="space-y-2.5 text-sm font-sans leading-relaxed text-stone-800 dark:text-stone-300">
              {recipe.instructions.map((step, idx) => (
                <li
                  key={idx}
                  className={`flex gap-3 p-3.5 rounded-2xl border ${
                    isDark ? 'bg-white/[0.015] border-white/5' : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-200 font-mono text-xs flex items-center justify-center shrink-0 border border-stone-300 dark:border-white/10 font-bold">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-4 sm:p-5 border-t flex justify-end ${
            isDark ? 'border-white/10 bg-black/20' : 'border-stone-200 bg-stone-100/50'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-5 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
              isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-stone-900 text-stone-50 hover:bg-stone-800'
            }`}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export const RecipeModal = React.memo(RecipeModalComponent);
