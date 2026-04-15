import { MacfError } from '../errors.js';
export class GitHubApiError extends MacfError {
    status;
    constructor(status, message) {
        super('GITHUB_API_ERROR', `GitHub API ${status}: ${message}`);
        this.name = 'GitHubApiError';
        this.status = status;
    }
}
const API_BASE = 'https://api.github.com';
function headers(token) {
    return {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
    };
}
/**
 * Creates a GitHub Variables API client for a given URL path prefix.
 *
 * @param pathPrefix - e.g. "/orgs/my-org" or "/repos/owner/repo"
 * @param token - GitHub API token
 */
export function createGitHubClient(pathPrefix, token) {
    const baseUrl = `${API_BASE}${pathPrefix}/actions/variables`;
    return {
        async writeVariable(name, value) {
            // Try PATCH (update) first
            const patchRes = await fetch(`${baseUrl}/${name}`, {
                method: 'PATCH',
                headers: { ...headers(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({ value }),
            });
            if (patchRes.ok)
                return;
            // Variable doesn't exist yet — create with POST
            if (patchRes.status === 404) {
                const postRes = await fetch(baseUrl, {
                    method: 'POST',
                    headers: { ...headers(token), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, value }),
                });
                if (postRes.ok)
                    return;
                throw new GitHubApiError(postRes.status, `Failed to create variable ${name}: ${await postRes.text()}`);
            }
            throw new GitHubApiError(patchRes.status, `Failed to update variable ${name}: ${await patchRes.text()}`);
        },
        async readVariable(name) {
            const res = await fetch(`${baseUrl}/${name}`, {
                method: 'GET',
                headers: headers(token),
            });
            if (res.status === 404)
                return null;
            if (!res.ok) {
                throw new GitHubApiError(res.status, `Failed to read variable ${name}: ${await res.text()}`);
            }
            const data = await res.json();
            return data.value;
        },
        async listVariables() {
            const results = [];
            let page = 1;
            const perPage = 30;
            // Paginate through all variables
            for (;;) {
                const res = await fetch(`${baseUrl}?per_page=${perPage}&page=${page}`, {
                    method: 'GET',
                    headers: headers(token),
                });
                if (!res.ok) {
                    throw new GitHubApiError(res.status, `Failed to list variables: ${await res.text()}`);
                }
                const data = await res.json();
                for (const v of data.variables) {
                    results.push({ name: v.name, value: v.value });
                }
                if (results.length >= data.total_count || data.variables.length < perPage) {
                    break;
                }
                page++;
            }
            return results;
        },
        async deleteVariable(name) {
            const res = await fetch(`${baseUrl}/${name}`, {
                method: 'DELETE',
                headers: headers(token),
            });
            // 204 = deleted, 404 = already gone — both OK
            if (res.status === 204 || res.status === 404)
                return;
            throw new GitHubApiError(res.status, `Failed to delete variable ${name}: ${await res.text()}`);
        },
    };
}
//# sourceMappingURL=github-client.js.map