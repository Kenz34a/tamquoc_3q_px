export async function api(path, { method = "GET", body, signal } = {}, csrf) {
  const response = await fetch(path, {
    method,
    signal,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Không kết nối được máy chủ. Hãy chạy npm run dev hoặc npm start.",
    );
  }
  if (!response.ok) {
    const error = new Error(data.error || "Yêu cầu không thành công.");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
