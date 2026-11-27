// Tạo nhiều video một lượt: mỗi tài khoản một cửa sổ Brave, chạy song song. Dành cho AI agent.
//
//   node ai-batch.js jobs.json --source gemini|flow [--parallel 3]
//   jobs.json: [{ "name": "slug_c01", "prompt": "..." | "promptFile": "c01.txt", "images": ["a.png"], "aspect": "9:16", "seconds": 6 }]
//
// Tài khoản hết lượt/điểm: dừng tài khoản đó, việc chuyển sang tài khoản khác.
// Captcha, "hoạt động bất thường", đòi đăng nhập: dừng tài khoản đó, KHÔNG gửi lại việc đó (để người dùng xem).
// Bị chặn vì prompt/ảnh: đánh dấu "sua-prompt" để agent sửa rồi chạy lại việc đó.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const FLAGGED = /captcha|unusual activity|hoạt động bất thường|Cần đăng nhập|accounts\.google|xác minh|Chưa chọn project/i;
const QUOTA = /hết hạn mức|hết lượt|không đủ điểm|Không còn tài khoản Gemini/i;
const PROMPT = /vi phạm|policy|chính sách|từ chối/i;
const classify = (code, log) => (code === 0 ? "xong" : FLAGGED.test(log) ? "bi-chan" : QUOTA.test(log) ? "het-luot" : PROMPT.test(log) ? "sua-prompt" : "loi");

// run(job, account) -> { code, log }. Mỗi tài khoản là một luồng, lấy việc từ hàng đợi chung.
async function runBatch({ jobs, accounts, run, parallel = accounts.length, log = console.error }) {
  const queue = jobs.map((job, i) => ({ job, i }));
  const results = jobs.map((job) => ({ name: job.name, status: "chua-chay" }));
  const idle = accounts.slice();
  let running = 0;
  await new Promise((done) => {
    const pump = () => {
      while (running < parallel && idle.length && queue.length) {
        const account = idle.shift(), item = queue.shift();
        running++;
        log(`[batch] ${item.job.name} -> ${account.name}`);
        run(item.job, account).catch((e) => ({ code: 1, log: String(e.message || e) })).then(({ code, log: out }) => {
          running--;
          const status = classify(code, out);
          results[item.i] = { name: item.job.name, status, account: account.name, detail: out.trim().split("\n").slice(-3).join(" | ") };
          log(`[batch] ${item.job.name}: ${status}`);
          if (status === "het-luot") queue.unshift(item); // việc chưa tạo được: tài khoản khác làm
          else if (status !== "bi-chan") idle.push(account);
          pump();
        });
      }
      if (!running && (!queue.length || !idle.length)) done();
    };
    pump();
  });
  return results;
}

module.exports = { runBatch, classify };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = (flag, fallback) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : fallback);
  const source = opt("--source");
  if (!argv[0] || !["gemini", "flow"].includes(source)) throw new Error("Cách dùng: node ai-batch.js jobs.json --source gemini|flow [--parallel N]");
  const base = path.dirname(path.resolve(argv[0]));
  const jobs = JSON.parse(fs.readFileSync(argv[0], "utf8").replace(/^\uFEFF/, ""));
  const dataDir = process.env.FLOW_DATA || "D:\\infiniti canvas";
  let config = { accounts: [] };
  try { config = JSON.parse(fs.readFileSync(path.join(dataDir, source + "-driver.json"), "utf8")); } catch {}
  const today = new Date().toDateString();
  const accounts = config.accounts.filter((a) => (source === "gemini" ? a.loggedIn !== false && a.limitedDay !== today : a.projectId));
  if (!accounts.length) throw new Error(`Không có tài khoản ${source} dùng được. Đăng nhập trong canvas (Cài đặt) trước.`);

  const run = (job, account) => new Promise((resolve) => {
    const args = source === "gemini" ? ["gemini-driver.js", "--make-video"] : ["flow-cli.js"];
    args[0] = path.join(__dirname, args[0]);
    args.push("--name", job.name, "--aspect", job.aspect || "9:16");
    if (job.promptFile) args.push("--prompt-file", path.resolve(base, job.promptFile));
    else args.push("--prompt", job.prompt || "");
    for (const image of job.images || []) args.push("--image", path.resolve(base, image));
    if (source === "flow" && job.seconds) args.push("--seconds", String(job.seconds));
    const env = { ...process.env, [source === "gemini" ? "GEMINI_ACCOUNT" : "FLOW_ACCOUNT"]: account.id };
    const child = spawn(process.execPath, args, { env });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, log: out }));
  });

  runBatch({ jobs, accounts, run, parallel: Number(opt("--parallel", "3")) }).then((results) => {
    console.log(JSON.stringify(results, null, 1));
    if (results.some((r) => r.status !== "xong")) process.exitCode = 1;
  });
}
