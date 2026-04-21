import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
/**
 * Generate a GitHub App installation token.
 *
 * Precedence:
 *   1. GH_TOKEN env var (if set, returned as-is — user override wins)
 *   2. Explicit TokenSource argument (from macf-agent.json config)
 *   3. APP_ID / INSTALL_ID / KEY_PATH env vars (legacy fallback for scripts)
 *
 * When both GH_TOKEN and an explicit TokenSource are present,
 * emit a debug warn (#111 C1). This is the quieter cousin of the
 * attribution trap: running an agent in a terminal with a stale
 * GH_TOKEN from another workspace silently operates under that
 * identity instead of the configured App. In debug mode, surface
 * the override so the user can spot the mismatch.
 */
export async function generateToken(source) {
    const envToken = process.env['GH_TOKEN'];
    if (envToken) {
        if (source && process.env['MACF_DEBUG'] === 'true') {
            process.stderr.write('warn: GH_TOKEN env is set and overrides the configured TokenSource. ' +
                'Unset GH_TOKEN if you want to use the App token; set MACF_DEBUG=false ' +
                'to silence this warning.\n');
        }
        return envToken;
    }
    const appId = source?.appId ?? process.env['APP_ID'];
    const installId = source?.installId ?? process.env['INSTALL_ID'];
    const keyPath = source?.keyPath ?? process.env['KEY_PATH'];
    if (!appId || !installId || !keyPath) {
        throw new Error('No GH_TOKEN, no TokenSource provided, and missing APP_ID/INSTALL_ID/KEY_PATH env vars');
    }
    const { stdout } = await execFileAsync('gh', [
        'token', 'generate',
        '--app-id', appId,
        '--installation-id', installId,
        '--key', keyPath,
    ], { encoding: 'utf-8' });
    const parsed = JSON.parse(stdout);
    return parsed.token;
}
//# sourceMappingURL=token.js.map