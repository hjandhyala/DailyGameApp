import { getGame, toPublic } from "@/lib/server/games";
import { error, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/games/[id]">) {
  const { id } = await ctx.params;
  const game = await getGame(id);
  if (!game || game.status === "removed") return error(404, "Not found");
  return json({ game: toPublic(game), status: game.status });
}
