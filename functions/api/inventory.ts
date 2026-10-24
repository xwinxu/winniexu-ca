import { DRINKS, Env, getInventory } from "../_shared";

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const inventory = await getInventory(ctx.env.ORDERS_KV);
  return Response.json(inventory);
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = await ctx.request.json<{ drink: string; total: number }>();
  if (!DRINKS[body.drink] || typeof body.total !== "number" || body.total < 0) {
    return new Response("Invalid inventory update", { status: 400 });
  }
  await ctx.env.ORDERS_KV.put(`inventory:total:${body.drink}`, String(Math.floor(body.total)));
  const inventory = await getInventory(ctx.env.ORDERS_KV);
  return Response.json(inventory);
};
