import { Env, getAllMenu, getInventory, isStaffAuthed, listOrders } from "../_shared";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const [orders, menu, inventory] = await Promise.all([
    listOrders(ctx.env.ORDERS_KV),
    getAllMenu(ctx.env.ORDERS_KV),
    getInventory(ctx.env.ORDERS_KV),
  ]);

  const confirmed = orders.filter((o) => o.paidAt);

  type ItemStats = {
    name: string;
    totalSold: number;
    series: { t: number; cumulative: number }[];
    soldOutAt: number | null;
    avgPrepMs: number | null;
  };
  const perItem: Record<string, ItemStats> = {};
  for (const [key, def] of Object.entries(menu)) {
    perItem[key] = { name: def.name, totalSold: 0, series: [], soldOutAt: null, avgPrepMs: null };
  }

  const events = confirmed
    .flatMap((o) => o.items.map((item) => ({ key: item.drinkKey, t: o.paidAt as number, qty: item.qty })))
    .sort((a, b) => a.t - b.t);

  const cumulative: Record<string, number> = {};
  for (const e of events) {
    if (!perItem[e.key]) continue;
    cumulative[e.key] = (cumulative[e.key] || 0) + e.qty;
    perItem[e.key].totalSold = cumulative[e.key];
    perItem[e.key].series.push({ t: e.t, cumulative: cumulative[e.key] });
  }

  for (const [key, entry] of Object.entries(perItem)) {
    const total = inventory[key]?.total;
    if (total !== null && total !== undefined) {
      const point = entry.series.find((p) => p.cumulative >= total);
      entry.soldOutAt = point ? point.t : null;
    }
  }

  const prepTimes: number[] = [];
  const waitTimes: number[] = [];
  const perItemPrep: Record<string, number[]> = {};
  for (const o of orders) {
    if (o.paidAt && o.readyAt) {
      const prep = o.readyAt - o.paidAt;
      prepTimes.push(prep);
      for (const item of o.items) {
        (perItemPrep[item.drinkKey] ||= []).push(prep);
      }
    }
    if (o.readyAt) {
      waitTimes.push(o.readyAt - o.createdAt);
    }
  }
  for (const [key, arr] of Object.entries(perItemPrep)) {
    if (perItem[key]) perItem[key].avgPrepMs = average(arr);
  }

  return Response.json({
    orderCount: orders.length,
    confirmedCount: confirmed.length,
    avgWaitMs: average(waitTimes),
    avgPrepMs: average(prepTimes),
    items: perItem,
  });
};
