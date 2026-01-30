import { Kafka } from 'kafkajs';

function requiredEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === '' || value === 'undefined') {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

export function createKafkaClient(): Kafka {
  const clientId = requiredEnv('KAFKA_CLIENT_ID', process.env.KAFKA_CLIENT_ID);
  const broker =
    process.env.KAFKA_BROKER_URL ??
    undefined;
  const brokerValue = requiredEnv('KAFKA_BROKER_URL', broker);

  return new Kafka({
    clientId,
    brokers: [brokerValue],
  });
}

