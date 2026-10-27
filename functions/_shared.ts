export interface Env {
  ORDERS_KV: KVNamespace;
}

export type MenuSection = "drinks" | "pairings";

export interface MenuItemDef {
  name: string;
  price: number;
  section: MenuSection; // drinks: ratio-based "running low". pairings: exact-count low-stock.
  imageUrl?: string; // optional; absent -> placeholder card art
  backImageUrl?: string; // optional; present -> card flips to show this + an Add to cart button
}

export const DRINKS: Record<string, MenuItemDef> = {
  teaone: {
    name: "Tea & 1",
    price: 12,
    section: "drinks",
    imageUrl: "assets/drinks/teaone.png",
    backImageUrl: "assets/drinks/teaone-back.png",
  },
  osmanthus: {
    name: "Osmanthus Coconut",
    price: 7,
    section: "drinks",
    imageUrl: "assets/drinks/osmanthus.png",
    backImageUrl: "assets/drinks/osmanthus-back.png",
  },
  banana: {
    name: "Bananocano",
    price: 6,
    section: "drinks",
    imageUrl: "assets/drinks/banana.png",
    backImageUrl: "assets/drinks/banana-back.png",
  },
  grapefruit: {
    name: "Clarified Citrus",
    price: 8,
    section: "drinks",
    imageUrl: "assets/drinks/grapefruit.png",
    backImageUrl: "assets/drinks/grapefruit-back.png",
  },
  jasmine_sobacha: {
    name: "Jasmine Sobacha",
    price: 6,
    section: "pairings",
    imageUrl: "assets/drinks/jasmine_sobacha.png",
    backImageUrl: "assets/drinks/jasmine_sobacha-back.png",
  },
  sesame_miso: {
    name: "Sesame Miso",
    price: 6,
    section: "pairings",
    imageUrl: "assets/drinks/sesame_miso.png",
    backImageUrl: "assets/drinks/sesame_miso-back.png",
  },
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
  backImageUrl?: string;
  total: number | null;
  remaining: number | null;
  removable: boolean; // staff-added items can be deleted entirely; built-ins can't
}

export const STAFF_PASSWORD = "slaytea";

export function isStaffAuthed(request: Request): boolean {
  return request.headers.get("x-staff-password") === STAFF_PASSWORD;
}

const ORDER_IDS_KEY = "order_ids";

// An explicit index of order ids, maintained on write. Every poll of the queue/
// inventory/stats pages reads this, so it must never cost a kv.list() call —
// Cloudflare's free tier allows only 1,000 list() ops/day, which a few people
// polling every few seconds for a few hours burns through fast. get()/put()
// have a far higher daily quota.
export async function getOrderIds(kv: KVNamespace): Promise<string[]> {
  const raw = await kv.get(ORDER_IDS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function addOrderId(kv: KVNamespace, id: string): Promise<void> {
  const ids = await getOrderIds(kv);
  ids.push(id);
  await kv.put(ORDER_IDS_KEY, JSON.stringify(ids));
}

export async function clearOrderIds(kv: KVNamespace): Promise<void> {
  await kv.delete(ORDER_IDS_KEY);
}

export async function listOrders(kv: KVNamespace): Promise<Order[]> {
  const ids = await getOrderIds(kv);
  const entries = await Promise.all(
    ids.map(async (id): Promise<Order | null> => {
      const raw = await kv.get(`order:${id}`);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as Order;
      } catch {
        // A single malformed/partially-written entry shouldn't take down the whole queue.
        return null;
      }
    }),
  );
  return entries.filter((o): o is Order => o !== null);
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

export async function removeExtraMenuItem(kv: KVNamespace, key: string): Promise<boolean> {
  const extras = await getExtraMenu(kv);
  if (!(key in extras)) return false;
  delete extras[key];
  await saveExtraMenu(kv, extras);
  await kv.delete(`inventory:total:${key}`);
  return true;
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
      backImageUrl: def.backImageUrl,
      total,
      remaining: total !== null ? Math.max(0, total - (used[key] || 0)) : null,
      removable: !(key in DRINKS),
    };
  }
  return result;
}
