import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { authRouter } from "./auth/authRoutes.js";
import { adminRouter } from "./admin/adminRoutes.js";
import { env } from "./config/env.js";
import { HttpError } from "./errors/httpError.js";
import { getRoomSummaries } from "./rooms/roomStore.js";
import { registerSocketHandlers } from "./socket/registerSocketHandlers.js";
import type { AppServer } from "./types/socket.js";
import { webrtcRouter } from "./webrtc/webrtcRoutes.js";
import { initializeVirtualUserService } from "./virtualUsers/virtualUserService.js";
import { initializePresenceBotService } from "./presenceBots/presenceBotService.js";

const app = express();

app.use(cors({ origin: env.clientOrigins }));
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/rooms", (_request, response) => {
  response.json(getRoomSummaries());
});

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/webrtc", webrtcRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "Internal server error." });
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

app.set("io", io);
registerSocketHandlers(io);
void initializeVirtualUserService(io).catch((error) => {
  console.error("Unable to initialize virtual users. Run all database migrations.", error);
});
void initializePresenceBotService(io).catch((error) => {
  console.error("Unable to initialize presence bots. Run all database migrations.", error);
});

httpServer.listen(env.port, () => {
  console.log(`me2talk backend listening on port ${env.port}`);
});
