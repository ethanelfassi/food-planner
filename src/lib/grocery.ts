import { GroceryItem, MetroAisle, ReceiptTaxCalculation, WeeklyPlan } from '@/types';
import { INGREDIENTS } from '@/data/ingredients';

export const AISLE_LABELS: Record<MetroAisle, { title: string; order: number; icon: string }> = {
  FRUITS_ET_LEGUMES: { title: 'Fruits & Légumes', order: 1, icon: 'Apple' },
  BOULANGERIE: { title: 'Boulangerie & Pains', order: 2, icon: 'Croissant' },
  BOUCHERIE_ET_POISSONNERIE: { title: 'Boucherie & Poissonnerie', order: 3, icon: 'Beef' },
  PRODUITS_LAITIERS_ET_OEUFS: { title: 'Produits laitiers & Œufs', order: 4, icon: 'Milk' },
  EPICERIE: { title: 'Épicerie & Féculents', order: 5, icon: 'Wheat' },
  SURGELES: { title: 'Surgelés', order: 6, icon: 'Snowflake' },
  DIVERS: { title: 'Articles divers & Maison', order: 7, icon: 'Package' },
};

export function generateGroceryList(
  weeklyPlan: WeeklyPlan,
  coupleModeEnabled = false,
  customPrices: Record<string, number> = {},
  user1Calories = 3050,
  partnerCalories = 1950
): GroceryItem[] {
  const aggregated: Record<string, number> = {};
  const coupleFactor = coupleModeEnabled
    ? Math.max(1.2, Math.min(2.0, 1 + partnerCalories / (user1Calories || 3050)))
    : 1.0;

  // Parcourir chaque jour
  for (const day of weeklyPlan.days) {
    for (const item of day.breakfast.ingredients) {
      aggregated[item.ingredientId] = (aggregated[item.ingredientId] || 0) + item.quantity * coupleFactor;
    }
    for (const item of day.snack.ingredients) {
      aggregated[item.ingredientId] = (aggregated[item.ingredientId] || 0) + item.quantity * coupleFactor;
    }
    for (const item of day.dinner.ingredients) {
      aggregated[item.ingredientId] = (aggregated[item.ingredientId] || 0) + item.quantity * coupleFactor;
    }
  }

  const groceryItems: GroceryItem[] = [];

  for (const [ingredientId, neededQuantity] of Object.entries(aggregated)) {
    const ingredient = INGREDIENTS[ingredientId];
    if (!ingredient) continue;

    const pack = ingredient.packaging;
    const packageCount = Math.max(1, Math.ceil(neededQuantity / pack.amount));

    let packageDescription = `${packageCount}x ${pack.label}`;
    if (pack.unit === 'g' && neededQuantity > 0) {
      packageDescription += ` (~${Math.round(neededQuantity)}g requis)`;
    } else if (pack.unit === 'unite') {
      packageDescription += ` (${Math.round(neededQuantity)} requis)`;
    }

    const hasCustomPrice = customPrices[ingredientId] !== undefined && customPrices[ingredientId] > 0;
    const exactUnitCost = hasCustomPrice ? customPrices[ingredientId] : pack.exactPriceMetro;
    const regUnitCost = pack.regularPriceMetro;

    const totalRegular = Math.round(packageCount * regUnitCost * 100) / 100;
    const totalExact = Math.round(packageCount * exactUnitCost * 100) / 100;
    const savings = Math.max(0, Math.round((totalRegular - totalExact) * 100) / 100);

    let unitPricePer100g = pack.unitPricePer100g;
    let unitPriceLabel = pack.unitPriceLabel;
    if (hasCustomPrice && pack.amount > 0) {
      if (pack.unit === 'g' || pack.unit === 'ml') {
        unitPricePer100g = Math.round(((exactUnitCost / pack.amount) * 100) * 100) / 100;
        unitPriceLabel = `${unitPricePer100g.toFixed(2)} $ / 100${pack.unit}`;
      } else {
        unitPricePer100g = Math.round((exactUnitCost / pack.amount) * 100) / 100;
        unitPriceLabel = `${unitPricePer100g.toFixed(2)} $ / unité`;
      }
    }

    const maxiUnitCost = pack.priceMaxi;
    const superCUnitCost = pack.priceSuperC;
    const igaUnitCost = pack.priceIGA;

    groceryItems.push({
      id: `grocery_${ingredientId}`,
      ingredientId,
      name: ingredient.name,
      aisle: ingredient.aisle,
      neededQuantity: Math.round(neededQuantity * 10) / 10,
      unit: ingredient.baseUnit,
      packageDescription,
      packageCount,
      regularPriceMetro: totalRegular,
      exactPriceMetro: totalExact,
      unitPriceLabel,
      pricePer100g: unitPricePer100g,
      isTaxable: pack.isTaxable,
      isMoiMemberPrice: pack.isMoiMemberPrice && !hasCustomPrice,
      moiPriceLabel: hasCustomPrice ? `Prix personnalisé : ${exactUnitCost.toFixed(2)}$` : pack.moiPriceLabel,
      isCustomPrice: hasCustomPrice,
      customPricePerPackage: hasCustomPrice ? exactUnitCost : undefined,
      savingsAmount: savings,
      estimatedPriceMaxi: Math.round(packageCount * maxiUnitCost * 100) / 100,
      estimatedPriceSuperC: Math.round(packageCount * superCUnitCost * 100) / 100,
      estimatedPriceIGA: Math.round(packageCount * igaUnitCost * 100) / 100,
      checked: false,
      flyerHighlight: ingredient.flyerDeal?.promoLabel,
      imageUrl: ingredient.imageUrl,
      metroProductUrl: ingredient.metroProductUrl,
    });
  }

  // Trier par ordre des rayons physiques de supermarché
  groceryItems.sort((a, b) => {
    const orderA = AISLE_LABELS[a.aisle]?.order ?? 99;
    const orderB = AISLE_LABELS[b.aisle]?.order ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, 'fr');
  });

  return groceryItems;
}

// Calcul fiscal exact pour le Québec (TPS 5% + TVQ 9.975%)
export function calculateReceiptTaxes(items: GroceryItem[]): ReceiptTaxCalculation {
  let subtotalZeroRated = 0;
  let subtotalTaxable = 0;
  let regularTotal = 0;

  for (const item of items) {
    regularTotal += item.regularPriceMetro;
    if (item.isTaxable) {
      subtotalTaxable += item.exactPriceMetro;
    } else {
      subtotalZeroRated += item.exactPriceMetro;
    }
  }

  // Arrondi au centime
  const round2 = (n: number) => Math.round(n * 100) / 100;

  subtotalZeroRated = round2(subtotalZeroRated);
  subtotalTaxable = round2(subtotalTaxable);
  regularTotal = round2(regularTotal);

  const tps = round2(subtotalTaxable * 0.05); // TPS fédérale 5%
  const tvq = round2(subtotalTaxable * 0.09975); // TVQ québécoise 9.975%
  const totalTaxes = round2(tps + tvq);
  const totalWithTax = round2(subtotalZeroRated + subtotalTaxable + totalTaxes);
  const totalSavingsMoi = round2(Math.max(0, regularTotal - (subtotalZeroRated + subtotalTaxable)));

  return {
    subtotalZeroRated,
    subtotalTaxable,
    tps,
    tvq,
    totalTaxes,
    totalWithTax,
    regularTotal,
    totalSavingsMoi,
  };
}
