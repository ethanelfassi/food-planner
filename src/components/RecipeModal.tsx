'use client';

import React from 'react';
import { Recipe } from '@/types';
import { INGREDIENTS } from '@/data/ingredients';
import { X, Clock, Flame, Dumbbell, Sparkles } from 'lucide-react';

interface RecipeModalProps {
  recipe: Recipe | null;
  isDark: boolean;
  onClose: () => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, isDark, onClose }) => {
  if (!recipe) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border flex flex-col ${
          isDark
            ? 'liquid-glass text-stone-100 border-white/15'
            : 'liquid-glass-light text-stone-900 border-stone-300'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          className={`p-6 sm:p-7 border-b flex items-start justify-between sticky top-0 z-10 backdrop-blur-2xl ${
            isDark ? 'border-white/10 bg-[#0B0C0E]/80' : 'border-stone-200/80 bg-[#FAF8F5]/85'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap font-mono text-[10px] uppercase tracking-widest">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                {recipe.mealType === 'dejeuner' && 'Déjeuner Sportif'}
                {recipe.mealType === 'souper' && 'Souper & Dîner (2 portions)'}
                {recipe.mealType === 'collation' && 'Collation Sportive'}
              </span>
              <span className="text-stone-400 flex items-center gap-1 font-sans">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min total
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-stone-900 dark:text-white leading-snug">
              {recipe.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-500/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* Macros Bar Style Apple Fitness */}
          <div
            className={`grid grid-cols-4 gap-2.5 p-4 rounded-2xl border text-center font-mono ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-stone-50 border-stone-300'
            }`}
          >
            <div>
              <div className="text-stone-600 dark:text-stone-400 text-[10px] uppercase tracking-wider mb-1 flex items-center justify-center gap-1 font-medium">
                <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Cals
              </div>
              <div className="text-lg font-medium tabular-nums text-amber-900 dark:text-amber-300">
                {recipe.caloriesPerServing} <span className="text-[10px] font-sans">kcal</span>
              </div>
            </div>
            <div>
              <div className="text-stone-600 dark:text-stone-400 text-[10px] uppercase tracking-wider mb-1 flex items-center justify-center gap-1 font-medium">
                <Dumbbell className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> Prot
              </div>
              <div className="text-lg font-medium tabular-nums text-emerald-900 dark:text-emerald-400">
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
                      isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-stone-200'
                    }`}
                  >
                    <div>
                      <span className="font-medium text-stone-900 dark:text-stone-200">
                        {ingMeta ? ingMeta.name : item.ingredientId}
                      </span>
                      {item.notes && (
                        <p className="text-xs text-stone-600 dark:text-stone-400 italic mt-0.5">{item.notes}</p>
                      )}
                    </div>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 shrink-0 ml-2">
                      {item.quantity} {item.unit}
                    </span>
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
