import { createApplication } from "./app.js";
const { server, store } = createApplication();
const port = Number(process.env.PORT || 3001);
server.listen(port, process.env.HOST || "0.0.0.0", () =>
  console.log(`Game server đang chạy trên cổng ${port}.`),
);
function stop() {
  server.close(() => {
    store.db.close();
    process.exit(0);
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
