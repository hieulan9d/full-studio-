import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { App, Tooltip } from "antd";

import { canvasThemes } from "@/lib/canvas-theme";
import { DEFAULT_LOCAL_PROXY_URL, normalizeLocalProxyUrl, useConfigStore } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";

const FLOWKIT_URL = "http://127.0.0.1:8100";

/** Round button: reloads the FlowKit extension and the Flow tab, e.g. after switching Google account. */
export function FlowkitReloadButton() {
    const { message } = App.useApp();
    const [busy, setBusy] = useState(false);
    const proxyUrl = useConfigStore((state) => state.config.proxyUrl);
    const colorTheme = useThemeStore((state) => state.theme);
    const theme = canvasThemes[colorTheme];
    const title = "Tải lại extension FlowKit (dùng sau khi đổi tài khoản Google)";

    const call = (path: string) => fetch(`${normalizeLocalProxyUrl(proxyUrl) || DEFAULT_LOCAL_PROXY_URL}/${FLOWKIT_URL}${path}`, { method: "POST" });

    const reload = async () => {
        if (busy) return;
        setBusy(true);
        try {
            // Flow tab first: reloading the extension drops the link to FlowKit for a moment.
            const tabs = await call("/api/ext/reload-flow-tab");
            if (!tabs.ok) throw new Error(`FlowKit ${tabs.status}`);
            const ext = await call("/api/ext/reload");
            if (!ext.ok) throw new Error(`FlowKit ${ext.status}`);
            message.success("Đã tải lại extension FlowKit và tab Flow. Đợi vài giây để kết nối lại.");
        } catch (error) {
            message.error(`Không tải lại được FlowKit: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Tooltip title={title}>
            <button
                type="button"
                className="flex size-14 shrink-0 items-center justify-center rounded-full border shadow-lg backdrop-blur"
                style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.toolbar.item }}
                onClick={reload}
                disabled={busy}
                aria-label={title}
            >
                <RefreshCw className={`size-5 ${busy ? "animate-spin" : ""}`} />
            </button>
        </Tooltip>
    );
}
