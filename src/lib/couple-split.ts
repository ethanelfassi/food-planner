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
    id: 'copine',
    name: 'Copine',
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
  const totalMetro = groceryItems.reduce((acc, i) => acc + i.estimatedPriceMetro, 0);

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

  // Calcul différencié par rayon :
  // En boucherie/poissonnerie et protéines pures, Ethan consomme environ 68% du total (165g prot vs 75g)
  // En fruits, légumes et épicerie de base, la répartition est proportionnelle au total calorique (~61% vs 39%)
  let user1Total = 0;
  let user2Total = 0;
  let meatDairyEthan = 0;
  let meatDairyCopine = 0;

  for (const item of groceryItems) {
    const cost = item.estimatedPriceMetro;
    if (item.aisle === 'BOUCHERIE_ET_POISSONNERIE') {
      // Forte surconsommation sportive
      const share1 = cost * 0.70;
      const share2 = cost * 0.30;
      user1Total += share1;
      user2Total += share2;
      meatDairyEthan += share1;
      meatDairyCopine += share2;
    } else if (item.aisle === 'PRODUITS_LAITIERS_ET_OEUFS') {
      // Forte consommation d'œufs et yogourt grec
      const share1 = cost * 0.65;
      const share2 = cost * 0.35;
      user1Total += share1;
      user2Total += share2;
      meatDairyEthan += share1;
      meatDairyCopine += share2;
    } else {
      // Épicerie, boulangerie, fruits & légumes
      const share1 = cost * 0.60;
      const share2 = cost * 0.40;
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
    meatDairyShareUser2: rounded(meatDairyCopine),
    explanation: `Ethan prend en charge ${user1Percent}% de la facture (${user1Rounded} $) car son quota protéique (165g) et calorique (3 050 kcal) concentre la majeure partie du budget boucherie et produits laitiers. Sa copine prend en charge ${user2Percent}% (${user2Rounded} $).`,
  };
}
