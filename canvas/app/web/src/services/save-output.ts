import { modelOptionName } from "@/stores/use-config-store";

type Desktop = { saveOutput?: (data: ArrayBuffer, name: string, mime: string) => Promise<string> };

/** App desktop: chép mỗi ảnh/video vừa tạo vào thư mục xuất chung. Lỗi lưu không làm hỏng lần tạo. */
export async function saveToOutput(source: string, model: string) {
    const desktop = (window as unknown as { desktop?: Desktop }).desktop;
    if (!desktop?.saveOutput || !source) return;
    try {
        const stamp = new Date().toLocaleString("sv-SE").replace(/[-:]/g, "").replace(" ", "-");
        const blob = await (await fetch(source)).blob();
        await desktop.saveOutput(await blob.arrayBuffer(), `${stamp}_${modelOptionName(model) || "canvas"}`, blob.type);
    } catch (error) {
        console.warn("Không lưu được vào thư mục xuất:", error);
    }
}
