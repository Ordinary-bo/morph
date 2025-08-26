export type Server = {
  id: string;
  name: string;
  server: string;
  type: string;
};

export type LatencyMessage = {
  id: string;
  latency: number;
};

self.onmessage = async (event: MessageEvent<Server[]>) => {
  const servers = event.data;

  // 并行测速
  servers.forEach(async (server) => {
    const start = Date.now();
    try {
      // HEAD 请求测试延迟
      await fetch(`http://${server.server}`, { method: "HEAD", mode: "no-cors" });
      const latency = Date.now() - start;
      const msg: LatencyMessage = { id: server.id, latency };
      self.postMessage(msg);
    } catch (e) {
      const msg: LatencyMessage = { id: server.id, latency: -1 }; // -1 表示请求失败
      self.postMessage(msg);
    }
  });
};
