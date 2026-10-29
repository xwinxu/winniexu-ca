import { Env, getAllMenu, listOrders } from "../../../_shared";

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const id = ctx.params.id as string;
  const raw = await ctx.env.ORDERS_KV.get(`order:${id}`);
  if (!raw) return new Response("Not found", { status: 404 });

  const order = JSON.parse(raw);
  if (order.status !== "preparing") return Response.json(order);

  const [orders, menu] = await Promise.all([
    listOrders(ctx.env.ORDERS_KV),
    getAllMenu(ctx.env.ORDERS_KV),
  ]);
  const queuedOrders = orders
    .filter((queued) => queued.status === "preparing")
    .sort((a, b) => a.createdAt - b.createdAt || a.number - b.number);
  const orderIndex = queuedOrders.findIndex((queued) => queued.id === id);
  if (orderIndex === -1) return Response.json(order);

  const ordersAhead = queuedOrders.slice(0, orderIndex);
  const drinksAhead = ordersAhead.reduce(
    (total, queued) =>
      total +
      queued.items.reduce((orderTotal, item) => {
        const section = item.section ?? menu[item.drinkKey]?.section;
        return orderTotal + (section === "drinks" ? item.qty : 0);
      }, 0),
    0,
  );
  return Response.json({ ...order, ordersAhead: ordersAhead.length, drinksAhead });
};
