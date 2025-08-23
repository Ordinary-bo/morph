import { useEffect, useState } from "react";
import {
  addSubscription,
  getSubscriptions,
  removeSubscription,
  SubscriptionDomain,
} from "../../services/file/subscriptions";
import {
  Button,
  Table,
  Input,
  Form,
  Switch,
  Modal,
  Typography,
  Card,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import useApp from "antd/es/app/useApp";

const { Title } = Typography;
const { Search } = Input;

const Subscriptions = () => {
  const { message: messageApi } = useApp();
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  // 获取订阅列表
  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const subs = await getSubscriptions();
      // 将对象转换为数组
      const subsArray = Object.entries(subs).map(([domain, enabled]) => ({
        domain,
        enabled,
        key: domain,
      }));
      setSubscriptions(subsArray);
      setFilteredSubscriptions(subsArray);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      messageApi.error("获取订阅列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // 处理搜索
  useEffect(() => {
    if (searchText) {
      const filtered = subscriptions.filter((sub) =>
        sub.domain.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredSubscriptions(filtered);
    } else {
      setFilteredSubscriptions(subscriptions);
    }
  }, [searchText, subscriptions]);

  // 添加订阅
  const handleAddSubscription = async (values: { name: string }) => {
    setAddLoading(true);
    try {
      await addSubscription(values.name);
      messageApi.success("订阅已添加");
      fetchSubscriptions();
    } catch (error) {
      messageApi.error("添加订阅失败");
    } finally {
      setAddLoading(false);
    }
  };

  // 删除订阅
  const handleRemove = async (domain: string) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除订阅 "${domain}" 吗？`,
      onOk: async () => {
        try {
          await removeSubscription(domain);
          messageApi.success("订阅已删除");
          fetchSubscriptions();
        } catch (error) {
          messageApi.error("删除订阅失败");
        }
      },
    });
  };

  // 切换订阅状态
  const handleToggleStatus = async (domain: string, enabled: boolean) => {
    try {
      await updateSubscriptionStatus(domain, enabled);
      messageApi.success(`订阅已${enabled ? "启用" : "禁用"}`);
      // 更新本地状态
      setSubscriptions((prev) =>
        prev.map((sub) => (sub.domain === domain ? { ...sub, enabled } : sub))
      );
    } catch (error) {
      messageApi.error("状态更新失败");
      // 恢复原状态
      fetchSubscriptions();
    }
  };

  // 更新所有订阅
  const handleUpdateAll = async () => {
    setLoading(true);
    try {
      // 这里实现更新所有订阅的逻辑
      messageApi.success("订阅更新成功");
      fetchSubscriptions();
    } catch (error) {
      messageApi.error("订阅更新失败");
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: "订阅域名",
      dataIndex: "domain",
      key: "domain",
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: "状态",
      dataIndex: "enabled",
      key: "enabled",
      width: 100,
      render: (enabled: boolean, record: SubscriptionItem) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleStatus(record.domain, checked)}
        />
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      render: (_, record: SubscriptionItem) => (
        <Button
          icon={<DeleteOutlined />}
          danger
          size="small"
          onClick={() => handleRemove(record.domain)}
        />
      ),
    },
  ];

  return (
    <div className="p-4 h-full flex flex-col">
      <Title level={2}>订阅管理</Title>
      
      <Card className="mb-4">
        <Form onFinish={handleAddSubscription} layout="inline">
          <Form.Item
            name="name"
            rules={[{ required: true, message: "请输入订阅名称" }]}
            className="flex-1 mb-2 md:mb-0"
          >
            <Input placeholder="输入订阅域名" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlusOutlined />}
              loading={addLoading}
            >
              添加订阅
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <Search
            placeholder="搜索订阅"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-64"
          />
          <Button type="primary" onClick={handleUpdateAll} loading={loading}>
            更新所有订阅
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredSubscriptions}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ y: 400 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default Subscriptions;