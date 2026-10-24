import { DRINKS, Env, getInventory, Order } from "../_shared";

interface CartItem {
  drink: string;
  qty: number;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = await ctx.request.json<{ items: CartItem[]; name: string }>();
  const customerName = body.name?.trim();
  const cart = (body.items || []).filter((i) => i.qty > 0);

  if (!customerName || cart.length === 0) {
    return new Response("Invalid order", { status: 400 });
  }
  for (const item of cart) {
    if (!DRINKS[item.drink] || !Number.isInteger(item.qty) || item.qty <= 0) {
      return new Response("Invalid order", { status: 400 });
    }
  }

  const inventory = await getInventory(ctx.env.ORDERS_KV);
  for (const item of cart) {
    const stock = inventory[item.drink];
    if (stock && stock.remaining !== null && stock.remaining < item.qty) {
      return new Response("Sold out", { status: 409 });
    }
  }

  const counterRaw = await ctx.env.ORDERS_KV.get("counter");
  const number = (counterRaw ? parseInt(counterRaw, 10) : 0) + 1;
  await ctx.env.ORDERS_KV.put("counter", String(number));

  const items = cart.map((item) => {
    const drink = DRINKS[item.drink];
    return {
      drinkKey: item.drink,
      drinkName: drink.name,
      qty: item.qty,
      unitPrice: drink.price,
    };
  });
  const amount = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

  const id = crypto.randomUUID();
  const order: Order = {
    id,
    number,
    items,
    amount,
    customerName,
    status: "awaiting_payment",
    createdAt: Date.now(),
  };
  await ctx.env.ORDERS_KV.put(`order:${id}`, JSON.stringify(order));

  return Response.json(order);
};
