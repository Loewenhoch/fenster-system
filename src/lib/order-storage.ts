"use client";

import { calculateSelectionBreakdown } from "@/lib/pricing";

export interface OrderSelection {
  windowId: string;
  productId: string;
  productName: string;
  category?: string;
  unitPrice: number;
  quantity?: number;
  installationFee: number;
  manipulationFee: number;
  totalPrice: number;
  isMountable?: boolean;
  isIncludedRestoration?: boolean;
}

export interface OrderState {
  apartmentId?: string;
  selections: OrderSelection[];
}

const STORAGE_KEY = "sta-fenster-bestellung";
const STATE_VERSION = 4;

interface StoredState extends OrderState {
  _version?: number;
}

export function getOrderState(expectedApartmentId?: string): OrderState {
  if (typeof window === "undefined") return { selections: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { selections: [] };
    const parsed = JSON.parse(raw) as StoredState;
    // Schema-Version prüfen: bei Mismatch State zurücksetzen
    if (parsed._version && parsed._version !== STATE_VERSION) {
      console.warn("Order state version mismatch, resetting");
      return { selections: [] };
    }
    // Wenn eine andere Wohnung erwartet wird: State zurücksetzen
    if (expectedApartmentId && parsed.apartmentId !== expectedApartmentId) {
      return { selections: [] };
    }
    return {
      apartmentId: parsed.apartmentId,
      selections: parsed.selections || [],
    };
  } catch {
    return { selections: [] };
  }
}

function getStoredState(expectedApartmentId?: string): StoredState {
  if (typeof window === "undefined") return { selections: [], _version: STATE_VERSION };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { selections: [], _version: STATE_VERSION };
    const parsed = JSON.parse(raw) as StoredState;
    if (parsed._version && parsed._version !== STATE_VERSION) {
      return { selections: [], _version: STATE_VERSION };
    }
    if (expectedApartmentId && parsed.apartmentId !== expectedApartmentId) {
      return { selections: [], _version: STATE_VERSION };
    }
    return { ...parsed, _version: STATE_VERSION };
  } catch {
    return { selections: [], _version: STATE_VERSION };
  }
}

export function setOrderState(state: OrderState): void {
  if (typeof window === "undefined") return;
  try {
    const stored: StoredState = { ...state, _version: STATE_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (e) {
    // QuotaExceededError oder andere Storage-Fehler ignorieren
    console.warn("localStorage write failed:", e);
  }
}

export function clearOrderState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function initOrderState(apartmentId: string): void {
  if (typeof window === "undefined") return;
  const state = getStoredState(apartmentId);
  if (state.apartmentId !== apartmentId) {
    setOrderState({ apartmentId, selections: [] });
  }
}

export function addSelection(selection: OrderSelection, apartmentId: string): void {
  const state = getStoredState(apartmentId);
  state.apartmentId = apartmentId;
  const existingIndex = state.selections.findIndex(
    (s) => s.windowId === selection.windowId && s.productId === selection.productId
  );
  if (existingIndex >= 0) {
    state.selections[existingIndex] = selection;
  } else {
    state.selections.push(selection);
  }
  setOrderState(state);
}

export function removeSelection(windowId: string, productId: string, apartmentId: string): void {
  const state = getStoredState(apartmentId);
  state.apartmentId = apartmentId;
  state.selections = state.selections.filter(
    (s) => !(s.windowId === windowId && s.productId === productId)
  );
  setOrderState(state);
}

/**
 * Atomare Batch-Update: Alle Änderungen in einem Schreibvorgang.
 * Verhindert Race Conditions bei schnellen aufeinanderfolgenden Updates.
 */
export function batchUpdateSelections(
  apartmentId: string,
  updates: ({ type: "add"; selection: OrderSelection } | { type: "remove"; windowId: string; productId: string })[]
): void {
  const state = getStoredState(apartmentId);
  state.apartmentId = apartmentId;
  for (const update of updates) {
    if (update.type === "add") {
      const existingIndex = state.selections.findIndex(
        (s) => s.windowId === update.selection.windowId && s.productId === update.selection.productId
      );
      if (existingIndex >= 0) {
        state.selections[existingIndex] = update.selection;
      } else {
        state.selections.push(update.selection);
      }
    } else {
      state.selections = state.selections.filter(
        (s) => !(s.windowId === update.windowId && s.productId === update.productId)
      );
    }
  }
  setOrderState(state);
}

export function setSelections(apartmentId: string, selections: OrderSelection[]): void {
  setOrderState({ apartmentId, selections });
}

export function getSubtotal(): number {
  const state = getOrderState();
  return calculateSelectionBreakdown(state.selections).totalNet;
}

export function getPriceBreakdown(): {
  materialTotal: number;
  installationTotal: number;
  manipulationTotal: number;
  totalNet: number;
} {
  const state = getOrderState();
  return calculateSelectionBreakdown(state.selections);
}
