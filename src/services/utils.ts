import { appDataDir, BaseDirectory } from "@tauri-apps/api/path";
import { create, exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";

export const FILE = {
  config: "config",
  configJson: "config.json",
  pacJson: "pac.json",
  directJson: "direct.json",
  serversJson: "servers.json",
  subscriptionsJson: "subscriptions.json",
};

/**
 * 创建配置文件夹
 * @returns 配置文件夹路径
 */
export async function createConfigDir() {
  try {
    const dir = await appDataDir();
    const configExists = await exists(FILE.config, {
      baseDir: BaseDirectory.AppData,
    });

    if (!configExists) {
      await mkdir(FILE.config, {
        baseDir: BaseDirectory.AppData,
        recursive: true,
      });
    } else {
      console.log("Config文件夹已存在");
    }
    const configDir = `${dir}config`;
    return configDir;
  } catch (error) {
    console.error("没有权限访问或创建配置文件夹");
    throw error;
  }
}

/**
 * 获取配置文件夹路径
 * @returns 配置文件夹路径
 */
export async function getConfigDir(path?: string) {
  const dir = await appDataDir();
  return `${dir}\\config${path ? `\\${path}` : ""}`;
}

/**
 * 通用的配置文件创建函数
 * @param fileName 文件名（例如 xxx.json）
 * @param defaultContent 默认内容（对象）
 */
export const createFile = async <T>(fileName: string, defaultContent?: T) => {
  const dir = await getConfigDir();
  const path = `${dir}\\${fileName}`;

  if (!(await exists(path))) {
    await create(path);
    console.log("配置文件已创建:", fileName);
    if (!defaultContent) return;
    const contents = JSON.stringify(defaultContent, null, 2);
    await writeTextFile(path, contents);
  } else {
    console.log("配置文件已存在:", fileName);
  }
};
