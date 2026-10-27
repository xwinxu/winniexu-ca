import { Env, isStaffAuthed, removeExtraMenuItem } from "../../_shared";

// Only removes staff-added items; built-in drinks/pairings aren't stored as
// extras so there's nothing in KV to delete for them.
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  if (!isStaffAuthed(ctx.request)) return new Response("Unauthorized", { status: 401 });

  const body = await ctx.request.json<{ key: string }>();
  if (!body.key) return new Response("Missing key", { status: 400 });

  const removed = await removeExtraMenuItem(ctx.env.ORDERS_KV, body.key);
  if (!removed) return new Response("Item not found or not removable", { status: 400 });

  return new Response(null, { status: 204 });
};
