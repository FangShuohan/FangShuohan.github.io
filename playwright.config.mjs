import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests',
  timeout:90000,
  expect:{timeout:10000},
  workers:1,
  reporter:'list',
  outputDir:'verification/test-results',
  use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1440,height:1000},screenshot:'only-on-failure',
    launchOptions:{...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{}),args:['--enable-unsafe-swiftshader']}
  },
  webServer:{command:'npm run preview -- --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI,timeout:30000},
});
