import { Base64 } from "js-base64";
import { ServerConfig } from "../../services/file/servers";

/**
 * 表示一个 Trojan 类型的服务器配置
 */
type TrojanServer = {
  /** 唯一标识符，通常用于前端显示和管理 */
  id: string;
  /** 服务器类型，固定为 'trojan' */
  type: "trojan";
  /** 登录密码 */
  password: string;
  /** 服务器地址或域名 */
  host: string;
  /** 服务器端口 */
  port: number;
  /** 额外参数，例如 allowInsecure 等 */
  params: Record<string, string>;
  /** 备注或名称 */
  remark: string;
};

/**
 * 表示一个 Shadowsocks (SS) 类型的服务器配置
 */
type SSServer = {
  /** 唯一标识符，通常用于前端显示和管理 */
  id: string;
  /** 服务器类型，固定为 'ss' */
  type: "ss";
  /** 加密方法，例如 aes-128-gcm */
  method: string;
  /** 登录密码 */
  password: string;
  /** 服务器地址或域名 */
  host: string;
  /** 服务器端口 */
  port: number;
  /** 备注或名称 */
  remark: string;
};

/**
 * 通用服务器配置对象，用于前端或程序统一处理不同协议的服务器
 */

export function parseSubscription(
  rawData: string
): Array<TrojanServer | SSServer> {
  const lines = Base64.decode(rawData)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const servers: Array<TrojanServer | SSServer> = [];

  for (const line of lines) {
    try {
      if (line.startsWith("trojan://")) {
        const trojanRegex = /^trojan:\/\/([^@]+)@([^:]+):(\d+)(\?[^#]+)?#(.+)$/;
        const match = line.match(trojanRegex);
        if (match) {
          const [, password, host, port, paramsStr, remark] = match;
          const params: Record<string, string> = {};
          if (paramsStr) {
            const searchParams = new URLSearchParams(paramsStr);
            searchParams.forEach((value, key) => {
              params[key] = value;
            });
          }
          servers.push({
            id: crypto.randomUUID(), // 生成唯一 ID
            type: "trojan",
            password,
            host,
            port: Number(port),
            params,
            remark: decodeURIComponent(remark),
          });
        }
      } else if (line.startsWith("ss://")) {
        const ssRegex = /^ss:\/\/([^@]+)@([^:]+):(\d+)#(.+)$/;
        const match = line.match(ssRegex);
        if (match) {
          const [_, encoded, host, port, remark] = match;
          const decoded = Base64.decode(encoded); // 使用 js-base64
          const [method, password] = decoded.split(":");
          servers.push({
            id: crypto.randomUUID(), // 生成唯一 ID
            type: "ss",
            method,
            password,
            host,
            port: Number(port),
            remark: decodeURIComponent(remark),
          });
        }
      }
    } catch (err) {
      console.warn("解析失败行:", line, err);
    }
  }

  return servers;
}

export function transformToConfig(
  servers: Array<TrojanServer | SSServer>
): ServerConfig[] {
  return servers.map((server) => {
    if (server.type === "trojan") {
      return {
        id: server.id,
        type: server.type.toLocaleLowerCase(),
        server: server.host,
        port: server.port,
        password: server.password,
        name: server.remark,
        encryption: "none",
        params: server.params,
      };
    } else if (server.type === "ss") {
      return {
        id: server.id,
        type: server.type.toLocaleLowerCase(),
        server: server.host,
        port: server.port,
        password: server.password,
        name: server.remark,
        encryption: server.method,
      };
    }
    return {} as ServerConfig;
  });
}
