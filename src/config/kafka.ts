import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { config } from './config.js';
import { logger } from '../utils/logger';

let kafka: Kafka;
let producer: Producer;
let consumer: Consumer;

// Batching configuration
const BATCH_SIZE = 100;
const FLUSH_INTERVAL = 1000; // 1 second

interface BufferedMessage {
  key: string;
  value: string;
  timestamp: string;
}

let messageBuffer: BufferedMessage[] = [];
let flushTimer: NodeJS.Timeout | null = null;

export async function initKafkaProducer(): Promise<void> {
  try {
    kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      logLevel: logLevel.ERROR,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    await producer.connect();
    logger.info('Kafka producer connected');
  } catch (error) {
    logger.error('Kafka producer connection error:', error);
    throw error;
  }
}

export async function initKafkaConsumer(groupId: string): Promise<void> {
  try {
    if (!kafka) {
      kafka = new Kafka({
        clientId: config.kafka.clientId,
        brokers: config.kafka.brokers,
        logLevel: logLevel.ERROR,
      });
    }

    consumer = kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await consumer.connect();
    await consumer.subscribe({
      topic: config.kafka.topic,
      fromBeginning: false,
    });

    logger.info('Kafka consumer connected');
  } catch (error) {
    logger.error('Kafka consumer connection error:', error);
    throw error;
  }
}

export function getProducer(): Producer {
  if (!producer) {
    throw new Error('Kafka producer not initialized');
  }
  return producer;
}

export function getConsumer(): Consumer {
  if (!consumer) {
    throw new Error('Kafka consumer not initialized');
  }
  return consumer;
}

async function flushBuffer(): Promise<void> {
  if (messageBuffer.length === 0) return;

  const messagesToSend = [...messageBuffer];
  messageBuffer = [];

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  try {
    await producer.send({
      topic: config.kafka.topic,
      messages: messagesToSend,
    });
    // logger.info(`Flushed ${messagesToSend.length} messages to Kafka`);
  } catch (error) {
    logger.error('Error flushing messages to Kafka:', error);
    // In a real app, you might want to retry or persist these failed messages
  }
}

export async function produceMessage(message: any): Promise<void> {
  // Add to buffer
  messageBuffer.push({
    key: message.userId || message.service,
    value: JSON.stringify(message),
    timestamp: Date.now().toString(),
  });

  // Flush if batch size reached
  if (messageBuffer.length >= BATCH_SIZE) {
    // We don't await this because we want to return immediately 
    flushBuffer().catch(err => logger.error('Async flush failed', err));
  } else if (!flushTimer) {
    // Schedule flush if not already scheduled
    flushTimer = setTimeout(() => {
      flushBuffer().catch(err => logger.error('Scheduled flush failed', err));
    }, FLUSH_INTERVAL);
  }
}

export async function closeKafka(): Promise<void> {
  try {
    // Flush any remaining messages
    if (messageBuffer.length > 0) {
      logger.info('Flushing remaining messages before shutdown...');
      await flushBuffer();
    }

    if (producer) {
      await producer.disconnect();
      logger.info('Kafka producer disconnected');
    }
    if (consumer) {
      await consumer.disconnect();
      logger.info('Kafka consumer disconnected');
    }
  } catch (error) {
    logger.error('Error closing Kafka connections:', error);
  }
}