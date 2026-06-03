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
}

export interface OrderState {
  selections: OrderSelection[];
}

const STORAGE_KEY = "sta-fenster-bestellung";

export function getOrderState(): OrderState {
  if (typeof window === "undefined") return { selections: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { selections: [] };
    return JSON.parse(raw) as OrderState;
  } catch {
    return { selections: [] };
  }
}

export function setOrderState(state: OrderState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearOrderState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function addSelection(selection: OrderSelection): void {
  const state = getOrderState();
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

export function removeSelection(windowId: string, productId: string): void {
  const state = getOrderState();
  state.selections = state.selections.filter(
    (s) => !(s.windowId === windowId && s.productId === productId)
  );
  setOrderState(state);
}

export function setSelections(selections: OrderSelection[]): void {
  setOrderState({ selections });
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
