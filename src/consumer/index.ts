import { initKafkaConsumer, getConsumer } from '../config/kafka.js';
import { getLogsCollection } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { connectMongoDB } from '../config/database.js';
import { ActivityLog } from '../config/types/index';
import { kafkaMessagesConsumedTotal } from '../utils/metrics';

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
      autoCommit: false, // We will manually resolve offsets
      eachBatchAutoResolve: false, 
      eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, commitOffsetsIfNecessary }) => {
        logger.info(`Received batch with ${batch.messages.length} messages`);
        
        const logsToInsert: ActivityLog[] = [];
        
        for (const message of batch.messages) {
           if (!isRunning() || !message.value) continue;

           try {
             const raw = JSON.parse(message.value.toString());
             
             const log: ActivityLog = {
               ...raw,
               timestamp: new Date(raw.timestamp),
               createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
             };
             
             logsToInsert.push(log);
           } catch (err) {
             logger.error('Failed to parse message', err);
             // Verify if we should skip or retry. For now, we skip bad messages but mark offset resolved
           }

           // Mark this message as processed (conceptually) - though we commit in bulk at end
           resolveOffset(message.offset);
        }

        if (logsToInsert.length > 0) {
          try {
            const collection = getLogsCollection();
            await collection.insertMany(logsToInsert);
            kafkaMessagesConsumedTotal.inc(logsToInsert.length);
            logger.info(`Processed ${logsToInsert.length} logs from Kafka batch`);
          } catch (error) {
            logger.error('Error inserting batch into MongoDB:', error);
            // In a real scenario, you might throw here to retry the batch
            // or DLQ the batch.
            throw error; 
          }
        }

        await heartbeat();
        await commitOffsetsIfNecessary();
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
  logger.info('SIGTERM received');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  process.exit(0);
});

startConsumer();