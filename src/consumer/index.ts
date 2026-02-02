import { initKafkaConsumer, getConsumer } from '../config/kafka.js';
import { getLogsCollection } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { connectMongoDB } from '../config/database.js';
import { ActivityLog } from '../config/types/index';
import { kafkaMessagesConsumedTotal } from '../utils/metrics';

const BATCH_SIZE = 100;
const BATCH_TIMEOUT = 1000; // 1 second

let messageBatch: ActivityLog[] = [];
let batchTimer: NodeJS.Timeout | null = null;

async function processBatch() {
  if (messageBatch.length === 0) return;

  const collection = getLogsCollection();
  const logsToInsert = [...messageBatch];
  messageBatch = [];

  try {
    await collection.insertMany(logsToInsert);
    kafkaMessagesConsumedTotal.inc(logsToInsert.length);
    logger.info(`Batch processed: ${logsToInsert.length} logs`);
  } catch (error) {
    logger.error('Error processing batch:', error);
    // In production, implement dead letter queue
  }
}

function scheduleBatchProcessing() {
  if (batchTimer) {
    clearTimeout(batchTimer);
  }

  batchTimer = setTimeout(async () => {
    await processBatch();
  }, BATCH_TIMEOUT);
}

async function startConsumer() {
  try {
    // Connect to MongoDB first
    await connectMongoDB();
    logger.info('Consumer: MongoDB connected');

    // Initialize Kafka consumer
    await initKafkaConsumer('activity-log-consumer-node');
    const consumer = getConsumer();

    logger.info('Starting Kafka consumer...');

    await consumer.run({
      autoCommit: true,
      autoCommitInterval: 5000,
      eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
        for (const message of batch.messages) {
          if (!message.value) continue;

          try {
            const raw = JSON.parse(message.value.toString());

            const log: ActivityLog = {
                ...raw,
                timestamp: new Date(raw.timestamp),
                createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
            };
            messageBatch.push(log);

            // Process batch if it reaches the size limit
            if (messageBatch.length >= BATCH_SIZE) {
              await processBatch();
            } else {
              scheduleBatchProcessing();
            }

            await resolveOffset(message.offset);
            await heartbeat();
          } catch (error) {
            logger.error('Error processing message:', error);
          }
        }
      },
    });

    logger.info('Kafka consumer started successfully');
  } catch (error) {
    logger.error('Failed to start consumer:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, processing remaining messages...');
  if (batchTimer) clearTimeout(batchTimer);
  await processBatch();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, processing remaining messages...');
  if (batchTimer) clearTimeout(batchTimer);
  await processBatch();
  process.exit(0);
});

startConsumer();