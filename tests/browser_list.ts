export const browserList: Array<{
  name: "chrome" | "firefox";
  errors: {
    page_not_exist_message: string;
  };
}> = [
  {
    name: "chrome",
    errors: {
      page_not_exist_message:
        'NS_ERROR_UNKNOWN_HOST: Error for navigating to page "https://hellaDOCSWOWThispagesurelycantexist.biscuit"',
    },
  },
  {
    name: "firefox",
    errors: {
      page_not_exist_message:
        'net::ERR_NAME_NOT_RESOLVED: Error for navigating to page "https://hellaDOCSWOWThispagesurelycantexist.biscuit"',
    },
  },
];
