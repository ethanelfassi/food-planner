import { DayPlan, Recipe, WeeklyPlan } from '@/types';
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

// Fonction pour calculer le score de promotion d'une recette
function calculateRecipePromoScore(recipe: Recipe): number {
  let score = 0;
  for (const item of recipe.ingredients) {
    const ing = INGREDIENTS[item.ingredientId];
    if (ing) {
      if (ing.packaging.isMoiMemberPrice) score += 3; // Priorité Prix Membre Moi
      if (ing.flyerDeal?.store === 'Metro') score += 2; // Promo circulaire
    }
  }
  return score;
}

// Trier et marquer les recettes
const scoredRecipes = RECIPES.map((r) => ({
  ...r,
  promoScore: calculateRecipePromoScore(r),
  hasPromoOrMoiDeal: calculateRecipePromoScore(r) > 0,
}));

const breakfasts = scoredRecipes.filter((r) => r.mealType === 'dejeuner');
const dinners = scoredRecipes.filter((r) => r.mealType === 'souper');
const snacks = scoredRecipes.filter((r) => r.mealType === 'collation');

export function generateWeeklyPlan(): WeeklyPlan {
  const days: DayPlan[] = [];

  // Favoriser les promos et les prix Membre Moi :
  // Trier les soupers par score de promotion décroissant, avec une légère composante de variété
  const sortedDinners = [...dinners].sort((a, b) => b.promoScore - a.promoScore);

  // Placer en priorité les meilleures aubaines de la semaine (bœuf haché Membre Moi, poulet club Membre Moi, saumon circulaire)
  const dinnerSelection: Recipe[] = [];
  for (let i = 0; i < 7; i++) {
    dinnerSelection.push(sortedDinners[i % sortedDinners.length]);
  }

  // De même pour déjeuners et collations
  const sortedBreakfasts = [...breakfasts].sort((a, b) => b.promoScore - a.promoScore);
  const sortedSnacks = [...snacks].sort((a, b) => b.promoScore - a.promoScore);

  for (let i = 0; i < 7; i++) {
    const dayName = DAY_NAMES[i];
    const breakfast = sortedBreakfasts[i % sortedBreakfasts.length];
    const snack = sortedSnacks[i % sortedSnacks.length];
    const dinner = dinnerSelection[i];

    // Le midi : portion de la veille au soir !
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
  mealType: 'breakfast' | 'dinner' | 'snack',
  newRecipeId: string
): WeeklyPlan {
  const newDays = [...plan.days];
  const targetDay = { ...newDays[dayIndex] };
  const candidate = RECIPES.find((r) => r.id === newRecipeId);

  if (!candidate) return plan;

  if (mealType === 'breakfast') {
    targetDay.breakfast = candidate;
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
