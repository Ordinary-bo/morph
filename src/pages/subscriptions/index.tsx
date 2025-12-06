import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Card,
  Popconfirm,
  Tooltip,
  App,
  Switch
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SyncOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { invoke } from "@tauri-apps/api/core"; 

// 定义订阅源的数据接口
interface SubscriptionItem {
  url: string;
  name: string;
  status: string;      // active | error
  last_updated: string; 
  enabled: boolean;    // 启用状态
}

const SubscriptionsPage: React.FC = () => {
  const [data, setData] = useState<SubscriptionItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [form] = Form.useForm();
  const { message } = App.useApp(); 

  // --- 初始化：加载数据 ---
  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await invoke<SubscriptionItem[]>("get_subscriptions");
      setData(res);
    } catch (error) {
      console.error(error);
      message.error("无法加载订阅列表");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // --- 交互逻辑 ---

  const handleDelete = async (url: string) => {
    try {
      const updatedList = await invoke<SubscriptionItem[]>("delete_subscription", { url });
      setData(updatedList);
      message.success("订阅源已删除");
    } catch (error) {
      message.error(`删除失败: ${error}`);
    }
  };

  // 触发刷新所有订阅（会跳过禁用的）
  const handleUpdateAll = async () => {
    message.loading({ content: "正在更新所有启用订阅...", key: "update" });
    try {
        const updatedList = await invoke<SubscriptionItem[]>("update_all_subscriptions");
        setData(updatedList);
        message.success({ content: "更新完成", key: "update" });
    } catch (e) {
        message.error({ content: `更新失败: ${e}`, key: "update" });
    }
  };

  // 切换开关
  const handleToggle = async (url: string, checked: boolean) => {
      // 乐观更新 UI
      const oldData = [...data];
      setData(prev => prev.map(item => item.url === url ? { ...item, enabled: checked } : item));

      try {
          const updatedList = await invoke<SubscriptionItem[]>("toggle_subscription_enabled", { url, enabled: checked });
          setData(updatedList); // 确保与后端同步
          message.success(checked ? "已启用" : "已禁用");
      } catch (e) {
          message.error("状态切换失败");
          setData(oldData); // 回滚
      }
  };

  const handleAddSubmit = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      const updatedList = await invoke<SubscriptionItem[]>("add_subscription", { 
        name: values.name, 
        url: values.url 
      });

      setData(updatedList);
      setIsModalOpen(false);
      form.resetFields();
      message.success("添加成功");
    } catch (error: any) {
      if (!error.errorFields) {
        message.error(`添加失败: ${error}`);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  // --- 表格列定义 ---
  const columns: ColumnsType<SubscriptionItem> = [
    {
      title: "启用",
      key: "enabled",
      width: 90,
      render: (_, record) => (
          <Switch 
            checked={record.enabled} 
            onChange={(c) => handleToggle(record.url, c)} 
            size="small"
          />
      ),
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (text) => <span className="font-semibold text-gray-700">{text}</span>,
    },
    {
      title: "URL",
      dataIndex: "url",
      key: "url",
      ellipsis: { showTitle: false },
      render: (url) => (
        <Tooltip placement="topLeft" title={url}>
          <div className="flex items-center text-gray-400">
            <LinkOutlined className="mr-2" />
            <span className="truncate max-w-[150px]">{url}</span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: "上次更新",
      key: "status",
      dataIndex: "status",
      render: (status, record) => {
        // 如果禁用了，显示禁用状态
        if (!record.enabled) return <Tag color="default">已禁用</Tag>;

        let color = status === "active" ? "success" : status === "error" ? "error" : "processing";
        let text = status === "active" ? "成功" : status === "error" ? "失败" : "新添加";
        
        return (
            <div className="flex flex-col">
                <Tag color={color} bordered={false} className="w-fit">{text}</Tag>
                <span className="text-xs text-gray-400 mt-1">{record.last_updated}</span>
            </div>
        );
      },
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Popconfirm
            title="确定要删除这个订阅源吗？"
            onConfirm={() => handleDelete(record.url)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-2 flex flex-col h-full gap-6">
      {/* 顶部标题和操作栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0">订阅管理</h1>
          <p className="text-gray-500 mt-1">管理您的机场订阅源</p>
        </div>
        <div className="flex gap-2">
            <Button icon={<SyncOutlined />} onClick={handleUpdateAll}>立即更新</Button>
            <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 shadow-md"
            >
            添加订阅
            </Button>
        </div>
      </div>

      {/* 列表内容区 */}
      <Card variant="borderless" className="shadow-sm rounded-lg flex-1 overflow-y-auto">
        <Table 
          columns={columns} 
          dataSource={data} 
          loading={loading}
          pagination={{ pageSize: 8 }} 
          rowKey="url"
        />
      </Card>

      {/* 添加订阅的模态框 */}
      <Modal
        title="添加新订阅"
        open={isModalOpen}
        onOk={handleAddSubmit}
        confirmLoading={confirmLoading}
        onCancel={() => setIsModalOpen(false)}
        okText="添加"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" name="add_subscription_form">
          <Form.Item
            name="url"
            label="订阅链接"
            rules={[
              { required: true, message: "请输入订阅链接!" },
              { type: "url", message: "请输入有效的 URL!" },
            ]}
          >
            <Input placeholder="https://..." prefix={<LinkOutlined />} />
          </Form.Item>
          <Form.Item
            name="name"
            label="备注名称"
            rules={[{ required: true, message: "请起个名字" }]}
          >
            <Input placeholder="例如: 我的主力机场" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubscriptionsPage;