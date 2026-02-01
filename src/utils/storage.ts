  /**
   * 本地存储键名枚举，防止魔法字符串
   */
  enum StorageKeys {
    LAST_SELECTED_NODE_ID = "app_last_selected_node_id",
  }
  
  export const storage = {
    /**
     * 保存最后选中的节点 ID
     */
    setLastSelectedNodeId(id: string): void {
      localStorage.setItem(StorageKeys.LAST_SELECTED_NODE_ID, id);
    },
  
    /**
     * 获取最后选中的节点 ID
     */
    getLastSelectedNodeId(): string | null {
      return localStorage.getItem(StorageKeys.LAST_SELECTED_NODE_ID);
    },
  
    /**
     * 清除特定配置（预留）
     */
    clearLastSelectedNodeId(): void {
      localStorage.removeItem(StorageKeys.LAST_SELECTED_NODE_ID);
    }
  };