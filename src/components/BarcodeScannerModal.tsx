'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
  ScanBarcode, 
  Search, 
  Check, 
  X, 
  Flame, 
  Dumbbell, 
  Wheat, 
  Droplet, 
  DollarSign, 
  Package, 
  Store, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Plus,
  Camera,
  ImageIcon,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Ingredient, MetroAisle } from '@/types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: (product: Ingredient) => void;
  isDark: boolean;
}

const AISLE_OPTIONS: { id: MetroAisle; label: string }[] = [
  { id: 'EPICERIE', label: 'Garde-manger & Épicerie' },
  { id: 'PRODUITS_LAITIERS_ET_OEUFS', label: 'Produits Laitiers & Œufs' },
  { id: 'BOUCHERIE_ET_POISSONNERIE', label: 'Boucherie & Poissonnerie' },
  { id: 'BOULANGERIE', label: 'Boulangerie & Pains' },
  { id: 'FRUITS_ET_LEGUMES', label: 'Fruits & Légumes' },
  { id: 'SURGELES', label: 'Surgelés' },
  { id: 'DIVERS', label: 'Divers' },
];

/**
 * Extrait les chiffres du code-barres (8 à 14 chiffres)
 * Compatible codes-barres 1D et QR codes contenant une URL (Open Food Facts, Metro, GS1).
 */
