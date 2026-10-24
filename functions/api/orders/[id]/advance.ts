import { Env, isStaffAuthed } from "../../../_shared";

const NEXT: Record<string, string> = {
  preparing: "ready",
  ready: "picked_up",
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const id = ctx.params.id as string;
  const raw = await ctx.env.ORDERS_KV.get(`order:${id}`);
  if (!raw) return new Response("Not found", { status: 404 });

  const order = JSON.parse(raw);
  const next = NEXT[order.status];
  if (!next) return new Response("Cannot advance from this status", { status: 400 });

  order.status = next;
  order[`${next}At`] = Date.now();
  await ctx.env.ORDERS_KV.put(`order:${id}`, JSON.stringify(order));
  return Response.json(order);
};
