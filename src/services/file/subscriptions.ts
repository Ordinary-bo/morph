import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { createFile, FILE, getConfigDir } from "../utils";
import request from "../../utils/request";
import {
  parseSubscription,
  transformToConfig,
} from "../../utils/subscribeParser";
import { addServersBatch } from "./servers";

// 默认订阅域名
const DEFAULT_SUBSCRIPTIONS_DOMAIN: SubscriptionDomain[] = [
  {
    domain: "example.com",
    status: true,
    timestamp: Date.now(),
  },
];

export interface SubscriptionDomain {
  domain: string;
  status?: boolean; // 订阅状态，true 表示启用，false 表示禁用
  timestamp?: number; // 更新时间戳
}

// 创建文件
export const createSubscriptionsFile = async () => {
  await createFile(FILE.subscriptionsJson, DEFAULT_SUBSCRIPTIONS_DOMAIN);
};

// 获取当前订阅（数组）
export const getSubscriptions = async (): Promise<SubscriptionDomain[]> => {
  const path = await getConfigDir(FILE.subscriptionsJson);
  const subscriptions = await readTextFile(path);
  const parsed = JSON.parse(subscriptions) as SubscriptionDomain[];
  return parsed;
};

// 修改订阅状态
export const updateSubscription = async (
  domain: string,
  isActive?: boolean
) => {
  const path = await getConfigDir(FILE.subscriptionsJson);
  const subscriptions = await readTextFile(path);
  const parsed = JSON.parse(subscriptions) as SubscriptionDomain[];

  const updated = parsed.map((sub) =>
    sub.domain === domain
      ? { ...sub, status: isActive, timestamp: Date.now() }
      : sub
  );

  await writeTextFile(path, JSON.stringify(updated, null, 2));
};

// 新增订阅
export const addSubscription = async (domain: string) => {
  const path = await getConfigDir(FILE.subscriptionsJson);
  const subscriptions = await readTextFile(path);
  const parsed = JSON.parse(subscriptions) as SubscriptionDomain[];

  // 检查是否已存在
  if (!parsed.find((sub) => sub.domain === domain)) {
    parsed.push({
      domain,
      status: true,
      timestamp: Date.now(),
    });
  }

  await writeTextFile(path, JSON.stringify(parsed, null, 2));
};

// 删除订阅
export const removeSubscription = async (domain: string) => {
  const path = await getConfigDir(FILE.subscriptionsJson);
  const subscriptions = await readTextFile(path);
  const parsed = JSON.parse(subscriptions) as SubscriptionDomain[];

  const updated = parsed.filter((sub) => sub.domain !== domain);

  await writeTextFile(path, JSON.stringify(updated, null, 2));
};

export const updateSubscriptions = async () => {
  const subscriptions = await getSubscriptions();
  subscriptions.forEach(async (sub) => {
    if (sub.status) {
      const response = await request<string>(sub.domain);
      const servers = parseSubscription(response);
      addServersBatch(transformToConfig(servers));
    }
  });
};
