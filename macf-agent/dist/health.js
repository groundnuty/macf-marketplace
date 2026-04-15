import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
function readVersion() {
    const pkgPath = resolve(import.meta.dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
}
export function createHealthState(agentName, agentType) {
    const version = readVersion();
    const startTime = Date.now();
    let currentIssue = null;
    let lastNotification = null;
    return {
        getHealth() {
            return {
                agent: agentName,
                status: 'online',
                type: agentType,
                uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
                current_issue: currentIssue,
                version,
                last_notification: lastNotification,
            };
        },
        setCurrentIssue(issueNumber) {
            currentIssue = issueNumber;
        },
        recordNotification() {
            lastNotification = new Date().toISOString();
        },
    };
}
//# sourceMappingURL=health.js.map