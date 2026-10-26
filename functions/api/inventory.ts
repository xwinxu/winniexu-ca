import { Env, getAllMenu, getInventory, isStaffAuthed } from "../_shared";

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const inventory = await getInventory(ctx.env.ORDERS_KV);
    return Response.json(inventory);
  } catch (err) {
    // TEMPORARY: surface the real error while debugging a production 500.
    return new Response(`inventory error: ${err instanceof Error ? err.stack : String(err)}`, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const body = await ctx.request.json<{ drink: string; total: number }>();
  const menu = await getAllMenu(ctx.env.ORDERS_KV);
  if (!menu[body.drink] || typeof body.total !== "number" || body.total < 0) {
    return new Response("Invalid inventory update", { status: 400 });
  }
  await ctx.env.ORDERS_KV.put(`inventory:total:${body.drink}`, String(Math.floor(body.total)));
  const inventory = await getInventory(ctx.env.ORDERS_KV);
  return Response.json(inventory);
};
