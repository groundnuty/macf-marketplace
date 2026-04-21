import { request } from 'node:https';
import { readFileSync } from 'node:fs';
import { MacfError } from './errors.js';
export class CollisionError extends MacfError {
    constructor(name, host, port) {
        super('AGENT_COLLISION', `Agent '${name}' is already running at ${host}:${port}. ` +
            'Stop the existing agent before starting another.');
        this.name = 'CollisionError';
    }
}
const HEALTH_PING_TIMEOUT_MS = 5000;
/**
 * Ping an agent's /health endpoint via mTLS.
 * Returns true if the agent responds, false if unreachable.
 */
function pingHealth(host, port, caCertPath, agentCertPath, agentKeyPath, timeoutMs = HEALTH_PING_TIMEOUT_MS) {
    // readFileSync on missing/unreadable cert files throws ENOENT/EACCES
    // as raw Node errors with no descriptive context. During a cert-
    // rotation race at startup, the agent cert/key files may be
    // momentarily absent — without this guard the error propagates as
    // an unhandled rejection up through main() and crashes startup.
    // Treat any read error the same way we treat network errors: the
    // peer is effectively unreachable for the purpose of the collision
    // check. Ultrareview finding H3.
    let ca;
    let cert;
    let key;
    try {
        ca = readFileSync(caCertPath);
        cert = readFileSync(agentCertPath);
        key = readFileSync(agentKeyPath);
    }
    catch {
        return Promise.resolve(false);
    }
    return new Promise((resolve) => {
        const req = request({
            hostname: host,
            port,
            method: 'GET',
            path: '/health',
            ca,
            cert,
            key,
            rejectUnauthorized: true,
            timeout: timeoutMs,
        }, (res) => {
            // Any 2xx response means the agent is alive
            resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300);
            res.resume(); // drain response
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.end();
    });
}
/**
 * Check if an agent is already registered and alive.
 * Returns the action to take: register (fresh), takeover (dead), or abort (alive).
 */
export async function checkCollision(name, registry, certPaths, logger) {
    const existing = await registry.get(name);
    if (existing === null) {
        logger.info('collision_check', { result: 'fresh', agent: name });
        return { action: 'register' };
    }
    logger.info('collision_check', {
        result: 'variable_exists',
        agent: name,
        host: existing.host,
        port: existing.port,
        instance_id: existing.instance_id,
    });
    const alive = await pingHealth(existing.host, existing.port, certPaths.caCertPath, certPaths.agentCertPath, certPaths.agentKeyPath);
    if (alive) {
        logger.warn('collision_check', {
            result: 'abort',
            agent: name,
            host: existing.host,
            port: existing.port,
        });
        return { action: 'abort', existing };
    }
    logger.info('collision_check', {
        result: 'takeover',
        agent: name,
        previous_instance: existing.instance_id,
    });
    return { action: 'takeover', previous: existing };
}
//# sourceMappingURL=collision.js.map