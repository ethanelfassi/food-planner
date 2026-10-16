import { GroceryItem } from '@/types';
import { AISLE_LABELS } from './grocery';

export function formatGroceryListAsText(items: GroceryItem[], storeName = 'Metro'): string {
  const dateStr = new Date().toLocaleDateString('fr-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalMetro = items.reduce((acc, i) => acc + i.estimatedPriceMetro, 0);

  let text = `🛒 LISTE D'ÉPICERIE (${storeName.toUpperCase()}) - ${dateStr}\n`;
  text += `🎯 Total estimé : ~${Math.round(totalMetro)} $ CAD (${items.length} articles)\n`;
  text += `--------------------------------------------------\n\n`;

  // Grouper par rayon
  const byAisle: Record<string, GroceryItem[]> = {};
  for (const item of items) {
    if (!byAisle[item.aisle]) {
      byAisle[item.aisle] = [];
    }
    byAisle[item.aisle].push(item);
  }

  // Trier les rayons selon l'ordre physique Metro
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
      const deal = item.flyerHighlight ? ` 🔥 (${item.flyerHighlight})` : '';
      text += `  ${checkMark} ${item.name} -> ${item.packageDescription}${deal}\n`;
    }
    text += `\n`;
  }

  text += `--------------------------------------------------\n`;
  text += `Généré automatiquement par Food Planner Québec.\n`;

  return text;
}

export function generateMailtoUrl(items: GroceryItem[], targetEmail = ''): string {
  const subject = encodeURIComponent(`🛒 Ma liste d'épicerie Metro du ${new Date().toLocaleDateString('fr-CA')}`);
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
