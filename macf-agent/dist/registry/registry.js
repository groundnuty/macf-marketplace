import { AgentInfoSchema } from './types.js';
import { toVariableSegment } from './variable-name.js';
/**
 * Creates a Registry backed by a GitHubVariablesClient.
 * All three backends (org, profile, repo) share this implementation —
 * the only difference is the URL path prefix baked into the client.
 */
export function createRegistry(client, project) {
    // GitHub Actions variable names only accept [A-Z0-9_]. Hyphens in the
    // project or agent name become underscores; names are uppercased.
    const prefix = `${toVariableSegment(project)}_AGENT_`;
    function variableName(agentName) {
        return `${prefix}${toVariableSegment(agentName)}`;
    }
    return {
        async register(name, info) {
            const value = JSON.stringify(info);
            await client.writeVariable(variableName(name), value);
        },
        async get(name) {
            const value = await client.readVariable(variableName(name));
            if (value === null)
                return null;
            let parsed;
            try {
                parsed = JSON.parse(value);
            }
            catch {
                return null;
            }
            const result = AgentInfoSchema.safeParse(parsed);
            if (!result.success)
                return null;
            return result.data;
        },
        async list(filterPrefix) {
            const allVars = await client.listVariables();
            // Sanitize filter side with the same transform used at write time so
            // a filterPrefix like 'cv-' matches stored 'CV_ARCHITECT'.
            const fullPrefix = `${prefix}${filterPrefix ? toVariableSegment(filterPrefix) : ''}`;
            const results = [];
            for (const v of allVars) {
                if (!v.name.startsWith(fullPrefix))
                    continue;
                let parsed;
                try {
                    parsed = JSON.parse(v.value);
                }
                catch {
                    continue;
                }
                const result = AgentInfoSchema.safeParse(parsed);
                if (!result.success)
                    continue;
                const agentName = v.name.slice(prefix.length);
                results.push({ name: agentName, info: result.data });
            }
            return results;
        },
        async remove(name) {
            await client.deleteVariable(variableName(name));
        },
    };
}
//# sourceMappingURL=registry.js.map