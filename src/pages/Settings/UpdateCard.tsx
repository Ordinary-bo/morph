import React, { useState, useEffect } from "react";
import { Button, Card, Tag, Skeleton } from "antd";
import { CloudSyncOutlined, CheckCircleOutlined, GithubOutlined } from "@ant-design/icons";
import { getVersion } from "@tauri-apps/api/app";
// ✅ 引入 Hook
import { useUpdateCheck } from "../../hooks/useUpdateCheck";

const UpdateCard: React.FC = () => {
  // ✅ 直接使用 Hook
  const { checking, checkUpdate } = useUpdateCheck();
  const [currentVersion, setCurrentVersion] = useState("");

  useEffect(() => {
    getVersion().then(setCurrentVersion);
  }, []);

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <CloudSyncOutlined className="text-indigo-500" /> 软件更新
        </span>
      }
      className="shadow-sm border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-gray-500 text-xs mb-1">当前版本</div>
          <div className="text-xl font-bold flex items-center gap-2 text-gray-800">
            {currentVersion ? (
              `v${currentVersion}`
            ) : (
              <Skeleton.Input active size="small" style={{ width: 60 }} />
            )}
            {currentVersion && (
              <Tag color="success" className="ml-2 border-0 flex items-center gap-1 px-2 py-0.5 rounded-full">
                <CheckCircleOutlined /> Release
              </Tag>
            )}
          </div>
        </div>

        <Button
          type="primary"
          icon={<GithubOutlined />}
          loading={checking}
          // ✅ 手动点击，传入 false 表示需要显示 Toast 反馈
          onClick={() => checkUpdate(false)}
          className="bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200 shadow-md border-none h-9 px-4"
        >
          {checking ? "检查中..." : "检查更新"}
        </Button>
      </div>
    </Card>
  );
};

export default UpdateCard;