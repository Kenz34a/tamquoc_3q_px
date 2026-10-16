import { createInterface } from "node:readline/promises";
import { openStore, passwordHash } from "../server/store.js";
import { credentials } from "../server/validation.js";

async function hidden(prompt) {
  if (!process.stdin.isTTY)
    throw new Error(
      "Hãy chạy lệnh trong terminal tương tác để nhập mật khẩu an toàn.",
    );
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (data) => {
      for (const char of data.toString()) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Đã hủy."));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (char === "\u007f") {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (char >= " " && value.length < 128) {
          value += char;
          process.stdout.write("*");
        }
      }
    };
    function cleanup() {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    }
    process.stdin.on("data", onData);
  });
}
const store = openStore();
try {
  const reader = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const username =
    process.argv.slice(2).find((arg) => !arg.startsWith("--")) ||
    (await reader.question("Tên đăng nhập admin: "));
  reader.close();
  const password = await hidden("Mật khẩu (ít nhất 12 ký tự): ");
  const confirmation = await hidden("Nhập lại mật khẩu: ");
  if (password !== confirmation) throw new Error("Hai mật khẩu không khớp.");
  credentials({ username, password });
  if (process.argv.includes("--reset-password")) {
    const row = store.db
      .prepare("SELECT id FROM accounts WHERE username=? AND role='admin'")
      .get(username);
    if (!row) throw new Error("Không tìm thấy admin.");
    store.transaction(() => {
      store.db
        .prepare("UPDATE accounts SET password_hash=? WHERE id=?")
        .run(passwordHash(password), row.id);
      store.db.prepare("DELETE FROM sessions WHERE account_id=?").run(row.id);
      store.audit("server-console", "admin.password.reset", row.id);
    });
    console.log("Đã đổi mật khẩu và đăng xuất các phiên quản trị cũ.");
  } else {
    store.createAccount({ username, password }, "admin");
    console.log("Đã tạo tài khoản quản trị. Mở /admin để đăng nhập.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  store.db.close();
}
