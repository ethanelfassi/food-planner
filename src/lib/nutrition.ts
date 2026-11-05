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

// Convertit une quantité en grammes équivalents selon l'unité et le type d'aliment (source unique de vérité)
export function estimateTotalWeightGrams(
  amount: number,
  unit: string,
  ingredientId = ''
): number {
  const cleanUnit = (unit || 'g').toLowerCase().trim();
  const safeAmount = Math.max(0, Number(amount) || 0);
  const id = ingredientId.toLowerCase();

  if (cleanUnit === 'g' || cleanUnit === 'ml') {
    if (id.includes('thon') && safeAmount >= 140 && safeAmount <= 190) {
      return 120;
    }
    return safeAmount;
  }

  if (cleanUnit === 'unite' || cleanUnit === 'unité') {
    if (id.includes('oeuf')) return safeAmount * 50;
    if (id.includes('banane')) return safeAmount * 120;
    if (id.includes('pomme')) return safeAmount * 170;
    if (id.includes('avocat')) return safeAmount * 150;
    if (id.includes('bagel')) return safeAmount * 95;
    if (id.includes('pita')) return safeAmount * 60;
    if (id.includes('tortilla')) return safeAmount * 61;
    if (id.includes('muffin')) return safeAmount * 57;
    if (id.includes('patate_douce')) return safeAmount * 200;
    if (id.includes('concombre')) return safeAmount * 300;
    if (id.includes('poivron')) return safeAmount * 150;
    if (id.includes('brocoli')) return safeAmount * 300;
    if (id.includes('chou_fleur')) return safeAmount * 600;
    if (id.includes('citron')) return safeAmount * 100;
    if (id.includes('ail')) return safeAmount * 10;
    if (id.includes('echalote') || id.includes('oignon_vert')) return safeAmount * 15;
    return safeAmount * 100;
  }

  if (
    cleanUnit === 'c_a_soupe' ||
    cleanUnit === 'cuillere' ||
    cleanUnit === 'c. à soupe'
  ) {
    return safeAmount * 15;
  }

  if (cleanUnit === 'tranche') {
    return safeAmount * 25;
  }

  if (cleanUnit === 'canne') {
    if (id.includes('thon')) return safeAmount * 120;
    if (id.includes('tomate')) return safeAmount * 796;
    if (id.includes('haricot') || id.includes('pois')) return safeAmount * 390;
    if (id.includes('coco')) return safeAmount * 400;
    if (id.includes('mais') || id.includes('corn')) return safeAmount * 280;
    return safeAmount * 400;
  }

  return safeAmount;
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
    const ing =
      (customCatalog && customCatalog[item.ingredientId]) ||
      INGREDIENTS[item.ingredientId];
    if (!ing) continue;

    const unit = (item.unit || ing.baseUnit || 'g').toLowerCase();
    const qty = Number(item.quantity) || 0;
    const grams = estimateTotalWeightGrams(qty, unit, item.ingredientId);

    const factor = grams / 100;
    totalCals += (ing.macrosPer100g?.calories ?? 0) * factor;
    totalProt += (ing.macrosPer100g?.protein ?? 0) * factor;
    totalCarbs += (ing.macrosPer100g?.carbs ?? 0) * factor;
    totalFat += (ing.macrosPer100g?.fat ?? 0) * factor;

    // Coût estimé au prorata de la portion utilisée du paquet
    if (ing.packaging && ing.packaging.amount > 0) {
      const packUnit = (ing.packaging.unit || 'g').toLowerCase();
      if (
        packUnit === 'canne' ||
        packUnit === 'unite' ||
        packUnit === 'unité'
      ) {
        const itemQuantity = Number(item.quantity) || 1;
        totalCost +=
          (ing.packaging.exactPriceMetro / ing.packaging.amount) * itemQuantity;
      } else {
        totalCost +=
          (ing.packaging.exactPriceMetro / ing.packaging.amount) * grams;
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
