import { GroceryItem, MetroAisle, ReceiptTaxCalculation, WeeklyPlan, Ingredient } from '@/types';
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
  partnerCalories = 1950,
  customCatalog?: Record<string, Ingredient> | Ingredient[],
  pantryMap?: Record<string, boolean>
): GroceryItem[] {
  const customMap: Record<string, Ingredient> = Array.isArray(customCatalog)
    ? Object.fromEntries(customCatalog.map((c) => [c.id, c]))
    : customCatalog || {};
  const aggregated: Record<string, number> = {};
  const coupleFactor = coupleModeEnabled
    ? Math.max(1.2, Math.min(2.0, 1 + partnerCalories / (user1Calories || 3050)))
    : 1.0;

  // Parcourir chaque jour (chaque repas est indépendant)
  for (const day of weeklyPlan.days) {
    for (const item of day.breakfast.ingredients) {
      aggregated[item.ingredientId] = (aggregated[item.ingredientId] || 0) + item.quantity * coupleFactor;
    }
    for (const item of day.lunch.ingredients) {
      aggregated[item.ingredientId] = (aggregated[item.ingredientId] || 0) + item.quantity * coupleFactor;
    }
    for (const item of day.dinner.ingredients) {
      aggregated[item.ingredientId] = (aggregated[item.ingredientId] || 0) + item.quantity * coupleFactor;
    }
    for (const item of day.snack.ingredients) {
      aggregated[item.ingredientId] = (aggregated[item.ingredientId] || 0) + item.quantity * coupleFactor;
    }
  }

  const groceryItems: GroceryItem[] = [];

  for (const [ingredientId, neededQuantity] of Object.entries(aggregated)) {
    const ingredient = customMap[ingredientId] || INGREDIENTS[ingredientId];
    if (!ingredient) continue;

    const pack = ingredient.packaging;
    const packageCount = Math.max(1, Math.ceil(neededQuantity / pack.amount));

    let packageDescription = `${packageCount}x ${pack.label}`;
    if (pack.unit === 'g' && neededQuantity > 0) {
      packageDescription += ` (~${Math.round(neededQuantity)}g requis)`;
    } else if (pack.unit === 'unite') {
      packageDescription += ` (${Math.round(neededQuantity)} requis)`;
    } else if (pack.unit === 'canne') {
      packageDescription += ` (${Math.round(neededQuantity * 10) / 10} boîte${neededQuantity > 1 ? 's' : ''} requise${neededQuantity > 1 ? 's' : ''})`;
    } else if (pack.unit === 'ml' && neededQuantity > 0) {
      packageDescription += ` (~${Math.round(neededQuantity)}ml requis)`;
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
      isInPantry: pantryMap ? Boolean(pantryMap[ingredientId]) : false,
      flyerHighlight: ingredient.flyerDeal?.promoLabel,
      imageUrl: ingredient.imageUrl,
      metroProductUrl: ingredient.metroProductUrl,
      macrosPer100g: ingredient.macrosPer100g,
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

// --- GÉNÉRATION D'UNE LISTE D'ÉPICERIE COMMUNE MUTUALISÉE ---

export interface CommonAccountPlanInput {
  accountId: string;
  accountName: string;
  plan: WeeklyPlan;
}

export function generateCommonGroceryList(
  accountPlans: CommonAccountPlanInput[],
  customPrices: Record<string, number> = {},
  customCatalog?: Record<string, Ingredient> | Ingredient[],
  pantryMap?: Record<string, boolean>
): GroceryItem[] {
  const customMap: Record<string, Ingredient> = Array.isArray(customCatalog)
    ? Object.fromEntries(customCatalog.map((c) => [c.id, c]))
    : customCatalog || {};

  interface IngredientDemand {
    total: number;
    byAccount: Record<string, number>;
  }

  const demandMap: Record<string, IngredientDemand> = {};

  for (const ap of accountPlans) {
    for (const day of ap.plan.days) {
      for (const item of day.breakfast.ingredients) {
        if (!demandMap[item.ingredientId]) demandMap[item.ingredientId] = { total: 0, byAccount: {} };
        demandMap[item.ingredientId].total += item.quantity;
        demandMap[item.ingredientId].byAccount[ap.accountId] =
          (demandMap[item.ingredientId].byAccount[ap.accountId] || 0) + item.quantity;
      }
      for (const item of day.lunch.ingredients) {
        if (!demandMap[item.ingredientId]) demandMap[item.ingredientId] = { total: 0, byAccount: {} };
        demandMap[item.ingredientId].total += item.quantity;
        demandMap[item.ingredientId].byAccount[ap.accountId] =
          (demandMap[item.ingredientId].byAccount[ap.accountId] || 0) + item.quantity;
      }
      for (const item of day.dinner.ingredients) {
        if (!demandMap[item.ingredientId]) demandMap[item.ingredientId] = { total: 0, byAccount: {} };
        demandMap[item.ingredientId].total += item.quantity;
        demandMap[item.ingredientId].byAccount[ap.accountId] =
          (demandMap[item.ingredientId].byAccount[ap.accountId] || 0) + item.quantity;
      }
      for (const item of day.snack.ingredients) {
        if (!demandMap[item.ingredientId]) demandMap[item.ingredientId] = { total: 0, byAccount: {} };
        demandMap[item.ingredientId].total += item.quantity;
        demandMap[item.ingredientId].byAccount[ap.accountId] =
          (demandMap[item.ingredientId].byAccount[ap.accountId] || 0) + item.quantity;
      }
    }
  }

  const accountNameMap = new Map(accountPlans.map((p) => [p.accountId, p.accountName]));
  const groceryItems: GroceryItem[] = [];

  for (const [ingredientId, demand] of Object.entries(demandMap)) {
    const ingredient = customMap[ingredientId] || INGREDIENTS[ingredientId];
    if (!ingredient) continue;

    const pack = ingredient.packaging;
    const neededQuantity = demand.total;
    const packageCount = Math.max(1, Math.ceil(neededQuantity / pack.amount));

    let packageDescription = `${packageCount}x ${pack.label}`;
    if (pack.unit === 'g' && neededQuantity > 0) {
      packageDescription += ` (~${Math.round(neededQuantity)}g requis)`;
    } else if (pack.unit === 'unite') {
      packageDescription += ` (${Math.round(neededQuantity)} requis)`;
    } else if (pack.unit === 'canne') {
      packageDescription += ` (${Math.round(neededQuantity * 10) / 10} boîte${neededQuantity > 1 ? 's' : ''} requise${neededQuantity > 1 ? 's' : ''})`;
    } else if (pack.unit === 'ml' && neededQuantity > 0) {
      packageDescription += ` (~${Math.round(neededQuantity)}ml requis)`;
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

    const neededBy = Object.keys(demand.byAccount).filter((accId) => demand.byAccount[accId] > 0);
    const neededBreakdown = Object.entries(demand.byAccount).map(([accId, qty]) => ({
      accountId: accId,
      accountName: accountNameMap.get(accId) || accId,
      quantity: Math.round(qty * 10) / 10,
    }));

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
      estimatedPriceMaxi: Math.round(packageCount * pack.priceMaxi * 100) / 100,
      estimatedPriceSuperC: Math.round(packageCount * pack.priceSuperC * 100) / 100,
      estimatedPriceIGA: Math.round(packageCount * pack.priceIGA * 100) / 100,
      checked: false,
      isInPantry: pantryMap ? Boolean(pantryMap[ingredientId]) : false,
      flyerHighlight: ingredient.flyerDeal?.promoLabel,
      imageUrl: ingredient.imageUrl,
      metroProductUrl: ingredient.metroProductUrl,
      macrosPer100g: ingredient.macrosPer100g,
      neededBy,
      neededBreakdown,
    });
  }

  // Trier par ordre de rayon puis nom
  groceryItems.sort((a, b) => {
    const orderA = AISLE_LABELS[a.aisle]?.order ?? 99;
    const orderB = AISLE_LABELS[b.aisle]?.order ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, 'fr');
  });

  return groceryItems;
}

// --- CALCUL DE RÉPARTITION EXACT DU TICKET DE CAISSE COMMUN ---

export interface AccountSplitSummary {
  accountId: string;
  accountName: string;
  itemCount: number;
  subtotalZeroRated: number;
  subtotalTaxable: number;
  tps: number;
  tvq: number;
  totalWithTax: number;
  percentOfTotal: number;
}

export function calculateCommonListSplit(
  items: GroceryItem[],
  accounts: { id: string; name: string }[]
): {
  totalWithTax: number;
  accountSplits: Record<string, AccountSplitSummary>;
  explanation: string;
} {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const numAccounts = Math.max(1, accounts.length);

  const splits: Record<string, {
    accountName: string;
    itemCount: number;
    subtotalZeroRated: number;
    subtotalTaxable: number;
  }> = {};

  for (const acc of accounts) {
    splits[acc.id] = {
      accountName: acc.name,
      itemCount: 0,
      subtotalZeroRated: 0,
      subtotalTaxable: 0,
    };
  }

  for (const item of items) {
    const cost = item.exactPriceMetro;
    const isTax = item.isTaxable;

    // 1. Article manuel ciblé
    if (item.isCustom && item.forAccount && splits[item.forAccount]) {
      const accId = item.forAccount;
      splits[accId].itemCount += 1;
      if (isTax) {
        splits[accId].subtotalTaxable += cost;
      } else {
        splits[accId].subtotalZeroRated += cost;
      }
      continue;
    }

    // 2. Article avec répartition des besoins issue des plans de repas
    if (item.neededBreakdown && item.neededBreakdown.length > 0) {
      const totalDemand = item.neededBreakdown.reduce((sum, b) => sum + b.quantity, 0);
      for (const b of item.neededBreakdown) {
        if (!splits[b.accountId]) continue;
        const ratio = totalDemand > 0 ? b.quantity / totalDemand : 1 / item.neededBreakdown.length;
        const partCost = cost * ratio;
        splits[b.accountId].itemCount += 1;
        if (isTax) {
          splits[b.accountId].subtotalTaxable += partCost;
        } else {
          splits[b.accountId].subtotalZeroRated += partCost;
        }
      }
      continue;
    }

    // 3. Article commun non ventilé : partage à parts égales
    const share = cost / numAccounts;
    for (const acc of accounts) {
      splits[acc.id].itemCount += 1;
      if (isTax) {
        splits[acc.id].subtotalTaxable += share;
      } else {
        splits[acc.id].subtotalZeroRated += share;
      }
    }
  }

  // Calcul des taxes et totaux par compte
  let grandTotal = 0;
  const resultSplits: Record<string, AccountSplitSummary> = {};

  for (const acc of accounts) {
    const raw = splits[acc.id];
    const subZero = round2(raw.subtotalZeroRated);
    const subTax = round2(raw.subtotalTaxable);
    const tps = round2(subTax * 0.05);
    const tvq = round2(subTax * 0.09975);
    const total = round2(subZero + subTax + tps + tvq);
    grandTotal += total;

    resultSplits[acc.id] = {
      accountId: acc.id,
      accountName: acc.name,
      itemCount: raw.itemCount,
      subtotalZeroRated: subZero,
      subtotalTaxable: subTax,
      tps,
      tvq,
      totalWithTax: total,
      percentOfTotal: 0,
    };
  }

  grandTotal = round2(grandTotal);

  for (const acc of accounts) {
    const res = resultSplits[acc.id];
    res.percentOfTotal = grandTotal > 0 ? Math.round((res.totalWithTax / grandTotal) * 100) : Math.round(100 / numAccounts);
  }

  const names = accounts.map((a) => a.name).join(' & ');
  const explanation = `Ventilation équitable basée sur les portions réelles cuisinées pour ${names} + partage égal des articles maison.`;

  return {
    totalWithTax: grandTotal,
    accountSplits: resultSplits,
    explanation,
  };
}
