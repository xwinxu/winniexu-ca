export interface Env {
  ORDERS_KV: KVNamespace;
}

export const DRINKS: Record<string, { name: string; price: number }> = {
  teaone: { name: "Tea & 1", price: 12 },
  osmanthus: { name: "Osmanthus Coconut", price: 7 },
  banana: { name: "Bananocano", price: 6 },
  grapefruit: { name: "Clarified Citrus", price: 8 },
};

export interface OrderItem {
  drinkKey: string;
  drinkName: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  number: number;
  items: OrderItem[];
  amount: number;
  customerName: string;
  status: "awaiting_payment" | "preparing" | "ready" | "picked_up";
  createdAt: number;
  [key: string]: unknown;
}

export interface InventoryEntry {
  total: number | null;
  remaining: number | null;
}

export const STAFF_PASSWORD = "slaytea";

export function isStaffAuthed(request: Request): boolean {
  return request.headers.get("x-staff-password") === STAFF_PASSWORD;
}

export async function listOrders(kv: KVNamespace): Promise<Order[]> {
  const list = await kv.list({ prefix: "order:" });
  return Promise.all(list.keys.map(async (k) => JSON.parse((await kv.get(k.name)) as string)));
}

export async function getInventory(kv: KVNamespace): Promise<Record<string, InventoryEntry>> {
  const orders = await listOrders(kv);

  const used: Record<string, number> = {};
  for (const order of orders) {
    for (const item of order.items) {
      used[item.drinkKey] = (used[item.drinkKey] || 0) + item.qty;
    }
  }

  const result: Record<string, InventoryEntry> = {};
  for (const key of Object.keys(DRINKS)) {
    const totalRaw = await kv.get(`inventory:total:${key}`);
    const total = totalRaw !== null ? parseInt(totalRaw, 10) : null;
    result[key] = {
      total,
      remaining: total !== null ? Math.max(0, total - (used[key] || 0)) : null,
    };
  }
  return result;
}
