import { clearOrderIds, Env, getOrderIds, isStaffAuthed } from "../_shared";

// Wipes all orders and the order-number counter — clears stale "amount left"
// counts left over from setup/testing. Leaves the menu and configured
// inventory totals untouched, since those are deliberate, not test artifacts.
// Called rarely, so this is the one place still fine to enumerate via the
// index rather than kv.list() (kept off the hot path to stay under the
// free-tier daily list() quota).
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const ids = await getOrderIds(ctx.env.ORDERS_KV);
  await Promise.all(ids.map((id) => ctx.env.ORDERS_KV.delete(`order:${id}`)));
  await clearOrderIds(ctx.env.ORDERS_KV);
  await ctx.env.ORDERS_KV.delete("counter");

  return new Response(null, { status: 204 });
};
