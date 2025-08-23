import { useEffect, useState } from "react";
import {
  SubscriptionDomain,
  addSubscription,
  getSubscriptions,
  removeSubscription,
  updateSubscription,
} from "../../services/file/subscriptions";
import { Button, Table, Input, Form, Switch,  Card } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import useApp from "antd/es/app/useApp";

const Subscriptions = () => {
  const { message: messageApi, modal } = useApp();
  const [subscriptions, setSubscriptions] = useState<SubscriptionDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  // 获取订阅列表
  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const subs = await getSubscriptions();
      setSubscriptions(subs);
    } catch (error) {
      console.log("error:", error);
      messageApi.error("获取订阅列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // 添加订阅
  const handleAddSubscription = async (values: { domain: string }) => {
    setAddLoading(true);
    try {
      await addSubscription(values.domain);
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
    modal.confirm({
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
      await updateSubscription(domain, enabled);
      messageApi.success(`订阅已${enabled ? "启用" : "禁用"}`);
      fetchSubscriptions();
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
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: boolean, record: SubscriptionDomain) => (
        <Switch
          checked={status}
          onChange={(checked) => handleToggleStatus(record.domain, checked)}
        />
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      render: (_: any, record: SubscriptionDomain) => (
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
      <Card className="mb-4">
        <Form onFinish={handleAddSubscription} layout="inline">
          <Form.Item
            name="domain"
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
        <Button  onClick={handleUpdateAll} loading={loading}>
          更新所有订阅
        </Button>

        <Table
          rowKey="domain"
          columns={columns}
          dataSource={subscriptions}
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
