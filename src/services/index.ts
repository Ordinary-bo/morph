import { createConfigFile } from "./file/config";
import { createDirectFile } from "./file/direct";
import { createPacFile } from "./file/pac";
import { createServersFile } from "./file/servers";
import { createSubscriptionsFile } from "./file/subscriptions";
import { createConfigDir } from "./utils";

async function init() {
  await createConfigDir();

  // 配置文件
  await createConfigFile();
  // PAC文件
  await createPacFile();
  // 直连文件
  await createDirectFile();
  // 订阅文件
  await createSubscriptionsFile();
  // 服务器文件
  await createServersFile();
}
init();
