import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { App } from "antd";
import { homeStore, useHomeStore } from "../../../store/homeStore";

export function useProxyManager() {
  const { message } = App.useApp();
  const { isRunning,connectedNodeId } = useHomeStore();
  
  // 状态分离
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("Rule");
  const [isSwitching, setIsSwitching] = useState(false);

  // 监听后端意外退出
  useEffect(() => {
    let unlisten: () => void;
    const setupListener = async () => {
      unlisten = await listen("singbox-stopped", (event) => {
        console.warn("Singbox backend stopped:", event.payload);
        if (homeStore.getSnapshot().isRunning) {
          homeStore.setIsRunning(false);
          homeStore.setConnectedNodeId(null);
          message.warning("核心进程退出，请检查日志");
        }
      });
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, [message]);

  // 启动/停止逻辑
  const toggleProxy = async () => {
    if (isRunning) {
      // Stop
      homeStore.setIsRunning(false);
      homeStore.setConnectedNodeId(null);
      try {
        message.loading({ content: "正在停止...", key: "process" });
        await invoke("stop_singbox");
        message.success({ content: "代理已停止", key: "process" });
      } catch (e) {
        message.error({ content: `停止失败: ${e}`, key: "process" });
        homeStore.setIsRunning(true); // 回滚
      }
    } else {
      // Start
      if (!selectedNodeId) return message.warning("请先选择一个节点");
      try {
        message.loading({ content: "正在启动核心...", key: "process" });
        await invoke("start_singbox", { nodeId: selectedNodeId, mode });
        homeStore.setIsRunning(true);
        homeStore.setConnectedNodeId(selectedNodeId);
        message.success({ content: "代理已启动", key: "process" });
      } catch (e) {
        message.error({ content: `启动失败: ${e}`, key: "process" });
        homeStore.setIsRunning(false);
        homeStore.setConnectedNodeId(null);
      }
    }
  };

  // 热切换节点
  const handleSwitchNode = async () => {
    if (!selectedNodeId || selectedNodeId === connectedNodeId) return;
    setIsSwitching(true);
    try {
      await invoke("stop_singbox");
      await invoke("start_singbox", { nodeId: selectedNodeId, mode });
      homeStore.setConnectedNodeId(selectedNodeId);
      message.success("节点切换成功");
    } catch (e) {
      message.error(`切换失败: ${e}`);
    } finally {
      setIsSwitching(false);
    }
  };

  // 切换模式
  const handleModeChange = async (value: string) => {
    setMode(value);
    if (!isRunning || !connectedNodeId) return;
    try {
      message.loading({ content: "正在切换模式...", key: "mode" });
      await invoke("stop_singbox");
      await invoke("start_singbox", { nodeId: connectedNodeId, mode: value });
      message.success({ content: "模式切换成功", key: "mode" });
    } catch (e) {
      message.error({ content: `切换失败: ${e}`, key: "mode" });
      homeStore.setIsRunning(false);
      homeStore.setConnectedNodeId(null);
    }
  };

  return {
    selectedNodeId,
    setSelectedNodeId,
    mode,
    isSwitching,
    toggleProxy,
    handleSwitchNode,
    handleModeChange
  };
}