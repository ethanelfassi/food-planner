'use client';

import React from 'react';
import { Recipe } from '@/types';
import { INGREDIENTS } from '@/data/ingredients';
import { X, Clock, Flame, Dumbbell, Sparkles } from 'lucide-react';

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, onClose }) => {
  if (!recipe) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between relative bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {recipe.mealType === 'dejeuner' && 'Déjeuner Sportif'}
                {recipe.mealType === 'souper' && 'Souper & Lunch (2 portions)'}
                {recipe.mealType === 'collation' && 'Collation Sportive'}
              </span>
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min au total
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
              {recipe.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Macros Bar */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Calories</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-amber-300">
                {recipe.caloriesPerServing} <span className="text-xs font-normal">kcal</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protéines</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-emerald-300">
                {recipe.proteinPerServing} <span className="text-xs font-normal">g</span>
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-1">Glucides</div>
              <div className="text-base sm:text-lg font-bold text-sky-300">
                {recipe.carbsPerServing} <span className="text-xs font-normal">g</span>
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-1">Lipides</div>
              <div className="text-base sm:text-lg font-bold text-purple-300">
                {recipe.fatPerServing} <span className="text-xs font-normal">g</span>
              </div>
            </div>
          </div>

          {/* Ingrédients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Ingrédients {recipe.servings > 1 ? `(${recipe.servings} portions - souper + dîner)` : '(1 portion)'}
              </h3>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {recipe.ingredients.map((item, index) => {
                const ingMeta = INGREDIENTS[item.ingredientId];
                return (
                  <li
                    key={index}
                    className="flex items-start justify-between bg-slate-800/40 border border-slate-700/40 p-2.5 rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-slate-200">
                        {ingMeta ? ingMeta.name : item.ingredientId}
                      </span>
                      {item.notes && (
                        <p className="text-xs text-slate-400 italic mt-0.5">{item.notes}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-700/70 text-emerald-300 rounded shrink-0 ml-2">
                      {item.quantity} {item.unit}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3">
              Préparation rapide
            </h3>
            <ol className="space-y-2.5 text-sm text-slate-300">
              {recipe.instructions.map((step, idx) => (
                <li key={idx} className="flex gap-3 bg-slate-800/20 p-3 rounded-lg border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
