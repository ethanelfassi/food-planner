import { DayPlan, Recipe, WeeklyPlan } from '@/types';
import { RECIPES } from '@/data/recipes';

const DAY_NAMES = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

const breakfasts = RECIPES.filter((r) => r.mealType === 'dejeuner');
const dinners = RECIPES.filter((r) => r.mealType === 'souper');
const snacks = RECIPES.filter((r) => r.mealType === 'collation');

export function generateWeeklyPlan(): WeeklyPlan {
  const days: DayPlan[] = [];

  // Sélectionner 7 soupers distincts ou variés pour chaque soir
  const dinnerSelection: Recipe[] = [];
  const shuffledDinners = [...dinners].sort(() => Math.random() - 0.5);

  for (let i = 0; i < 7; i++) {
    dinnerSelection.push(shuffledDinners[i % shuffledDinners.length]);
  }

  for (let i = 0; i < 7; i++) {
    const dayName = DAY_NAMES[i];
    const breakfast = breakfasts[i % breakfasts.length];
    const snack = snacks[i % snacks.length];
    const dinner = dinnerSelection[i];

    // Le midi : portion de la veille au soir !
    // Pour le lundi midi (jour 0), on prend une portion du souper du dimanche ou le premier souper
    const lunch = i === 0 ? dinnerSelection[dinnerSelection.length - 1] : dinnerSelection[i - 1];

    // Calcul des totaux journaliers
    // Noter que pour le lunch, c'est la même valeur par portion que le souper
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
    // Si on change le souper de ce soir, le dîner du lendemain hérite de cette nouvelle recette !
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
