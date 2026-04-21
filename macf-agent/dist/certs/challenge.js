import { toVariableSegment } from '../registry/variable-name.js';
import { MacfError } from '../errors.js';
export class ChallengeError extends MacfError {
    constructor(message) {
        super('CHALLENGE_ERROR', message);
        this.name = 'ChallengeError';
    }
}
/** Registry variable name for an agent's current challenge. */
export function challengeVarName(project, agentName) {
    return `${toVariableSegment(project)}_CHALLENGE_${toVariableSegment(agentName)}`;
}
/**
 * Allocate a challenge and return the client-facing (id + instruction).
 * Does NOT write the registry variable — the client does that in the next
 * round-trip, proving GitHub write access at the registry scope.
 */
export function createChallenge(config) {
    const rec = config.store.issue(config.agentName);
    const varName = challengeVarName(config.project, config.agentName);
    return {
        challengeId: rec.challengeId,
        instruction: `Write registry variable ${varName} = '${rec.expectedValue}'. ` +
            `Then POST /sign again with { challenge_done: true, challenge_id: '${rec.challengeId}' }.`,
    };
}
/**
 * Verify a step-2 request. Caller passes the client-supplied challenge_id
 * and agent_name. We read the registry variable, delete it regardless of
 * outcome (prevents replay), consume the in-memory entry, and return
 * 'ok' / 'mismatch' — the caller surfaces a generic error on mismatch to
 * avoid telling the attacker WHICH check failed.
 */
export async function verifyAndConsumeChallenge(config) {
    const varName = challengeVarName(config.project, config.agentName);
    const observedValue = await config.client.readVariable(varName);
    // Delete the registry variable unconditionally (best-effort). Intentional:
    // mismatch attempts don't leave a re-usable variable behind; attackers get
    // one shot per outstanding challenge.
    try {
        await config.client.deleteVariable(varName);
    }
    catch {
        // Ignore; consuming the in-memory entry below still blocks replay
        // server-side, which is the security-critical half.
    }
    if (observedValue === null) {
        // Still consume the in-memory entry (replay-block).
        config.store.consume(config.challengeId, config.agentName, '');
        return 'mismatch';
    }
    return config.store.consume(config.challengeId, config.agentName, observedValue);
}
//# sourceMappingURL=challenge.js.map