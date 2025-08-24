import { ClientOptions, fetch } from "@tauri-apps/plugin-http";

type RequestOptions = RequestInit & ClientOptions;

async function request<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  
  const contentType = response.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  } else if (contentType.includes("text/")) {
    return response.text() as unknown as T;
  } else {
    return response.blob() as unknown as T;
  }
}

export default request;
