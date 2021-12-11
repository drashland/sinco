import type { Browsers } from "../src/types.ts";
import { getChromePath, getFirefoxPath } from "../src/utility.ts";

export const browserList: Array<{
  name: Browsers;
  errors: {
    page_not_exist_message: string;
    page_name_not_resolved: string;
  };
  cookies: Record<string, string | number | boolean>[];
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
    cookies: [
      {
        domain: "drash.land",
        expires: -1,
        httpOnly: false,
        name: "user",
        path: "/",
        secure: true,
        session: true,
        size: 6,
        value: "ed",
      },
    ],
  },
  {
    name: "firefox",
    errors: {
      page_not_exist_message:
        'net::ERR_NAME_NOT_RESOLVED: Error for navigating to page "https://hellaDOCSWOWThispagesurelycantexist.biscuit"',
      page_name_not_resolved:
        'NS_ERROR_UNKNOWN_HOST:Errorfornavigatingtopage"https://hhh"',
    },
    getPath: getFirefoxPath,
    cookies: [
      {
        domain: "drash.land",
        expires: -1,
        httpOnly: false,
        name: "user",
        path: "/",
        priority: "Medium",
        sameParty: false,
        secure: true,
        session: true,
        size: 6,
        sourcePort: 443,
        sourceScheme: "Secure",
        value: "ed",
      },
    ],
  },
];
