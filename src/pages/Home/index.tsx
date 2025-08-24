import React, { useEffect, useState } from "react";
import { Table, Button, Switch, Modal, message, Flex } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined } from "@ant-design/icons";
import { ServerConfig, getServers } from "../../services/file/servers";
import { updateSubscriptions } from "../../services/file/subscriptions";

// 服务器类型定义
type Server = {
  status?: boolean;
} & ServerConfig;

const Home: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);

  const getData = async () => {
    const result = await getServers();
    setServers(result);
  };

  // 示例初始化数据
  useEffect(() => {
    getData();
  }, []);

  // 删除服务器
  const handleDelete = (record: Server) => {
    Modal.confirm({
      title: "确认删除该服务器吗？",
      onOk: () => {
        setServers((prev) => prev.filter((s) => s !== record));
        message.success("删除成功");
      },
    });
  };

  // 切换状态
  const handleToggleStatus = (checked: boolean, record: Server) => {
    setServers((prev) =>
      prev.map((s) => (s === record ? { ...s, status: checked } : s))
    );
  };

  const columns: ColumnsType<Server> = [
    {
      title: "状态",
      dataIndex: "status",
      render: (_, record) => (
        <Switch
          checked={record.status}
          onChange={(checked) => handleToggleStatus(checked, record)}
        />
      ),
    },
    { title: "协议", dataIndex: "protocol" },
    { title: "类型", dataIndex: "type" },
    { title: "服务器", dataIndex: "server" },
    { title: "端口", dataIndex: "port" },
    { title: "密码", dataIndex: "password" },
    { title: "名称", dataIndex: "name" },
    { title: "加密", dataIndex: "encryption" },
    {
      title: "操作",
      render: (_, record) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record)}
        >
          删除
        </Button>
      ),
    },
  ];

  const handleSubscription = async () => {
    try {
      updateSubscriptions();
      message.success("订阅解析成功");
    } catch (error) {
      console.error("解析订阅失败:", error);
      message.error("解析订阅失败，请检查订阅链接是否正确");
    }
  };
  return (
    <div>
      <Flex>
        <Button type="primary" onClick={getData}>
          刷新服务器列表
        </Button>
        <Button onClick={handleSubscription}>更新所有订阅</Button>
        <Button>控制台</Button>
        <Button>测数</Button>
      </Flex>
      <Table<Server>
        rowKey={(record) => record.id}
        columns={columns}
        dataSource={servers}
      />
    </div>
  );
};

export default Home;
