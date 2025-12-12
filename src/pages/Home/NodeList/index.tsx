import React, { memo, useLayoutEffect, useRef } from "react";
import { List as AntList, Typography } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";

const { Text } = Typography;

export interface Node {
  id: string;
  protocol: string;
  name: string;
  address: string;
  port: number;
}

interface NodeListProps {
  nodes: Node[];
  selectedNodeId: string | null;
  latencies: Record<string, number>; // 新增：传入延迟数据 { id: latency }
  onSelect: (id: string) => void;
  activeNodeId: string | null;
}

const NodeList: React.FC<NodeListProps> = ({
  nodes,
  activeNodeId,
  selectedNodeId,
  latencies,
  onSelect,
}) => {
  // ⚠️ 必须自己包一层 div，当作真实 scroll 容器
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const getProtocolStyle = (p: string) => {
    const proto = p.toLowerCase();
    if (proto.includes("vmess"))
      return { color: "text-purple-600", bg: "bg-purple-50", icon: "V" };
    if (proto.includes("trojan"))
      return { color: "text-orange-600", bg: "bg-orange-50", icon: "T" };
    if (proto.includes("ss"))
      return { color: "text-blue-600", bg: "bg-blue-50", icon: "S" };
    return { color: "text-gray-600", bg: "bg-gray-100", icon: "?" };
  };

  const getLatencyColor = (ms: number | undefined) => {
    if (ms === undefined) return "bg-gray-200";
    if (ms === -1) return "bg-red-500";
    if (ms < 200) return "bg-green-500";
    if (ms < 500) return "bg-yellow-500";
    return "bg-orange-500";
  };

  // ⭐ 首次进入定位 activeNodeId
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (!activeNodeId) {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const target = container.querySelector<HTMLElement>(
      `[data-node-id="${CSS.escape(activeNodeId)}"]`
    );

    if (!target) {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // 计算位置
    const targetOffset =
      target.offsetTop - container.clientHeight / 2 + target.clientHeight / 2;

    container.scrollTo({
      top: Math.max(targetOffset, 0),
      behavior: "smooth",
    });
  }, []);

  return (
    <div ref={scrollRef} style={{ maxHeight: "100%", overflowY: "auto" }}>
      <AntList
        dataSource={nodes}
        split={false}
        className="px-2"
        renderItem={(item) => {
          const isSelected = selectedNodeId === item.id;
          const style = getProtocolStyle(item.protocol);
          const latency = latencies[item.id];

          return (
            <AntList.Item className="!p-0 mb-3" data-node-id={item.id}>
              <div
                onClick={() => onSelect(item.id)}
                className={`
                  w-full p-3 rounded-xl cursor-pointer transition-all duration-200 border
                  flex items-center justify-between group relative overflow-hidden
                  ${
                    isSelected
                      ? "bg-white border-blue-500 shadow-md shadow-blue-100 ring-1 ring-blue-500 z-10"
                      : "bg-white border-gray-100 hover:border-blue-300 hover:shadow-md"
                  }
                `}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${style.bg} ${style.color}`}
                  >
                    {style.icon}
                  </div>

                  <div className="flex-col flex min-w-0">
                    <Text
                      strong
                      className={`text-sm truncate ${
                        isSelected ? "text-blue-700" : "text-gray-700"
                      }`}
                    >
                      {item.name}
                    </Text>

                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span className="uppercase font-medium bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 scale-90 origin-left">
                        {item.protocol}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-3 border-l border-gray-50 ml-2">
                  <div className="flex flex-col items-end gap-0.5 min-w-[40px]">
                    <div className="flex items-end gap-0.5 h-3">
                      <div
                        className={`w-1 h-1 rounded-sm ${
                          latency && latency < 1000
                            ? getLatencyColor(latency)
                            : "bg-gray-200"
                        }`}
                      ></div>
                      <div
                        className={`w-1 h-2 rounded-sm ${
                          latency && latency < 500
                            ? getLatencyColor(latency)
                            : "bg-gray-200"
                        }`}
                      ></div>
                      <div
                        className={`w-1 h-3 rounded-sm ${
                          latency && latency < 200
                            ? getLatencyColor(latency)
                            : "bg-gray-200"
                        }`}
                      ></div>
                    </div>

                    <span
                      className={`text-[10px] font-mono ${
                        latency === -1 ? "text-red-400" : "text-gray-400"
                      }`}
                    >
                      {latency === undefined
                        ? "-"
                        : latency === -1
                        ? "Timeout"
                        : `${latency}ms`}
                    </span>
                  </div>

                  <div
                    className={`w-5 flex justify-center ${
                      isSelected ? "text-blue-500" : "text-transparent"
                    }`}
                  >
                    <CheckCircleFilled />
                  </div>
                </div>
              </div>
            </AntList.Item>
          );
        }}
      />
    </div>
  );
};

export default memo(NodeList);
