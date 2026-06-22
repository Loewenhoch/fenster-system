export const INSTALLATION_FEE = 120;
export const MANIPULATION_FEE = 150;
export const VAT_RATE = 0.1;

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
  priceReceiver?: number | null;
  hasExistingSunscreen?: boolean | null;
  hasElectricSunscreen?: boolean | null;
  requiresManipulationFee?: boolean | null;
}

export interface PriceSelection {
  windowId: string;
  category?: string;
  unitPrice: number;
  quantity?: number;
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

export function getIncludedReceiverUnitPrice(
  window: PricingWindow,
  fallbackUnitPrice?: number | null
): number {
  return window.priceReceiver ?? fallbackUnitPrice ?? 0;
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
