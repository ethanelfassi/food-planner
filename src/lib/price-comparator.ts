import { GroceryItem, StorePriceSummary } from '@/types';

export interface StoreBannerDefinition {
  id: string;
  storeName: string;
  bannerType: 'Standard' | 'Discount' | 'Haut de gamme';
  enabled: boolean;
  loyaltyProgramName?: string;
  searchBaseUrl?: string;
  getItemPrice: (item: GroceryItem) => number;
}

/**
 * Registre extensible des enseignes d'épicerie.
 * Actuellement centré exclusivement sur Metro.
 * Pour activer ou ajouter une nouvelle enseigne dans le futur, il suffit d'ajouter une entrée ici.
 */
export const STORE_BANNERS_REGISTRY: StoreBannerDefinition[] = [
  {
    id: 'metro',
    storeName: 'Metro',
    bannerType: 'Standard',
    enabled: true,
    loyaltyProgramName: 'Programme Moi',
    searchBaseUrl: 'https://www.metro.ca/epicerie-en-ligne/recherche?filter=',
    getItemPrice: (item) => (item.isInPantry ? 0 : item.exactPriceMetro),
  },
];

export function getActiveStoreBanners(): StoreBannerDefinition[] {
  return STORE_BANNERS_REGISTRY.filter((b) => b.enabled);
}

export function calculateStorePriceComparison(groceryList: GroceryItem[]): StorePriceSummary[] {
  const rounded = (n: number) => Math.round(n * 100) / 100;
  const activeBanners = getActiveStoreBanners();

  const totalMetro = groceryList.reduce(
    (acc, item) => acc + (item.isInPantry ? 0 : item.exactPriceMetro),
    0
  );

  return activeBanners.map((banner) => {
    const totalEstimated = rounded(
      groceryList.reduce((acc, item) => acc + banner.getItemPrice(item), 0)
    );
    return {
      storeName: banner.storeName,
      totalEstimated,
      differenceWithMetro: rounded(totalEstimated - totalMetro),
      bannerType: banner.bannerType,
    };
  });
}
