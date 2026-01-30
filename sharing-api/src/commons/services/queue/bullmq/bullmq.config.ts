function parseBool(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
}

export type RedisConnectionOptions = {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: Record<string, any>;
};

export function createRedisConnectionOptions(): RedisConnectionOptions {
  const host = process.env.REDIS_HOST ?? '127.0.0.1';
  const port = Number(process.env.REDIS_PORT ?? 6379);
  const password = process.env.REDIS_PASSWORD || undefined;
  const db = process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined;

  const tlsEnabled = parseBool(process.env.REDIS_TLS, false);
  const tls = tlsEnabled ? {} : undefined;

  return { host, port, password, db, tls };
}

