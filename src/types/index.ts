export type MetroAisle =
  | 'FRUITS_ET_LEGUMES'
  | 'BOUCHERIE_ET_POISSONNERIE'
  | 'PRODUITS_LAITIERS_ET_OEUFS'
  | 'BOULANGERIE'
  | 'EPICERIE'
  | 'SURGELES'
  | 'DIVERS';

export interface IngredientPackaging {
  amount: number;
  unit: string;
  label: string; // Ex: "Barquette de 450g", "Pot de 750g", "Douzaine"
  priceMetro: number;
  priceMaxi: number;
  priceSuperC: number;
  priceIGA: number;
}

export interface Ingredient {
  id: string;
  name: string;
  aisle: MetroAisle;
  baseUnit: 'g' | 'ml' | 'unite' | 'c_a_soupe' | 'canne' | 'tranche';
  packaging: IngredientPackaging;
  imageUrl?: string;
  metroProductUrl?: string;
  macrosPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  flyerDeal?: {
    store: 'Metro' | 'Maxi' | 'Super C' | 'IGA';
    promoLabel: string;
    discountPrice: number;
  };
}

export type MealType = 'dejeuner' | 'diner' | 'souper' | 'collation';

export interface RecipeIngredientItem {
  ingredientId: string;
  quantity: number; // Quantité par portion unitaire
  unit: string;
  displayQuantity?: string;
  notes?: string;
}

export interface Recipe {
  id: string;
  title: string;
  mealType: 'dejeuner' | 'souper' | 'collation';
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number; // Portions produites par la recette (2 pour les soupers cuisinés le soir)
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  ingredients: RecipeIngredientItem[];
  instructions: string[];
  tags: string[];
}

export interface DayPlan {
  dayIndex: number;
  dayName: string; // "Lundi", "Mardi", etc.
  breakfast: Recipe;
  lunch: Recipe; // Restes du souper de la veille ou repas midi
  dinner: Recipe; // Cuisiné le soir (x2 portions pour couvrir le midi suivant)
  snack: Recipe; // Collation sportive riche en protéines
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
}

export interface WeeklyPlan {
  days: DayPlan[];
  avgDailyCalories: number;
  avgDailyProtein: number;
  avgDailyCarbs: number;
  avgDailyFat: number;
}

export interface GroceryItem {
  id: string;
  ingredientId?: string;
  name: string;
  aisle: MetroAisle;
  neededQuantity: number;
  unit: string;
  packageDescription: string;
  packageCount: number;
  estimatedPriceMetro: number;
  estimatedPriceMaxi: number;
  estimatedPriceSuperC: number;
  estimatedPriceIGA: number;
  checked: boolean;
  isCustom?: boolean;
  flyerHighlight?: string;
  imageUrl?: string;
  metroProductUrl?: string;
}

export interface StorePriceSummary {
  storeName: string;
  totalEstimated: number;
  differenceWithMetro: number;
  bannerType: 'Standard' | 'Discount' | 'Haut de gamme';
}

// --- NOUVEAUX TYPES : GESTION DE COUPLE & RÉPARTITION DES COURSES ---
export interface UserProfile {
  id: string;
  name: string;
  targetCalories: number;
  targetProtein: number;
  dietaryDescription: string;
  portionMultiplier: number; // Ratio calorique / protéique relatif
}

export interface CoupleSettings {
  coupleModeEnabled: boolean;
  user1: UserProfile; // Ethan (Sportif, 3050 kcal, 165g prot)
  user2: UserProfile; // Copine (Régime / Objectif différent)
}

export interface SplitCostReport {
  totalMetroCost: number;
  user1Share: number;
  user2Share: number;
  user1Percent: number;
  user2Percent: number;
  meatDairyShareUser1: number;
  meatDairyShareUser2: number;
  explanation: string;
}

// --- NOUVEAUX TYPES : TRACKER CALORIQUE INTÉGRÉ ---
export interface DailyLoggedItem {
  id: string;
  name: string;
  mealType: MealType | 'extra';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  consumed: boolean;
}
