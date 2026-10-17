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

  // Trier par score décroissant (produits aimés + promos en premier)
  const sortedBreakfasts = [...validBreakfasts].sort((a, b) => b.recipeScore - a.recipeScore);
  const sortedDinners = [...validDinners].sort((a, b) => b.recipeScore - a.recipeScore);
  const sortedSnacks = [...validSnacks].sort((a, b) => b.recipeScore - a.recipeScore);

  // Construire la sélection des soupers avec variété
  const dinnerSelection: Recipe[] = [];
  for (let i = 0; i < 7; i++) {
    dinnerSelection.push(sortedDinners[i % sortedDinners.length]);
  }

  for (let i = 0; i < 7; i++) {
    const dayName = DAY_NAMES[i];
    const breakfast = sortedBreakfasts[i % sortedBreakfasts.length];
    const snack = sortedSnacks[i % sortedSnacks.length];
    const dinner = dinnerSelection[i];

    // Le midi : portion de la veille au soir
    const lunch = i === 0 ? dinnerSelection[dinnerSelection.length - 1] : dinnerSelection[i - 1];

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
    const nextDayIndex = (dayIndex + 1) % 7;
    if (newDays[nextDayIndex]) {
      const nextDay = { ...newDays[nextDayIndex] };
      nextDay.lunch = candidate;
      nextDay.dailyCalories =
        nextDay.breakfast.caloriesPerServing +
        nextDay.lunch.caloriesPerServing +
        nextDay.dinner.caloriesPerServing +
        nextDay.snack.caloriesPerServing;
      nextDay.dailyProtein =
        nextDay.breakfast.proteinPerServing +
        nextDay.lunch.proteinPerServing +
        nextDay.dinner.proteinPerServing +
        nextDay.snack.proteinPerServing;
      newDays[nextDayIndex] = nextDay;
    }
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
