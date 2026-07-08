import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  VAT_RATE,
  getMountingFeeQuantity,
  getMountingFees,
  isMountableCategory,
} from "@/lib/pricing";

type RepairableOrder = Prisma.OrderGetPayload<{
  include: {
    items: { include: { product: true; window: true } };
  };
}>;

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function cents(value: number): number {
  return Math.round(value * 100);
}

function calculateCurrentDraftTotals(order: RepairableOrder) {
  const itemFees = new Map<
    string,
    { installationFee: number; manipulationFee: number }
  >();

  for (const item of order.items) {
    itemFees.set(item.id, { installationFee: 0, manipulationFee: 0 });
  }

  const mountingByWindow = new Map<
    string,
    {
      itemId: string;
      quantity: number;
      installationFee: number;
      manipulationFee: number;
    }
  >();

  for (const item of order.items) {
    if (!item.window || !isMountableCategory(item.product.category)) continue;

    const { installationFee, manipulationFee, mountingTotal } =
      getMountingFees(item.window);
    if (mountingTotal <= 0) continue;

    const quantity = getMountingFeeQuantity(item.window, item.product.category);
    if (quantity <= 0) continue;

    const current = mountingByWindow.get(item.window.id);
    if (!current || quantity > current.quantity) {
      mountingByWindow.set(item.window.id, {
        itemId: item.id,
        quantity,
        installationFee,
        manipulationFee,
      });
    }
  }

  for (const fees of mountingByWindow.values()) {
    itemFees.set(fees.itemId, {
      installationFee: fees.installationFee * fees.quantity,
      manipulationFee: fees.manipulationFee * fees.quantity,
    });
  }

  const materialTotal = order.items.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );
  const installationTotal = [...itemFees.values()].reduce(
    (sum, fees) => sum + fees.installationFee,
    0
  );
  const manipulationTotal = [...itemFees.values()].reduce(
    (sum, fees) => sum + fees.manipulationFee,
    0
  );
  const totalNet = materialTotal + installationTotal + manipulationTotal;
  const totalGross = roundCurrency(totalNet * (1 + VAT_RATE));

  return {
    itemFees,
    materialTotal,
    installationTotal,
    manipulationTotal,
    totalNet,
    totalGross,
  };
}

export async function repairDraftOrderTotals(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true, window: true } },
    },
  });

  if (!order || order.status !== "DRAFT") return false;

  const current = calculateCurrentDraftTotals(order);
  const orderChanged =
    cents(order.materialTotal) !== cents(current.materialTotal) ||
    cents(order.installationTotal) !== cents(current.installationTotal) ||
    cents(order.manipulationTotal) !== cents(current.manipulationTotal) ||
    cents(order.totalNet) !== cents(current.totalNet) ||
    cents(order.totalGross) !== cents(current.totalGross);

  const changedItems = order.items.filter((item) => {
    const fees = current.itemFees.get(item.id) ?? {
      installationFee: 0,
      manipulationFee: 0,
    };
    return (
      cents(item.installationFee) !== cents(fees.installationFee) ||
      cents(item.manipulationFee) !== cents(fees.manipulationFee)
    );
  });

  if (!orderChanged && changedItems.length === 0) return false;

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      changedItems.map((item) => {
        const fees = current.itemFees.get(item.id) ?? {
          installationFee: 0,
          manipulationFee: 0,
        };
        return tx.orderItem.update({
          where: { id: item.id },
          data: fees,
        });
      })
    );

    await tx.order.update({
      where: { id: order.id },
      data: {
        materialTotal: current.materialTotal,
        installationTotal: current.installationTotal,
        manipulationTotal: current.manipulationTotal,
        totalNet: current.totalNet,
        totalGross: current.totalGross,
      },
    });
  });

  return true;
}

export async function repairDraftOrders(orderIds: string[]): Promise<boolean> {
  let changed = false;
  for (const orderId of orderIds) {
    changed = (await repairDraftOrderTotals(orderId)) || changed;
  }
  return changed;
}
