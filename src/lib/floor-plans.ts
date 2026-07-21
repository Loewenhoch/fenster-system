export interface PlanLink {
  label: string;
  href: string;
}

const PLAN_BASE = "/grundrisse";

function normalizeFloorForPlan(floor: string): string | null {
  const normalized = floor.trim().toLowerCase();

  if (normalized === "eg") return "eg";
  if (normalized === "kg") return "kg";
  if (normalized === "zg") return "zg";

  const ogMatch = normalized.match(/(\d+)\.\s*og/);
  if (ogMatch) return `og${ogMatch[1]}`;

  return null;
}

function getFloorLabel(floorKey: string): string {
  if (floorKey === "eg") return "EG";
  if (floorKey === "kg") return "KG";
  if (floorKey === "zg") return "ZG";

  const ogMatch = floorKey.match(/^og(\d+)$/);
  return ogMatch ? `${ogMatch[1]}.OG` : floorKey.toUpperCase();
}

export function getApartmentPlanLinks(
  houseNumber: string,
  floor: string
): PlanLink[] {
  const floorKey = normalizeFloorForPlan(floor);
  if (!floorKey) return [];
  const hasZwischengeschoss = houseNumber === "66" && floor.toLowerCase().includes("zg");

  const links: PlanLink[] = [];

  if (hasZwischengeschoss) {
    links.push({
      label: "Grundriss Haus 66 - ZG (Zwischengeschoss)",
      href: `${PLAN_BASE}/starhembergstrasse-66-gr-zg.pdf`,
    });
  }

  if (floorKey !== "zg") {
    links.push({
      label: `Grundriss Haus ${houseNumber} - ${getFloorLabel(floorKey)}`,
      href: `${PLAN_BASE}/starhembergstrasse-${houseNumber}-gr-${floorKey}.pdf`,
    });
  }

  return links;
}

export const BUILDING_VIEW_LINKS: PlanLink[] = [
  { label: "Ansicht Strassenseite", href: `${PLAN_BASE}/ansicht-strassenseitig.pdf` },
  { label: "Ansicht Hofseite", href: `${PLAN_BASE}/ansicht-hofseitig.pdf` },
  { label: "Ansicht SO", href: `${PLAN_BASE}/ansicht-so.pdf` },
  { label: "Ansicht NW", href: `${PLAN_BASE}/ansicht-nw.pdf` },
];
