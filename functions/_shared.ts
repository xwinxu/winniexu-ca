export interface Env {
  ORDERS_KV: KVNamespace;
}

export type MenuSection = "drinks" | "pairings";

export interface MenuItemDef {
  name: string;
  price: number;
  section: MenuSection; // drinks: ratio-based "running low". pairings: exact-count low-stock.
  imageUrl?: string; // optional either way; absent -> placeholder card art
}

export const DRINKS: Record<string, MenuItemDef> = {
  teaone: { name: "Tea & 1", price: 12, section: "drinks", imageUrl: "assets/drinks/teaone.png" },
  osmanthus: { name: "Osmanthus Coconut", price: 7, section: "drinks", imageUrl: "assets/drinks/osmanthus.png" },
  banana: { name: "Bananocano", price: 6, section: "drinks", imageUrl: "assets/drinks/banana.png" },
  grapefruit: { name: "Clarified Citrus", price: 8, section: "drinks", imageUrl: "assets/drinks/grapefruit.png" },
  jasmine_sobacha: { name: "Jasmine Sobacha", price: 6, section: "pairings" },
  sesame_miso: { name: "Sesame Miso", price: 6, section: "pairings" },
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
  paidAt?: number;
  readyAt?: number;
  picked_upAt?: number;
  [key: string]: unknown;
}

export interface InventoryEntry {
  name: string;
  price: number;
  section: MenuSection;
  imageUrl?: string;
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

// Staff-added items, layered on top of the built-in DRINKS so the menu can grow
// without a code deploy. Stored as one small JSON blob since the menu is tiny.
export async function getExtraMenu(kv: KVNamespace): Promise<Record<string, MenuItemDef>> {
  const raw = await kv.get("menu:extra");
  return raw ? JSON.parse(raw) : {};
}

export async function saveExtraMenu(kv: KVNamespace, extras: Record<string, MenuItemDef>): Promise<void> {
  await kv.put("menu:extra", JSON.stringify(extras));
}

export async function getAllMenu(kv: KVNamespace): Promise<Record<string, MenuItemDef>> {
  const extras = await getExtraMenu(kv);
  return { ...DRINKS, ...extras };
}

export function slugifyMenuKey(name: string, existingKeys: Set<string>): string {
  let base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!base) base = "item";
  let key = base;
  let n = 2;
  while (existingKeys.has(key)) {
    key = `${base}_${n}`;
    n++;
  }
  return key;
}

export async function getInventory(kv: KVNamespace): Promise<Record<string, InventoryEntry>> {
  const menu = await getAllMenu(kv);
  const orders = await listOrders(kv);

  const used: Record<string, number> = {};
  for (const order of orders) {
    for (const item of order.items) {
      used[item.drinkKey] = (used[item.drinkKey] || 0) + item.qty;
    }
  }

  const result: Record<string, InventoryEntry> = {};
  for (const [key, def] of Object.entries(menu)) {
    const totalRaw = await kv.get(`inventory:total:${key}`);
    const total = totalRaw !== null ? parseInt(totalRaw, 10) : null;
    result[key] = {
      name: def.name,
      price: def.price,
      section: def.section,
      imageUrl: def.imageUrl,
      total,
      remaining: total !== null ? Math.max(0, total - (used[key] || 0)) : null,
    };
  }
  return result;
}
