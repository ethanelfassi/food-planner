import { DayPlan, ProductPreferencesMap, Recipe, WeeklyPlan } from '@/types';
import { RECIPES } from '@/data/recipes';
import { INGREDIENTS } from '@/data/ingredients';

const DAY_NAMES = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

// Calcule le score promotionnel et l'impact des préférences produit
export function calculateRecipeScore(
  recipe: Recipe,
  preferences: ProductPreferencesMap = {}
): {
  isExcluded: boolean;
  score: number;
  likedCount: number;
} {
  let isExcluded = false;
  let score = 0;
  let likedCount = 0;

  for (const item of recipe.ingredients) {
    const pref = preferences[item.ingredientId];
    if (pref === 'disliked') {
      isExcluded = true;
    } else if (pref === 'liked') {
      score += 15; // Fort bonus pour chaque ingrédient favori
      likedCount++;
    }

    const ing = INGREDIENTS[item.ingredientId];
    if (ing) {
      if (ing.packaging.isMoiMemberPrice) score += 4; // Priorité Prix Membre Moi
      if (ing.flyerDeal?.store === 'Metro') score += 2; // Promo circulaire
    }
  }

  return { isExcluded, score, likedCount };
}

const createEmptyMeal = (mealType: 'dejeuner' | 'diner' | 'souper' | 'collation', title: string): Recipe => ({
  id: `empty_${mealType}`,
  title,
  mealType,
  prepTimeMinutes: 0,
  cookTimeMinutes: 0,
  servings: 1,
  caloriesPerServing: 0,
  proteinPerServing: 0,
  carbsPerServing: 0,
  fatPerServing: 0,
  tags: [],
  ingredients: [],
  instructions: [],
  isCustom: true,
});

export function generateWeeklyPlan(
  preferences: ProductPreferencesMap = {},
  customRecipes: Recipe[] = []
): WeeklyPlan {
  const days: DayPlan[] = [];

  const allRecipes = [...RECIPES, ...customRecipes];

  // Évaluer et filtrer les recettes selon les préférences
  const scoredRecipes = allRecipes.map((r) => {
    const { isExcluded, score, likedCount } = calculateRecipeScore(r, preferences);
    const customBonus = r.isCustom ? 25 : 0; // Bonus pour favoriser les recettes personnalisées créées par l'utilisateur
    return {
      ...r,
      isExcluded,
      recipeScore: score + customBonus,
      likedCount,
      hasPromoOrMoiDeal: score > 0,
    };
  });

  // Filtrer les candidats autorisés (non exclus)
  let validBreakfasts = scoredRecipes.filter((r) => r.mealType === 'dejeuner' && !r.isExcluded);
  let validDinners = scoredRecipes.filter((r) => r.mealType === 'souper' && !r.isExcluded);
  let validSnacks = scoredRecipes.filter((r) => r.mealType === 'collation' && !r.isExcluded);

  // Filets de sécurité si l'utilisateur a tout exclu : fallback gracieux
  if (validBreakfasts.length === 0) {
    validBreakfasts = scoredRecipes.filter((r) => r.mealType === 'dejeuner');
  }
  if (validDinners.length === 0) {
    validDinners = scoredRecipes.filter((r) => r.mealType === 'souper');
  }
  if (validSnacks.length === 0) {
    validSnacks = scoredRecipes.filter((r) => r.mealType === 'collation');
  }

  // Fallbacks si aucune recette n'existe dans le catalogue
  const defaultEmptyBreakfast = createEmptyMeal('dejeuner', 'Aucun petit-déjeuner planifié');
  const defaultEmptyLunch = createEmptyMeal('diner', 'Aucun déjeuner planifié');
  const defaultEmptyDinner = createEmptyMeal('souper', 'Aucun dîner planifié');
  const defaultEmptySnack = createEmptyMeal('collation', 'Aucune collation planifiée');

  // Trier par score décroissant (produits aimés + promos en premier)
  const sortedBreakfasts = validBreakfasts.length > 0
    ? [...validBreakfasts].sort((a, b) => b.recipeScore - a.recipeScore)
    : [defaultEmptyBreakfast];
  const sortedDinners = validDinners.length > 0
    ? [...validDinners].sort((a, b) => b.recipeScore - a.recipeScore)
    : [defaultEmptyDinner];
  const sortedSnacks = validSnacks.length > 0
    ? [...validSnacks].sort((a, b) => b.recipeScore - a.recipeScore)
    : [defaultEmptySnack];

  for (let i = 0; i < 7; i++) {
    const dayName = DAY_NAMES[i];
    const breakfast = sortedBreakfasts[i % sortedBreakfasts.length];
    const lunch = defaultEmptyLunch;
    const dinner = sortedDinners[i % sortedDinners.length];
    const snack = sortedSnacks[i % sortedSnacks.length];

    const dailyCalories =
      breakfast.caloriesPerServing +
      lunch.caloriesPerServing +
      dinner.caloriesPerServing +
      snack.caloriesPerServing;

    const dailyProtein =
      breakfast.proteinPerServing +
      lunch.proteinPerServing +
      dinner.proteinPerServing +
      snack.proteinPerServing;

    const dailyCarbs =
      breakfast.carbsPerServing +
      lunch.carbsPerServing +
      dinner.carbsPerServing +
      snack.carbsPerServing;

    const dailyFat =
      breakfast.fatPerServing +
      lunch.fatPerServing +
      dinner.fatPerServing +
      snack.fatPerServing;

    days.push({
      dayIndex: i,
      dayName,
      breakfast,
      lunch,
      dinner,
      snack,
      dailyCalories,
      dailyProtein,
      dailyCarbs,
      dailyFat,
    });
  }

  const avgDailyCalories = Math.round(
    days.reduce((acc, d) => acc + d.dailyCalories, 0) / 7
  );
  const avgDailyProtein = Math.round(
    days.reduce((acc, d) => acc + d.dailyProtein, 0) / 7
  );
  const avgDailyCarbs = Math.round(
    days.reduce((acc, d) => acc + d.dailyCarbs, 0) / 7
  );
  const avgDailyFat = Math.round(
    days.reduce((acc, d) => acc + d.dailyFat, 0) / 7
  );

  return {
    days,
    avgDailyCalories,
    avgDailyProtein,
    avgDailyCarbs,
    avgDailyFat,
  };
}

