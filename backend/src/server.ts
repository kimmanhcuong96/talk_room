import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { getRoomSummaries } from "./rooms/roomStore.js";
import { registerSocketHandlers } from "./socket/registerSocketHandlers.js";
import type { AppServer } from "./types/socket.js";

const app = express();

app.use(cors({ origin: env.clientOrigins }));
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/rooms", (_request, response) => {
  response.json(getRoomSummaries());
});

const httpServer = createServer(app);
const io: AppServer = new Server(httpServer, {
  cors: {
    origin: env.clientOrigins,
    methods: ["GET", "POST"]
  },
  pingInterval: 3000,
  pingTimeout: 3000
});

registerSocketHandlers(io);

httpServer.listen(env.port, () => {
  console.log(`English Talk Rooms backend listening on port ${env.port}`);
});
