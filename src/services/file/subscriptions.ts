import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { createFile, FILE, getConfigDir } from "../utils";

// 默认订阅域名
const DEFAULT_SUBSCRIPTIONS_DOMAIN = {
  "subscription1.com": true,
  "subscription2.com": true,
};

export interface SubscriptionDomain {
  [key: string]: boolean;
}

export const createSubscriptionsFile = async () => {
  createFile(FILE.subscriptionsJson, DEFAULT_SUBSCRIPTIONS_DOMAIN);
};

// 获取当前订阅
export const getSubscriptions = async () => {
  const path = await getConfigDir(FILE.subscriptionsJson);
  const subscriptions = await readTextFile(path);
  const parsed = JSON.parse(subscriptions) as SubscriptionDomain;
  return parsed;
};

// 修改订阅
export const updateSubscription = async (
  domain: string,
  isActive?: boolean
) => {
  const path = await getConfigDir(FILE.subscriptionsJson);
  const subscriptions = await readTextFile(path);
  const parsed = JSON.parse(subscriptions) as SubscriptionDomain;

  // 更新订阅状态
  parsed[domain] = isActive || true;

  // 写回文件
  await writeTextFile(path, JSON.stringify(parsed));
};

// 新增订阅
export const addSubscription = async (domain: string) => {
  const path = await getConfigDir(FILE.subscriptionsJson);
  const subscriptions = await readTextFile(path);
  const parsed = JSON.parse(subscriptions) as SubscriptionDomain;
  // 添加新订阅
  parsed[domain] = true;
  // 写回文件
  await writeTextFile(path, JSON.stringify(parsed));
};

// 删除订阅
export const removeSubscription = async (domain: string) => {
  const path = await getConfigDir(FILE.subscriptionsJson);
  const subscriptions = await readTextFile(path);
  const parsed = JSON.parse(subscriptions) as SubscriptionDomain;
  // 删除订阅
  delete parsed[domain];
  // 写回文件
  await writeTextFile(path, JSON.stringify(parsed));
};