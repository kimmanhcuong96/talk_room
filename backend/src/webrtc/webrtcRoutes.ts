import { Router } from "express";
import { getIceConfig } from "./iceConfig.js";
import { getTurnUsageStatus } from "./turnUsage.js";

export const webrtcRouter = Router();

webrtcRouter.get("/ice-config", async (_request, response) => {
  response.json(await getIceConfig());
});

webrtcRouter.get("/turn-usage", async (_request, response) => {
  response.json(await getTurnUsageStatus());
});
