import { Env, getAllMenu, getInventory, isStaffAuthed, listOrders } from "../_shared";

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const inventory = await getInventory(ctx.env.ORDERS_KV);
  return Response.json(inventory);
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const body = await ctx.request.json<{ drink: string; total?: number; remaining?: number }>();
  const menu = await getAllMenu(ctx.env.ORDERS_KV);
  if (!menu[body.drink]) {
    return new Response("Invalid inventory update", { status: 400 });
  }

  if (body.remaining !== undefined) {
    if (!Number.isInteger(body.remaining) || body.remaining < 0) {
      return new Response("Invalid inventory update", { status: 400 });
    }
    const orders = await listOrders(ctx.env.ORDERS_KV);
    const used = orders.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (itemSum, item) => itemSum + (item.drinkKey === body.drink ? item.qty : 0),
          0,
        ),
      0,
    );
    await ctx.env.ORDERS_KV.put(`inventory:total:${body.drink}`, String(used + body.remaining));
  } else if (typeof body.total === "number" && Number.isFinite(body.total) && body.total >= 0) {
    await ctx.env.ORDERS_KV.put(`inventory:total:${body.drink}`, String(Math.floor(body.total)));
  } else {
    return new Response("Invalid inventory update", { status: 400 });
  }

  const inventory = await getInventory(ctx.env.ORDERS_KV);
  return Response.json(inventory);
};
