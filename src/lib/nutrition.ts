import { RecipeIngredientItem, Ingredient } from '@/types';
import { INGREDIENTS } from '@/data/ingredients';

export interface RecipeNutrientCalculation {
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  estimatedTotalCost: number;
  estimatedCostPerServing: number;
}

// Calcul automatique et temps réel des valeurs nutritionnelles et du coût d'une recette
export function calculateRecipeNutrients(
  ingredients: RecipeIngredientItem[],
  servings: number = 1,
  customCatalog?: Record<string, Ingredient>
): RecipeNutrientCalculation {
  const safeServings = Math.max(1, servings || 1);
  let totalCals = 0;
  let totalProt = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalCost = 0;

  for (const item of ingredients) {
    const ing = (customCatalog && customCatalog[item.ingredientId]) || INGREDIENTS[item.ingredientId];
    if (!ing) continue;

    // Calcul du poids en grammes
    let grams = Number(item.quantity) || 0;
    const unit = (item.unit || ing.baseUnit || 'g').toLowerCase();

    if (unit === 'g' || unit === 'ml') {
      grams = Number(item.quantity) || 0;
    } else if (unit === 'unite' || unit === 'unité') {
      if (item.ingredientId.includes('oeuf')) grams = (Number(item.quantity) || 1) * 50;
      else if (item.ingredientId.includes('banane')) grams = (Number(item.quantity) || 1) * 120;
      else if (item.ingredientId.includes('pomme')) grams = (Number(item.quantity) || 1) * 180;
      else if (item.ingredientId.includes('avocat')) grams = (Number(item.quantity) || 1) * 150;
      else if (item.ingredientId.includes('bagel')) grams = (Number(item.quantity) || 1) * 95;
      else if (item.ingredientId.includes('patate_douce')) grams = (Number(item.quantity) || 1) * 200;
      else if (item.ingredientId.includes('ail')) grams = (Number(item.quantity) || 1) * 10;
      else grams = (Number(item.quantity) || 1) * (ing.packaging?.amount || 100);
    } else if (unit === 'c_a_soupe' || unit === 'cuillere' || unit === 'c. à soupe') {
      grams = (Number(item.quantity) || 1) * 15;
    } else if (unit === 'tranche') {
      grams = (Number(item.quantity) || 1) * 25;
    } else if (unit === 'canne') {
      const id = item.ingredientId.toLowerCase();
      if (id.includes('thon')) {
        grams = (Number(item.quantity) || 1) * 120; // 1 boîte de thon standard 170g = 120g de chair égouttée
      } else if (id.includes('tomate')) {
        grams = (Number(item.quantity) || 1) * 796; // Boîte standard de tomates québécoise 796 ml
      } else if (id.includes('haricot') || id.includes('pois')) {
        grams = (Number(item.quantity) || 1) * 390; // Boîte de légumineuses 540 ml = ~390g égoutté
      } else {
        grams = (Number(item.quantity) || 1) * 400;
      }
    }

    const factor = grams / 100;
    totalCals += (ing.macrosPer100g?.calories ?? 0) * factor;
    totalProt += (ing.macrosPer100g?.protein ?? 0) * factor;
    totalCarbs += (ing.macrosPer100g?.carbs ?? 0) * factor;
    totalFat += (ing.macrosPer100g?.fat ?? 0) * factor;

    // Coût estimé au prorata de la quantité utilisée
    if (ing.packaging && ing.packaging.amount > 0) {
      const unitCost = ing.packaging.exactPriceMetro / ing.packaging.amount;
      totalCost += unitCost * grams;
    }
  }

  const round0 = (n: number) => Math.round(n);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    caloriesPerServing: round0(totalCals / safeServings),
    proteinPerServing: round1(totalProt / safeServings),
    carbsPerServing: round1(totalCarbs / safeServings),
    fatPerServing: round1(totalFat / safeServings),
    totalCalories: round0(totalCals),
    totalProtein: round1(totalProt),
    totalCarbs: round1(totalCarbs),
    totalFat: round1(totalFat),
    estimatedTotalCost: round2(totalCost),
    estimatedCostPerServing: round2(totalCost / safeServings),
  };
}
