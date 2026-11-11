// Launcher "full studido": mở canvas (Electron). Canvas tự mở Voice Studio khi biến VOICESTUDIO_EXE trỏ đúng file cài đặt.
// Build: launcher\build.bat   ->   full studido.exe (đặt ở thư mục gốc repo, cạnh canvas\ và edit\)
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

static class FullStudio
{
    [STAThread]
    static int Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string desktop = Path.Combine(root, "canvas", "desktop");
        string electron = Path.Combine(desktop, "node_modules", "electron", "dist", "electron.exe");
        string local = Environment.GetEnvironmentVariable("LOCALAPPDATA") ?? "";
        string voice = Environment.GetEnvironmentVariable("VOICESTUDIO_EXE");
        if (string.IsNullOrEmpty(voice)) voice = Path.Combine(local, "Programs", "VoiceStudio", "VoiceStudio.exe");

        if (!File.Exists(electron))
        {
            MessageBox.Show("Không tìm thấy Electron của canvas:\n" + electron + "\n\nChạy: npm --prefix canvas/desktop install",
                "full studido", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
        if (!File.Exists(web(root)))
        {
            MessageBox.Show("Canvas chưa được build:\n" + web(root) + "\n\nChạy: npm --prefix canvas/app/web run build",
                "full studido", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
        if (!File.Exists(voice))
            MessageBox.Show("Không thấy Voice Studio ở:\n" + voice + "\n\nCanvas vẫn mở, nhưng sẽ không có giọng đọc.",
                "full studido", MessageBoxButtons.OK, MessageBoxIcon.Warning);

        var psi = new ProcessStartInfo(electron, ".")
        {
            WorkingDirectory = desktop,
            UseShellExecute = false,
        };
        psi.EnvironmentVariables["VOICESTUDIO_EXE"] = voice;
        Process.Start(psi);
        return 0;
    }

    static string web(string root) { return Path.Combine(root, "canvas", "app", "web", "dist", "index.html"); }
}
