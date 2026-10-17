import { CoupleSettings, GroceryItem, SplitCostReport } from '@/types';

export const DEFAULT_COUPLE_SETTINGS: CoupleSettings = {
  coupleModeEnabled: false,
  user1: {
    id: 'ethan',
    name: 'Ethan',
    targetCalories: 3050,
    targetProtein: 165,
    dietaryDescription: 'Sportif 5x/semaine • Prise de masse • Grand consommateur de protéines',
    portionMultiplier: 1.0,
  },
  user2: {
    id: 'laurine',
    name: 'Laurine',
    targetCalories: 1950,
    targetProtein: 75,
    dietaryDescription: 'Maintien / Santé • Portions plus légères • Moins de viande rouge',
    portionMultiplier: 0.64, // ~1950 / 3050
  },
};

export function calculateSplitCost(
  groceryItems: GroceryItem[],
  settings: CoupleSettings
): SplitCostReport {
  const totalMetro = groceryItems.reduce((acc, i) => acc + i.exactPriceMetro, 0);

  if (!settings.coupleModeEnabled) {
    return {
      totalMetroCost: totalMetro,
      user1Share: totalMetro,
      user2Share: 0,
      user1Percent: 100,
      user2Percent: 0,
      meatDairyShareUser1: totalMetro,
      meatDairyShareUser2: 0,
      explanation: 'Mode 1 personne actif. 100% à la charge d\'Ethan.',
    };
  }

  // Calcul dynamique différencié selon les cibles réelles personnalisées :
  const protTotal = (settings.user1.targetProtein || 165) + (settings.user2.targetProtein || 75);
  const meatShare1 = Math.min(0.85, Math.max(0.5, (settings.user1.targetProtein || 165) / protTotal));
  const meatShare2 = 1 - meatShare1;

  const calTotal = (settings.user1.targetCalories || 3050) + (settings.user2.targetCalories || 1950);
  const calShare1 = Math.min(0.80, Math.max(0.5, (settings.user1.targetCalories || 3050) / calTotal));
  const calShare2 = 1 - calShare1;

  const dairyShare1 = (meatShare1 + calShare1) / 2;
  const dairyShare2 = 1 - dairyShare1;

  let user1Total = 0;
  let user2Total = 0;
  let meatDairyEthan = 0;
  let meatDairyLaurine = 0;

  for (const item of groceryItems) {
    const cost = item.exactPriceMetro;
    if (item.aisle === 'BOUCHERIE_ET_POISSONNERIE') {
      const share1 = cost * meatShare1;
      const share2 = cost * meatShare2;
      user1Total += share1;
      user2Total += share2;
      meatDairyEthan += share1;
      meatDairyLaurine += share2;
    } else if (item.aisle === 'PRODUITS_LAITIERS_ET_OEUFS') {
      const share1 = cost * dairyShare1;
      const share2 = cost * dairyShare2;
      user1Total += share1;
      user2Total += share2;
      meatDairyEthan += share1;
      meatDairyLaurine += share2;
    } else {
      const share1 = cost * calShare1;
      const share2 = cost * calShare2;
      user1Total += share1;
      user2Total += share2;
    }
  }

  const rounded = (n: number) => Math.round(n * 100) / 100;
  const user1Rounded = rounded(user1Total);
  const user2Rounded = rounded(user2Total);
  const user1Percent = Math.round((user1Rounded / (user1Rounded + user2Rounded || 1)) * 100);
  const user2Percent = 100 - user1Percent;

  return {
    totalMetroCost: rounded(totalMetro),
    user1Share: user1Rounded,
    user2Share: user2Rounded,
    user1Percent,
    user2Percent,
    meatDairyShareUser1: rounded(meatDairyEthan),
    meatDairyShareUser2: rounded(meatDairyLaurine),
    explanation: `${settings.user1.name} prend en charge ${user1Percent}% de la facture (${user1Rounded} $) car son quota protéique (${settings.user1.targetProtein}g) et calorique (${settings.user1.targetCalories} kcal) concentre la majeure partie du budget boucherie et produits laitiers. Laurine (${settings.user2.targetProtein}g prot, ${settings.user2.targetCalories} kcal) prend en charge ${user2Percent}% (${user2Rounded} $).`,
  };
}
