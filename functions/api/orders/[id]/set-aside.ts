import { Env, isStaffAuthed } from "../../../_shared";

// Ready orders that no one came to pick up yet. Clears the active "ready"
// queue just like a normal pickup, but flags the order so staff (recent
// orders list) and the customer's own order page can tell it apart from an
// actual confirmed pickup.
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const id = ctx.params.id as string;
  const raw = await ctx.env.ORDERS_KV.get(`order:${id}`);
  if (!raw) return new Response("Not found", { status: 404 });

  const order = JSON.parse(raw);
  if (order.status !== "ready") return new Response("Can only set aside a ready order", { status: 400 });

  order.status = "picked_up";
  order.picked_upAt = Date.now();
  order.setAsideForPickup = true;
  await ctx.env.ORDERS_KV.put(`order:${id}`, JSON.stringify(order));
  return Response.json(order);
};
