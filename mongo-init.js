// MongoDB initialization script
db = db.getSiblingDB('activity_logs');

// Update logs schema
db.runCommand({
  collMod: "logs",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["service", "action", "severity", "timestamp"],
      properties: {
        service: { bsonType: "string" },
        action: { bsonType: "string" },
        userId: { bsonType: "string" },
        metadata: { bsonType: "object" },
        severity: { enum: ["info", "warn", "error", "critical"] },
        timestamp: { bsonType: "date" },
        createdAt: { bsonType: "date" },
      },
    },
  },
  validationLevel: "moderate",
});

// Create indexes for better query performance
db.logs.createIndex({ service: 1, timestamp: -1 });
db.logs.createIndex({ action: 1, timestamp: -1 });
db.logs.createIndex({ userId: 1, timestamp: -1 });
db.logs.createIndex({ severity: 1, timestamp: -1 });
db.logs.createIndex({ timestamp: -1 });
db.logs.createIndex({ 'metadata.ip': 1 });
db.logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// Create aggregation statistics collection
db.getCollection("stats").createIndex({ service: 1, date: -1 });
db.getCollection("stats").createIndex({ action: 1, date: -1 });

print('Activity Logs database initialized successfully');