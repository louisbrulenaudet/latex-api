// src/routes/health.ts

import { Hono } from "hono";
import { HealthResponseSchema } from "../dtos/health";

const health = new Hono();

health.get("/", (c) => {
  return c.json(HealthResponseSchema.parse({ status: "ok" }));
});

export default health;
export type HealthRoute = typeof health;
