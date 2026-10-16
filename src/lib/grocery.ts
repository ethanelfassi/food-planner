import { GroceryItem, MetroAisle, WeeklyPlan } from '@/types';
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

export function generateGroceryList(weeklyPlan: WeeklyPlan): GroceryItem[] {
  const aggregated: Record<string, number> = {};

  // Parcourir chaque jour
  for (const day of weeklyPlan.days) {
    // 1. Déjeuner (1 portion)
    for (const item of day.breakfast.ingredients) {
      aggregated[item.ingredientId] = (aggregated[item.ingredientId] || 0) + item.quantity;
    }

    // 2. Collation (1 portion)
    for (const item of day.snack.ingredients) {
      aggregated[item.ingredientId] = (aggregated[item.ingredientId] || 0) + item.quantity;
    }

    // 3. Souper cuisiné le soir (ingrédients déjà quantifiés pour 2 portions dans la recette)
    for (const item of day.dinner.ingredients) {
      aggregated[item.ingredientId] = (aggregated[item.ingredientId] || 0) + item.quantity;
    }
  }

  // Transformer en GroceryItem
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

    // Calcul des prix
    const metroUnitCost = (ingredient.flyerDeal?.store === 'Metro' && ingredient.flyerDeal.discountPrice)
      ? ingredient.flyerDeal.discountPrice
      : pack.priceMetro;

    const maxiUnitCost = (ingredient.flyerDeal?.store === 'Maxi' && ingredient.flyerDeal.discountPrice)
      ? ingredient.flyerDeal.discountPrice
      : pack.priceMaxi;

    const superCUnitCost = (ingredient.flyerDeal?.store === 'Super C' && ingredient.flyerDeal.discountPrice)
      ? ingredient.flyerDeal.discountPrice
      : pack.priceSuperC;

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
      estimatedPriceMetro: Math.round(packageCount * metroUnitCost * 100) / 100,
      estimatedPriceMaxi: Math.round(packageCount * maxiUnitCost * 100) / 100,
      estimatedPriceSuperC: Math.round(packageCount * superCUnitCost * 100) / 100,
      estimatedPriceIGA: Math.round(packageCount * igaUnitCost * 100) / 100,
      checked: false,
      flyerHighlight: ingredient.flyerDeal?.promoLabel,
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
