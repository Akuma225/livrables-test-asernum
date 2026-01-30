import { Injectable } from "@nestjs/common";
import { Kafka } from "kafkajs";

@Injectable()
export class KafkaProducer {
  private readonly producer;

  constructor() {
    this.producer = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID!,
      brokers: [process.env.KAFKA_BROKER_URL!],
    }).producer();
  }

  async emit(topic: string, message: any) {
    await this.producer.connect();

    await this.producer.send({
      topic,
      messages: [
        {
          key: message.document_id ?? message.documentId,
          value: JSON.stringify(message),
        },
      ],
    });
  }
}
