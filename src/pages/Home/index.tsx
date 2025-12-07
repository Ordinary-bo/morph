import React, { useEffect, useMemo, useState } from "react";
import { Segmented, Button, Dropdown, Space, App, Tag } from "antd";
import {
  PoweroffOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  SortAscendingOutlined,
  SignalFilled,
  DownOutlined,
  GoogleOutlined,
  YoutubeOutlined,
  BugOutlined,
} from "@ant-design/icons";
import { invoke } from "@tauri-apps/api/core";
import { homeStore, useHomeStore, SortType } from "../../store/homeStore";
import NodeList, { Node } from "./NodeList";
import { listen } from "@tauri-apps/api/event";

interface Subscription {
  url: string;
  name: string;
  enabled: boolean;
  nodes: Node[];
}

// 1. 定义测速目标配置
const TEST_URLS = [
  {
    label: "Google",
    value: "https://www.google.com/generate_204",
    icon: <GoogleOutlined />,
  },
  {
    label: "YouTube",
    value: "https://www.youtube.com/generate_204",
    icon: <YoutubeOutlined />,
  },
  { label: "Github", value: "https://github.com", icon: <BugOutlined /> },
  { label: "Baidu", value: "https://www.baidu.com", icon: <GlobalOutlined /> },
];

const HomePage: React.FC = () => {
  // 从 store 获取全局状态
  const { isRunning, latencies, sortType } = useHomeStore();

  // --- 本地状态 ---
  const [nodes, setNodes] = useState<Node[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("Rule");
  const [isTesting, setIsTesting] = useState(false);

  // ✅ 记录当前选择的测速 URL 和结果
  const [testUrl, setTestUrl] = useState(TEST_URLS[0].value);
  const [urlDelay, setUrlDelay] = useState<number | null>(null);

  const { message } = App.useApp();

  // 加载本地节点
  const loadLocalNodes = async () => {
    try {
      const subs = await invoke<Subscription[]>("get_subscriptions");
      const activeNodes = subs
        .filter((sub) => sub.enabled)
        .flatMap((sub) => sub.nodes);
      setNodes(activeNodes);
      if (!selectedNodeId && activeNodes.length > 0) {
        setSelectedNodeId(activeNodes[0].id);
      }
    } catch (e) {
      message.error("无法读取节点列表");
    }
  };

  useEffect(() => {
    loadLocalNodes();
  }, []);

  // 监听后端意外退出
  useEffect(() => {
    let unlisten: () => void;
    const setupListener = async () => {
      unlisten = await listen("singbox-stopped", (event) => {
        console.warn("Singbox backend stopped:", event.payload);
        if (homeStore.getSnapshot().isRunning) {
          homeStore.setIsRunning(false);
          message.error("核心进程意外退出，请检查日志");
        }
      });
    };
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // 排序逻辑
  const sortedNodes = useMemo(() => {
    let list = [...nodes];
    if (sortType === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    } else if (sortType === "latency") {
      list.sort((a, b) => {
        const latA = latencies[a.id];
        const latB = latencies[b.id];
        const valA =
          latA === -1 || latA === undefined ? Number.MAX_SAFE_INTEGER : latA;
        const valB =
          latB === -1 || latB === undefined ? Number.MAX_SAFE_INTEGER : latB;
        return valA - valB;
      });
    }
    return list;
  }, [nodes, latencies, sortType]);

  // 处理模式切换 (热重启)
  const handleModeChange = async (value: string) => {
    setMode(value);
    if (!isRunning) return;
    if (!selectedNodeId) return;

    try {
      message.loading({
        content: `正在切换到 ${value === "Rule" ? "规则" : "全局"}模式...`,
        key: "switch_mode",
      });
      await invoke("stop_singbox");
      await invoke("start_singbox", {
        nodeId: selectedNodeId,
        mode: value,
      });
      homeStore.setIsRunning(true);
      message.success({
        content: `已切换为 ${value === "Rule" ? "规则" : "全局"}模式`,
        key: "switch_mode",
      });
    } catch (e) {
      console.error(e);
      message.error({ content: `切换失败: ${e}`, key: "switch_mode" });
      homeStore.setIsRunning(false);
    }
  };

  // --- 批量 TCP 测速 ---
  const handleSpeedTest = async () => {
    if (nodes.length === 0) return;
    setIsTesting(true);
    message.loading({ content: "正在检测节点物理延迟...", key: "test" });
    homeStore.setLatencies({});

    const CONCURRENCY_LIMIT = 10;
    let index = 0;
    let successCount = 0;

    const runBatch = async () => {
      const promises = [];
      while (index < nodes.length && promises.length < CONCURRENCY_LIMIT) {
        const node = nodes[index];
        index++;
        const p = (async () => {
          try {
            const ms = await invoke<number>("tcp_ping", {
              address: node.address,
              port: node.port,
            });
            homeStore.updateLatency(node.id, ms);
            if (ms !== -1) successCount++;
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
    message.success({
      content: `测速完成，${successCount} 个节点可用`,
      key: "test",
    });
  };

  // ✅ 连通性测试 (真·URL测速)
  const handleUrlConnectivityTest = async () => {
    if (!isRunning) {
      return message.warning("请先启动代理，才能测试 Google/YouTube 连通性");
    }

    const targetLabel = TEST_URLS.find((u) => u.value === testUrl)?.label;
    message.loading({
      content: `正在通过代理访问 ${targetLabel}...`,
      key: "urltest",
    });
    setUrlDelay(null);

    const start = performance.now();
    try {
      await fetch(testUrl, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
      });
      const ms = Math.round(performance.now() - start);
      setUrlDelay(ms);
      message.success({
        content: `${targetLabel} 连接成功: ${ms}ms`,
        key: "urltest",
      });
    } catch (e) {
      setUrlDelay(-1);
      message.error({ content: `${targetLabel} 访问失败`, key: "urltest" });
    }
  };

  const toggleProxy = async () => {
    const currentRunning = homeStore.getSnapshot().isRunning;
    
    // === 情况 1: 用户点击停止 ===
    if (currentRunning) {
      // ✅ 关键修改：先更新 UI 状态，防止监听器误判
      homeStore.setIsRunning(false); 
      setUrlDelay(null); // 重置测速结果

      try {
        message.loading({ content: "正在停止...", key: "process" });
        await invoke("stop_singbox");
        message.success({ content: "代理已停止", key: "process" });
      } catch (e) {
        console.error(e);
        message.error({ content: `停止失败: ${e}`, key: "process" });
        
        // ❌ 如果后端真的停不掉，再把开关变回去（回滚状态）
        homeStore.setIsRunning(true); 
      }
    } 
    // === 情况 2: 用户点击启动 ===
    else {
      if (!selectedNodeId) return message.warning("请先选择一个节点");
      try {
        message.loading({ content: "正在启动核心...", key: "process" });
        await invoke("start_singbox", {
          nodeId: selectedNodeId,
          mode,
        });
        homeStore.setIsRunning(true);
        message.success({ content: "代理已启动", key: "process" });
      } catch (e) {
        console.error(e);
        message.error({ content: `启动失败: ${e}`, key: "process" });
        homeStore.setIsRunning(false);
      }
    }
  };

  const activeNode = nodes.find((n) => n.id === selectedNodeId);
  const currentTestUrlObj = TEST_URLS.find((u) => u.value === testUrl);

  const sortItems = [
    { key: "default", label: "默认排序", icon: <SortAscendingOutlined /> },
    { key: "latency", label: "低延迟优先", icon: <SignalFilled /> },
    { key: "name", label: "名称排序", icon: <SortAscendingOutlined /> },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white px-6 py-4 shadow-sm border-b border-gray-100 relative z-10">
        {/* 置顶卡片 / 启动按钮 */}
        {isRunning && activeNode ? (
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-blue-200 shadow-lg">
                <ThunderboltOutlined style={{ fontSize: 20 }} />
              </div>
              <div>
                <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                  Connected
                </div>
                <div className="text-blue-900 font-bold text-lg">
                  {activeNode.name}
                </div>
              </div>
            </div>

            {/* 显示 URL 测速结果 */}
            {urlDelay !== null && (
              <Tag
                color={urlDelay === -1 ? "error" : "success"}
                className="ml-auto mr-4 text-base px-3 py-1"
              >
                {currentTestUrlObj?.label}:{" "}
                {urlDelay === -1 ? "Timeout" : `${urlDelay}ms`}
              </Tag>
            )}

            <Button
              danger
              type="primary"
              shape="round"
              icon={<PoweroffOutlined />}
              onClick={toggleProxy}
            >
              断开
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 mb-4">
            <div
              onClick={toggleProxy}
              className="w-20 h-20 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-all text-gray-400 hover:text-gray-600 mb-2"
            >
              <PoweroffOutlined className="text-3xl" />
            </div>
            <div className="text-gray-400 text-sm">点击启动代理</div>
          </div>
        )}

        {/* 工具栏 */}
        <div className="flex justify-between items-center mt-2">
          <Segmented
            value={mode}
            onChange={handleModeChange}
            options={[
              { label: "规则", value: "Rule", icon: <GlobalOutlined /> },
              { label: "全局", value: "Global", icon: <ThunderboltOutlined /> },
            ]}
          />
          <Space>
            {/* 测速目标选择 & 连通性测试按钮 */}
            <Dropdown.Button
              onClick={handleUrlConnectivityTest}
              menu={{
                items: TEST_URLS.map((u) => ({
                  key: u.value,
                  label: u.label,
                  icon: u.icon,
                  onClick: () => setTestUrl(u.value),
                })),
                selectedKeys: [testUrl],
              }}
              icon={<DownOutlined />}
            >
              {currentTestUrlObj?.icon}
              <span className="ml-1">{currentTestUrlObj?.label}</span>
            </Dropdown.Button>

            <Button
              icon={<ThunderboltOutlined />}
              loading={isTesting}
              onClick={handleSpeedTest}
            >
              批量延迟
            </Button>

            <Dropdown
              menu={{
                items: sortItems,
                onClick: (e) => homeStore.setSortType(e.key as SortType),
                selectedKeys: [sortType],
              }}
            >
              <Button icon={<SortAscendingOutlined />}>
                {sortItems.find((i) => i.key === sortType)?.label || "排序"}
              </Button>
            </Dropdown>
          </Space>
        </div>
      </div>

      {/* 底部节点列表 */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm scroll-smooth">
          {sortedNodes.length === 0 ? (
            <div className="p-10 text-center text-gray-400">暂无节点</div>
          ) : (
            <NodeList
              nodes={sortedNodes}
              selectedNodeId={selectedNodeId}
              latencies={latencies}
              onSelect={setSelectedNodeId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;