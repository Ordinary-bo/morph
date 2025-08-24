import React, { useEffect, useState } from "react";
import { Table, Button, Switch, Modal, Input, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { getServers } from "../../services/file/servers";

// 服务器类型定义
interface Server {
  protocol: string;
  type: string;
  server: string;
  port: number;
  password: string;
  name: string;
  encryption: string;
  params?: Record<string, string>;
  status?: boolean; // 新增状态
}

const Home: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newServer, setNewServer] = useState<Partial<Server>>({ status: true });

  const getData = async () => {
    const result = await getServers();
    setServers(result);
  };

  // 示例初始化数据
  useEffect(() => {
    getData()
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

  // 新增服务器
  const handleAddServer = () => {
    if (!newServer.server || !newServer.port || !newServer.name) {
      message.error("请填写服务器、端口和名称");
      return;
    }
    setServers((prev) => [...prev, newServer as Server]);
    setIsModalOpen(false);
    setNewServer({ status: true });
    message.success("添加成功");
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

  return (
    <div style={{ padding: 20 }}>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setIsModalOpen(true)}
        style={{ marginBottom: 16 }}
      >
        新增服务器
      </Button>

      <Table<Server>
        rowKey={(record) => `${record.server}:${record.port}`}
        columns={columns}
        dataSource={servers}
        pagination={{ pageSize: 5 }}
      />

      <Modal
        title="新增服务器"
        open={isModalOpen}
        onOk={handleAddServer}
        onCancel={() => setIsModalOpen(false)}
      >
        <Input
          placeholder="服务器"
          value={newServer.server}
          onChange={(e) =>
            setNewServer({ ...newServer, server: e.target.value })
          }
          style={{ marginBottom: 8 }}
        />
        <Input
          placeholder="端口"
          type="number"
          value={newServer.port}
          onChange={(e) =>
            setNewServer({ ...newServer, port: Number(e.target.value) })
          }
          style={{ marginBottom: 8 }}
        />
        <Input
          placeholder="名称"
          value={newServer.name}
          onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
          style={{ marginBottom: 8 }}
        />
        <Input
          placeholder="协议"
          value={newServer.protocol}
          onChange={(e) =>
            setNewServer({ ...newServer, protocol: e.target.value })
          }
          style={{ marginBottom: 8 }}
        />
        <Input
          placeholder="类型"
          value={newServer.type}
          onChange={(e) => setNewServer({ ...newServer, type: e.target.value })}
          style={{ marginBottom: 8 }}
        />
        <Input
          placeholder="密码"
          value={newServer.password}
          onChange={(e) =>
            setNewServer({ ...newServer, password: e.target.value })
          }
          style={{ marginBottom: 8 }}
        />
        <Input
          placeholder="加密"
          value={newServer.encryption}
          onChange={(e) =>
            setNewServer({ ...newServer, encryption: e.target.value })
          }
        />
      </Modal>
    </div>
  );
};

export default Home;
