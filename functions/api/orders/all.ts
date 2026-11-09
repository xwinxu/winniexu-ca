import { Env, isStaffAuthed, listOrders } from "../../_shared";

// Staff-only full order history, newest first. Backs the "Recent orders"
// scrollable panel and ad-hoc reconciliation (e.g. tallying Venmo payments).
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const orders = await listOrders(ctx.env.ORDERS_KV);
  orders.sort((a, b) => b.createdAt - a.createdAt);
  return Response.json(orders);
};
