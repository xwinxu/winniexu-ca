import { Env, isStaffAuthed } from "../../../_shared";

// Ready orders that no one came to pick up get moved here instead of sitting
// in the active "ready" queue forever. They can be moved back with /back-to-ready.
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const id = ctx.params.id as string;
  const raw = await ctx.env.ORDERS_KV.get(`order:${id}`);
  if (!raw) return new Response("Not found", { status: 404 });

  const order = JSON.parse(raw);
  if (order.status !== "ready") return new Response("Can only set aside a ready order", { status: 400 });

  order.status = "set_aside";
  order.set_asideAt = Date.now();
  await ctx.env.ORDERS_KV.put(`order:${id}`, JSON.stringify(order));
  return Response.json(order);
};
