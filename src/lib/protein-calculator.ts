import { Ingredient, MetroAisle } from '@/types';
import { INGREDIENTS } from '@/data/ingredients';

export type ProteinTier = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'EXPENSIVE';

export interface ProteinEfficiencyResult {
  price: number;
  totalGrams: number;
  totalProteinGrams: number;
  costPer100gProtein: number; // Ratio $ / 100g de protéine
  proteinPerDollar: number;   // Grammes de protéine pour 1$ CAD
  costPerGramProtein: number; // $ / g de protéine
  dailyCostForTarget: (targetGrams: number) => number;
  tier: ProteinTier;
  tierLabel: string;
  tierColorClass: {
    bg: string;
    text: string;
    border: string;
    badge: string;
    dot: string;
  };
  advice: string;
}

export interface RankedProteinItem {
  id: string;
  name: string;
  aisle: MetroAisle;
  imageUrl?: string;
  metroProductUrl?: string;
  barcode?: string;
  isCustom?: boolean;
  packageLabel: string;
  packageAmount: number;
  packageUnit: string;
  price: number;
  isCustomPrice: boolean;
  isMoiPrice: boolean;
  proteinPer100g: number;
  caloriesPer100g: number;
  result: ProteinEfficiencyResult;
}

// Convertit une quantité en grammes équivalents selon l'unité et le type d'aliment
export function estimateTotalWeightGrams(amount: number, unit: string, ingredientId = ''): number {
  const cleanUnit = (unit || 'g').toLowerCase().trim();
  const safeAmount = Math.max(0, Number(amount) || 0);
  const id = ingredientId.toLowerCase();

  if (cleanUnit === 'g' || cleanUnit === 'ml') {
    // Si c'est du thon en conserve avec le poids brut de la boîte (170g),
    // le poids net réel consommable (égoutté) est de 120g
    if (id.includes('thon') && safeAmount >= 140 && safeAmount <= 190) {
      return 120;
    }
    return safeAmount;
  }

  if (cleanUnit === 'unite' || cleanUnit === 'unité') {
    if (id.includes('oeuf')) return safeAmount * 50; // 1 gros œuf = ~50g
    if (id.includes('banane')) return safeAmount * 120;
    if (id.includes('pomme')) return safeAmount * 180;
    if (id.includes('avocat')) return safeAmount * 150;
    if (id.includes('bagel')) return safeAmount * 95;
    if (id.includes('patate_douce')) return safeAmount * 200;
    if (id.includes('canne')) {
      if (id.includes('thon')) return safeAmount * 120;
      return safeAmount * 400;
    }
    return safeAmount * 100; // estimation par défaut
  }

  if (cleanUnit === 'c_a_soupe' || cleanUnit === 'cuillere') {
    return safeAmount * 15;
  }

  if (cleanUnit === 'tranche') {
    return safeAmount * 25;
  }

  if (cleanUnit === 'canne') {
    if (id.includes('thon')) return safeAmount * 120; // 1 boîte de thon 170g = 120g net égoutté
    if (id.includes('tomate')) return safeAmount * 796;
    if (id.includes('haricot') || id.includes('pois')) return safeAmount * 390;
    return safeAmount * 400;
  }

  return safeAmount;
}

