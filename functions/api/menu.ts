import { Env, getAllMenu, getExtraMenu, isStaffAuthed, saveExtraMenu, slugifyMenuKey } from "../_shared";

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const extras = await getExtraMenu(ctx.env.ORDERS_KV);
  return Response.json(extras);
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const body = await ctx.request.json<{ name: string; price: number; section?: string; imageUrl?: string }>();
  const name = body.name?.trim();
  const section = body.section === "drinks" ? "drinks" : "pairings";
  if (!name || typeof body.price !== "number" || !(body.price > 0)) {
    return new Response("Invalid menu item", { status: 400 });
  }

  const allMenu = await getAllMenu(ctx.env.ORDERS_KV);
  const key = slugifyMenuKey(name, new Set(Object.keys(allMenu)));
  const imageUrl = body.imageUrl?.trim() || undefined;

  const extras = await getExtraMenu(ctx.env.ORDERS_KV);
  extras[key] = { name, price: body.price, section, imageUrl };
  await saveExtraMenu(ctx.env.ORDERS_KV, extras);

  return Response.json({ key, name, price: body.price, section, imageUrl });
};
