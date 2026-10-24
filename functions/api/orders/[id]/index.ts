interface Env {
  ORDERS_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const id = ctx.params.id as string;
  const raw = await ctx.env.ORDERS_KV.get(`order:${id}`);
  if (!raw) return new Response("Not found", { status: 404 });
  return new Response(raw, { headers: { "content-type": "application/json" } });
};
