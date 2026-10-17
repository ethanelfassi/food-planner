'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Recipe, RecipeIngredientItem, MealType } from '@/types';
import { INGREDIENTS } from '@/data/ingredients';
import { calculateRecipeNutrients } from '@/lib/nutrition';
import { 
  X, 
  Plus, 
  Trash2, 
  Flame, 
  Dumbbell, 
  Clock, 
  ChefHat, 
  Search, 
  Check, 
  Sparkles,
  DollarSign,
  UtensilsCrossed
} from 'lucide-react';

interface RecipeCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeToEdit?: Recipe | null;
  onSaveRecipe: (savedRecipe: Recipe) => void;
  onDeleteRecipe?: (recipeId: string) => void;
  isDark: boolean;
  activeAccountId?: string;
  customProducts?: import('@/types').Ingredient[];
}

const COMMON_UNITS = [
  { value: 'g', label: 'Grammes (g)' },
  { value: 'ml', label: 'Millilitres (ml)' },
  { value: 'unite', label: 'Unité (pièce)' },
  { value: 'c_a_soupe', label: 'Cuillère à soupe (~15g)' },
  { value: 'tranche', label: 'Tranche (~25g)' },
  { value: 'canne', label: 'Boîte / Canne (~400g)' },
];

export const RecipeCreatorModal: React.FC<RecipeCreatorModalProps> = ({
  isOpen,
  onClose,
  recipeToEdit,
  onSaveRecipe,
  onDeleteRecipe,
  isDark,
  activeAccountId = 'ethan',
  customProducts = [],
}) => {
  const [title, setTitle] = useState('');
  const [mealType, setMealType] = useState<MealType>('souper');
  const [servings, setServings] = useState(2);
  const [prepTime, setPrepTime] = useState(10);
  const [cookTime, setCookTime] = useState(15);
  const [ingredients, setIngredients] = useState<RecipeIngredientItem[]>([]);
  const [instructionsText, setInstructionsText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sélecteur d'ingrédient
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [ingredientQty, setIngredientQty] = useState<number | string>(100);
  const [ingredientUnit, setIngredientUnit] = useState('g');
  const [ingredientNotes, setIngredientNotes] = useState('');

  // Initialisation lors de l'ouverture
  useEffect(() => {
    if (recipeToEdit) {
      setTitle(recipeToEdit.title);
      setMealType(recipeToEdit.mealType as MealType);
      setServings(recipeToEdit.servings || 1);
      setPrepTime(recipeToEdit.prepTimeMinutes || 10);
      setCookTime(recipeToEdit.cookTimeMinutes || 15);
      setIngredients(recipeToEdit.ingredients || []);
      setInstructionsText((recipeToEdit.instructions || []).join('\n'));
      setTagsText((recipeToEdit.tags || []).join(', '));
    } else {
      // Nouvelle recette par défaut (ex: style Pâtes aux champignons)
      setTitle('');
      setMealType('souper');
      setServings(2);
      setPrepTime(10);
      setCookTime(15);
      setIngredients([]);
      setInstructionsText('');
      setTagsText('fait-maison');
    }
    setErrorMessage(null);
  }, [recipeToEdit, isOpen]);

  // Catalogue fusionné (produits statiques + produits ajoutés par code-barres)
  const catalog = useMemo(() => {
    const customMap = Object.fromEntries(customProducts.map((p) => [p.id, p]));
    return { ...INGREDIENTS, ...customMap };
  }, [customProducts]);

  // Liste triée des produits pour la recherche
  const catalogList = useMemo(() => {
    return Object.values(catalog).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    if (!ingredientSearch.trim()) return catalogList.slice(0, 15);
    const q = ingredientSearch.toLowerCase();
    return catalogList.filter(
      (item) => item.name.toLowerCase().includes(q) || item.aisle.toLowerCase().includes(q)
    );
  }, [catalogList, ingredientSearch]);

  // Calcul temps réel des macronutriments et du coût
  const liveNutrients = useMemo(() => {
    return calculateRecipeNutrients(ingredients, servings, catalog);
  }, [ingredients, servings, catalog]);

  if (!isOpen) return null;

  const handleSelectCatalogItem = (ingId: string) => {
    setSelectedIngredientId(ingId);
    const ing = catalog[ingId];
    if (ing) {
      setIngredientUnit(ing.baseUnit || 'g');
      if (ing.baseUnit === 'unite') {
        setIngredientQty(1);
      } else if (ing.baseUnit === 'ml') {
        setIngredientQty(150);
      } else {
        setIngredientQty(150);
      }
    }
  };

  const handleAddIngredient = () => {
    if (!selectedIngredientId) {
      setErrorMessage('Veuillez sélectionner un produit du catalogue.');
      return;
    }
    const numQty = Number(ingredientQty);
    if (!numQty || numQty <= 0) {
      setErrorMessage('La quantité doit être supérieure à zéro.');
      return;
    }

    const newItem: RecipeIngredientItem = {
      ingredientId: selectedIngredientId,
      quantity: numQty,
      unit: ingredientUnit,
      notes: ingredientNotes.trim() || undefined,
    };

    setIngredients((prev) => [...prev, newItem]);
    setSelectedIngredientId('');
    setIngredientSearch('');
    setIngredientNotes('');
    setErrorMessage(null);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateIngredientQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: newQty } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Veuillez donner un titre à votre repas.');
      return;
    }
    if (ingredients.length === 0) {
      setErrorMessage('Veuillez ajouter au moins un ingrédient du catalogue.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const instructions = instructionsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const tags = tagsText
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const recipeData: Partial<Recipe> = {
      id: recipeToEdit ? recipeToEdit.id : undefined,
      title: title.trim(),
      mealType,
      prepTimeMinutes: Number(prepTime) || 10,
      cookTimeMinutes: Number(cookTime) || 15,
      servings: Number(servings) || 1,
      ingredients,
      instructions,
      tags: tags.length > 0 ? tags : ['fait-maison'],
      createdBy: activeAccountId,
      isCustom: true,
    };

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de l\'enregistrement de la recette');
      }

      const json = await res.json();
      if (json.success && json.recipe) {
        onSaveRecipe(json.recipe);
        onClose();
      } else {
        throw new Error(json.error || 'Erreur inconnue');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Impossible d\'enregistrer la recette dans SQLite');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recipeToEdit || !recipeToEdit.id) return;
    if (!confirm(`Supprimer définitivement la recette "${recipeToEdit.title}" ?`)) return;

    try {
      const res = await fetch(`/api/recipes?id=${encodeURIComponent(recipeToEdit.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onDeleteRecipe?.(recipeToEdit.id);
        onClose();
      }
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border flex flex-col ${
          isDark
            ? 'liquid-glass text-stone-100 border-white/15'
            : 'liquid-glass-light text-stone-900 border-stone-300'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`p-6 border-b flex items-start justify-between sticky top-0 z-20 backdrop-blur-2xl ${
            isDark ? 'border-white/10 bg-[#0B0C0E]/95' : 'border-stone-200 bg-[#F7F7F6]/95'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-semibold flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5" />
                {recipeToEdit ? 'Édition de Recette' : 'Créateur de Recette Personnalisée'}
              </span>
              <span className="text-stone-400 text-xs">•</span>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                Calcul automatique des macros
              </span>
            </div>
            <h2 className="font-serif text-2xl font-normal tracking-tight text-stone-900 dark:text-white">
              {recipeToEdit ? recipeToEdit.title : 'Nouveau Repas sur Mesure'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-500/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-stone-200/80 dark:bg-white/10 text-stone-900 dark:text-stone-100 border border-stone-400/50 dark:border-white/20 text-xs font-mono">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Informations Générales */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 font-semibold">
                Nom du Repas
              </label>
              <input
                type="text"
                placeholder="Ex: Pâtes aux champignons, crème & lardons québécois"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-2xl text-sm border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                  isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                }`}
                required
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Type de Repas
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-stone-900 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                >
                  <option value="dejeuner">Déjeuner</option>
                  <option value="souper">Souper</option>
                  <option value="diner">Dîner</option>
                  <option value="collation">Collation</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Portions
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={servings}
                  onChange={(e) => setServings(Math.max(1, Number(e.target.value)))}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                    isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Préparation (min)
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                    isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Cuisson (min)
                </label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={cookTime}
                  onChange={(e) => setCookTime(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                    isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* BANDEAU MACROS TEMPS RÉEL (Calculé automatiquement d'après la BD) */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-black/30 border-white/10' : 'bg-stone-50 border-stone-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-600 dark:text-stone-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Macros Calculés en Direct (Par Portion)
              </span>
              <span className="text-[10px] font-mono text-stone-400">
                Total recette : {liveNutrients.totalCalories} kcal • {liveNutrients.estimatedTotalCost.toFixed(2)} $
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center font-mono">
              <div className="p-2 rounded-xl bg-white/50 dark:bg-white/5 border border-stone-200 dark:border-white/10">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 flex items-center justify-center gap-0.5">
                  <Flame className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Cals
                </div>
                <div className="text-lg font-bold text-stone-950 dark:text-white tabular-nums">
                  {liveNutrients.caloriesPerServing} <span className="text-[10px] font-normal">kcal</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/50 dark:bg-white/5 border border-stone-200 dark:border-white/10">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 flex items-center justify-center gap-0.5">
                  <Dumbbell className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Protéines
                </div>
                <div className="text-lg font-bold text-stone-950 dark:text-white tabular-nums">
                  {liveNutrients.proteinPerServing} <span className="text-[10px] font-normal">g</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/50 dark:bg-white/5 border border-stone-200 dark:border-white/10">
                <div className="text-[9px] uppercase tracking-wider text-stone-500">Glucides</div>
                <div className="text-lg font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                  {liveNutrients.carbsPerServing} <span className="text-[10px] font-normal">g</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/50 dark:bg-white/5 border border-stone-200 dark:border-white/10">
                <div className="text-[9px] uppercase tracking-wider text-stone-500">Lipides</div>
                <div className="text-lg font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                  {liveNutrients.fatPerServing} <span className="text-[10px] font-normal">g</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/50 dark:bg-white/5 border border-stone-200 dark:border-white/10 col-span-2 sm:col-span-1">
                <div className="text-[9px] uppercase tracking-wider text-stone-500">Coût / portion</div>
                <div className="text-lg font-bold text-stone-950 dark:text-white tabular-nums">
                  {liveNutrients.estimatedCostPerServing.toFixed(2)} <span className="text-[10px] font-normal">$</span>
                </div>
              </div>
            </div>
          </div>

          {/* AJOUT D'INGRÉDIENTS DEPUIS LE CATALOGUE SQLITE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-700 dark:text-stone-300 font-bold flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5" /> Ingrédients de la Recette ({ingredients.length})
              </label>
              <span className="text-[11px] font-mono text-stone-400">
                Sélectionnez parmi tous les produits disponibles
              </span>
            </div>

            {/* Sélecteur d'ingrédient */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-stone-200'
              }`}
            >
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un produit... (ex: pâtes, champignons, crème, lardons, poulet)"
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                  }`}
                />
              </div>

              {/* Résultats / Sélection */}
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {filteredCatalog.map((ing) => {
                  const isSelected = selectedIngredientId === ing.id;
                  return (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => handleSelectCatalogItem(ing.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all border ${
                        isSelected
                          ? isDark
                            ? 'bg-white/15 border-white text-white font-bold'
                            : 'bg-stone-900 text-white border-stone-900 font-bold'
                          : isDark
                          ? 'bg-white/[0.02] border-transparent text-stone-300 hover:bg-white/[0.06]'
                          : 'bg-stone-50 border-transparent text-stone-800 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{ing.name}</span>
                        {ing.barcode && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 font-semibold">
                            Code-barres
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-stone-400 shrink-0">
                          ({ing.packaging.exactPriceMetro.toFixed(2)}$ / {ing.packaging.label})
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-stone-400 shrink-0 ml-2">
                        {ing.macrosPer100g.calories} kcal • {ing.macrosPer100g.protein}g P
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Configuration de la quantité et validation */}
              {selectedIngredientId && (
                <div className="pt-2 border-t border-stone-200 dark:border-white/10 flex flex-wrap items-center gap-2.5">
                  <div className="flex-1 min-w-[120px]">
                    <span className="text-[10px] font-mono text-stone-400 block mb-0.5">Quantité</span>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={ingredientQty}
                      onChange={(e) => setIngredientQty(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono border focus:outline-none ${
                        isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <span className="text-[10px] font-mono text-stone-400 block mb-0.5">Unité</span>
                    <select
                      value={ingredientUnit}
                      onChange={(e) => setIngredientUnit(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                        isDark ? 'bg-stone-900 border-white/10 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                      }`}
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-[2] min-w-[160px]">
                    <span className="text-[10px] font-mono text-stone-400 block mb-0.5">Note (facultatif)</span>
                    <input
                      type="text"
                      placeholder="Ex: Émincés et dorés à la poêle"
                      value={ingredientNotes}
                      onChange={(e) => setIngredientNotes(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                        isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className={`px-4 py-2 mt-3 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all flex items-center gap-1.5 ${
                      isDark ? 'bg-white text-stone-950 hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                </div>
              )}
            </div>

            {/* Liste des Ingrédients Sélectionnés */}
            {ingredients.length > 0 ? (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {ingredients.map((item, index) => {
                  const ing = catalog[item.ingredientId];
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs ${
                        isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-stone-200 shadow-xs'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-stone-900 dark:text-stone-100 truncate">
                          {ing ? ing.name : item.ingredientId}
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-stone-500 italic">{item.notes}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleUpdateIngredientQty(index, Number(e.target.value))}
                            className={`w-16 px-2 py-1 rounded-lg text-xs font-mono text-right border ${
                              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-stone-50 border-stone-300'
                            }`}
                          />
                          <span className="font-mono text-stone-500 text-[11px]">{item.unit}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(index)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-950 dark:hover:text-white transition-colors"
                          title="Retirer cet ingrédient"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-stone-400 text-xs font-mono border border-dashed border-stone-300 dark:border-white/10 rounded-2xl">
                Aucun ingrédient sélectionné. Utilisez la recherche ci-dessus pour composer votre plat.
              </div>
            )}
          </div>

          {/* Instructions de préparation */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 font-semibold">
              Étapes de Préparation (Une par ligne)
            </label>
            <textarea
              rows={4}
              placeholder="Ex:&#10;1. Cuire les pâtes al dente.&#10;2. Faire dorer les lardons et champignons dans une poêle.&#10;3. Ajouter la crème et mélanger avec les pâtes et le parmesan."
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              className={`w-full p-3 rounded-2xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 font-sans leading-relaxed ${
                isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
              }`}
            />
          </div>

          {/* Actions Modal */}
          <div className="pt-4 border-t border-stone-200 dark:border-white/10 flex items-center justify-between">
            {recipeToEdit && onDeleteRecipe ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider text-stone-500 hover:text-stone-950 dark:hover:text-white border border-transparent hover:border-stone-300 dark:hover:border-white/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer la recette</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className={`px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all flex items-center gap-2 shadow-sm ${
                  isDark ? 'bg-white text-stone-950 hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                {isSaving ? (
                  <span>Sauvegarde...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Enregistrer le Repas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
