export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
  child: (bindings: Record<string, unknown>) => Logger;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createLogger(options?: {
  level?: LogLevel;
  name?: string;
  bindings?: Record<string, unknown>;
}): Logger {
  const min = LEVEL_ORDER[options?.level ?? (process.env.PLAYKIT_LOG_LEVEL as LogLevel) ?? 'info'];
  const base = {
    kit: 'playkit',
    name: options?.name ?? 'playkit',
    ...(options?.bindings ?? {}),
  };

  const write = (level: LogLevel, msg: string, meta?: Record<string, unknown>) => {
    if (LEVEL_ORDER[level] < min) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg,
      ...base,
      ...(meta ?? {}),
    });
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  };

  const logger: Logger = {
    debug: (msg, meta) => write('debug', msg, meta),
    info: (msg, meta) => write('info', msg, meta),
    warn: (msg, meta) => write('warn', msg, meta),
    error: (msg, meta) => write('error', msg, meta),
    child: (bindings) =>
      createLogger({
        level: options?.level,
        name: options?.name,
        bindings: { ...base, ...bindings },
      }),
  };

  return logger;
}
