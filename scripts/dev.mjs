import { createServer } from "vite";
import { createApplication } from "../server/app.js";
const args = process.argv.slice(2);
const index = args.indexOf("--port");
const { server, store } = createApplication();
const apiPort = Number(process.env.API_PORT || 3001);
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(apiPort, "127.0.0.1", resolve);
});
const vite = await createServer({
  server: {
    host: "0.0.0.0",
    port: index >= 0 ? Number(args[index + 1]) : 5173,
    strictPort: true,
  },
});
await vite.listen();
vite.printUrls();
console.log(`API sẵn sàng trên cổng ${apiPort}. Trang quản trị: /admin`);
async function stop() {
  await vite.close();
  server.close(() => {
    store.db.close();
    process.exit(0);
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
