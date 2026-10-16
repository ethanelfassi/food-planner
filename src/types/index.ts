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
  regularPriceMetro: number;
  exactPriceMetro: number; // Prix exact appliqué chez Metro (promo / Membre Moi si actif)
  unitPricePer100g: number; // Prix calculé aux 100g ou 100ml ou unité
  unitPriceLabel: string; // Ex: "2.00 $ / 100g", "0.33 $ / unité"
  priceMaxi: number;
  priceSuperC: number;
  priceIGA: number;
  isTaxable: boolean; // false pour épicerie de base détaxée (0%), true pour articles taxés (14.975%)
  isMoiMemberPrice: boolean; // Si prix exclusif réservé aux membres Moi
  moiPriceLabel?: string; // Ex: "Prix exclusif Membre Moi"
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
    isMoiExclusive?: boolean;
  };
}

export type MealType = 'dejeuner' | 'diner' | 'souper' | 'collation';

export interface RecipeIngredientItem {
  ingredientId: string;
  quantity: number;
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
  servings: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  ingredients: RecipeIngredientItem[];
  instructions: string[];
  tags: string[];
  hasPromoOrMoiDeal?: boolean; // Pour prioriser les recettes en promo
}

export interface DayPlan {
  dayIndex: number;
  dayName: string;
  breakfast: Recipe;
  lunch: Recipe;
  dinner: Recipe;
  snack: Recipe;
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
  regularPriceMetro: number;
  exactPriceMetro: number; // Prix final appliqué (avec rabais Membre Moi inclus)
  unitPriceLabel: string; // "2.00 $ / 100g"
  pricePer100g: number;
  isTaxable: boolean; // TPS (5%) et TVQ (9.975%)
  isMoiMemberPrice: boolean;
  moiPriceLabel?: string;
  savingsAmount: number; // Économie réalisée par rapport au prix régulier
  estimatedPriceMaxi: number;
  estimatedPriceSuperC: number;
  estimatedPriceIGA: number;
  checked: boolean;
  isCustom?: boolean;
  isCustomPrice?: boolean;
  customPricePerPackage?: number;
  flyerHighlight?: string;
  imageUrl?: string;
  metroProductUrl?: string;
}

export interface ReceiptTaxCalculation {
  subtotalZeroRated: number; // Épicerie de base non taxable (0%)
  subtotalTaxable: number; // Produits taxables (articles de maison, snacks)
  tps: number; // 5.0%
  tvq: number; // 9.975%
  totalTaxes: number;
  totalWithTax: number; // Ce qu'on va EXACTEMENT payer à la caisse
  regularTotal: number; // Total si prix réguliers sans promo
  totalSavingsMoi: number; // Montant total sauvé grâce aux prix Membre Moi & promos
}

export interface StorePriceSummary {
  storeName: string;
  totalEstimated: number;
  differenceWithMetro: number;
  bannerType: 'Standard' | 'Discount' | 'Haut de gamme';
}

export interface UserProfile {
  id: string;
  name: string;
  targetCalories: number;
  targetProtein: number;
  dietaryDescription: string;
  portionMultiplier: number;
}

export interface CoupleSettings {
  coupleModeEnabled: boolean;
  user1: UserProfile;
  user2: UserProfile;
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

export type ProductPreferenceStatus = 'liked' | 'disliked' | 'neutral';

export type ProductPreferencesMap = Record<string, ProductPreferenceStatus>;

export interface ProductPreference {
  ingredientId: string;
  status: ProductPreferenceStatus;
  updatedAt: string;
}

export type CustomPricesMap = Record<string, number>; // ingredientId -> custom price ($ CAD)

export interface UserCustomizationSettings {
  targetCalories: number; // Ex: 3050 kcal
  targetProtein: number; // Ex: 165 g
  targetCarbs: number; // Ex: 390 g
  targetFat: number; // Ex: 90 g
  targetWeeklyBudget: number; // Ex: 135 $ CAD
  partnerCalories: number; // Ex: 1950 kcal
  partnerProtein: number; // Ex: 75 g
  goalName: string; // Ex: 'Prise de masse athlétique'
}

export const DEFAULT_USER_SETTINGS: UserCustomizationSettings = {
  targetCalories: 3050,
  targetProtein: 165,
  targetCarbs: 390,
  targetFat: 90,
  targetWeeklyBudget: 135,
  partnerCalories: 1950,
  partnerProtein: 75,
  goalName: 'Prise de masse athlétique',
};
