export const APP_NAME = "Sonnenschutz";
export const APP_SUBTITLE = "Starhembergstraße 64, Linz";

export const BUILDINGS = {
  H64: { number: "64", street: "Starhembergstraße", city: "Linz" },
  H66: { number: "66", street: "Starhembergstraße", city: "Linz" },
};

export const FLOORS = [
  "KG",
  "EG",
  "1.OG",
  "2.OG",
  "3.OG",
  "4.OG",
  "5.OG",
  "6.OG",
  "DG",
];

export const ORDER_STATUS = {
  DRAFT: { label: "Entwurf", color: "bg-gray-200 text-gray-800" },
  CONFIRMED: { label: "Bestätigt", color: "bg-green-200 text-green-800" },
  COMPLETED: { label: "Abgeschlossen", color: "bg-blue-200 text-blue-800" },
  CANCELLED: { label: "Storniert", color: "bg-red-200 text-red-800" },
};

export const RESIDENT_ROLES = {
  OWNER_PRIMARY: { label: "Eigentümer (Haupt)", color: "bg-purple-200 text-purple-800" },
  OWNER_SECONDARY: { label: "Eigentümer (Neben)", color: "bg-purple-100 text-purple-700" },
  TENANT: { label: "Mieter", color: "bg-orange-200 text-orange-800" },
};

export const PRODUCT_CATEGORIES = {
  SUNSCREEN_MOTOR: { label: "Sonnenschutz mit Motor", icon: "Zap" },
  SUNSCREEN_CORD: { label: "Sonnenschutz mit Gurt", icon: "GripVertical" },
  INSECT_SCREEN: { label: "Insektenschutz integriert", icon: "Shield" },
  RECEIVER: { label: "Funkempfänger", icon: "Radio" },
  SENDER_1CH: { label: "Handsender 1-Kanal", icon: "Remote" },
  SENDER_15CH: { label: "Handsender 15-Kanal", icon: "Remote" },
};

export const ITEMS_PER_PAGE = 25;
