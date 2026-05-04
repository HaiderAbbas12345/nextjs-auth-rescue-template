import { MongoClient, type MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not set');
}

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {};

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In dev, Next.js HMR re-evaluates modules; reuse a single client across reloads
  // to avoid exhausting the Mongo connection pool.
  const globalWithMongo = globalThis as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB);
}
