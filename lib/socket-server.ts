import type { Server } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __SOCKET_IO__: Server | undefined;
}

export function getIO(): Server | null {
  if (typeof globalThis !== "undefined" && globalThis.__SOCKET_IO__) {
    return globalThis.__SOCKET_IO__;
  }
  return null;
}

export function setIO(io: Server) {
  globalThis.__SOCKET_IO__ = io;
}
