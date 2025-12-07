import React from "react";
import { Segmented, Button, Dropdown, Space } from "antd";
import {
  GlobalOutlined,
  ThunderboltOutlined,
  DownOutlined,
  SortAscendingOutlined,
  SignalFilled,
} from "@ant-design/icons";
import { SortType, homeStore, useHomeStore } from "../../../store/homeStore";
import { TEST_URLS } from "../const";

interface ControlToolbarProps {
  mode: string;
  onModeChange: (val: string) => void;
  testUrl: string;
  onTestUrlChange: (val: string) => void;
  onUrlTest: () => void;
  onSpeedTest: () => void;
  isTesting: boolean;
}

const ControlToolbar: React.FC<ControlToolbarProps> = ({
  mode,
  onModeChange,
  testUrl,
  onTestUrlChange,
  onUrlTest,
  onSpeedTest,
  isTesting,
}) => {
  const { sortType } = useHomeStore();
  const currentTestUrlObj = TEST_URLS.find((u) => u.value === testUrl);

  const sortItems = [
    { key: "default", label: "默认排序", icon: <SortAscendingOutlined /> },
    { key: "latency", label: "低延迟优先", icon: <SignalFilled /> },
    { key: "name", label: "名称排序", icon: <SortAscendingOutlined /> },
  ];

  return (
    <div className="flex justify-between items-center mt-2">
      <Segmented
        value={mode}
        onChange={onModeChange}
        options={[
          { label: "规则", value: "Rule", icon: <GlobalOutlined /> },
          { label: "全局", value: "Global", icon: <ThunderboltOutlined /> },
        ]}
      />
      <Space>
        <Dropdown.Button
          onClick={onUrlTest}
          menu={{
            items: TEST_URLS.map((u) => ({
              key: u.value,
              label: u.label,
              icon: u.icon,
              onClick: () => onTestUrlChange(u.value),
            })),
            selectedKeys: [testUrl],
          }}
          icon={<DownOutlined />}
        >
          {currentTestUrlObj?.icon}
          <span className="ml-1 hidden sm:inline">{currentTestUrlObj?.label}</span>
        </Dropdown.Button>

        <Button icon={<ThunderboltOutlined />} loading={isTesting} onClick={onSpeedTest}>
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
  );
};

export default ControlToolbar;