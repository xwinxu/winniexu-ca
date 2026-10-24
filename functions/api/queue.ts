interface Env {
  ORDERS_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const list = await ctx.env.ORDERS_KV.list({ prefix: "order:" });
  const orders = await Promise.all(
    list.keys.map(async (k) => JSON.parse((await ctx.env.ORDERS_KV.get(k.name)) as string)),
  );

  const byStatus = (status: string) =>
    orders.filter((o) => o.status === status).sort((a, b) => a.createdAt - b.createdAt);

  return Response.json({
    awaitingPayment: byStatus("awaiting_payment"),
    preparing: byStatus("preparing"),
    ready: byStatus("ready"),
  });
};
