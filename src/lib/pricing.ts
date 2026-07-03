export const INSTALLATION_FEE = 120;
export const MANIPULATION_FEE = 150;
export const VAT_RATE = 0.1;
export const NO_ORDER_PRODUCT_ID = "NO_ORDER";
export const NO_ORDER_CATEGORY = "NO_ORDER";

export const SUNSCREEN_CATEGORIES = new Set([
  "SUNSCREEN_MOTOR",
  "SUNSCREEN_CORD",
]);

export const MOUNTABLE_CATEGORIES = new Set([
  "SUNSCREEN_MOTOR",
  "SUNSCREEN_CORD",
  "INSECT_SCREEN",
]);

export interface PricingWindow {
  widthMm?: number | null;
  rekordTypeNew?: string | null;
  priceMotorComplete?: number | null;
  priceCordComplete?: number | null;
  priceCordMaterial?: number | null;
  priceMotorMaterial?: number | null;
  priceMotorSurcharge?: number | null;
  priceReceiver?: number | null;
  priceIsgWindow?: number | null;
  priceIsgDoor?: number | null;
  hasExistingSunscreen?: boolean | null;
  hasElectricSunscreen?: boolean | null;
  requiresManipulationFee?: boolean | null;
}

export interface PriceSelection {
  windowId: string;
  category?: string;
  unitPrice: number;
  quantity?: number;
  mountingFeeQuantity?: number;
  installationFee?: number;
  manipulationFee?: number;
  isMountable?: boolean;
  isIncludedRestoration?: boolean;
}

export function isSunscreenCategory(category: string): boolean {
  return SUNSCREEN_CATEGORIES.has(category);
}

export function isMountableCategory(category: string): boolean {
  return MOUNTABLE_CATEGORIES.has(category);
}

export function isNoOrderCategory(category?: string | null): boolean {
  return category === NO_ORDER_CATEGORY;
}

export function getWindowTypeLabel(window: Pick<PricingWindow, "rekordTypeNew">): string | null {
  const type = window.rekordTypeNew?.trim();
  return type ? `Typ ${type}` : null;
}

export function isNonOrderableWindowType(
  window: Pick<PricingWindow, "rekordTypeNew">
): boolean {
  return window.rekordTypeNew?.trim() === "7";
}

export function getExistingSunscreenCategory(
  window: PricingWindow
): "SUNSCREEN_MOTOR" | "SUNSCREEN_CORD" | null {
  if (!window.hasExistingSunscreen && !window.requiresManipulationFee) return null;
  return window.hasElectricSunscreen ? "SUNSCREEN_MOTOR" : "SUNSCREEN_CORD";
}

export function isIncludedExistingSunscreen(
  window: PricingWindow,
  category?: string | null
): boolean {
  return !!category && getExistingSunscreenCategory(window) === category;
}

export function getSunscreenQuantity(
  window: PricingWindow,
  category: string
): number {
  if (!isSunscreenCategory(category)) return 1;

  const type = window.rekordTypeNew ?? "";
  if (/\b3\s*\+\s*3\b/.test(type)) return 2;
  if ((window.widthMm ?? 0) >= 2800) return 2;

  return 1;
}

export function getInsectScreenQuantity(
  _window: Pick<PricingWindow, "rekordTypeNew">,
  category: string
): number {
  if (category !== "INSECT_SCREEN") return 1;

  return 1;
}

export function getProductQuantity(
  window: PricingWindow,
  category: string
): number {
  if (category === "INSECT_SCREEN") {
    return getInsectScreenQuantity(window, category);
  }

  return getSunscreenQuantity(window, category);
}

