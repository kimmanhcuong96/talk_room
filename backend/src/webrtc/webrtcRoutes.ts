import { Router } from "express";
import { getIceConfig } from "./iceConfig.js";

export const webrtcRouter = Router();

webrtcRouter.get("/ice-config", async (_request, response) => {
  response.json(await getIceConfig());
});
