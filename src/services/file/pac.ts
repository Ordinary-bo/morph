import { createFile, FILE } from "../utils";

// 默认PAC域名
const DEFAULT_PAC_DOMAIN = ["google.com"];

export const createPacFile = async () => {
  await createFile(FILE.pacJson, DEFAULT_PAC_DOMAIN);
};
