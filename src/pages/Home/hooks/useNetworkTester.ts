import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { App } from "antd";

import { Node } from "../NodeList";
import { useHomeStore, homeStore } from "../../../store/homeStore";
import { TEST_URLS } from "../const";



export function useNetworkTester() {
  const { message } = App.useApp();
  const { isRunning } = useHomeStore();
  const [isTesting, setIsTesting] = useState(false);
  const [testUrl, setTestUrl] = useState(TEST_URLS[0].value);
  const [urlDelay, setUrlDelay] = useState<number | null>(null);

  // 批量 TCP 测速
  const runBatchTcpPing = async (nodes: Node[]) => {
    if (nodes.length === 0) return;
    setIsTesting(true);
    message.loading({ content: "正在检测节点延迟...", key: "test" });
    homeStore.setLatencies({});

    const CONCURRENCY_LIMIT = 10;
    let index = 0;
    
    // 递归执行器
    const runBatch = async () => {
      const promises = [];
      while (index < nodes.length && promises.length < CONCURRENCY_LIMIT) {
        const node = nodes[index];
        index++;
        const p = (async () => {
          try {
            const ms = await invoke<number>("tcp_ping", { address: node.address, port: node.port });
            homeStore.updateLatency(node.id, ms);
          } catch (e) {
            homeStore.updateLatency(node.id, -1);
          }
        })();
        promises.push(p);
      }
      if (promises.length > 0) {
        await Promise.all(promises);
        if (index < nodes.length) await runBatch();
      }
    };

    await runBatch();
    setIsTesting(false);
    homeStore.setSortType("latency");
    message.success({ content: "测速完成", key: "test" });
  };

  // URL HTTP 测速
  const runHttpConnectivityTest = async () => {
    if (!isRunning) return message.warning("请先启动代理");
    
    const targetLabel = TEST_URLS.find((u) => u.value === testUrl)?.label;
    message.loading({ content: `测试 ${targetLabel}...`, key: "urltest" });
    setUrlDelay(null);

    try {
      const settings: any = await invoke("get_settings");
      const currentPort = settings.mixed_port || 2080;
      const localProxy = `http://127.0.0.1:${currentPort}`;
      const ms = await invoke<number>("http_ping", { url: testUrl, proxyUrl: localProxy });
      if (ms === -1) throw new Error("Timeout");
      setUrlDelay(ms);
      message.success({ content: `${targetLabel}: ${ms}ms`, key: "urltest" });
    } catch (e) {
      setUrlDelay(-1);
      message.error({ content: "连接失败", key: "urltest" });
    }
  };

  const clearUrlDelay = () => setUrlDelay(null);

  return {
    isTesting,
    testUrl,
    setTestUrl,
    urlDelay,
    clearUrlDelay,
    runBatchTcpPing,
    runHttpConnectivityTest,
    currentTestUrlObj: TEST_URLS.find((u) => u.value === testUrl)
  };
}