// Calcule la rentabilité protéique précise d'un produit
export function calculateProteinEfficiency(
  price: number,
  packageAmount: number,
  packageUnit: string,
  proteinPer100g: number,
  ingredientId = ''
): ProteinEfficiencyResult {
  const safePrice = Math.max(0.01, Number(price) || 0);
  const safeProteinPer100g = Math.max(0, Number(proteinPer100g) || 0);
  const totalWeightGrams = estimateTotalWeightGrams(packageAmount, packageUnit, ingredientId);

  // Protéines totales dans l'emballage (g)
  const totalProteinGrams = Math.round(((totalWeightGrams / 100) * safeProteinPer100g) * 10) / 10;

  // Si pas de protéine ou produit invalide
  if (totalProteinGrams <= 0) {
    return {
      price: safePrice,
      totalGrams: totalWeightGrams,
      totalProteinGrams: 0,
      costPer100gProtein: 999,
      proteinPerDollar: 0,
      costPerGramProtein: 9.99,
      dailyCostForTarget: () => 0,
      tier: 'EXPENSIVE',
      tierLabel: 'Négligeable en Protéine',
      tierColorClass: {
        bg: 'bg-stone-500/10',
        text: 'text-stone-400',
        border: 'border-stone-500/20',
        badge: 'bg-stone-500/10 text-stone-400 border-stone-500/20',
        dot: 'bg-stone-400',
      },
      advice: 'Cet aliment ne contient pas de quantité significative de protéine.',
    };
  }

  // Ratio $ / 100g de protéine pure
  const costPer100gProtein = Math.round(((safePrice / totalProteinGrams) * 100) * 100) / 100;
  // Grammes de protéine par dollar
  const proteinPerDollar = Math.round((totalProteinGrams / safePrice) * 10) / 10;
  // Coût par gramme de protéine
  const costPerGramProtein = Math.round((safePrice / totalProteinGrams) * 1000) / 1000;

  // Qualification du niveau de rentabilité selon les standards du marché québécois
  let tier: ProteinTier = 'AVERAGE';
  let tierLabel = 'Rapport Modéré';
  let advice = "Source de protéine modérément dispendieuse. Idéale pour diversifier vos menus.";
  let tierColorClass = {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    dot: 'bg-amber-500',
  };

  if (costPer100gProtein < 4.00) {
    tier = 'EXCELLENT';
    tierLabel = 'Ultra Rentable / Aubaine';
    advice = 'Aubaine exceptionnelle ! Chaque dollar dépensé génère un maximum de protéines pures.';
    tierColorClass = {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      dot: 'bg-emerald-500',
    };
  } else if (costPer100gProtein < 6.50) {
    tier = 'GOOD';
    tierLabel = 'Très Bon Rapport';
    advice = 'Excellente source de base au quotidien. Très bon compromis entre goût, nutrition et budget.';
    tierColorClass = {
      bg: 'bg-sky-500/10 dark:bg-sky-500/15',
      text: 'text-sky-700 dark:text-sky-400',
      border: 'border-sky-500/30',
      badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
      dot: 'bg-sky-500',
    };
  } else if (costPer100gProtein > 9.50) {
    tier = 'EXPENSIVE';
    tierLabel = 'Protéine Coûteuse / Plaisir';
    advice = 'Coût élevé au gramme de protéine. Aliment à savourer pour le goût et le plaisir culinaire.';
    tierColorClass = {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-500/30',
      badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
      dot: 'bg-rose-500',
    };
  }

  return {
    price: safePrice,
    totalGrams: totalWeightGrams,
    totalProteinGrams,
    costPer100gProtein,
    proteinPerDollar,
    costPerGramProtein,
    dailyCostForTarget: (targetGrams: number) => Math.round(((targetGrams / 100) * costPer100gProtein) * 100) / 100,
    tier,
    tierLabel,
    tierColorClass,
    advice,
  };
}

// Génère le palmarès complet de rentabilité protéique du catalogue (Metro + custom barcode)
export function getCatalogProteinRankings(
  customProducts: Ingredient[] = [],
  customPrices: Record<string, number> = {}
): RankedProteinItem[] {
  // Fusionner les ingrédients statiques et les produits custom
  const customMap = Object.fromEntries(customProducts.map((p) => [p.id, p]));
  const mergedCatalog: Record<string, Ingredient> = { ...INGREDIENTS, ...customMap };

  const rankedItems: RankedProteinItem[] = [];

  for (const [id, item] of Object.entries(mergedCatalog)) {
    const prot100g = item.macrosPer100g?.protein ?? 0;
    // Ignorer les produits quasi-dépourvus de protéines (< 1.5g / 100g comme l'huile, le sucre, etc.)
    if (prot100g < 1.5) continue;

    const pack = item.packaging;
    if (!pack || pack.amount <= 0) continue;

    const hasCustomPrice = customPrices[id] !== undefined && customPrices[id] > 0;
    const activePrice = hasCustomPrice ? customPrices[id] : pack.exactPriceMetro;

    const efficiency = calculateProteinEfficiency(
      activePrice,
      pack.amount,
      pack.unit,
      prot100g,
      id
    );

    if (efficiency.totalProteinGrams > 0) {
      rankedItems.push({
        id,
        name: item.name,
        aisle: item.aisle,
        imageUrl: item.imageUrl,
        metroProductUrl: item.metroProductUrl,
        barcode: item.barcode,
        isCustom: item.isCustom || id.startsWith('barcode_'),
        packageLabel: pack.label,
        packageAmount: pack.amount,
        packageUnit: pack.unit,
        price: activePrice,
        isCustomPrice: hasCustomPrice,
        isMoiPrice: !hasCustomPrice && pack.isMoiMemberPrice,
        proteinPer100g: prot100g,
        caloriesPer100g: item.macrosPer100g?.calories ?? 0,
        result: efficiency,
      });
    }
  }

  // Trier par ratio le plus avantageux ($ / 100g de protéine croissant)
  return rankedItems.sort((a, b) => a.result.costPer100gProtein - b.result.costPer100gProtein);
}
