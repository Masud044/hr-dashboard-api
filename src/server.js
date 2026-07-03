// src\server.js
import dotenv from "dotenv";
dotenv.config(); 
import app from "./app.js";
import { closePool, initializePool } from "./config/db.js";

dotenv.config();

const PORT = Number.parseInt(process.env.PORT || "3000", 10);

async function startServer() {
  try {
    await initializePool();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

async function shutdown() {
  try {
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error("Failed to close Oracle pool:", error);
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();
