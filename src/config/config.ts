import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  
  // MongoDB
  MONGO_URI: Joi.string().required(),
  MONGO_DB_NAME: Joi.string().required(),
  
  // Kafka
  KAFKA_BROKERS: Joi.string().required(),
  KAFKA_CLIENT_ID: Joi.string().required(),
  KAFKA_TOPIC: Joi.string().required(),
  
  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  
  // Rate Limiting
  MAX_REQUESTS_PER_MINUTE: Joi.number().default(1000),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  nodeEnv: envVars.NODE_ENV,
  port: envVars.PORT,
  
  mongo: {
    uri: envVars.MONGO_URI,
    dbName: envVars.MONGO_DB_NAME,
  },
  
  kafka: {
    brokers: envVars.KAFKA_BROKERS.split(','),
    clientId: envVars.KAFKA_CLIENT_ID,
    topic: envVars.KAFKA_TOPIC,
  },
  
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
  },
  
  rateLimiting: {
    maxRequestsPerMinute: envVars.MAX_REQUESTS_PER_MINUTE,
  },
};