import { eventBus } from "tools-browser";
import { Button, Flex, Switch, Table } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import useApp from "antd/es/app/useApp";
import { useEffect, useState } from "react";
import {
  SubscriptionDomain,
  getSubscriptions,
  removeSubscription,
  updateSubscription,
} from "../../../../services/file/subscriptions";
import { parseSubscription, transformToConfig } from "../../../../utils/subscribeParser";
import { Base64 } from "js-base64";
import request from "../../../../utils/request";
import { addServersBatch } from "../../../../services/file/servers";

const List = () => {
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDomain[]>([]);
  const { message, modal } = useApp();
  // 切换订阅状态
  const handleToggleStatus = async (domain: string, enabled: boolean) => {
    try {
      await updateSubscription(domain, enabled);
      message.success(`订阅已${enabled ? "启用" : "禁用"}`);
      fetchSubscriptions();
    } catch (error) {
      message.error("状态更新失败");
      // 恢复原状态
      fetchSubscriptions();
    }
  };

  // 更新所有订阅
  const handleUpdateAll = async () => {
    setLoading(true);
    try {
      // 这里实现更新所有订阅的逻辑
      message.success("订阅更新成功");
      fetchSubscriptions();
    } catch (error) {
      message.error("订阅更新失败");
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

  // 删除订阅
  const handleRemove = async (domain: string) => {
    modal.confirm({
      title: "确认删除",
      content: `确定要删除订阅 "${domain}" 吗？`,
      onOk: async () => {
        try {
          await removeSubscription(domain);
          message.success("订阅已删除");
          fetchSubscriptions();
        } catch (error) {
          message.error("删除订阅失败");
        }
      },
    });
  };

  // 获取订阅列表
  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const subs = await getSubscriptions();
      setSubscriptions(subs);
    } catch (error) {
      console.log("error:", error);
      message.error("获取订阅列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    eventBus.on("refreshSubscriptions", fetchSubscriptions);
    return () => {
      eventBus.off("refreshSubscriptions", () => {});
    };
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleSubscription = async () => {
    subscriptions.forEach(async (sub) => {
      if (sub.status) {
        const response = await request<string>(sub.domain);
        const servers = parseSubscription(response);
        console.log('transformToConfig(servers):', transformToConfig(servers));
        addServersBatch(transformToConfig(servers));
      }
    });
  };

  return (
    <>
      <Flex>
        <Button onClick={handleUpdateAll} loading={loading}>
          刷新
        </Button>
        <Button onClick={handleSubscription} loading={loading}>
          解析订阅
        </Button>
      </Flex>

      <Table
        rowKey="domain"
        columns={columns}
        dataSource={subscriptions}
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ y: 400 }}
        size="middle"
      />
    </>
  );
};
export default List;
