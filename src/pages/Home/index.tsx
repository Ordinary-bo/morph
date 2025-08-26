import React, { useEffect, useState, useRef } from "react";
import { Button, Card, Flex, Tag, Tooltip } from "antd";
import { ServerConfig, getServers } from "../../services/file/servers";
import { updateSubscriptions } from "../../services/file/subscriptions";
import useApp from "antd/es/app/useApp";
import LatencyWorker from "../../worker/latencyWorker.ts?worker";
import { getLatencyColor } from "../../utils/color";

type Server = {
  latency?: number;
} & ServerConfig;

const Home: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const { message } = useApp();
  const workerRef = useRef<Worker>(null);

  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [_, setPendingTests] = useState(0);

  const getData = async () => {
    setLoadingRefresh(true);
    try {
      const result = await getServers();
      setServers(result);
    } finally {
      setLoadingRefresh(false);
    }
  };

  const handleSubscription = async () => {
    setLoadingSubscription(true);
    try {
      await updateSubscriptions();
      message.success("订阅解析成功");
    } catch (error) {
      console.error("解析订阅失败:", error);
      message.error("解析订阅失败，请检查订阅链接是否正确");
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleTestLatency = () => {
    if (workerRef.current && servers.length > 0) {
      setLoadingTest(true);
      setPendingTests(servers.length);
      workerRef.current.postMessage(servers);
    }
  };

  useEffect(() => {
    getData();

    workerRef.current = new LatencyWorker();
    workerRef.current.onmessage = (
      event: MessageEvent<{ id: string; latency: number }>
    ) => {
      setServers((prev) =>
        prev.map((s) =>
          s.id === event.data.id ? { ...s, latency: event.data.latency } : s
        )
      );
      
      setPendingTests((prev) => {
        const remaining = prev - 1;
        if (remaining <= 0) setLoadingTest(false);
        return remaining;
      });
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return (
    <div>
      <Flex justify="start" gap={12} style={{ marginBottom: 16 }}>
        <Button loading={loadingRefresh} type="primary" onClick={getData}>
          刷新列表
        </Button>
        <Button
          loading={loadingSubscription}
          type="default"
          onClick={handleSubscription}
        >
          更新订阅
        </Button>
        <Button loading={loadingTest} type="dashed" onClick={handleTestLatency}>
          测速
        </Button>
      </Flex>

      <Flex wrap gap={20}>
        {servers.map((item) => (
          <Card
            key={item.id}
            size="small"
            title={<Tooltip title={item.name}>{item.name}</Tooltip>}
            extra={<Button type="link">连接</Button>}
            style={{
              width: 210,
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <p>
              <Tag color="blue">{item.type}</Tag>
               <Tag color="purple">{item.port}</Tag>
                <Tag color="pink">{item.encryption}</Tag>
            </p>
            <p>{item.server}</p>
            <p>
              延迟:
              <span style={{ color: getLatencyColor(item.latency) }}>
                {item.latency == null ? "--" : item.latency + " ms"}
              </span>
            </p>
          </Card>
        ))}
      </Flex>
    </div>
  );
};

export default Home;
