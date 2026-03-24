// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  use: {
    headless: true,
    baseURL: 'https://shopping-list-liard-one.vercel.app',
  },
});
