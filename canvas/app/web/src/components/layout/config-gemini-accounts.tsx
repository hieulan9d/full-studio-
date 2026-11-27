import { App, Button, Input, Tag } from "antd";
import { LogIn, Plus, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type GeminiState = { accounts: { id: string; name: string; email: string; loggedIn: boolean | null; active: boolean }[] };
type GeminiApi = {
    accounts: () => Promise<GeminiState>;
    check: () => Promise<GeminiState>;
    add: () => Promise<GeminiState>;
    open: (id: string) => Promise<GeminiState>;
    use: (id: string) => Promise<GeminiState>;
    rename: (id: string, name: string) => Promise<GeminiState>;
    remove: (id: string) => Promise<GeminiState>;
};
const gemini = (window as unknown as { desktop?: { gemini?: GeminiApi } }).desktop?.gemini;

/** Chỉ có trong app desktop: thêm tài khoản Gemini web, mỗi tài khoản một profile trình duyệt được giữ lại. */
export function ConfigGeminiAccounts({ active }: { active: boolean }) {
    const { modal, message } = App.useApp();
    const { t } = useTranslation();
    const [state, setState] = useState<GeminiState | null>(null);
    const [busy, setBusy] = useState("");

    const run = useCallback(
        async (key: string, action: () => Promise<GeminiState>) => {
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
        if (active && gemini) void run("check", gemini.accounts);
    }, [active, run]);

    if (!gemini) return null;

    return (
        <div className="space-y-3">
            <section className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{t("config.gemini.title")}</div>
                    <div className="mt-1 text-xs text-stone-500">{t("config.gemini.description")}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                    <Button icon={<RefreshCw className="size-4" />} loading={busy === "check"} disabled={!!busy} onClick={() => void run("check", gemini.check)}>
                        {t("config.gemini.check")}
                    </Button>
                    <Button type="primary" icon={<Plus className="size-4" />} loading={busy === "add"} disabled={!!busy} onClick={() => void run("add", gemini.add)}>
                        {t("config.gemini.add")}
                    </Button>
                </div>
            </section>
            {state?.accounts.map((account) => (
                <section key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Input key={account.name} className="max-w-72" defaultValue={account.name} onBlur={(event) => event.target.value.trim() && event.target.value !== account.name && void run("rename", () => gemini.rename(account.id, event.target.value))} />
                            {account.active ? <Tag color="green">{t("config.gemini.active")}</Tag> : null}
                            <Tag color={account.loggedIn ? "blue" : "orange"}>{t(`config.gemini.${account.loggedIn == null ? "unknown" : account.loggedIn ? "loggedIn" : "loggedOut"}`)}</Tag>
                        </div>
                        {account.email && account.email !== account.name ? <div className="mt-1 text-xs text-stone-500">{account.email}</div> : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                        {!account.active ? (
                            <Button icon={<UserCheck className="size-4" />} disabled={!!busy} onClick={() => void run("use", () => gemini.use(account.id))}>
                                {t("config.gemini.use")}
                            </Button>
                        ) : null}
                        <Button icon={<LogIn className="size-4" />} loading={busy === "open-" + account.id} disabled={!!busy} onClick={() => void run("open-" + account.id, () => gemini.open(account.id))}>
                            {t("config.gemini.open")}
                        </Button>
                        <Button danger icon={<Trash2 className="size-4" />} disabled={!!busy} onClick={() => modal.confirm({ title: t("config.gemini.remove"), content: t("config.gemini.confirmRemove"), onOk: () => run("remove", () => gemini.remove(account.id)) })}>
                            {t("config.gemini.remove")}
                        </Button>
                    </div>
                </section>
            ))}
        </div>
    );
}
