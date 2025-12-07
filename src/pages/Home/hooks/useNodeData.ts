import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { App } from "antd";
import { Node } from "../NodeList"; 
import { useHomeStore } from "../../../store/homeStore";

interface Subscription {
  url: string;
  name: string;
  enabled: boolean;
  nodes: Node[];
}

export function useNodeData() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const { message } = App.useApp();
  const { latencies, sortType } = useHomeStore();

  const loadLocalNodes = async () => {
    try {
      const subs = await invoke<Subscription[]>("get_subscriptions");
      const activeNodes = subs
        .filter((sub) => sub.enabled)
        .flatMap((sub) => sub.nodes);
      setNodes(activeNodes);
      return activeNodes;
    } catch (e) {
      message.error("无法读取节点列表");
      return [];
    }
  };

  useEffect(() => {
    loadLocalNodes();
  }, []);

  const sortedNodes = useMemo(() => {
    let list = [...nodes];
    if (sortType === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    } else if (sortType === "latency") {
      list.sort((a, b) => {
        const latA = latencies[a.id];
        const latB = latencies[b.id];
        const valA = latA === undefined || latA === -1 ? Number.MAX_SAFE_INTEGER : latA;
        const valB = latB === undefined || latB === -1 ? Number.MAX_SAFE_INTEGER : latB;
        return valA - valB;
      });
    }
    return list;
  }, [nodes, latencies, sortType]);

  return { nodes, sortedNodes, loadLocalNodes, setNodes };
}