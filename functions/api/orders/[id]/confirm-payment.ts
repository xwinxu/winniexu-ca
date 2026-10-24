import { Env, isStaffAuthed } from "../../../_shared";

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const id = ctx.params.id as string;
  const raw = await ctx.env.ORDERS_KV.get(`order:${id}`);
  if (!raw) return new Response("Not found", { status: 404 });

  const order = JSON.parse(raw);
  if (order.status === "awaiting_payment") {
    order.status = "preparing";
    order.paidAt = Date.now();
    await ctx.env.ORDERS_KV.put(`order:${id}`, JSON.stringify(order));
  }
  return Response.json(order);
};
