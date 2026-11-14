import { saveAs } from "file-saver";

import i18n from "@/i18n";
import { useConfigStore, type AiConfig, type ModelChannel, type WebdavSyncConfig } from "@/stores/use-config-store";
import { usePromptSourceStore, type PromptSourceSchedule } from "@/stores/use-prompt-source-store";
import type { PromptSource } from "@/services/api/prompt-source-presets";

type AppConfigFile = {
    app: "infinite-canvas";
    version: 1;
    exportedAt: string;
    config: AiConfig;
    webdav: WebdavSyncConfig;
    promptSources: {
        sources: PromptSource[];
        schedule: PromptSourceSchedule;
    };
};

export function exportAppConfig() {
    const { config, webdav } = useConfigStore.getState();
    const { sources, schedule } = usePromptSourceStore.getState();
    const data: AppConfigFile = { app: "infinite-canvas", version: 1, exportedAt: new Date().toISOString(), config, webdav, promptSources: { sources, schedule } };
    saveAs(new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }), "infinite-canvas-config.json");
}

export async function importAppConfig(file: File) {
    let data: AppConfigFile;
    try {
        data = JSON.parse(await file.text()) as AppConfigFile;
    } catch {
        throw new Error(i18n.t("config.invalidFile"));
    }
    if (data.app !== "infinite-canvas" || data.version !== 1 || !data.config || !data.webdav || !data.promptSources) throw new Error(i18n.t("config.invalidFile"));
    // Gộp, không ghi đè: giữ nhà cung cấp/cài đặt đang có, chỉ thêm hoặc cập nhật phần trong file nhập.
    const current = useConfigStore.getState().config;
    useConfigStore.setState({ config: mergeConfig(current, data.config) });
    const currentSources = usePromptSourceStore.getState();
    usePromptSourceStore.setState({ sources: mergeById(currentSources.sources, data.promptSources.sources || []) });
}

function sameUrl(a: string, b: string) {
    const norm = (value: string) => (value || "").trim().replace(/\/+$/, "").toLowerCase();
    return Boolean(norm(a)) && norm(a) === norm(b);
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
    const next = [...existing];
    for (const item of incoming) if (!next.some((x) => x.id === item.id)) next.push(item);
    return next;
}

function mergeChannel(existing: ModelChannel, incoming: ModelChannel): ModelChannel {
    const models = [...existing.models];
    for (const model of incoming.models || []) {
        const index = models.findIndex((m) => m.name === model.name);
        if (index >= 0) models[index] = { ...models[index], ...model };
        else models.push(model);
    }
    // Khóa API: file nhập để trống thì giữ khóa đang có.
    return { ...existing, ...incoming, id: existing.id, apiKey: incoming.apiKey?.trim() ? incoming.apiKey : existing.apiKey, models };
}

function mergeConfig(current: AiConfig, incoming: AiConfig): AiConfig {
    const channels = [...current.channels];
    for (const channel of incoming.channels || []) {
        const index = channels.findIndex((c) => c.id === channel.id || sameUrl(c.baseUrl, channel.baseUrl));
        if (index >= 0) channels[index] = mergeChannel(channels[index], channel);
        else channels.push(channel);
    }
    // Các cài đặt khác (model mặc định, giọng, ...): giữ giá trị đang có, chỉ bổ sung chỗ còn trống.
    const filled: Record<string, unknown> = { ...incoming };
    for (const [key, value] of Object.entries(current)) if (value !== undefined && value !== null && value !== "") filled[key] = value;
    return { ...(filled as AiConfig), channels };
}
