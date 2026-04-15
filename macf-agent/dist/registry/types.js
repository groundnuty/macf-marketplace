import { z } from 'zod';
// --- Agent registration info stored in GitHub variable ---
export const AgentInfoSchema = z.object({
    host: z.string(),
    port: z.number().int().positive(),
    type: z.enum(['permanent', 'worker']),
    instance_id: z.string(),
    started: z.string(),
});
// --- Registry configuration ---
export const OrgRegistryConfigSchema = z.object({
    type: z.literal('org'),
    org: z.string().min(1),
});
export const ProfileRegistryConfigSchema = z.object({
    type: z.literal('profile'),
    user: z.string().min(1),
});
export const RepoRegistryConfigSchema = z.object({
    type: z.literal('repo'),
    owner: z.string().min(1),
    repo: z.string().min(1),
});
export const RegistryConfigSchema = z.union([
    OrgRegistryConfigSchema,
    ProfileRegistryConfigSchema,
    RepoRegistryConfigSchema,
]);
//# sourceMappingURL=types.js.map