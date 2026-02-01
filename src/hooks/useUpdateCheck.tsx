import { useState, useCallback } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-shell";
import { exit } from "@tauri-apps/plugin-process"; 
import { Modal, message } from "antd";
import { RocketOutlined } from "@ant-design/icons";

// 🔴 请替换为你的 GitHub 用户名和仓库名
const GITHUB_USER = "hubin4826"; 
const GITHUB_REPO = "morph";

// 标记定义
const FORCE_FLAG = "";
const MIN_SUPPORTED_REGEX = '';
interface ReleaseInfo {
  tag_name: string;
  html_url: string;
  body: string;
  assets: Array<{ browser_download_url: string; name: string }>;
}

export const useUpdateCheck = () => {
  const [checking, setChecking] = useState(false);

  // 版本比较: 1(v1>v2), -1(v1<v2), 0(相等)
  const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.replace(/^v/, "").split(".").map(Number);
    const parts2 = v2.replace(/^v/, "").split(".").map(Number);
    const len = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < len; i++) {
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
      const currentVer = await getVersion();
      // 加时间戳防止缓存
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/latest?t=${Date.now()}`
      );
      
      if (!res.ok) {
        throw new Error(`GitHub API Error: ${res.statusText}`);
      }

      const data: ReleaseInfo = await res.json();
      
      // 只有当 远程版本 > 本地版本 时才处理
      if (compareVersions(data.tag_name, currentVer) > 0) {
        let isForce = false;

        // 判定条件 1: 暴力强制标记
        if (data.body.includes(FORCE_FLAG)) {
          isForce = true;
        }

        // 判定条件 2: 最低兼容版本检查
        const match = data.body.match(MIN_SUPPORTED_REGEX);
        if (match && match[1]) {
          const minSupportedVer = match[1];
          // 如果 当前版本 < 最低兼容版本，则强制更新
          if (compareVersions(currentVer, minSupportedVer) < 0) {
            isForce = true;
          }
        }
        
        showUpdateModal(data, isForce);
      } else {
        if (!isSilent) message.success("当前已是最新版本");
      }
    } catch (e) {
      if (!isSilent) message.error("检查更新失败，请检查网络连接");
      console.error(e);
    } finally {
      if (!isSilent) setChecking(false);
    }
  }, []);

  const showUpdateModal = (release: ReleaseInfo, isForce: boolean) => {
    Modal.confirm({
      title: (
        <div className="flex items-center gap-2">
          <RocketOutlined className="text-indigo-500" />
          <span>{isForce ? "发现重要安全更新" : `发现新版本 ${release.tag_name}`}</span>
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
            {/* 过滤掉标记文本，不展示给用户 */}
            {release.body
              .replace(FORCE_FLAG, "")
              .replace(MIN_SUPPORTED_REGEX, "")
              .trim() || "暂无更新日志"}
          </div>
        </div>
      ),
      okText: "立即下载",
      // 强制更新核心：隐藏取消，禁止关闭
      cancelButtonProps: { style: { display: isForce ? "none" : "inline-block" } },
      keyboard: !isForce,
      maskClosable: !isForce,
      closable: !isForce,
      centered: true,
      onOk: async () => {
        // 优先下载 msi/exe/dmg
        const asset = release.assets.find(
          (a) => a.name.endsWith(".msi") || a.name.endsWith(".exe") || a.name.endsWith(".dmg")
        );
        const url = asset ? asset.browser_download_url : release.html_url;
        
        await open(url);

        // 如果是强制更新，跳转浏览器后直接退出应用
        if (isForce) {
          message.loading("正在跳转下载，应用即将退出...", 2);
          setTimeout(() => {
            exit(0);
          }, 2000);
          // 阻止 Modal 关闭
          return new Promise(() => {});
        }
      },
    });
  };

  return { checking, checkUpdate };
};