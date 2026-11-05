import {
  DayPlan,
  ProductPreferencesMap,
  Recipe,
  ScheduledMealRecord,
  UserCustomizationSettings,
  WeeklyPlan,
} from '@/types';
import { RECIPES } from '@/data/recipes';
import { INGREDIENTS } from '@/data/ingredients';

export const MIN_RECIPES_FOR_AUTO_GENERATION = 5;

export const DAY_NAMES = [
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
      if (ing.flyerDeal?.store === 'Metro') score += 2; // Promo circulaire Metro
    }
  }

  return { isExcluded, score, likedCount };
}

export const createEmptyMeal = (
  mealType: 'dejeuner' | 'diner' | 'souper' | 'collation',
  title: string
): Recipe => ({
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

export function recalculateDayMacros(day: DayPlan): DayPlan {
  const dailyCalories = Math.round(
    (day.breakfast?.caloriesPerServing || 0) +
      (day.lunch?.caloriesPerServing || 0) +
      (day.dinner?.caloriesPerServing || 0) +
      (day.snack?.caloriesPerServing || 0)
  );
  const dailyProtein =
    Math.round(
      ((day.breakfast?.proteinPerServing || 0) +
        (day.lunch?.proteinPerServing || 0) +
        (day.dinner?.proteinPerServing || 0) +
        (day.snack?.proteinPerServing || 0)) *
        10
    ) / 10;
  const dailyCarbs =
    Math.round(
      ((day.breakfast?.carbsPerServing || 0) +
        (day.lunch?.carbsPerServing || 0) +
        (day.dinner?.carbsPerServing || 0) +
        (day.snack?.carbsPerServing || 0)) *
        10
    ) / 10;
  const dailyFat =
    Math.round(
      ((day.breakfast?.fatPerServing || 0) +
        (day.lunch?.fatPerServing || 0) +
        (day.dinner?.fatPerServing || 0) +
        (day.snack?.fatPerServing || 0)) *
        10
    ) / 10;

  return {
    ...day,
    dailyCalories,
    dailyProtein,
    dailyCarbs,
    dailyFat,
  };
}

export function recalculateWeeklyPlanAverages(plan: WeeklyPlan): WeeklyPlan {
  const updatedDays = plan.days.map(recalculateDayMacros);
  const count = Math.max(1, updatedDays.length);

  const avgDailyCalories = Math.round(
    updatedDays.reduce((acc, d) => acc + d.dailyCalories, 0) / count
  );
  const avgDailyProtein = Math.round(
    updatedDays.reduce((acc, d) => acc + d.dailyProtein, 0) / count
  );
  const avgDailyCarbs = Math.round(
    updatedDays.reduce((acc, d) => acc + d.dailyCarbs, 0) / count
  );
  const avgDailyFat = Math.round(
    updatedDays.reduce((acc, d) => acc + d.dailyFat, 0) / count
  );

  return {
    days: updatedDays,
    avgDailyCalories,
    avgDailyProtein,
    avgDailyCarbs,
    avgDailyFat,
  };
}

export function applyScheduledMealsToWeeklyPlan(
  plan: WeeklyPlan,
  accountId: string,
  scheduledMeals: ScheduledMealRecord[],
  allRecipes: Recipe[]
): WeeklyPlan {
  const recMap = new Map(allRecipes.map((r) => [r.id, r]));
  const updatedDays = plan.days.map((day, idx) => {
    const matches = scheduledMeals.filter(
      (m) => m.accountId === accountId && m.dayIndex === idx
    );
    if (matches.length === 0) return recalculateDayMacros(day);
    const newDay: DayPlan = { ...day };
    for (const m of matches) {
      const found = recMap.get(m.recipeId);
      if (found) {
        if (m.mealSlot === 'breakfast') newDay.breakfast = found;
        else if (m.mealSlot === 'lunch') newDay.lunch = found;
        else if (m.mealSlot === 'dinner') newDay.dinner = found;
        else if (m.mealSlot === 'snack') newDay.snack = found;
      }
    }
    return recalculateDayMacros(newDay);
  });

  return recalculateWeeklyPlanAverages({ ...plan, days: updatedDays });
}

export function generateWeeklyPlan(
  preferences: ProductPreferencesMap = {},
  customRecipes: Recipe[] = [],
  userSettings?: UserCustomizationSettings
): WeeklyPlan {
  const days: DayPlan[] = [];
  const allRecipes = [...RECIPES, ...customRecipes];

  const defaultEmptyBreakfast = createEmptyMeal('dejeuner', 'Aucun petit-déjeuner planifié');
  const defaultEmptyLunch = createEmptyMeal('diner', 'Aucun déjeuner planifié');
  const defaultEmptyDinner = createEmptyMeal('souper', 'Aucun dîner planifié');
  const defaultEmptySnack = createEmptyMeal('collation', 'Aucune collation planifiée');

  // Règle métier : si l'utilisateur a moins de 5 recettes enregistrées, le générateur ne génère rien automatiquement.
  if (allRecipes.length < MIN_RECIPES_FOR_AUTO_GENERATION) {
    for (let i = 0; i < 7; i++) {
      days.push({
        dayIndex: i,
        dayName: DAY_NAMES[i],
        breakfast: defaultEmptyBreakfast,
        lunch: defaultEmptyLunch,
        dinner: defaultEmptyDinner,
        snack: defaultEmptySnack,
        dailyCalories: 0,
        dailyProtein: 0,
        dailyCarbs: 0,
        dailyFat: 0,
      });
    }
    return {
      days,
      avgDailyCalories: 0,
      avgDailyProtein: 0,
      avgDailyCarbs: 0,
      avgDailyFat: 0,
    };
  }

  // Évaluer et filtrer les recettes selon les préférences
  const scoredRecipes = allRecipes.map((r) => {
    const { isExcluded, score, likedCount } = calculateRecipeScore(r, preferences);
    const customBonus = r.isCustom ? 25 : 0;
    return {
      ...r,
      isExcluded,
      recipeScore: score + customBonus,
      likedCount,
      hasPromoOrMoiDeal: score > 0,
    };
  });

  // Filtrer les candidats autorisés (non exclus) pour les 4 repas
  let validBreakfasts = scoredRecipes.filter((r) => r.mealType === 'dejeuner' && !r.isExcluded);
  let validLunches = scoredRecipes.filter((r) => r.mealType === 'diner' && !r.isExcluded);
  let validDinners = scoredRecipes.filter((r) => r.mealType === 'souper' && !r.isExcluded);
  let validSnacks = scoredRecipes.filter((r) => r.mealType === 'collation' && !r.isExcluded);

  // Repli croisé entre midi (diner) et soir (souper) si l'un des deux créneaux n'a pas de recette dédiée
  if (validLunches.length === 0 && validDinners.length > 0) {
    validLunches = [...validDinners];
  }
  if (validDinners.length === 0 && validLunches.length > 0) {
    validDinners = [...validLunches];
  }

  // Filets de sécurité si l'utilisateur a tout exclu dans une catégorie
  if (validBreakfasts.length === 0) {
    validBreakfasts = scoredRecipes.filter((r) => r.mealType === 'dejeuner');
  }
  if (validLunches.length === 0) {
    validLunches = scoredRecipes.filter((r) => r.mealType === 'diner' || r.mealType === 'souper');
  }
  if (validDinners.length === 0) {
    validDinners = scoredRecipes.filter((r) => r.mealType === 'souper' || r.mealType === 'diner');
  }
  if (validSnacks.length === 0) {
    validSnacks = scoredRecipes.filter((r) => r.mealType === 'collation');
  }

  // Trier par score décroissant (produits aimés + promos en premier)
  const sortedBreakfasts =
    validBreakfasts.length > 0
      ? [...validBreakfasts].sort((a, b) => b.recipeScore - a.recipeScore)
      : [defaultEmptyBreakfast];
  const sortedLunches =
    validLunches.length > 0
      ? [...validLunches].sort((a, b) => b.recipeScore - a.recipeScore)
      : [defaultEmptyLunch];
  const sortedDinners =
    validDinners.length > 0
      ? [...validDinners].sort((a, b) => b.recipeScore - a.recipeScore)
      : [defaultEmptyDinner];
  const sortedSnacks =
    validSnacks.length > 0
      ? [...validSnacks].sort((a, b) => b.recipeScore - a.recipeScore)
      : [defaultEmptySnack];

  const targetCals = userSettings?.targetCalories || 0;
  const targetProt = userSettings?.targetProtein || 0;

  for (let i = 0; i < 7; i++) {
    const dayName = DAY_NAMES[i];
    const breakfast = sortedBreakfasts[i % sortedBreakfasts.length];
    // Décalage d'index (+1) entre lunch et dinner pour éviter de manger exactement le même plat midi et soir
    const dinner = sortedDinners[i % sortedDinners.length];
    let lunch =
      sortedLunches.length > 1
        ? sortedLunches[(i + 1) % sortedLunches.length]
        : sortedLunches[i % sortedLunches.length];
    let snack = sortedSnacks[i % sortedSnacks.length];

    // Si des cibles métaboliques sont fournies et qu'on a plusieurs choix, affiner le couple (lunch, snack) pour approcher la cible
    if (targetCals > 0 && (sortedLunches.length > 1 || sortedSnacks.length > 1)) {
      let bestCombo = { lunch, snack, diff: Infinity };
      for (const candLunch of sortedLunches.slice(0, 6)) {
        // Éviter si possible d'avoir le même plat midi et soir le même jour
        if (sortedLunches.length > 1 && candLunch.id === dinner.id) continue;
        for (const candSnack of sortedSnacks.slice(0, 6)) {
          const totalCals =
            breakfast.caloriesPerServing +
            candLunch.caloriesPerServing +
            dinner.caloriesPerServing +
            candSnack.caloriesPerServing;
          const totalProt =
            breakfast.proteinPerServing +
            candLunch.proteinPerServing +
            dinner.proteinPerServing +
            candSnack.proteinPerServing;
          const calError = Math.abs(totalCals - targetCals) / Math.max(1, targetCals);
          const protError =
            targetProt > 0 ? Math.abs(totalProt - targetProt) / targetProt : 0;
          const varietyPenalty = candLunch.id === days[i - 1]?.lunch?.id ? 0.15 : 0;
          const scoreDiff = calError * 0.6 + protError * 0.4 + varietyPenalty;
          if (scoreDiff < bestCombo.diff) {
            bestCombo = { lunch: candLunch, snack: candSnack, diff: scoreDiff };
          }
        }
      }
      lunch = bestCombo.lunch;
      snack = bestCombo.snack;
    }

    days.push(
      recalculateDayMacros({
        dayIndex: i,
        dayName,
        breakfast,
        lunch,
        dinner,
        snack,
        dailyCalories: 0,
        dailyProtein: 0,
        dailyCarbs: 0,
        dailyFat: 0,
      })
    );
  }

  return recalculateWeeklyPlanAverages({
    days,
    avgDailyCalories: 0,
    avgDailyProtein: 0,
    avgDailyCarbs: 0,
    avgDailyFat: 0,
  });
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

  newDays[dayIndex] = recalculateDayMacros(targetDay);

  return recalculateWeeklyPlanAverages({
    ...plan,
    days: newDays,
  });
}
