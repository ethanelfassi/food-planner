'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  CameraOff,
  SwitchCamera,
  Zap,
  ZapOff,
  ImageIcon,
  RefreshCw,
  Sparkles,
  ShieldCheck,
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
 * Extrait les chiffres du code-barres (8 à 14 chiffres).
 * Compatible codes-barres 1D et QR codes contenant une URL (Open Food Facts, Metro, GS1).
 */
function extractBarcode(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  if (/^\d{8,14}$/.test(trimmed)) {
    return trimmed;
  }

  const urlMatch = trimmed.match(/(?:product|produit|p|code)[/=:]([0-9]{8,14})(?:[/?#&]|$)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  const anyDigits = trimmed.match(/\b\d{8,14}\b/);
  if (anyDigits) {
    return anyDigits[0];
  }

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

  // État caméra en direct
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInsecureOrigin, setIsInsecureOrigin] = useState(false);
  const [camerasList, setCamerasList] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileScannerRef = useRef<Html5Qrcode | null>(null);
  const hasDetectedRef = useRef<boolean>(false);

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
  const [unitWeightGrams, setUnitWeightGrams] = useState('');
  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const formatsToSupport = useRef([
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.ITF,
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
  ]).current;

  const stopAllMediaTracks = useCallback(() => {
    if (typeof document === 'undefined') return;
    const viewport = document.getElementById('barcode-camera-viewport');
    if (!viewport) return;
    const videos = viewport.querySelectorAll('video');
    videos.forEach((video) => {
      const stream = video.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {}
        });
        video.srcObject = null;
      }
    });
  }, []);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2 /* SCANNING */ || state === 3 /* PAUSED */) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Note arrêt caméra:', e);
      }
    }
    stopAllMediaTracks();
    setIsCameraActive(false);
    setIsCameraStarting(false);
    setIsTorchOn(false);
    setHasTorchSupport(false);
  }, [stopAllMediaTracks]);

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
      setUnitWeightGrams(
        p.unitWeightGrams
          ? String(p.unitWeightGrams)
          : p.packaging?.amount && p.packaging.amount <= 180
          ? String(p.packaging.amount)
          : ''
      );
    } catch (err: any) {
      setError('Impossible de joindre la base de données code-barres: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCodeDetected = useCallback(
    (rawCode: string, fromLiveStream: boolean = false) => {
      if (fromLiveStream && hasDetectedRef.current) {
        return;
      }

      const cleanCode = extractBarcode(rawCode);
      if (!cleanCode || cleanCode.length < 8) {
        if (!fromLiveStream) {
          setError("Code non reconnu. Veillez à ce que le code-barres ou QR code soit bien net et centré.");
        }
        return;
      }

      hasDetectedRef.current = true;

      // Arrêt immédiat de la caméra dès qu'un code valide est détecté
      void stopCamera();

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
    },
    [stopCamera, lookupBarcode]
  );

  const startCamera = useCallback(
    async (cameraIdToUse?: string) => {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setIsInsecureOrigin(true);
        setCameraError(
          "La caméra en direct nécessite une connexion HTTPS sur iPhone/mobile."
        );
        return;
      }

      setIsInsecureOrigin(false);
      setCameraError(null);
      setError(null);
      setIsCameraStarting(true);
      hasDetectedRef.current = false;

      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2 || state === 3) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (_) {}
      }
      stopAllMediaTracks();

      await new Promise((r) => setTimeout(r, 80));

      const viewportEl = document.getElementById('barcode-camera-viewport');
      if (!viewportEl) {
        setIsCameraStarting(false);
        setCameraError("Impossible d'initialiser la zone vidéo.");
        return;
      }

      try {
        const scanner = new Html5Qrcode('barcode-camera-viewport', {
          formatsToSupport,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = scanner;

        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCamerasList(devices);
            if (!cameraIdToUse && !selectedCameraId) {
              const rearCamera = devices.find(
                (d) =>
                  d.label.toLowerCase().includes('back') ||
                  d.label.toLowerCase().includes('arrière') ||
                  d.label.toLowerCase().includes('environment')
              );
              if (rearCamera) {
                setSelectedCameraId(rearCamera.id);
              }
            }
          }
        } catch (_) {}

        const cameraConfig = cameraIdToUse
          ? { deviceId: { exact: cameraIdToUse } }
          : selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'environment' };

        await scanner.start(
          cameraConfig,
          {
            fps: 20,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const width = Math.min(viewfinderWidth - 24, Math.max(240, Math.floor(viewfinderWidth * 0.85)));
              const height = Math.min(viewfinderHeight - 24, Math.max(130, Math.floor(width * 0.5)));
              return { width, height };
            },
            aspectRatio: 1.333333,
          },
          (decodedText) => {
            handleCodeDetected(decodedText, true);
          },
          () => {
            // Ignorer les frames sans code détecté
          }
        );

        setIsCameraActive(true);
        setIsCameraStarting(false);

        try {
          const capabilities = scanner.getRunningTrackCameraCapabilities();
          const torchFeature = (capabilities as any)?.torchFeature?.();
          if (torchFeature && torchFeature.isSupported && torchFeature.isSupported()) {
            setHasTorchSupport(true);
          }
        } catch (_) {}
      } catch (err: any) {
        setIsCameraStarting(false);
        setIsCameraActive(false);

        let msg = "Impossible d'accéder à la caméra.";
        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
          msg = "Accès caméra refusé. Autorisez la caméra dans les réglages de Safari / votre navigateur.";
        } else if (err?.name === 'NotFoundError') {
          msg = "Aucune caméra détectée sur cet appareil.";
        } else if (typeof window !== 'undefined' && !window.isSecureContext) {
          setIsInsecureOrigin(true);
          msg = "La caméra en direct nécessite HTTPS sur iPhone/mobile.";
        } else if (err?.message) {
          msg = `Erreur caméra : ${err.message}`;
        }
        setCameraError(msg);
      }
    },
    [formatsToSupport, handleCodeDetected, selectedCameraId, stopAllMediaTracks]
  );

  const handleSwitchCamera = async () => {
    if (camerasList.length <= 1) return;
    const currentIndex = camerasList.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % camerasList.length;
    const nextCamera = camerasList[nextIndex];
    setSelectedCameraId(nextCamera.id);
    await startCamera(nextCamera.id);
  };

  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorchSupport) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  // Démarrage automatique du stream caméra à l'ouverture
  useEffect(() => {
    if (isOpen && !foundProduct && !isCameraActive && !isCameraStarting && !cameraError && !hasDetectedRef.current) {
      startCamera();
    }
  }, [isOpen, foundProduct, isCameraActive, isCameraStarting, cameraError, startCamera]);

  // Nettoyage complet à la fermeture ou au démontage
  useEffect(() => {
    if (!isOpen) {
      hasDetectedRef.current = false;
      void stopCamera();
      setFoundProduct(null);
      setBarcodeInput('');
      setError(null);
      setCameraError(null);
      setLastScannedCode(null);
      setSuccessNotice(false);
    }
  }, [isOpen, stopCamera]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  // Fallback photo / pellicule
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningImage(true);
    setError(null);
    setFoundProduct(null);

    try {
      if (!fileScannerRef.current) {
        fileScannerRef.current = new Html5Qrcode('barcode-hidden-scanner', {
          formatsToSupport,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
      }

      const decodedText = await fileScannerRef.current.scanFile(file, false);
      handleCodeDetected(decodedText, false);
    } catch (err: any) {
      console.warn('Scan file error:', err);
      setError("Aucun code-barres ou QR code net détecté sur la photo. Réessayez ou utilisez la caméra en direct.");
    } finally {
      setScanningImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    hasDetectedRef.current = true;
    void stopCamera();
    lookupBarcode(barcodeInput);
  };

  const handleSwitchToHttps = () => {
    if (typeof window === 'undefined') return;
    window.location.href = `https://${window.location.hostname}:3443${window.location.pathname}${window.location.search}`;
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

    const parsedUnitWeight = parseFloat(unitWeightGrams.replace(',', '.'));
    const productPayload: Partial<Ingredient> = {
      id: foundProduct?.barcode ? `barcode_${foundProduct.barcode}` : `custom_prod_${Date.now()}`,
      name: name.trim(),
      aisle,
      baseUnit: unit === 'ml' ? 'ml' : 'g',
      unitWeightGrams: parsedUnitWeight > 0 ? parsedUnitWeight : undefined,
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
      metroProductUrl:
        foundProduct?.metroProductUrl ||
        `https://www.metro.ca/recherche?free-text=${encodeURIComponent(name.trim())}`,
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
    hasDetectedRef.current = false;
    setFoundProduct(null);
    setBarcodeInput('');
    setError(null);
    setCameraError(null);
    setLastScannedCode(null);
    setSuccessNotice(false);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 animate-in fade-in duration-150 mb-safe sm:mb-0">
      {/* Conteneur DOM caché pour l'analyse de fichier image */}
      <div id="barcode-hidden-scanner" className="hidden" />

      {/* Input photo/pellicule en secours */}
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
              <h2 className="font-serif text-lg font-medium truncate">Scanner en direct</h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                Pointez le code-barres : la caméra s&apos;arrête automatiquement dès détection
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              void stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {!foundProduct && (
            <div className="space-y-3">
              {/* Zone Caméra Live */}
              {!isInsecureOrigin && (
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200 dark:border-white/15 bg-black">
                  <div
                    id="barcode-camera-viewport"
                    className="w-full min-h-[250px] sm:min-h-[280px] bg-black"
                  />

                  {/* Cadre de visée visuel quand la caméra tourne */}
                  {isCameraActive && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
                      <div className="w-[82%] max-w-[320px] h-[120px] rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] relative">
                        <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-[2px] bg-emerald-400/80 animate-pulse" />
                      </div>
                      <span className="mt-3 px-2.5 py-0.5 rounded-full bg-black/70 text-[10px] font-mono text-emerald-300 uppercase tracking-wider">
                        Caméra active • Visez le code-barres
                      </span>
                    </div>
                  )}

                  {/* Loader démarrage caméra */}
                  {isCameraStarting && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 text-white">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                      <span className="text-xs font-mono text-stone-300">Activation de la caméra...</span>
                    </div>
                  )}

                  {/* Contrôles flottants */}
                  {isCameraActive && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      {hasTorchSupport && (
                        <button
                          type="button"
                          onClick={handleToggleTorch}
                          className={`p-2 rounded-xl backdrop-blur-md border transition-colors ${
                            isTorchOn
                              ? 'bg-amber-400 text-stone-950 border-amber-300'
                              : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                          }`}
                          title={isTorchOn ? 'Éteindre le flash' : 'Allumer le flash'}
                        >
                          {isTorchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        </button>
                      )}
                      {camerasList.length > 1 && (
                        <button
                          type="button"
                          onClick={handleSwitchCamera}
                          className="p-2 rounded-xl bg-black/60 text-white border border-white/20 hover:bg-black/80 backdrop-blur-md transition-colors"
                          title="Changer de caméra"
                        >
                          <SwitchCamera className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void stopCamera()}
                        className="p-2 rounded-xl bg-black/60 text-white border border-white/20 hover:bg-red-600/80 backdrop-blur-md transition-colors"
                        title="Couper la caméra"
                      >
                        <CameraOff className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* État caméra coupée */}
                  {!isCameraActive && !isCameraStarting && !cameraError && (
                    <div className="absolute inset-0 bg-stone-950/90 flex flex-col items-center justify-center gap-3 p-4 text-center">
                      <CameraOff className="w-8 h-8 text-stone-400" />
                      <p className="text-xs text-stone-300 font-sans">
                        {loading
                          ? 'Code détecté — caméra coupée, recherche du produit...'
                          : 'Caméra en pause'}
                      </p>
                      {!loading && (
                        <button
                          type="button"
                          onClick={() => startCamera()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-stone-950 text-xs font-mono font-semibold hover:bg-stone-200 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Relancer la caméra</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bannière HTTPS requis (iPhone / mobile sur http://) */}
              {isInsecureOrigin && (
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-amber-950/30 border-amber-700/40 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold">
                        HTTPS requis pour la caméra en direct sur iPhone/mobile
                      </p>
                      <p className="opacity-85">
                        Safari bloque la caméra en direct sur les adresses <code>http://</code>. Passez en HTTPS sur le port 3443 (il suffit d&apos;accepter le certificat local une fois).
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchToHttps}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Passer en HTTPS pour activer la caméra en direct</span>
                  </button>
                </div>
              )}

              {/* Erreur caméra (hors origine non sécurisée) */}
              {cameraError && !isInsecureOrigin && (
                <div
                  className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                    isDark ? 'bg-red-950/40 border-red-800/40 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span>{cameraError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono shrink-0"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {/* Actions secondaires : Photo / Pellicule & Relancer */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={scanningImage || loading}
                  className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-2xl border flex items-center justify-center gap-2 text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 text-stone-200'
                      : 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-800'
                  }`}
                >
                  {scanningImage ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyse de la photo...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Prendre une photo / Pellicule</span>
                    </>
                  )}
                </button>

                {!isCameraActive && !isCameraStarting && !isInsecureOrigin && (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className={`py-2.5 px-4 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300'
                        : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Relancer la caméra</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Saisie manuelle alternative */}
          {!foundProduct && (
            <form onSubmit={handleManualLookupSubmit} className="space-y-2.5 pt-1">
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

              <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 flex-wrap">
                <span>Exemples fréquents :</span>
                <button
                  type="button"
                  onClick={() => {
                    hasDetectedRef.current = true;
                    void stopCamera();
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
                    hasDetectedRef.current = true;
                    void stopCamera();
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
                    hasDetectedRef.current = true;
                    void stopCamera();
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

          {/* Erreur si produit non trouvé */}
          {error && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                isDark ? 'bg-red-950/40 border-red-800/40 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div className="text-xs">
                <p className="font-semibold">{error}</p>
                <div className="flex gap-3 pt-1.5 opacity-90">
                  {!isInsecureOrigin && (
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="underline font-mono text-[11px] hover:opacity-100"
                    >
                      Relancer la caméra
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="underline font-mono text-[11px] hover:opacity-100"
                  >
                    Choisir une photo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Succès Feedback */}
          {successNotice && (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 ${
                isDark ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold">Produit ajouté avec succès à votre catalogue !</span>
            </div>
          )}

          {/* CARTE DU PRODUIT RECONNU */}
          {foundProduct && (
            <div
              className={`p-5 rounded-3xl border space-y-5 animate-in fade-in duration-200 ${
                isDark ? 'bg-white/[0.03] border-white/10' : 'bg-stone-50 border-stone-200 shadow-xs'
              }`}
            >
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
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border shrink-0 ${
                      isDark ? 'bg-white/5 border-white/10' : 'bg-stone-200 border-stone-300'
                    }`}
                  >
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

              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold block">
                  Valeurs nutritives certifiées (par 100 g / ml)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                      isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                    }`}
                  >
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

                  <div
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                      isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                    }`}
                  >
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

                  <div
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                      isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                    }`}
                  >
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

                  <div
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                      isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                    }`}
                  >
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

              <div>
                <label className="block text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1">
                  Poids d&apos;1 unité / portion (g, optionnel — ex: 35 pour une barre)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={unitWeightGrams}
                  onChange={(e) => setUnitWeightGrams(e.target.value)}
                  placeholder="Ex: 35"
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                    isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200/80 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.02] shrink-0">
          <button
            type="button"
            onClick={() => {
              void stopCamera();
              onClose();
            }}
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
