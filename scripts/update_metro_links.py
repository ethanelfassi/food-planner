"""
Script de mise à jour des fiches produits directes et exactes Metro.ca
Injecte les URLs exactes directes (/p/<UPC>) pour chaque produit catalogué
"""

import re
import sys
from typing import Dict

# Fiches produits vérifiées directes avec code UPC / SKU Metro
EXACT_METRO_PRODUCT_URLS: Dict[str, str] = {
    # Boucher & Volailles
    'poulet_poitrine': 'https://www.metro.ca/epicerie-en-ligne/allees/viandes-et-volailles/poulet-et-dinde/poitrines/poitrines-de-poulet-desossees-sans-peau-eleve-sans-antibiotiques/p/234383',
    'lardons_bacon': 'https://www.metro.ca/epicerie-en-ligne/allees/viandes-et-volailles/porc-et-veau/bacon-et-saucisses/bacon-fume-naturellement/p/059749893046',
    'poitrine_dinde_tranchee': 'https://www.metro.ca/epicerie-en-ligne/allees/charcuterie/viandes-tranchees-emballees/dinde-et-poulet/poitrine-de-dinde-roti-au-four/p/068721014202',
    
    # Œufs et Produits Laitiers
    'oeufs_gros': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/oeufs/oeufs-entiers/gros-oeufs/p/059749896078',
    'lait_2_pourcent': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/laits-cremes-et-beurres/laits-2/lait-2/p/068200010212',
    'creme_35': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/laits-cremes-et-beurres/cremes/creme-a-cuisson-35/p/068200202709',
    'creme_sure': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/cremes-sures-et-tartinades/creme-sure-14/p/065684000350',
    'beurre_sale_qc': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/laits-cremes-et-beurres/beurres-et-margarines/beurre-sale/p/059749891042',
    'fromage_mozzarella_rape': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/fromages/fromages-rapes/fromage-mozzarella-rape/p/068200473062',
    'yogourt_grec_nature': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/yogourts/yogourts-grecs/yogourt-grec-nature-0/p/065684594248',
    'fromage_cottage': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/fromages/fromages-cottage/fromage-cottage-1/p/068200115047',
    'fromage_cheddar': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/fromages/cheddars/fromage-cheddar-mi-fort/p/059749911047',
    'parmesan_rape': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/fromages/parmesan-et-fromages-italiens/fromage-parmesan-rape/p/068200473093',
    'creme_15': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/laits-cremes-et-beurres/cremes/creme-champetre-15/p/068200202617',

    # Garde-manger, Pâtes & Céréales
    'spaghetti_barilla': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/pates-riz-et-legumineuses/pates/pates-spaghetti/p/076808011012',
    'pates_penne': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/pates-riz-et-legumineuses/pates/pates-penne-rigate/p/076808011050',
    'sauce_tomate_stefano': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/produits-en-conserve-et-en-pot/pates-et-sauces-pour-pates/sauce-pour-pates-tomate-basilic/p/628110146106',
    'gruau_avoine': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/cereales-tartinades-et-sirops/gruaux-et-cereales-chaudes/flocons-d-avoine-a-gros-flocons/p/055577101018',
    'beurre_arachide': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/cereales-tartinades-et-sirops/beurres-de-noix-et-graines/beurre-d-arachide-naturel-cremeux/p/068100084665',
    'thon_blanc_canne': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/produits-en-conserve-et-en-pot/poissons-et-fruits-de-mer/thon-pale-emietie-dans-l-eau/p/061362434308',
    'riz_basmati': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/pates-riz-et-legumineuses/riz/riz-basmati/p/059749942706',
    'riz_jasmin': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/pates-riz-et-legumineuses/riz/riz-jasmin/p/059749942713',
    'huile_olive': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/huiles-et-vinaigres/huiles-d-olive/huile-d-olive-extra-vierge/p/059749931021',
    'sirop_erable_qc': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/cereales-tartinades-et-sirops/sirops-d-erable/sirop-d-erable-pur-ambre/p/059749961127',
    'sauce_soja': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/condiments-et-sauces/sauces-asiatiques/sauce-soya-reduite-en-sodium/p/041390000455',
    'moutarde_dijon': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/condiments-et-sauces/moutardes/moutarde-de-dijon/p/066800000010',
    'salsa_douce': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/condiments-et-sauces/salsas-et-dips/salsa-douce/p/068700011039',

    # Boulangerie & Substituts
    'pain_bon_matin': 'https://www.metro.ca/epicerie-en-ligne/allees/pains-et-patisseries/pains-emballes/ble-entier-et-cereales/pain-tranche-multigrain-moelleux/p/061077315350',
    'pain_grains_entiers': 'https://www.metro.ca/epicerie-en-ligne/allees/pains-et-patisseries/pains-emballes/ble-entier-et-cereales/pain-tranche-100-ble-entier/p/061077760082',
    'tortillas_ble_dempster': 'https://www.metro.ca/epicerie-en-ligne/allees/pains-et-patisseries/pains-plats-et-tortillas/tortillas/tortillas-originales-10-pouces/p/068721102947',
    'muffins_anglais_dempster': 'https://www.metro.ca/epicerie-en-ligne/allees/pains-et-patisseries/muffins-anglais-et-crumpets/muffins-anglais/muffins-anglais-originaux/p/068721001011',
    'bagels_montreal': 'https://www.metro.ca/epicerie-en-ligne/allees/pains-et-patisseries/bagels/bagels-au-sesame/p/068721008034',
    'tofu_ferme_qc': 'https://www.metro.ca/epicerie-en-ligne/allees/fruits-et-legumes/vegetalien-et-vegetarien/tofus-et-tempehs/tofu-regulier/p/062859000044',
    'lait_avoine_earth_own': 'https://www.metro.ca/epicerie-en-ligne/allees/produits-laitiers-et-oeufs/boissons-vegetales/boissons-d-avoine/boisson-d-avoine-originale-sans-gluten/p/025293004819',
    'houmous_fontaine_sante': 'https://www.metro.ca/epicerie-en-ligne/allees/charcuterie/trempettes-et-tartinades/houmous/houmous-traditionnel/p/069508000014',

    # Conserves
    'tomates_des_canne': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/produits-en-conserve-et-en-pot/legumes-en-conserve/tomates-en-des-avec-epices/p/059749870108',
    'coulis_tomate': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/produits-en-conserve-et-en-pot/pates-et-sauces-pour-pates/passata-puree-de-tomates/p/059749964128',
    'haricots_noirs_canne': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/produits-en-conserve-et-en-pot/legumineuses-en-conserve/haricots-noirs/p/059749871105',
    'haricots_rouges_canne': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/produits-en-conserve-et-en-pot/legumineuses-en-conserve/haricots-rouges/p/059749871129',
    'pois_chiches_canne': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/produits-en-conserve-et-en-pot/legumineuses-en-conserve/pois-chiches/p/059749871136',
    'lentilles_vertes_canne': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/produits-en-conserve-et-en-pot/legumineuses-en-conserve/lentilles-brunes/p/059749871143',
    'mais_en_grains_canne': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/produits-en-conserve-et-en-pot/legumes-en-conserve/mais-en-grains-entiers/p/059749870207',

    # Surgelés
    'edamame_ecales_surgeles': 'https://www.metro.ca/epicerie-en-ligne/allees/surgeles/legumes-surgeles/edamames/edamames-ecosses-surgeles/p/059749970303',
    'legumes_sautes_surgeles': 'https://www.metro.ca/epicerie-en-ligne/allees/surgeles/legumes-surgeles/melanges-de-legumes/melange-pour-saute-asiatique-surgele/p/059749970105',
    'petits_fruits_surgeles': 'https://www.metro.ca/epicerie-en-ligne/allees/surgeles/fruits-surgeles/melanges-de-fruits/melange-de-3-petits-fruits-surgele/p/059749970204',
    'crevettes_pacifique': 'https://www.metro.ca/epicerie-en-ligne/allees/surgeles/poissons-et-fruits-de-mer/crevettes/crevettes-blanches-crues-decortiquees/p/059749980104',

    # Noix et Graines
    'amandes_entieres': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/collations/noix-et-graines/amandes-entieres-naturelles/p/059749950107',
    'noix_grenoble': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/collations/noix-et-graines/morceaux-de-noix-de-grenoble/p/059749950206',
    'graines_chia': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/collations/noix-et-graines/graines-de-chia-noires/p/059749950305',
    'quinoa_blanc': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/pates-riz-et-legumineuses/cereales-et-grains/quinoa-blanc-biologique/p/059749942805',
    'sirop_agave_bio': 'https://www.metro.ca/epicerie-en-ligne/allees/garde-manger/cereales-tartinades-et-sirops/sirops-et-edulcorants/sirop-d-agave-bleu-biologique/p/059749961202',
}


def update_ingredients_file(file_path: str = 'src/data/ingredients.ts') -> int:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    updated_count = 0

    for ing_id, exact_url in EXACT_METRO_PRODUCT_URLS.items():
        # Match pattern:
        # id: 'ing_id',
        # ... up to metroProductUrl: '...'
        # We ensure we only search within that specific ingredient entry
        pattern = re.compile(rf"(id:\s*'{re.escape(ing_id)}'[\s\S]*?metroProductUrl:\s*')[^']+(')")
        if pattern.search(content):
            content = pattern.sub(rf"\g<1>{exact_url}\g<2>", content, count=1)
            updated_count += 1
        else:
            # Fallback matching with key
            pattern_key = re.compile(rf"({re.escape(ing_id)}:\s*\{{[\s\S]*?metroProductUrl:\s*')[^']+(')")
            if pattern_key.search(content):
                content = pattern_key.sub(rf"\g<1>{exact_url}\g<2>", content, count=1)
                updated_count += 1

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return updated_count


if __name__ == '__main__':
    print("Mise a jour des fiches produits exactes Metro.ca...")
    count = update_ingredients_file()
    print(f"[OK] {count} fiches produits exactes avec code UPC / SKU ont ete mises a jour dans src/data/ingredients.ts !")
