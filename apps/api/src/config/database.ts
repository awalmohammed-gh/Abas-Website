import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

// Some Windows setups hand Node a resolver that refuses SRV queries
// ("querySrv ECONNREFUSED"). DNS_SERVERS lets the API use explicit resolvers.
if (env.DNS_SERVERS?.length) {
  dns.setServers(env.DNS_SERVERS);
}

export async function connectDatabase(uri: string = env.MONGODB_URI, dbName: string = env.MONGODB_DB_NAME): Promise<void> {
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 15_000,
    autoIndex: true,
  });
  if (!env.isTest) {
    console.log(`[db] connected to database "${dbName}"`);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
