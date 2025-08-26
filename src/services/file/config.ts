import { createFile, FILE } from "../utils";

const DEFAULT_CONFIG = {
  log: {
    level: "info", // 日志级别，可选 trace/debug/info/warn/error
  },
  inbounds: [
    {
      type: "socks",
      listen: "0.0.0.0", // 如果 allowLAN=true，就监听 0.0.0.0，否则 127.0.0.1
      listen_port: 1081, // socksPort
      sniff: true, // sniff 开启可自动识别流量
    },
    {
      type: "http",
      listen: "0.0.0.0",
      listen_port: 1080, // httpPort
    },
  ],
  outbounds: [
    {
      type: "direct", // 默认直连，可换成代理服务器
      tag: "DIRECT",
    },
    {
      type: "block", // 阻止访问的出口
      tag: "BLOCK",
    },
  ],
  route: {
    auto_detect_interface: true,
    rules: [
      // 这里可以接 PAC 或订阅规则
      // 比如 { "rule_set": "proxy.pac", "outbound": "代理节点" }
    ],
    final: "DIRECT", // globalMode=http 时，可以改成代理节点 tag
  },
};

export const createConfigFile = async () => {
  await createFile(FILE.configJson, DEFAULT_CONFIG);
};
