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

// Détermine le poids en grammes d'une unité / portion pour n'importe quel aliment
export function resolveUnitWeightGrams(
  ingredientId = '',
  ingredient?: Ingredient
): number {
  const id = (ingredientId || ingredient?.id || '').toLowerCase();

  // Priorité 1 : poids unitaire explicitement renseigné
  if (ingredient?.unitWeightGrams && ingredient.unitWeightGrams > 0) {
    return ingredient.unitWeightGrams;
  }

  // Priorité 2 : extraction depuis le libellé d'emballage ou le nom du produit
  const label = ingredient?.packaging?.label || '';
  const name = ingredient?.name || '';
  const multiMatch = `${label} ${name}`.match(
    /\b(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i
  );
  if (multiMatch) {
    const unitVal = parseFloat(multiMatch[2].replace(',', '.'));
    if (unitVal > 0 && unitVal <= 500) {
      return Math.round(unitVal * 10) / 10;
    }
  }

  if (
    ingredient?.packaging?.amount &&
    ingredient.packaging.amount > 0 &&
    ['g', 'ml'].includes((ingredient.packaging.unit || 'g').toLowerCase())
  ) {
    const countMatch = label.match(
      /(\d+)\s*(?:pi[eè]ces?|unit[eé]s?|muffins?|tortillas?|pitas?|bagels?|merguez|galettes?|courgettes?|poivrons?|avocats?|pommes?|bananes?|citrons?)/i
    );
    if (countMatch) {
      const count = parseInt(countMatch[1], 10);
      if (count > 0) {
        const perUnit = Math.round(ingredient.packaging.amount / count);
        if (perUnit > 0 && perUnit <= 600) {
          return perUnit;
        }
      }
    }
  }

  const nameWeightMatch = name.match(/\b(\d+(?:[.,]\d+)?)\s*(?:g|ml)\b/i);
  if (nameWeightMatch) {
    const nameGrams = parseFloat(nameWeightMatch[1].replace(',', '.'));
    if (nameGrams > 0 && nameGrams <= 350) {
      return Math.round(nameGrams * 10) / 10;
    }
  }

  // Priorité 3 : produits scannés ou personnalisés sans poids unitaire explicite
  const isCustomOrBarcode =
    Boolean(ingredient?.isCustom) ||
    id.startsWith('barcode_') ||
    id.startsWith('custom_');
  const normText = `${id} ${name.toLowerCase()} ${label.toLowerCase()}`;

  if (isCustomOrBarcode && ingredient?.packaging) {
    const pkgAmount = Number(ingredient.packaging.amount) || 0;
    const pkgUnit = (ingredient.packaging.unit || 'g').toLowerCase();
    if (pkgAmount > 0 && pkgAmount <= 200 && (pkgUnit === 'g' || pkgUnit === 'ml')) {
      return pkgAmount;
    }
    if (/flocon|cereal|corn.?flake|avoine|gruau|granola|muesli/.test(normText)) return 38;
    if (/whey|proteine|protéine|poudre/.test(normText)) return 30;
    if (/sauce|coulis|salsa|houmous/.test(normText)) return 60;
    if (/pain|tranche|bagel/.test(normText)) return 40;
    if (/galette|steak|poulet|saumon|tilapia|viande|porc|boeuf|bœuf|merguez/.test(normText)) return 125;
    if (/barre/.test(normText)) return 35;
  }

  // Priorité 4 : règles catalogue standard
  if (id.includes('oeuf')) return 50;
  if (id.includes('banane')) return 120;
  if (id.includes('pomme_terre') || id.includes('patate_rouge') || id.includes('grelot')) return 150;
  if (id.includes('patate_douce')) return 200;
  if (id.includes('pomme')) return 170;
  if (id.includes('avocat')) return 150;
  if (id.includes('bagel')) return 95;
  if (id.includes('pita')) return 60;
  if (id.includes('tortilla')) return 61;
  if (id.includes('muffin')) return 57;
  if (id.includes('concombre')) return 300;
  if (id.includes('poivron')) return 150;
  if (id.includes('brocoli')) return 300;
  if (id.includes('chou_fleur')) return 600;
  if (id.includes('courgette')) return 165;
  if (id.includes('carotte')) return 75;
  if (id.includes('oignon_jaune')) return 110;
  if (id.includes('citron')) return 100;
  if (id.includes('ail')) return 10;
  if (id.includes('echalote') || id.includes('oignon_vert')) return 15;
  if (id.includes('barre') || normText.includes('barre')) return 35;
  if (id.includes('poitrine_dinde') || id.includes('jambon')) return 30;
  if (id.includes('poulet_poitrine')) return 175;
  if (id.includes('haut_cuisse')) return 110;
  if (id.includes('saumon') || id.includes('tilapia') || id.includes('filet_porc')) return 150;
  if (id.includes('steak')) return 175;
  if (id.includes('tofu')) return 150;
  if (id.includes('yogourt') || id.includes('fromage_cottage') || id.includes('ricotta')) return 175;
  if (id.includes('fromage')) return 30;
  if (id.includes('whey')) return 30;

  return 100;
}

// Convertit une quantité en grammes équivalents selon l'unité et le type d'aliment (source unique de vérité)
export function estimateTotalWeightGrams(
  amount: number,
  unit: string,
  ingredientId = '',
  ingredient?: Ingredient
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
    return safeAmount * resolveUnitWeightGrams(ingredientId, ingredient);
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
    const grams = estimateTotalWeightGrams(qty, unit, item.ingredientId, ing);

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
