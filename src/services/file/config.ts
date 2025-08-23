import { createFile, FILE } from "../utils";

const DEFAULT_CONFIG = {
  // 检测服务器间隔时间
  checkInterval: 5000,
  // 允许同时测速的服务器数量
  maxConcurrentTests: 5,
  // socks代理端口
  socksPort: 1081,
  // http代理端口
  httpPort: 1080,
  // pac端口
  pacPort: 1082,
  // pac代理模式 http | socks5/socks4/http
  pacMode: "http",
  // 日志级别
  globalMode: "http", // socks4 | http
  // 是否允许局域网
  allowLAN: true,
  // 是否开启自启
  autoStart: false,
};

export const createConfigFile = async () => {
  await createFile(FILE.configJson, DEFAULT_CONFIG);
};
