import type { Browsers } from "../src/types.ts";
import { getChromePath, getFirefoxPath } from "../src/utility.ts";

export const browserList: Array<{
  name: Browsers;
  errors: {
    page_not_exist_message: string;
    page_name_not_resolved: string;
  };
  getPath: () => string;
}> = [
  {
    name: "chrome",
    errors: {
      page_not_exist_message:
        'NS_ERROR_UNKNOWN_HOST: Error for navigating to page "https://hellaDOCSWOWThispagesurelycantexist.biscuit"',
      page_name_not_resolved:
        'net::ERR_NAME_NOT_RESOLVED: Error for navigating to page "https://hhh"',
    },
    getPath: getChromePath,
  },
  {
    name: "firefox",
    errors: {
      page_not_exist_message:
        'net::ERR_NAME_NOT_RESOLVED: Error for navigating to page "https://hellaDOCSWOWThispagesurelycantexist.biscuit"',
      page_name_not_resolved: "todo",
    },
    getPath: getFirefoxPath,
  },
];
