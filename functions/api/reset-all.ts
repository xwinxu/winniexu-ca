import { Env, isStaffAuthed } from "../_shared";

// Wipes all orders and the order-number counter — clears stale "amount left"
// counts left over from setup/testing. Leaves the menu and configured
// inventory totals untouched, since those are deliberate, not test artifacts.
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const list = await ctx.env.ORDERS_KV.list({ prefix: "order:" });
  await Promise.all(list.keys.map((k) => ctx.env.ORDERS_KV.delete(k.name)));
  await ctx.env.ORDERS_KV.delete("counter");

  return new Response(null, { status: 204 });
};