export function replaceRecipeInPlan(
  plan: WeeklyPlan,
  dayIndex: number,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  newRecipeId: string,
  customRecipes: Recipe[] = []
): WeeklyPlan {
  const newDays = [...plan.days];
  const targetDay = { ...newDays[dayIndex] };
  const allRecipes = [...RECIPES, ...customRecipes];
  const candidate = allRecipes.find((r) => r.id === newRecipeId);

  if (!candidate) return plan;

  if (mealType === 'breakfast') {
    targetDay.breakfast = candidate;
  } else if (mealType === 'lunch') {
    targetDay.lunch = candidate;
  } else if (mealType === 'dinner') {
    targetDay.dinner = candidate;
  } else if (mealType === 'snack') {
    targetDay.snack = candidate;
  }

  targetDay.dailyCalories =
    targetDay.breakfast.caloriesPerServing +
    targetDay.lunch.caloriesPerServing +
    targetDay.dinner.caloriesPerServing +
    targetDay.snack.caloriesPerServing;

  targetDay.dailyProtein =
    targetDay.breakfast.proteinPerServing +
    targetDay.lunch.proteinPerServing +
    targetDay.dinner.proteinPerServing +
    targetDay.snack.proteinPerServing;

  targetDay.dailyCarbs =
    targetDay.breakfast.carbsPerServing +
    targetDay.lunch.carbsPerServing +
    targetDay.dinner.carbsPerServing +
    targetDay.snack.carbsPerServing;

  targetDay.dailyFat =
    targetDay.breakfast.fatPerServing +
    targetDay.lunch.fatPerServing +
    targetDay.dinner.fatPerServing +
    targetDay.snack.fatPerServing;

  newDays[dayIndex] = targetDay;

  const avgDailyCalories = Math.round(
    newDays.reduce((acc, d) => acc + d.dailyCalories, 0) / 7
  );
  const avgDailyProtein = Math.round(
    newDays.reduce((acc, d) => acc + d.dailyProtein, 0) / 7
  );
  const avgDailyCarbs = Math.round(
    newDays.reduce((acc, d) => acc + d.dailyCarbs, 0) / 7
  );
  const avgDailyFat = Math.round(
    newDays.reduce((acc, d) => acc + d.dailyFat, 0) / 7
  );

  return {
    days: newDays,
    avgDailyCalories,
    avgDailyProtein,
    avgDailyCarbs,
    avgDailyFat,
  };
}
