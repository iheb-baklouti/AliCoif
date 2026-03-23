import { buildSalonSnapshot } from "./salon";
import { getIO } from "./socket-server";

export async function emitSalonUpdate() {
  const io = getIO();
  if (!io) return;
  const snapshot = await buildSalonSnapshot();
  io.to("salon").emit("salon:update", snapshot);
}
