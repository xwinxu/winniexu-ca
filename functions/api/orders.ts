interface Env {
  ORDERS_KV: KVNamespace;
}

export const DRINKS: Record<string, { name: string; price: number }> = {
  teaone: { name: "Tea & 1", price: 12 },
  osmanthus: { name: "Osmanthus Coconut", price: 7 },
  banana: { name: "Bananocano", price: 6 },
  grapefruit: { name: "Clarified Citrus", price: 8 },
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = await ctx.request.json<{ drink: string; name: string }>();
  const drink = DRINKS[body.drink];
  const customerName = body.name?.trim();
  if (!drink || !customerName) {
    return new Response("Invalid order", { status: 400 });
  }

  const counterRaw = await ctx.env.ORDERS_KV.get("counter");
  const number = (counterRaw ? parseInt(counterRaw, 10) : 0) + 1;
  await ctx.env.ORDERS_KV.put("counter", String(number));

  const id = crypto.randomUUID();
  const order = {
    id,
    number,
    drinkKey: body.drink,
    drinkName: drink.name,
    amount: drink.price,
    customerName,
    status: "awaiting_payment" as const,
    createdAt: Date.now(),
  };
  await ctx.env.ORDERS_KV.put(`order:${id}`, JSON.stringify(order));

  return Response.json(order);
};
