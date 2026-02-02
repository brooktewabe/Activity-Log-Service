import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { config } from './config.js';
import { logger } from '../utils/logger';

let kafka: Kafka;
let producer: Producer;
let consumer: Consumer;

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

export async function produceMessage(message: any): Promise<void> {
  try {
    await producer.send({
      topic: config.kafka.topic,
      messages: [
        {
          key: message.userId || message.service,
          value: JSON.stringify(message),
          timestamp: Date.now().toString(),
        },
      ],
    });
  } catch (error) {
    logger.error('Error producing message to Kafka:', error);
    throw error;
  }
}

export async function closeKafka(): Promise<void> {
  try {
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