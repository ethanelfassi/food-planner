import { GroceryItem } from '@/types';
import { AISLE_LABELS, calculateReceiptTaxes } from './grocery';

export function formatGroceryListAsText(items: GroceryItem[], storeName = 'Metro'): string {
  const dateStr = new Date().toLocaleDateString('fr-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const receipt = calculateReceiptTaxes(items);

  let text = `🛒 LISTE D'ÉPICERIE EXACTE (${storeName.toUpperCase()}) - ${dateStr}\n`;
  text += `🎯 TOTAL EXACT À LA CAISSE : ${receipt.totalWithTax.toFixed(2)} $ CAD\n`;
  if (receipt.totalSavingsMoi > 0) {
    text += `🎁 Économies Membre Moi & Promos : -${receipt.totalSavingsMoi.toFixed(2)} $\n`;
  }
  text += `--------------------------------------------------\n\n`;

  // Grouper par rayon
  const byAisle: Record<string, GroceryItem[]> = {};
  for (const item of items) {
    if (!byAisle[item.aisle]) {
      byAisle[item.aisle] = [];
    }
    byAisle[item.aisle].push(item);
  }

  const sortedAisles = Object.keys(byAisle).sort((a, b) => {
    const orderA = AISLE_LABELS[a as keyof typeof AISLE_LABELS]?.order ?? 99;
    const orderB = AISLE_LABELS[b as keyof typeof AISLE_LABELS]?.order ?? 99;
    return orderA - orderB;
  });

  for (const aisleKey of sortedAisles) {
    const label = AISLE_LABELS[aisleKey as keyof typeof AISLE_LABELS]?.title || aisleKey;
    text += `📍 [ ${label.toUpperCase()} ]\n`;
    for (const item of byAisle[aisleKey]) {
      const checkMark = item.checked ? '[x]' : '[ ]';
      const moi = item.isMoiMemberPrice ? ' [👑 PRIX MEMBRE MOI]' : '';
      const unitP = item.unitPriceLabel ? ` (${item.unitPriceLabel})` : '';
      const tax = item.isTaxable ? ' [Taxable +14.975%]' : ' [Détaxé 0%]';
      text += `  ${checkMark} ${item.name}\n`;
      text += `      -> ${item.packageDescription} | ${item.exactPriceMetro.toFixed(2)} $ CAD${unitP}${moi}${tax}\n`;
    }
    text += `\n`;
  }

  text += `==================================================\n`;
  text += `🧾 DÉTAIL DU TICKET DE CAISSE (REVENU QUÉBEC) :\n`;
  text += `  - Épicerie de base détaxée (0% taxe) : ${receipt.subtotalZeroRated.toFixed(2)} $\n`;
  if (receipt.subtotalTaxable > 0) {
    text += `  - Produits taxables : ${receipt.subtotalTaxable.toFixed(2)} $\n`;
    text += `  - TPS (5.0%) : ${receipt.tps.toFixed(2)} $\n`;
    text += `  - TVQ (9.975%) : ${receipt.tvq.toFixed(2)} $\n`;
  }
  text += `  ------------------------------------------------\n`;
  text += `  👉 MONTANT EXACT À PAYER : ${receipt.totalWithTax.toFixed(2)} $ CAD\n`;
  text += `==================================================\n`;

  return text;
}

export function generateMailtoUrl(items: GroceryItem[], targetEmail = ''): string {
  const receipt = calculateReceiptTaxes(items);
  const subject = encodeURIComponent(`🛒 Ma liste d'épicerie Metro du ${new Date().toLocaleDateString('fr-CA')} (${receipt.totalWithTax.toFixed(2)}$ TTC)`);
  const body = encodeURIComponent(formatGroceryListAsText(items, 'Metro'));
  return `mailto:${targetEmail}?subject=${subject}&body=${body}`;
}

export function downloadGroceryListFile(items: GroceryItem[], storeName = 'Metro'): void {
  const text = formatGroceryListAsText(items, storeName);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `epicerie-metro-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
