import React, { useEffect } from "react";
import { GlobalOutlined } from "@ant-design/icons";
import { useHomeStore } from "../../store/homeStore";

// 引入 Hooks
import { useNodeData } from "./hooks/useNodeData";
import { useProxyManager } from "./hooks/useProxyManager";
import { useNetworkTester } from "./hooks/useNetworkTester";

// 引入 Components
import NodeList from "./NodeList";
import StatusCard from "./StatusCard";
import ControlToolbar from "./ControlToolbar";

const HomePage: React.FC = () => {
  // 1. 全局 Store
  const { isRunning, latencies, connectedNodeId } = useHomeStore();
  // 2. 自定义 Hooks
  const { sortedNodes, nodes } = useNodeData(); // 节点数据
  
  const {
    selectedNodeId,
    setSelectedNodeId,
    mode,
    isSwitching,
    toggleProxy,
    handleSwitchNode,
    handleModeChange
  } = useProxyManager(); // 核心控制

  const {
    isTesting,
    testUrl,
    setTestUrl,
    urlDelay,
    clearUrlDelay,
    runBatchTcpPing,
    runHttpConnectivityTest,
    currentTestUrlObj
  } = useNetworkTester(); // 测速逻辑

  // 3. 副作用处理
  // 初始化默认选中第一个节点
  useEffect(() => {
    if (connectedNodeId !== null && !selectedNodeId)
      return setSelectedNodeId(connectedNodeId);
    if (!selectedNodeId && nodes.length > 0) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [nodes, selectedNodeId, setSelectedNodeId]);

  // 当停止代理或切换节点时，清理旧的测速结果
  useEffect(() => {
    if (!isRunning) clearUrlDelay();
  }, [isRunning, clearUrlDelay]);
  
  // 在切换节点时也清理测速结果
  const onSwitchNodeWrapper = async () => {
      await handleSwitchNode();
      clearUrlDelay();
  };

  // 4. 计算当前用于显示的节点对象
  const connectedNode = nodes.find((n) => n.id === connectedNodeId);
  const previewNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white px-6 py-4 shadow-sm border-b border-gray-100 relative z-10">
        
        {/* 顶部状态卡片 */}
        <StatusCard
          isRunning={isRunning}
          connectedNode={connectedNode}
          previewNode={previewNode}
          urlDelay={urlDelay}
          testUrlLabel={currentTestUrlObj?.label}
          isSwitching={isSwitching}
          onToggle={toggleProxy}
          onSwitch={onSwitchNodeWrapper}
        />

        {/* 工具栏 */}
        <ControlToolbar
          mode={mode}
          onModeChange={handleModeChange}
          testUrl={testUrl}
          onTestUrlChange={setTestUrl}
          onUrlTest={runHttpConnectivityTest}
          onSpeedTest={() => runBatchTcpPing(nodes)}
          isTesting={isTesting}
        />
      </div>

      {/* 底部节点列表 */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm scroll-smooth">
          {sortedNodes.length === 0 ? (
            <div className="p-10 text-center text-gray-400 flex flex-col items-center">
              <GlobalOutlined className="text-4xl mb-3 text-gray-200" />
              暂无订阅节点
            </div>
          ) : (
            <NodeList
              nodes={sortedNodes}
              selectedNodeId={selectedNodeId}
              latencies={latencies}
              onSelect={setSelectedNodeId}
              activeNodeId={connectedNodeId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;