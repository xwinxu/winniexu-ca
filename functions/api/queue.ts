import { Env, listOrders } from "../_shared";

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const orders = await listOrders(ctx.env.ORDERS_KV);

  const byStatus = (status: string) =>
    orders.filter((o) => o.status === status).sort((a, b) => a.createdAt - b.createdAt);

  return Response.json({
    awaitingPayment: byStatus("awaiting_payment"),
    preparing: byStatus("preparing"),
    ready: byStatus("ready"),
  });
};
