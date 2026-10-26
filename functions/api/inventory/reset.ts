import { Env, getAllMenu, isStaffAuthed } from "../../_shared";

// Clears one item's configured total (back to "no limit set"). Leaves order
// history untouched — use /api/reset-all to clear stale test orders instead.
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const body = await ctx.request.json<{ drink: string }>();
  const menu = await getAllMenu(ctx.env.ORDERS_KV);
  if (!menu[body.drink]) return new Response("Unknown item", { status: 400 });

  await ctx.env.ORDERS_KV.delete(`inventory:total:${body.drink}`);
  return new Response(null, { status: 204 });
};
