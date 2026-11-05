import { CoupleSettings, GroceryItem, SplitCostReport } from '@/types';

export const DEFAULT_COUPLE_SETTINGS: CoupleSettings = {
  coupleModeEnabled: false,
  user1: {
    id: 'user_1',
    name: 'Profil Principal',
    targetCalories: 2500,
    targetProtein: 140,
    dietaryDescription: 'Objectif nutritionnel principal',
    portionMultiplier: 1.0,
  },
  user2: {
    id: 'user_2',
    name: 'Partenaire',
    targetCalories: 2000,
    targetProtein: 90,
    dietaryDescription: 'Objectif nutritionnel partenaire',
    portionMultiplier: 0.8,
  },
};

export function calculateSplitCost(
  groceryItems: GroceryItem[],
  settings: CoupleSettings
): SplitCostReport {
  const billableItems = groceryItems.filter((i) => !i.isInPantry);
  const totalMetro = billableItems.reduce((acc, i) => acc + i.exactPriceMetro, 0);
  const user1Name = settings.user1?.name || 'Membre 1';
  const user2Name = settings.user2?.name || 'Membre 2';

  if (!settings.coupleModeEnabled) {
    return {
      totalMetroCost: totalMetro,
      user1Share: totalMetro,
      user2Share: 0,
      user1Percent: 100,
      user2Percent: 0,
      meatDairyShareUser1: totalMetro,
      meatDairyShareUser2: 0,
      explanation: `Mode individuel actif. 100 % à la charge de ${user1Name}.`,
    };
  }

  // Calcul dynamique différencié selon les cibles réelles personnalisées :
  const prot1 = settings.user1.targetProtein || 140;
  const prot2 = settings.user2.targetProtein || 90;
  const protTotal = Math.max(1, prot1 + prot2);
  const meatShare1 = Math.min(0.85, Math.max(0.15, prot1 / protTotal));
  const meatShare2 = 1 - meatShare1;

  const cal1 = settings.user1.targetCalories || 2500;
  const cal2 = settings.user2.targetCalories || 2000;
  const calTotal = Math.max(1, cal1 + cal2);
  const calShare1 = Math.min(0.85, Math.max(0.15, cal1 / calTotal));
  const calShare2 = 1 - calShare1;

  const dairyShare1 = (meatShare1 + calShare1) / 2;
  const dairyShare2 = 1 - dairyShare1;

  let user1Total = 0;
  let user2Total = 0;
  let meatDairyUser1 = 0;
  let meatDairyUser2 = 0;

  for (const item of billableItems) {
    const cost = item.exactPriceMetro;
    if (item.aisle === 'BOUCHERIE_ET_POISSONNERIE') {
      const share1 = cost * meatShare1;
      const share2 = cost * meatShare2;
      user1Total += share1;
      user2Total += share2;
      meatDairyUser1 += share1;
      meatDairyUser2 += share2;
    } else if (item.aisle === 'PRODUITS_LAITIERS_ET_OEUFS') {
      const share1 = cost * dairyShare1;
      const share2 = cost * dairyShare2;
      user1Total += share1;
      user2Total += share2;
      meatDairyUser1 += share1;
      meatDairyUser2 += share2;
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
    meatDairyShareUser1: rounded(meatDairyUser1),
    meatDairyShareUser2: rounded(meatDairyUser2),
    explanation: `${user1Name} prend en charge ${user1Percent}% de la facture (${user1Rounded} $) selon ses cibles (${prot1}g prot, ${cal1} kcal). ${user2Name} (${prot2}g prot, ${cal2} kcal) prend en charge ${user2Percent}% (${user2Rounded} $).`,
  };
}
