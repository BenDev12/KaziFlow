import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

export function buildPinoConfig(config: ConfigService): Params {
  const nodeEnv = config.get<string>('NODE_ENV');
  const isProd = nodeEnv === 'production';
  // pino-pretty's worker-thread transport has no test-runner benefit and
  // is a common source of Jest "did not exit" hangs from a lingering
  // worker thread, so plain JSON logging is used outside local dev too.
  const usePrettyPrint = !isProd && nodeEnv !== 'test';

  return {
    pinoHttp: {
      level: isProd ? 'info' : 'debug',
      transport: usePrettyPrint ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
      genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
      redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
    },
  };
}
