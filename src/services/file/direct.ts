import { createFile, FILE } from "../utils";

const DEFAULT_DIRECT_DOMAIN = ["baidu.com"];
export const createDirectFile = async () => {
  createFile(FILE.directJson, DEFAULT_DIRECT_DOMAIN);
};
