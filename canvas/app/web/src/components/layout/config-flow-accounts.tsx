import { App, Button, Input, InputNumber, Tag } from "antd";
import { LogIn, Plus, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type FlowAccount = { id: string; name: string; email: string; credits: number | null; active: boolean; hasProject: boolean };
type FlowState = { minCredits: { image: number; video: number }; accounts: FlowAccount[] };
type FlowApi = {
    accounts: () => Promise<FlowState>;
    switchAccount: (id: string) => Promise<FlowState>;
    addAccount: () => Promise<FlowState>;
    removeAccount: (id: string) => Promise<FlowState>;
    renameAccount: (id: string, name: string) => Promise<FlowState>;
    openAccount: (id: string) => Promise<FlowState>;
    refreshCredits: () => Promise<FlowState>;
    setMinCredits: (n: number) => Promise<FlowState>;
};
const flow = (window as unknown as { desktop?: { flow?: FlowApi } }).desktop?.flow;

/** Chỉ có trong app desktop: quản lý nhiều tài khoản Google Flow, xem điểm còn lại, tự đổi khi hết điểm. */
export function ConfigFlowAccounts({ active }: { active: boolean }) {
    const { modal, message } = App.useApp();
    const { t } = useTranslation();
    const [state, setState] = useState<FlowState | null>(null);
    const [busy, setBusy] = useState("");

    const run = useCallback(
        async (key: string, action: () => Promise<FlowState>) => {
            setBusy(key);
            try {
                setState(await action());
            } catch (reason) {
                void message.error(reason instanceof Error ? reason.message : String(reason));
            } finally {
                setBusy("");
            }
        },
        [message],
    );

    useEffect(() => {
        if (active && flow) void run("load", flow.accounts);
    }, [active, run]);

    if (!flow) return <div className="text-sm text-stone-500">{t("config.flow.desktopOnly")}</div>;

    return (
        <div className="space-y-3">
            <section className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-sm font-semibold">{t("config.flow.title")}</div>
                        <div className="mt-1 text-xs text-stone-500">{t("config.flow.description")}</div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Button icon={<RefreshCw className="size-4" />} loading={busy === "refresh"} disabled={!!busy && busy !== "refresh"} onClick={() => void run("refresh", flow.refreshCredits)}>
                            {t("config.flow.refresh")}
                        </Button>
                        <Button type="primary" icon={<Plus className="size-4" />} loading={busy === "add"} disabled={!!busy && busy !== "add"} onClick={() => void run("add", flow.addAccount)}>
                            {t("config.flow.add")}
                        </Button>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm">{t("config.flow.minCredits")}</span>
                    <InputNumber
                        min={0}
                        value={state?.minCredits.video ?? 50}
                        onChange={(value) => setState((prev) => (prev ? { ...prev, minCredits: { image: Number(value) || 0, video: Number(value) || 0 } } : prev))}
                        onBlur={() => state && void run("min", () => flow.setMinCredits(state.minCredits.video))}
                    />
                    <span className="text-xs text-stone-500">{t("config.flow.minCreditsHint")}</span>
                </div>
            </section>
            {state?.accounts.map((account) => (
                <section key={account.id} className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Input
                                    key={account.name}
                                    className="max-w-72"
                                    defaultValue={account.name}
                                    onBlur={(event) => event.target.value.trim() && event.target.value !== account.name && void run("rename", () => flow.renameAccount(account.id, event.target.value))}
                                />
                                {account.active ? <Tag color="green">{t("config.flow.active")}</Tag> : null}
                            </div>
                            <div className="mt-1.5 text-sm font-medium tabular-nums">{account.credits != null ? t("config.flow.credits", { count: account.credits }) : t("config.flow.creditsUnknown")}</div>
                            {account.email && account.email !== account.name ? <div className="text-xs text-stone-500">{account.email}</div> : null}
                            {!account.hasProject ? <div className="mt-1 text-xs text-amber-600">{t("config.flow.noProject")}</div> : null}
                        </div>
                        <div className="flex shrink-0 gap-2">
                            {!account.active ? (
                                <Button icon={<UserCheck className="size-4" />} loading={busy === "use-" + account.id} disabled={!!busy && busy !== "use-" + account.id} onClick={() => void run("use-" + account.id, () => flow.switchAccount(account.id))}>
                                    {t("config.flow.use")}
                                </Button>
                            ) : null}
                            <Button icon={<LogIn className="size-4" />} loading={busy === "open-" + account.id} disabled={!!busy && busy !== "open-" + account.id} onClick={() => void run("open-" + account.id, () => flow.openAccount(account.id))}>
                                {t("config.flow.open")}
                            </Button>
                            {state.accounts.length > 1 ? (
                                <Button
                                    danger
                                    icon={<Trash2 className="size-4" />}
                                    disabled={!!busy}
                                    onClick={() => modal.confirm({ title: t("config.flow.remove"), content: t("config.flow.confirmRemove"), onOk: () => run("remove", () => flow.removeAccount(account.id)) })}
                                >
                                    {t("config.flow.remove")}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}
