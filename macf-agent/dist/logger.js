import { appendFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
function formatEntry(level, event, data) {
    const entry = {
        ts: new Date().toISOString(),
        level,
        event,
        ...data,
    };
    return JSON.stringify(entry);
}
export function createLogger(config) {
    const { logPath, debug = false } = config;
    if (logPath) {
        const dir = dirname(logPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        if (!existsSync(logPath)) {
            writeFileSync(logPath, '');
        }
    }
    function write(level, event, data) {
        const line = formatEntry(level, event, data);
        if (logPath) {
            appendFileSync(logPath, line + '\n');
        }
        if (debug) {
            process.stderr.write(line + '\n');
        }
    }
    return {
        info: (event, data) => write('info', event, data),
        warn: (event, data) => write('warn', event, data),
        error: (event, data) => write('error', event, data),
    };
}
//# sourceMappingURL=logger.js.map