export function getCombinedWindowTypeParts(
  window: Pick<PricingWindow, "rekordTypeNew">
): string[] {
  return (window.rekordTypeNew ?? "")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getMountingFeeQuantity(
  window: PricingWindow,
  category: string
): number {
  if (!isMountableCategory(category)) return 0;

  const productQuantity = getProductQuantity(window, category);
  const combinedParts = getCombinedWindowTypeParts(window).length;

  if (category === "INSECT_SCREEN") {
    return Math.max(productQuantity, combinedParts || 1);
  }

  return productQuantity;
}

export function getIncludedReceiverUnitPrice(
  window: PricingWindow,
  fallbackUnitPrice?: number | null
): number {
  return window.priceReceiver ?? fallbackUnitPrice ?? 0;
}

function positiveOrZero(value?: number | null): number {
  return value && value > 0 ? value : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getMotorUpgradeUnitPrice(
  window: PricingWindow,
  includedReceiverFallbackUnitPrice?: number | null
): number {
  if (getExistingSunscreenCategory(window) !== "SUNSCREEN_CORD") return 0;

  const explicitSurcharge = positiveOrZero(window.priceMotorSurcharge);
  if (explicitSurcharge > 0) return explicitSurcharge;

  const motorBase =
    positiveOrZero(window.priceMotorMaterial) ||
    positiveOrZero(window.priceMotorComplete);
  if (motorBase <= 0) return 0;

  const cordBase =
    positiveOrZero(window.priceCordMaterial) ||
    positiveOrZero(window.priceCordComplete);
  if (cordBase <= 0) return 0;

  const receiverPrice = getIncludedReceiverUnitPrice(
    window,
    includedReceiverFallbackUnitPrice
  );

  return Math.max(0, roundCurrency(motorBase + receiverPrice - cordBase));
}

export function getInsectScreenUnitPrice(
  window: Pick<PricingWindow, "priceIsgWindow" | "priceIsgDoor">
): number {
  return positiveOrZero(window.priceIsgWindow) + positiveOrZero(window.priceIsgDoor);
}

export function hasCombinedInsectScreen(
  window: Pick<PricingWindow, "priceIsgWindow" | "priceIsgDoor">
): boolean {
  return (
    positiveOrZero(window.priceIsgWindow) > 0 &&
    positiveOrZero(window.priceIsgDoor) > 0
  );
}

export function getMountingFees(window: PricingWindow): {
  installationFee: number;
  manipulationFee: number;
  mountingTotal: number;
} {
  if (window.hasExistingSunscreen || window.requiresManipulationFee) {
    return {
      installationFee: 0,
      manipulationFee: 0,
      mountingTotal: 0,
    };
  }

  return {
    installationFee: INSTALLATION_FEE,
    manipulationFee: 0,
    mountingTotal: INSTALLATION_FEE,
  };
}

export function calculateSelectionBreakdown(selections: PriceSelection[]): {
  materialTotal: number;
  installationTotal: number;
  manipulationTotal: number;
  totalNet: number;
} {
  const materialTotal = selections.reduce(
    (sum, selection) => sum + selection.unitPrice * (selection.quantity ?? 1),
    0
  );

  const perWindowFees = new Map<
    string,
    { installationFee: number; manipulationFee: number }
  >();

  for (const selection of selections) {
    const isMountable =
      selection.isMountable ??
      (selection.category
        ? isMountableCategory(selection.category)
        : (selection.installationFee ?? 0) > 0 ||
          (selection.manipulationFee ?? 0) > 0);

    if (!isMountable) continue;

    const current = perWindowFees.get(selection.windowId) ?? {
      installationFee: 0,
      manipulationFee: 0,
    };

    current.installationFee = Math.max(
      current.installationFee,
      selection.installationFee ?? 0
    );
    current.manipulationFee = Math.max(
      current.manipulationFee,
      selection.manipulationFee ?? 0
    );
    perWindowFees.set(selection.windowId, current);
  }

  let installationTotal = 0;
  let manipulationTotal = 0;

  for (const fees of perWindowFees.values()) {
    installationTotal += fees.installationFee;
    manipulationTotal += fees.manipulationFee;
  }

  return {
    materialTotal,
    installationTotal,
    manipulationTotal,
    totalNet: materialTotal + installationTotal + manipulationTotal,
  };
}
