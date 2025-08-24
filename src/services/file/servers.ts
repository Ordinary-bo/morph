import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { createFile, FILE, getConfigDir } from "../utils";

export type ServerConfig = {
  /** 协议类型，例如 'trojan' 或 'ss' */
  protocol: string;
  /** 类型，通常为大写的协议名称 */
  type: string;
  /** 服务器地址或域名 */
  server: string;
  /** 服务器端口 */
  port: number;
  /** 登录密码 */
  password: string;
  /** 服务器名称或备注 */
  name: string;
  /** 加密方式，例如 SS 的加密方法或 Trojan 固定为 'none' */
  encryption: string;
  /** 可选额外参数，通常用于 Trojan */
  params?: Record<string, string>;
};

const DEFAULT_SERVERS: ServerConfig[] = [];

export const createServersFile = async () => {
  await createFile(FILE.serversJson, DEFAULT_SERVERS);
};
/**
 * 获取当前服务器列表
 */
export const getServers = async (): Promise<ServerConfig[]> => {
  const path = await getConfigDir(FILE.serversJson);
  const data = await readTextFile(path);
  const parsed = JSON.parse(data) as ServerConfig[];
  return parsed;
};

/**
 * 新增服务器
 */
export const addServer = async (server: ServerConfig): Promise<void> => {
  const path = await getConfigDir(FILE.serversJson);
  const servers = await getServers();

  if (
    !servers.find(
      (s) =>
        s.name === server.name ||
        (s.server === server.server && s.port === server.port)
    )
  ) {
    servers.push({ ...server });
  }

  await writeTextFile(path, JSON.stringify(servers, null, 2));
};

/**
 * 批量新增服务器
 * @param newServers 待新增的服务器数组
 */
export const addServersBatch = async (
  newServers: ServerConfig[]
): Promise<void> => {
  const path = await getConfigDir(FILE.serversJson);
  const servers = await getServers();

  // 过滤掉已经存在的服务器（通过 name 或 host+port）
  const filtered = newServers.filter(
    (ns) =>
      !servers.find(
        (s) =>
          s.name === ns.name || (s.server === ns.server && s.port === ns.port)
      )
  );

  if (filtered.length > 0) {
    servers.push(...filtered);
    await writeTextFile(path, JSON.stringify(servers, null, 2));
  }
};

/**
 * 删除服务器
 */
export const removeServer = async (name: string): Promise<void> => {
  const path = await getConfigDir(FILE.serversJson);
  const servers = await getServers();

  const updated = servers.filter((s) => s.name !== name);
  await writeTextFile(path, JSON.stringify(updated, null, 2));
};

/**
 * 修改服务器
 */
export const updateServer = async (
  name: string,
  updated: Partial<ServerConfig>
): Promise<void> => {
  const path = await getConfigDir(FILE.serversJson);
  const servers = await getServers();

  const newServers = servers.map((s) =>
    s.name === name ? { ...s, ...updated } : s
  );
  await writeTextFile(path, JSON.stringify(newServers, null, 2));
};
