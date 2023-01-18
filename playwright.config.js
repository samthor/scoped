/** @type {import("@playwright/test").PlaywrightTestConfig} */
module.exports = exports = {
  webServer: {
    command: "serve -l 4200",
    url: "http://localhost:4200/",
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:4200/",
  },
};
