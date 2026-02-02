import { useState, useCallback } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Modal, message } from "antd";
import { RocketOutlined } from "@ant-design/icons";

const FORCE_FLAG = "[force-update]";
const MIN_SUPPORTED_REGEX = /\[min-version:\s*([0-9]+(?:\.[0-9]+)*)\]/i;

export const useUpdateCheck = () => {
  const [checking, setChecking] = useState(false);

  // 辅助比较函数
  const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.replace(/^v/, "").split(".").map(Number);
    const parts2 = v2.replace(/^v/, "").split(".").map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const n1 = parts1[i] || 0;
      const n2 = parts2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  };

  const checkUpdate = useCallback(async (isSilent = false) => {
    if (!isSilent) setChecking(true);

    try {
      // 检查更新
      const update = await check();

      // 只要有新版本号且与当前版本不同就提示更新
      // 最低支持版本和强制更新请在 Release Notes 中写：[force-update] [min-version: 0.0.2]
      if (update && update.version && compareVersions(update.version, update.currentVersion) > 0) {
        let isForce = false;
        const body = update.body || "";

        // 检测强制更新标记
        if (body.includes(FORCE_FLAG)) {
          isForce = true;
        }

        // 检测最低兼容版本
        const match = body.match(MIN_SUPPORTED_REGEX);
        if (match?.[1]) {
          if (compareVersions(update.currentVersion, match[1]) < 0) {
            isForce = true;
          }
        }

        showUpdateModal(update, isForce);
      } else {
        if (!isSilent) message.success("当前已是最新版本");
      }
    } catch (e) {
      if (!isSilent) message.error("检查更新失败");
      console.error(e);
    } finally {
      if (!isSilent) setChecking(false);
    }
  }, []);

  const showUpdateModal = (update: Update, isForce: boolean) => {
    // ✅ 2. 去掉了未使用的 'const modal ='
    Modal.confirm({
      title: (
        <div className="flex items-center gap-2">
          <RocketOutlined className="text-indigo-500" />
          <span>
            {isForce ? "发现重要安全更新" : `发现新版本 v${update.version}`}
          </span>
        </div>
      ),
      content: (
        <div className="mt-4">
          {isForce && (
            <div className="bg-red-50 text-red-500 px-3 py-2 rounded text-xs mb-3 border border-red-100 font-bold">
              ⚠️ 您的版本过低，必须升级到此版本才能继续使用。
            </div>
          )}
          <div className="text-gray-600 text-sm max-h-60 overflow-y-auto whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded">
            {/* 过滤掉暗号显示 */}
            {update.body
              ?.replace(new RegExp(FORCE_FLAG, "g"), "")
              .replace(MIN_SUPPORTED_REGEX, "")
              .trim() || "暂无更新日志"}
          </div>
        </div>
      ),
      okText: "立即更新",
      cancelButtonProps: {
        style: { display: isForce ? "none" : "inline-block" },
      },
      keyboard: !isForce,
      maskClosable: !isForce,
      closable: !isForce,
      centered: true,
      // ✅ 3. 去掉了未使用的 'reject' 参数
      onOk: async () => {
        return new Promise<void>(async (resolve) => {
          const hideLoading = message.loading("正在下载更新，请稍候...", 0);

          try {
            await update.downloadAndInstall(() => {
            });

            hideLoading();
            message.success("更新完成，即将重启...");

            await relaunch();
            resolve();
          } catch (e) {
            hideLoading();
            message.error("更新失败: " + e);
            
            // 如果不是强制更新，允许关闭弹窗重试
            if (!isForce) {
              resolve();
            }
            // 如果是强制更新，不调用 resolve()，让弹窗卡住，迫使用户重试或手动重启
          }
        });
      },
    });
  };

  return { checking, checkUpdate };
};