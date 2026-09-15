import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/bank-browser',workers:1,timeout:240000,expect:{timeout:20000},use:{baseURL:'http://127.0.0.1:3103',channel:'msedge',headless:true,viewport:{width:1440,height:1000},trace:'off',screenshot:'only-on-failure'},outputDir:'.local/content-bank/browser-results',reporter:[['list']]});
