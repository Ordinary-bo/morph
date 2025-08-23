import { createFile, FILE } from "../utils";


export const createServersFile = async () => {
  await createFile(FILE.serversJson);
};
