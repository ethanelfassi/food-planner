import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ ok: false, error: 'Code-barres manquant' }, { status: 400 });
  }

  // Nettoyer le code-barres (garder uniquement les chiffres)
  const sanitizedCode = code.replace(/\D/g, '');

  if (sanitizedCode.length < 8 || sanitizedCode.length > 14) {
    return NextResponse.json(
      { ok: false, error: 'Format de code-barres invalide (doit contenir entre 8 et 14 chiffres)' },
      { status: 400 }
    );
  }

  try {
    const offUrl = `https://world.openfoodfacts.org/api/v2/product/${sanitizedCode}.json`;
    const response = await fetch(offUrl, {
      headers: {
        'User-Agent': 'FoodPlannerQC/1.0 (ethan@foodplannerqc.local) - pair programming food app',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `Erreur serveur Open Food Facts (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return NextResponse.json(
        { ok: false, error: 'Produit non trouvé dans la base Open Food Facts' },
        { status: 404 }
      );
    }

    const p = data.product;
    const nutriments = p.nutriments || {};

    // Nom et marque
    const rawName = p.product_name_fr || p.product_name || p.generic_name_fr || p.generic_name || 'Produit sans nom';
    const brand = p.brands ? p.brands.split(',')[0].trim() : '';
    const fullName = brand && !rawName.toLowerCase().includes(brand.toLowerCase())
      ? `${rawName} (${brand})`
      : rawName;

    // Détermination de l'allée / catégorie
    const categoriesLower = (p.categories || '').toLowerCase();
    let aisle = 'EPICERIE';
    if (/lait|dairy|fromage|cheese|oeuf|egg|creme|crème|butter|beurre|yogourt|yogurt/.test(categoriesLower)) {
      aisle = 'PRODUITS_LAITIERS_ET_OEUFS';
    } else if (/viande|meat|poulet|chicken|poisson|fish|boucherie|boeuf|beef|porc|pork|dinde|turkey/.test(categoriesLower)) {
      aisle = 'BOUCHERIE_ET_POISSONNERIE';
    } else if (/pain|bread|boulangerie|bakery|tortilla|bagel|patisserie/.test(categoriesLower)) {
      aisle = 'BOULANGERIE';
    } else if (/fruit|legume|légume|vegetable|pomme|salade/.test(categoriesLower)) {
      aisle = 'FRUITS_ET_LEGUMES';
    } else if (/surgele|surgelé|frozen/.test(categoriesLower)) {
      aisle = 'SURGELES';
    }

    // Parsing du format & quantité
    let amount = 100;
    let unit = 'g';
    const quantityStr = p.quantity || p.product_quantity || '';
    if (quantityStr) {
      const match = String(quantityStr).match(/(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|unit|lb|oz)?/i);
      if (match) {
        const val = parseFloat(match[1].replace(',', '.'));
        const u = (match[2] || 'g').toLowerCase();
        if (u === 'kg') {
          amount = Math.round(val * 1000);
          unit = 'g';
        } else if (u === 'l') {
          amount = Math.round(val * 1000);
          unit = 'ml';
        } else if (u === 'lb') {
          amount = Math.round(val * 453.59);
          unit = 'g';
        } else if (u === 'ml') {
          amount = Math.round(val);
          unit = 'ml';
        } else {
          amount = Math.round(val);
          unit = 'g';
        }
      }
    }

    // Macros pour 100g
    let calories = 0;
    if (nutriments['energy-kcal_100g'] !== undefined) {
      calories = Math.round(Number(nutriments['energy-kcal_100g']) || 0);
    } else if (nutriments['energy-kj_100g'] !== undefined) {
      calories = Math.round((Number(nutriments['energy-kj_100g']) || 0) / 4.184);
    }

    const protein = Math.round((Number(nutriments['proteins_100g']) || 0) * 10) / 10;
    const carbs = Math.round((Number(nutriments['carbohydrates_100g']) || 0) * 10) / 10;
    const fat = Math.round((Number(nutriments['fat_100g']) || 0) * 10) / 10;

    // Image
    const imageUrl = p.image_front_url || p.image_url || p.image_small_url || null;

    // Metro Product URL
    const metroProductUrl = `https://www.metro.ca/recherche?free-text=${encodeURIComponent(fullName)}`;

    return NextResponse.json({
      ok: true,
      product: {
        barcode: sanitizedCode,
        name: fullName,
        brand,
        aisle,
        packaging: {
          amount: amount || 100,
          unit,
          label: quantityStr || `${amount} ${unit}`,
          regularPriceMetro: 3.99, // Prix indicatif ajustable par l'utilisateur
          exactPriceMetro: 3.99,
          unitPricePer100g: amount ? Math.round((3.99 / (amount / 100)) * 100) / 100 : 0,
          unitPriceLabel: 'Prix personnalisable',
          priceMaxi: 3.79,
          priceSuperC: 3.69,
          priceIGA: 4.19,
          isTaxable: false,
          isMoiMemberPrice: false,
        },
        macrosPer100g: {
          calories,
          protein,
          carbs,
          fat,
        },
        imageUrl,
        metroProductUrl,
      },
    });
  } catch (err: any) {
    console.error('Erreur API Barcode:', err);
    return NextResponse.json(
      { ok: false, error: `Erreur interne lors de la requête code-barres: ${err.message}` },
      { status: 500 }
    );
  }
}
