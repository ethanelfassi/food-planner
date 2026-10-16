import { GroceryItem, StorePriceSummary } from '@/types';

export function calculateStorePriceComparison(groceryList: GroceryItem[]): StorePriceSummary[] {
  const totalMetro = groceryList.reduce((acc, item) => acc + item.estimatedPriceMetro, 0);
  const totalMaxi = groceryList.reduce((acc, item) => acc + item.estimatedPriceMaxi, 0);
  const totalSuperC = groceryList.reduce((acc, item) => acc + item.estimatedPriceSuperC, 0);
  const totalIGA = groceryList.reduce((acc, item) => acc + item.estimatedPriceIGA, 0);

  const rounded = (n: number) => Math.round(n * 100) / 100;

  return [
    {
      storeName: 'Metro',
      totalEstimated: rounded(totalMetro),
      differenceWithMetro: 0,
      bannerType: 'Standard',
    },
    {
      storeName: 'Maxi',
      totalEstimated: rounded(totalMaxi),
      differenceWithMetro: rounded(totalMaxi - totalMetro),
      bannerType: 'Discount',
    },
    {
      storeName: 'Super C',
      totalEstimated: rounded(totalSuperC),
      differenceWithMetro: rounded(totalSuperC - totalMetro),
      bannerType: 'Discount',
    },
    {
      storeName: 'IGA',
      totalEstimated: rounded(totalIGA),
      differenceWithMetro: rounded(totalIGA - totalMetro),
      bannerType: 'Haut de gamme',
    },
  ];
}
