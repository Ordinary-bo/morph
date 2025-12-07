import React from "react";
import { Button, Tag } from "antd";
import { ThunderboltOutlined, PoweroffOutlined, SwapOutlined } from "@ant-design/icons";
import { Node } from "../NodeList";

interface StatusCardProps {
  isRunning: boolean;
  connectedNode?: Node;
  previewNode?: Node;
  urlDelay: number | null;
  testUrlLabel?: string;
  isSwitching: boolean;
  onToggle: () => void;
  onSwitch: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({
  isRunning,
  connectedNode,
  previewNode,
  urlDelay,
  testUrlLabel,
  isSwitching,
  onToggle,
  onSwitch,
}) => {
  // 计算是否需要显示切换按钮
  const showSwitchButton = isRunning && connectedNode && previewNode && connectedNode.id !== previewNode.id;

  if (isRunning && connectedNode) {
    return (
      <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-blue-200 shadow-lg relative">
              <ThunderboltOutlined style={{ fontSize: 20 }} />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Connected</div>
              <div className="text-blue-900 font-bold text-lg leading-tight">{connectedNode.name}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {urlDelay !== null && (
              <Tag color={urlDelay === -1 ? "error" : "success"} className="mr-0 font-medium px-2 py-0.5 border-0">
                {testUrlLabel}: {urlDelay === -1 ? "Timeout" : `${urlDelay}ms`}
              </Tag>
            )}
            {!showSwitchButton && (
              <Button danger type="primary" shape="round" size="small" icon={<PoweroffOutlined />} onClick={onToggle}>
                断开
              </Button>
            )}
          </div>
        </div>

        {showSwitchButton && (
          <div className="mt-3 pt-3 border-t border-blue-200/50 flex items-center justify-between">
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <span>列表选中:</span>
              <span className="font-medium text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                {previewNode.name}
              </span>
            </div>
            <Button
              type="primary"
              size="small"
              shape="round"
              loading={isSwitching}
              icon={<SwapOutlined />}
              onClick={onSwitch}
              className="bg-blue-600 hover:bg-blue-500 shadow-sm"
            >
              切换到该节点
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 未启动状态
  return (
    <div className="flex flex-col items-center justify-center py-2 mb-4">
      <div
        onClick={onToggle}
        className="w-20 h-20 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-all text-gray-400 hover:text-gray-600 hover:scale-105 active:scale-95 mb-2 shadow-inner"
      >
        <PoweroffOutlined className="text-3xl" />
      </div>
      <div className="text-gray-400 text-sm font-medium">
        {previewNode ? (
          <span className="flex items-center gap-1">
            点击启动 <span className="text-gray-600 max-w-[150px] truncate">{previewNode.name}</span>
          </span>
        ) : (
          "请选择一个节点启动"
        )}
      </div>
    </div>
  );
};

export default StatusCard;