function extractBarcode(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // 1. Déjà purement numérique entre 8 et 14 chiffres
  if (/^\d{8,14}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. URL Open Food Facts / Metro (ex: .../product/3017620422003 ou .../p/076808011012)
  const urlMatch = trimmed.match(/(?:product|produit|p|code)[/=:]([0-9]{8,14})(?:[/?#&]|$)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // 3. Séquence de 8 à 14 chiffres consécutifs
  const anyDigits = trimmed.match(/\b\d{8,14}\b/);
  if (anyDigits) {
    return anyDigits[0];
  }

  // 4. Nettoyage de secours
  const clean = trimmed.replace(/\D/g, '');
  if (clean.length >= 8 && clean.length <= 14) {
    return clean;
  }
  return clean;
}

const BarcodeScannerModalComponent: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductAdded,
  isDark,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundProduct, setFoundProduct] = useState<Partial<Ingredient> | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);

  // Champs modifiables du produit trouvé
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState<MetroAisle>('EPICERIE');
  const [price, setPrice] = useState('3.99');
  const [amount, setAmount] = useState('454');
  const [unit, setUnit] = useState('g');
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [fat, setFat] = useState('0');
  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  // Formats supportés : QR Code + Barcodes 1D standards
  const formatsToSupport = useRef([
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
    Html5QrcodeSupportedFormats.ITF,
  ]).current;

  // Recherche dans l'API Open Food Facts / Metro
  const lookupBarcode = useCallback(async (codeToLookup: string) => {
    const cleanCode = codeToLookup.replace(/\D/g, '').trim();
    if (cleanCode.length < 8) {
      setError('Veuillez entrer un code-barres valide (8 à 14 chiffres)');
      return;
    }

    setLoading(true);
    setError(null);
    setFoundProduct(null);
    setSuccessNotice(false);

    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(cleanCode)}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Produit non trouvé. Vérifiez les chiffres sur l'emballage.");
        setLoading(false);
        return;
      }

      const p = data.product;
      setFoundProduct(p);
      setName(p.name || '');
      setAisle((p.aisle as MetroAisle) || 'EPICERIE');
      setPrice(String(p.packaging?.exactPriceMetro ?? 3.99));
      setAmount(String(p.packaging?.amount ?? 454));
      setUnit(p.packaging?.unit ?? 'g');
      setCalories(String(p.macrosPer100g?.calories ?? 0));
      setProtein(String(p.macrosPer100g?.protein ?? 0));
      setCarbs(String(p.macrosPer100g?.carbs ?? 0));
      setFat(String(p.macrosPer100g?.fat ?? 0));
    } catch (err: any) {
      setError('Impossible de joindre la base de données code-barres: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Détection réussie d'un code
  const handleCodeDetected = useCallback((rawCode: string) => {
    const cleanCode = extractBarcode(rawCode);
    if (!cleanCode || cleanCode.length < 8) {
      setError("Code non reconnu. Veillez à ce que le code-barres ou QR code soit bien net et centré.");
      return;
    }

    // Retour sonore léger
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (_) {}

    // Retour haptique
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 50, 40]);
      }
    } catch (_) {}

    setBarcodeInput(cleanCode);
    setLastScannedCode(cleanCode);
    lookupBarcode(cleanCode);
  }, [lookupBarcode]);

  // Traitement de la photo prise avec l'appareil photo natif ou sélectionnée dans la pellicule
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningImage(true);
    setError(null);
    setFoundProduct(null);

    try {
      if (!scannerInstanceRef.current) {
        scannerInstanceRef.current = new Html5Qrcode('barcode-hidden-scanner', {
          formatsToSupport,
          verbose: false,
        });
      }

      const decodedText = await scannerInstanceRef.current.scanFile(file, false);
      handleCodeDetected(decodedText);
    } catch (err: any) {
      console.warn('Scan file error:', err);
      setError("Aucun code-barres ou QR code net détecté sur la photo. Réessayez en vous rapprochant du code ou saisissez les chiffres ci-dessous.");
    } finally {
      setScanningImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupBarcode(barcodeInput);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Le nom du produit est requis.');
      return;
    }

    setSaving(true);
    setError(null);

    const numAmount = Math.max(1, parseFloat(amount) || 100);
    const numPrice = Math.max(0, parseFloat(price) || 0);
    const unitPricePer100 = Math.round((numPrice / (numAmount / 100)) * 100) / 100;

    const productPayload: Partial<Ingredient> = {
      id: foundProduct?.barcode ? `barcode_${foundProduct.barcode}` : `custom_prod_${Date.now()}`,
      name: name.trim(),
      aisle,
      baseUnit: unit === 'ml' ? 'ml' : 'g',
      packaging: {
        amount: numAmount,
        unit,
        label: `${numAmount} ${unit}`,
        regularPriceMetro: numPrice,
        exactPriceMetro: numPrice,
        unitPricePer100g: unitPricePer100,
        unitPriceLabel: `${numPrice} $ / emballage`,
        priceMaxi: numPrice,
        priceSuperC: numPrice,
        priceIGA: numPrice,
        isTaxable: false,
        isMoiMemberPrice: false,
      },
      imageUrl: foundProduct?.imageUrl,
      metroProductUrl: foundProduct?.metroProductUrl || `https://www.metro.ca/recherche?free-text=${encodeURIComponent(name.trim())}`,
      barcode: foundProduct?.barcode || barcodeInput.replace(/\D/g, '').trim(),
      isCustom: true,
      macrosPer100g: {
        calories: Math.max(0, Math.round(parseFloat(calories) || 0)),
        protein: Math.max(0, Math.round((parseFloat(protein) || 0) * 10) / 10),
        carbs: Math.max(0, Math.round((parseFloat(carbs) || 0) * 10) / 10),
        fat: Math.max(0, Math.round((parseFloat(fat) || 0) * 10) / 10),
      },
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde du produit');
      }

      setSuccessNotice(true);
      onProductAdded(data.product);

      // Fermeture après confirmation visuelle
      setTimeout(() => {
        setBarcodeInput('');
        setFoundProduct(null);
        setSuccessNotice(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleResetForAnotherScan = () => {
    setFoundProduct(null);
    setBarcodeInput('');
    setError(null);
    setLastScannedCode(null);
    setSuccessNotice(false);
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 animate-in fade-in duration-150 mb-safe sm:mb-0">
      {/* Conteneur DOM requis par Html5Qrcode pour l'analyse d'images */}
      <div id="barcode-hidden-scanner" className="hidden" />

      {/* Input natif : sans 'capture' imposé, le téléphone ouvre le menu natif avec le choix Appareil Photo OU Pellicule */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelected}
      />

      <div
        className={`w-full max-w-xl rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] transition-colors ${
          isDark
            ? 'bg-stone-950/98 border-white/10 text-white'
            : 'bg-white/98 border-stone-200 text-stone-900 shadow-2xl'
        }`}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-stone-200/80 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-white/10 text-white' : 'bg-stone-900 text-white'}`}>
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-lg font-medium truncate">Scanner un Produit</h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                Prenez une photo du code-barres ou choisissez depuis votre pellicule
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* BOUTON PRINCIPAL : APPAREIL PHOTO OU PELLICULE */}
          {!foundProduct && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={scanningImage || loading}
                className={`w-full p-6 sm:p-8 rounded-2xl sm:rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors active:scale-[0.99] group text-center cursor-pointer ${
                  isDark
                    ? 'border-white/20 hover:border-white/50 bg-white/[0.02] hover:bg-white/[0.05]'
                    : 'border-stone-300 hover:border-stone-700 bg-stone-50 hover:bg-stone-100/80 shadow-xs'
                }`}
              >
                {scanningImage ? (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <Loader2 className="w-10 h-10 animate-spin text-stone-400" />
                    <div>
                      <p className="font-serif text-base font-medium">Analyse de la photo...</p>
                      <p className="text-xs text-stone-400 font-mono mt-0.5">Recherche du code-barres ou QR code</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${
                      isDark ? 'bg-white text-stone-950 group-hover:bg-stone-200' : 'bg-stone-900 text-white group-hover:bg-stone-800'
                    }`}>
                      <Camera className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <div className="font-serif text-base sm:text-lg font-medium flex items-center justify-center gap-2">
                        <span>Appareil photo ou Pellicule</span>
                        <ImageIcon className="w-4 h-4 text-stone-400" />
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-sans max-w-sm">
                        Cliquez pour photographier directement le code-barres ou choisir une image existante.
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-stone-200/80 dark:bg-white/10 text-stone-700 dark:text-stone-300 mt-1">
                      <Sparkles className="w-3 h-3" /> Codes-barres 1D (UPC/EAN) &amp; QR Codes
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Saisie manuelle alternative */}
          {!foundProduct && (
            <form onSubmit={handleManualLookupSubmit} className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">
                  Ou entrer manuellement les chiffres :
                </label>
                {lastScannedCode && (
                  <span className="text-[10px] font-mono text-emerald-500 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Détecté : {lastScannedCode}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="ex: 076808011012 (Barilla) ou 059749896078 (Selection)"
                    value={barcodeInput}
                    onChange={(e) => {
                      setBarcodeInput(e.target.value);
                      if (error) setError(null);
                    }}
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-2xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-stone-500 transition-colors ${
                      isDark
                        ? 'bg-black/50 border-white/15 text-white placeholder-stone-600'
                        : 'bg-stone-50 border-stone-300 text-stone-900 placeholder-stone-400'
                    }`}
                  />
                  <ScanBarcode className="absolute right-3.5 top-3 w-4 h-4 text-stone-400" />
                </div>
                <button
                  type="submit"
                  disabled={loading || !barcodeInput.trim()}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-medium font-mono uppercase tracking-wider transition-colors disabled:opacity-50 shrink-0 ${
                    isDark
                      ? 'bg-white text-stone-950 hover:bg-stone-200 font-semibold shadow-md active:scale-95'
                      : 'bg-stone-950 text-white hover:bg-stone-800 font-semibold shadow-sm active:scale-95'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recherche...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Trouver</span>
                    </>
                  )}
                </button>
              </div>

              {/* Suggestions rapides testées */}
              <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 flex-wrap">
                <span>Exemples fréquents :</span>
                <button
                  type="button"
                  onClick={() => {
                    setBarcodeInput('076808011012');
                    lookupBarcode('076808011012');
                  }}
                  className="underline hover:text-stone-900 dark:hover:text-stone-200 font-mono"
                >
                  Pâtes Barilla
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setBarcodeInput('059749896078');
                    lookupBarcode('059749896078');
                  }}
                  className="underline hover:text-stone-900 dark:hover:text-stone-200 font-mono"
                >
                  Œufs Selection
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setBarcodeInput('068100084665');
                    lookupBarcode('068100084665');
                  }}
                  className="underline hover:text-stone-900 dark:hover:text-stone-200 font-mono"
                >
                  Beurre d&apos;arachide Kraft
                </button>
              </div>
            </form>
          )}

          {/* Erreur si non trouvé ou scan échoué */}
          {error && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isDark ? 'bg-red-950/40 border-red-800/40 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div className="text-xs">
                <p className="font-semibold">{error}</p>
                <div className="flex gap-2 pt-1.5 opacity-90">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="underline font-mono text-[11px] hover:opacity-100"
                  >
                    Reprendre une photo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Succès Feedback */}
          {successNotice && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isDark ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold">Produit ajouté avec succès à votre catalogue !</span>
            </div>
          )}

          {/* CARTE DU PRODUIT RECONNU */}
          {foundProduct && (
            <div
              className={`p-5 rounded-3xl border space-y-5 animate-in fade-in duration-200 ${
                isDark
                  ? 'bg-white/[0.03] border-white/10'
                  : 'bg-stone-50 border-stone-200 shadow-xs'
              }`}
            >
              {/* Entête Détection & Bouton Scanner un autre */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Fiche reconnue ({foundProduct.barcode || barcodeInput})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetForAnotherScan}
                  className="flex items-center gap-1.5 text-xs font-mono text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Scanner un autre</span>
                </button>
              </div>

              <div className="flex gap-4 items-start">
                {foundProduct.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={foundProduct.imageUrl}
                    alt={name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl bg-white p-1 border border-stone-200 dark:border-white/10 shrink-0 shadow-xs"
                    loading="lazy"
                  />
                ) : (
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border shrink-0 ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-stone-200 border-stone-300'
                  }`}>
                    <Package className="w-8 h-8 text-stone-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nom du produit"
                    className={`w-full font-serif text-base font-semibold px-2.5 py-1 rounded-xl border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                      isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                  <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 pt-1">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Store className="w-3.5 h-3.5" /> Metro ÉTS
                    </span>
                    {foundProduct.metroProductUrl && (
                      <a
                        href={foundProduct.metroProductUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] underline hover:text-stone-900 dark:hover:text-white"
                      >
                        Voir sur Metro <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Capsules Macros / 100g */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold block">
                  Valeurs nutritives certifiées (par 100 g / ml)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                  }`}>
                    <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mb-1">
                      <Flame className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                      <span>Calories</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        value={calories}
                        onChange={(e) => setCalories(e.target.value)}
                        className="w-14 text-center font-mono font-bold text-base bg-transparent border-b border-dashed border-stone-400 focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-400 font-mono">kcal</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                  }`}>
                    <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mb-1">
                      <Dumbbell className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                      <span>Protéines</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={protein}
                        onChange={(e) => setProtein(e.target.value)}
                        className="w-14 text-center font-mono font-bold text-base bg-transparent border-b border-dashed border-stone-400 focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-400 font-mono">g</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                  }`}>
                    <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mb-1">
                      <Wheat className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                      <span>Glucides</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={carbs}
                        onChange={(e) => setCarbs(e.target.value)}
                        className="w-14 text-center font-mono font-bold text-base bg-transparent border-b border-dashed border-stone-400 focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-400 font-mono">g</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                  }`}>
                    <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mb-1">
                      <Droplet className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                      <span>Lipides</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={fat}
                        onChange={(e) => setFat(e.target.value)}
                        className="w-14 text-center font-mono font-bold text-base bg-transparent border-b border-dashed border-stone-400 focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-400 font-mono">g</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rayon, Quantité et Prix Metro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1">
                    Rayon / Allée
                  </label>
                  <select
                    value={aisle}
                    onChange={(e) => setAisle(e.target.value as MetroAisle)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                      isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  >
                    {AISLE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className={isDark ? 'bg-stone-900' : 'bg-white'}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1">
                    Poids emballage ({unit})
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="454"
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                        isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                      }`}
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className={`px-2 py-2 rounded-xl text-xs border font-mono ${
                        isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                      }`}
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="unite">unité</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1">
                    Prix Metro ($)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="3.99"
                      className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs border font-mono focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                        isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                      }`}
                    />
                    <DollarSign className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-stone-400" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200/80 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.02] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            Annuler
          </button>

          {foundProduct && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider font-semibold transition-colors active:scale-95 shadow-md ${
                isDark
                  ? 'bg-white text-stone-950 hover:bg-stone-200'
                  : 'bg-stone-950 text-white hover:bg-stone-800'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Ajouter au catalogue</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const BarcodeScannerModal = React.memo(BarcodeScannerModalComponent);
