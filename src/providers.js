/**
 * 内置 provider：从环境变量读取令牌，请勿把密钥写入代码库。
 * 可按需扩展此表或配合 get_token_from_env 工具使用自定义变量名。
 */
export const TOKEN_PROVIDERS = {
    gitee: {
        envVar: 'GITEE_ACCESS_TOKEN',
        title: 'Gitee',
        description: 'Gitee 私人令牌（Personal Access Token）'
    },
    lanhu: {
        envVars: ['LANHU_ACCESS_TOKEN', 'LANHU_TOKEN'],
        title: '蓝湖',
        description: '蓝湖（Lanhu）Open API 令牌（读取 LANHU_ACCESS_TOKEN 或 LANHU_TOKEN）'
    },
    github: {
        envVar: 'GITHUB_TOKEN',
        title: 'GitHub',
        description: 'GitHub personal access token 或 fine-grained token'
    },
    gitlab: {
        envVar: 'GITLAB_TOKEN',
        title: 'GitLab',
        description: 'GitLab personal / project access token'
    },
    coding: {
        envVar: 'CODING_TOKEN',
        title: 'CODING',
        description: '腾讯云 CODING 项目令牌'
    },
    bitbucket: {
        envVar: 'BITBUCKET_ACCESS_TOKEN',
        title: 'Bitbucket',
        description: 'Bitbucket app password / access token'
    }
};

export const providerIds = Object.keys(TOKEN_PROVIDERS);

/**
 * @param {{ envVar?: string, envVars?: string[] }} meta
 * @returns {{ value: string | undefined, resolvedEnvVar: string | undefined }}
 */
export function resolveProviderEnv(meta) {
    const names = meta.envVars ?? (meta.envVar ? [meta.envVar] : []);
    for (const name of names) {
        const v = process.env[name];
        if (v !== undefined && String(v).trim() !== '') {
            return { value: v, resolvedEnvVar: name };
        }
    }
    const primary = names[0];
    return { value: undefined, resolvedEnvVar: primary };
}
