export function getTagColor(type: string): string {
  switch (type.toLowerCase()) {
    case "ss":
      return "purple"; // Shadowsocks
    case "trojan":
      return "red"; // Trojan
    case "v2ray":
      return "green"; // V2Ray
    case "socks":
      return "orange"; // SOCKS
    case "origin":
      return "cyan"; // 直连/Origin
    default:
      return "blue"; // 默认颜色
  }
}
export function getLatencyColor(latency?: number): string {
  if (latency == null || latency < 0) return "gray";
  if (latency < 100) return "green";
  if (latency < 200) return "yellow";
  return "red";
}
