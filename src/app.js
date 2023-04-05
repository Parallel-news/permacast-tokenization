import express from "express";
import cors from "cors";
import { resolveRequests, sleep } from "./utils/exm.js";

const app = express();

const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
  })
);

app.get("/ping", async (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.send(`pong`);
  return;
});

app.listen(port, async () => {
  console.log(`listening at PORT:${port}`);
  while (true) {
    await resolveRequests();
    await sleep(5);
  }
});
