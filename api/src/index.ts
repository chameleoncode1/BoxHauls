import { Hono } from "hono";
import { cors } from "hono/cors";
import { quoteRoute } from "./routes/quote";

export interface Env {
  DB: D1Database;
  GOOGLE_MAPS_API_KEY: string;
  BASE_FARE_CENTS: string;
  PER_MILE_CENTS: string;
  HELPER_FEE_CENTS: string;
  HEAVY_FEE_CENTS: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: ["https://boxhauls.com", "https://www.boxhauls.com", "http://localhost:4321"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

app.get("/health", (c) => c.json({ ok: true }));

app.route("/", quoteRoute);

export default app;
