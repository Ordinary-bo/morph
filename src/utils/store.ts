import { Store } from '@tauri-apps/plugin-store';

let appSettings: Store | null = null;
let proxyNodes: Store | null = null;

async function getAppSettingsStore() {
  if (!appSettings) {
    appSettings = await Store.load('settings.json');
  }
  return appSettings;
}

async function getProxyNodesStore() {
  if (!proxyNodes) {
    proxyNodes = await Store.load('nodes.json');
  }
  return proxyNodes;
}


export const SettingsStore = {
  async get(key: string, defaultValue: any = null) {
    const store = await getAppSettingsStore(); // 先获取实例
    const val = await store.get(key);
    return val !== null ? val : defaultValue;
  },

  async set(key: string, value: any) {
    const store = await getAppSettingsStore();
    await store.set(key, value);
    await store.save(); // 记得保存
  }
};

export const NodesStore = {
  async getNodes() {
    const store = await getProxyNodesStore();
    return (await store.get('node_list')) || [];
  },

  async addNode(node: any) {
    const store = await getProxyNodesStore();
    const currentNodes = (await store.get('node_list') as any[]) || [];
    const newNodes = [...currentNodes, node];
    
    await store.set('node_list', newNodes);
    await store.save();
    return newNodes;
  },

  async clear() {
    const store = await getProxyNodesStore();
    await store.clear();
    await store.save();
  }
};