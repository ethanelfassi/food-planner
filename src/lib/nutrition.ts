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
      const id = item.ingredientId.toLowerCase();
      const qty = Number(item.quantity) || 1;
      if (id.includes('oeuf')) grams = qty * 50;
      else if (id.includes('banane')) grams = qty * 120;
      else if (id.includes('pomme')) grams = qty * 170;
      else if (id.includes('avocat')) grams = qty * 150;
      else if (id.includes('bagel')) grams = qty * 95;
      else if (id.includes('pita')) grams = qty * 60;
      else if (id.includes('tortilla')) grams = qty * 61;
      else if (id.includes('muffin')) grams = qty * 57;
      else if (id.includes('patate_douce')) grams = qty * 200;
      else if (id.includes('concombre')) grams = qty * 300;
      else if (id.includes('poivron')) grams = qty * 150;
      else if (id.includes('brocoli')) grams = qty * 300;
      else if (id.includes('chou_fleur')) grams = qty * 600;
      else if (id.includes('citron')) grams = qty * 100;
      else if (id.includes('ail')) grams = qty * 10;
      else if (id.includes('echalote') || id.includes('oignon_vert')) grams = qty * 15;
      else grams = qty * 100;
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
      } else if (id.includes('coco')) {
        grams = (Number(item.quantity) || 1) * 400;
      } else if (id.includes('mais') || id.includes('corn')) {
        grams = (Number(item.quantity) || 1) * 280; // Canne de 341 ml = ~280g égoutté
      } else {
        grams = (Number(item.quantity) || 1) * 400;
      }
    }

    const factor = grams / 100;
    totalCals += (ing.macrosPer100g?.calories ?? 0) * factor;
    totalProt += (ing.macrosPer100g?.protein ?? 0) * factor;
    totalCarbs += (ing.macrosPer100g?.carbs ?? 0) * factor;
    totalFat += (ing.macrosPer100g?.fat ?? 0) * factor;

    // Coût estimé au prorata de la portion utilisée du paquet
    if (ing.packaging && ing.packaging.amount > 0) {
      const packUnit = (ing.packaging.unit || 'g').toLowerCase();
      if (packUnit === 'canne' || packUnit === 'unite' || packUnit === 'unité') {
        const itemQuantity = Number(item.quantity) || 1;
        totalCost += (ing.packaging.exactPriceMetro / ing.packaging.amount) * itemQuantity;
      } else {
        totalCost += (ing.packaging.exactPriceMetro / ing.packaging.amount) * grams;
      }
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
