import { MongoClient, Db, Collection } from 'mongodb';
import { config } from './config.js';
import { logger } from '../utils/logger';
import { ActivityLog } from '../config/types/index';

let client: MongoClient;
let db: Db;
let logsCollection: Collection<ActivityLog>;

export async function connectMongoDB(): Promise<void> {
  try {
    client = new MongoClient(config.mongo.uri, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    db = client.db(config.mongo.dbName);
    logsCollection = db.collection<ActivityLog>('logs');

    // Create indexes
    await createIndexes();

    logger.info('MongoDB connection established');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
}

async function createIndexes(): Promise<void> {
  try {
    await logsCollection.createIndex({ service: 1, timestamp: -1 });
    await logsCollection.createIndex({ action: 1, timestamp: -1 });
    await logsCollection.createIndex({ userId: 1, timestamp: -1 });
    await logsCollection.createIndex({ severity: 1, timestamp: -1 });
    await logsCollection.createIndex({ timestamp: -1 });
    await logsCollection.createIndex({ 'metadata.ip': 1 });
    await logsCollection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 7776000 } // 90 days TTL
    );

    logger.info('MongoDB indexes created');
  } catch (error) {
    logger.error('Error creating indexes:', error);
  }
}

export function getLogsCollection(): Collection<ActivityLog> {
  if (!logsCollection) {
    throw new Error('Database not initialized');
  }
  return logsCollection;
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    logger.info('MongoDB connection closed');
  }
}