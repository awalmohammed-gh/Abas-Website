/**
 * MongoDB connection for ABA Mart: the single place the connection is opened.
 * The API passes in values from its validated environment (apps/api/src/config/env.ts).
 */
import { setServers } from "node:dns";
import mongoose from "mongoose";

export interface MongoDBOptions {
  /** mongodb:// or mongodb+srv:// connection string */
  uri: string;
  dbName: string;
  /**
   * Optional DNS resolvers for mongodb+srv:// lookups. Some networks refuse
   * the SRV/TXT queries those URIs need ("querySrv ECONNREFUSED").
   */
  dnsServers?: string[];
  log?: boolean;
}

mongoose.set("strictQuery", true);

/** Opens the shared Mongoose connection, reusing it if it is already open to the same database. */
export async function connectMongoDB({ uri, dbName, dnsServers, log = true }: MongoDBOptions): Promise<typeof mongoose> {
  const { connection } = mongoose;
  if (connection.readyState === mongoose.ConnectionStates.connected && connection.name === dbName) return mongoose;

  if (dnsServers?.length) setServers(dnsServers);
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 15_000,
    autoIndex: true,
  });
  if (log) console.log(`[db] connected to database "${dbName}"`);
  return mongoose;
}

export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect();
}

export function isMongoDBConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}

/** Name of the database the shared connection is actually using. */
export function connectedDatabaseName(): string | null {
  return isMongoDBConnected() ? mongoose.connection.name : null;
}
