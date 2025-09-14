const express = require('express');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const fs = require('fs');

const SAZUMI_APP = express();
const SAZUMI_PORT = 3000;

const SAZUMI_EMAIL_API = 'https://dumdaduma.zeabur.app/new-email';
const SAZUMI_MSG_API = 'https://dumdaduma.zeabur.app/msg';
const SAZUMI_TARGET_URL = 'https://wangxutechnologyhkcolimited.pxf.io/MAzYVP';
const SAZUMI_IP_API = 'https://ipinfo.io/json';

let SAZUMI_DRIVER;
let SAZUMI_EMAIL_DATA;
let SAZUMI_PROXY_LIST = [];
let SAZUMI_PROXY_USAGE = new Map();
let SAZUMI_CURRENT_PROXY = null;

function SAZUMI_LOAD_PROXIES() {
    try {
        const SAZUMI_PROXY_DATA = fs.readFileSync('proxy.txt', 'utf8');
        SAZUMI_PROXY_LIST = SAZUMI_PROXY_DATA.split('\n').filter(proxy => proxy.trim() !== '');
        SAZUMI_PROXY_LIST.forEach(proxy => {
            SAZUMI_PROXY_USAGE.set(proxy.trim(), 0);
        });
        console.log(`[INFO] Loaded ${SAZUMI_PROXY_LIST.length} proxies`);
    } catch (error) {
        console.log(`[ERROR] Failed to load proxies: ${error.message}`);
        process.exit(1);
    }
}

function SAZUMI_GET_AVAILABLE_PROXY() {
    for (const [proxy, usage] of SAZUMI_PROXY_USAGE) {
        if (usage < 9) {
            return proxy;
        }
    }
    return null;
}

function SAZUMI_INCREMENT_PROXY_USAGE(proxy) {
    const SAZUMI_CURRENT_USAGE = SAZUMI_PROXY_USAGE.get(proxy) || 0;
    SAZUMI_PROXY_USAGE.set(proxy, SAZUMI_CURRENT_USAGE + 1);
}

async function SAZUMI_GET_IP_INFO() {
    try {
        console.log('[INFO] Getting current IP information...');
        const SAZUMI_AXIOS_CONFIG = {};
        if (SAZUMI_CURRENT_PROXY) {
            const [host, port] = SAZUMI_CURRENT_PROXY.split(':');
            SAZUMI_AXIOS_CONFIG.proxy = {
                host: host,
                port: parseInt(port)
            };
        }
        const SAZUMI_RESPONSE = await axios.get(SAZUMI_IP_API, SAZUMI_AXIOS_CONFIG);
        const SAZUMI_IP_DATA = SAZUMI_RESPONSE.data;
        console.log(`[INFO] Current IP: ${SAZUMI_IP_DATA.ip}`);
        console.log(`[INFO] Location: ${SAZUMI_IP_DATA.city}, ${SAZUMI_IP_DATA.region}, ${SAZUMI_IP_DATA.country}`);
        console.log(`[INFO] ISP: ${SAZUMI_IP_DATA.org}`);
        return SAZUMI_IP_DATA;
    } catch (error) {
        console.log(`[ERROR] Failed to get IP info: ${error.message}`);
        throw error;
    }
}

async function SAZUMI_GET_EMAIL() {
    try {
        console.log('[INFO] Getting temporary email...');
        const SAZUMI_AXIOS_CONFIG = {};
        if (SAZUMI_CURRENT_PROXY) {
            const [host, port] = SAZUMI_CURRENT_PROXY.split(':');
            SAZUMI_AXIOS_CONFIG.proxy = {
                host: host,
                port: parseInt(port)
            };
        }
        const SAZUMI_RESPONSE = await axios.get(SAZUMI_EMAIL_API, SAZUMI_AXIOS_CONFIG);
        SAZUMI_EMAIL_DATA = SAZUMI_RESPONSE.data;
        console.log(`[INFO] Email obtained: ${SAZUMI_EMAIL_DATA.email}`);
        return SAZUMI_EMAIL_DATA.email;
    } catch (error) {
        console.log(`[ERROR] Failed to get email: ${error.message}`);
        throw error;
    }
}

async function SAZUMI_GET_VERIFICATION_CODE(email) {
    const SAZUMI_MAX_ATTEMPTS = 30;
    let SAZUMI_ATTEMPTS = 0;
    
    while (SAZUMI_ATTEMPTS < SAZUMI_MAX_ATTEMPTS) {
        try {
            console.log(`[INFO] Checking for verification code... Attempt ${SAZUMI_ATTEMPTS + 1}`);
            const SAZUMI_AXIOS_CONFIG = {};
            if (SAZUMI_CURRENT_PROXY) {
                const [host, port] = SAZUMI_CURRENT_PROXY.split(':');
                SAZUMI_AXIOS_CONFIG.proxy = {
                    host: host,
                    port: parseInt(port)
                };
            }
            const SAZUMI_RESPONSE = await axios.get(`${SAZUMI_MSG_API}?email=${email}`, SAZUMI_AXIOS_CONFIG);
            
            if (SAZUMI_RESPONSE.data && SAZUMI_RESPONSE.data.message) {
                const SAZUMI_MESSAGE = SAZUMI_RESPONSE.data.message;
                const SAZUMI_CODE_MATCH = SAZUMI_MESSAGE.match(/(\d{4})/);
                
                if (SAZUMI_CODE_MATCH) {
                    const SAZUMI_CODE = SAZUMI_CODE_MATCH[1];
                    console.log(`[INFO] Verification code found: ${SAZUMI_CODE}`);
                    return SAZUMI_CODE;
                }
            }
        } catch (error) {
            console.log(`[INFO] No message yet, retrying...`);
        }
        
        SAZUMI_ATTEMPTS++;
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    throw new Error('Verification code not received');
}

function SAZUMI_GENERATE_PASSWORD() {
    const SAZUMI_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';
    let SAZUMI_PASSWORD = '';
    for (let i = 0; i < 12; i++) {
        SAZUMI_PASSWORD += SAZUMI_CHARS.charAt(Math.floor(Math.random() * SAZUMI_CHARS.length));
    }
    return SAZUMI_PASSWORD;
}

async function SAZUMI_INIT_DRIVER() {
    console.log('[INFO] Initializing Chrome driver in headless mode...');
    const SAZUMI_OPTIONS = new chrome.Options();
    SAZUMI_OPTIONS.addArguments('--headless');
    SAZUMI_OPTIONS.addArguments('--no-sandbox');
    SAZUMI_OPTIONS.addArguments('--disable-dev-shm-usage');
    SAZUMI_OPTIONS.addArguments('--disable-gpu');
    SAZUMI_OPTIONS.addArguments('--disable-blink-features=AutomationControlled');
    SAZUMI_OPTIONS.addArguments('--window-size=1920,1080');
    SAZUMI_OPTIONS.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    if (SAZUMI_CURRENT_PROXY) {
        SAZUMI_OPTIONS.addArguments(`--proxy-server=http://${SAZUMI_CURRENT_PROXY}`);
        console.log(`[INFO] Using proxy: ${SAZUMI_CURRENT_PROXY}`);
    }
    
    SAZUMI_DRIVER = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(SAZUMI_OPTIONS)
        .build();
    
    console.log('[INFO] Chrome driver initialized successfully in background');
}

async function SAZUMI_WAIT_FOR_PAGE_LOAD() {
    await SAZUMI_DRIVER.wait(until.stalenessOf(await SAZUMI_DRIVER.findElement(By.tagName('html'))), 1000).catch(() => {});
    await SAZUMI_DRIVER.wait(() => {
        return SAZUMI_DRIVER.executeScript('return document.readyState').then(state => state === 'complete');
    }, 30000);
}

async function SAZUMI_AUTOMATION_PROCESS() {
    try {
        SAZUMI_CURRENT_PROXY = SAZUMI_GET_AVAILABLE_PROXY();
        if (!SAZUMI_CURRENT_PROXY) {
            console.log('[INFO] All proxies exhausted. Stopping automation.');
            return false;
        }
        
        console.log(`[INFO] Using proxy: ${SAZUMI_CURRENT_PROXY} (Usage: ${SAZUMI_PROXY_USAGE.get(SAZUMI_CURRENT_PROXY)}/9)`);
        
        await SAZUMI_GET_IP_INFO();
        await SAZUMI_INIT_DRIVER();
        
        const SAZUMI_EMAIL = await SAZUMI_GET_EMAIL();
        
        console.log('[INFO] Navigating to PicWish...');
        await SAZUMI_DRIVER.get(SAZUMI_TARGET_URL);
        await SAZUMI_WAIT_FOR_PAGE_LOAD();
        
        console.log('[INFO] Clicking Login button...');
        const SAZUMI_LOGIN_BTN = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('span.text-white.bg-theme')), 
            30000
        );
        await SAZUMI_LOGIN_BTN.click();
        await SAZUMI_WAIT_FOR_PAGE_LOAD();
        
        console.log('[INFO] Entering email address...');
        const SAZUMI_EMAIL_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="account"]')), 
            30000
        );
        await SAZUMI_EMAIL_INPUT.clear();
        await SAZUMI_EMAIL_INPUT.sendKeys(SAZUMI_EMAIL);
        
        console.log('[INFO] Clicking Send button...');
        const SAZUMI_SEND_BTN = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('button span.text-theme')), 
            30000
        );
        await SAZUMI_SEND_BTN.click();
        
        console.log('[INFO] Waiting for verification code...');
        const SAZUMI_CODE = await SAZUMI_GET_VERIFICATION_CODE(SAZUMI_EMAIL);
        
        console.log('[INFO] Entering verification code...');
        const SAZUMI_CODE_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="captcha"]')), 
            30000
        );
        await SAZUMI_CODE_INPUT.clear();
        await SAZUMI_CODE_INPUT.sendKeys(SAZUMI_CODE);
        
        const SAZUMI_PASSWORD = SAZUMI_GENERATE_PASSWORD();
        console.log(`[INFO] Generated password: ${SAZUMI_PASSWORD}`);
        
        console.log('[INFO] Entering password...');
        const SAZUMI_PASSWORD_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="password"]')), 
            30000
        );
        await SAZUMI_PASSWORD_INPUT.clear();
        await SAZUMI_PASSWORD_INPUT.sendKeys(SAZUMI_PASSWORD);
        
        console.log('[INFO] Clicking Sign up button...');
        const SAZUMI_SIGNUP_BTN = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.id('loginRegisterBtn')), 
            30000
        );
        await SAZUMI_SIGNUP_BTN.click();
        await SAZUMI_WAIT_FOR_PAGE_LOAD();
        
        console.log('[INFO] SUCCESS - Account created successfully!');
        console.log(`[INFO] Email: ${SAZUMI_EMAIL}`);
        console.log(`[INFO] Password: ${SAZUMI_PASSWORD}`);
        console.log(`[INFO] Username: ${SAZUMI_EMAIL_DATA.username}`);
        
        SAZUMI_INCREMENT_PROXY_USAGE(SAZUMI_CURRENT_PROXY);
        return true;
        
    } catch (error) {
        console.log(`[ERROR] Automation failed: ${error.message}`);
        SAZUMI_INCREMENT_PROXY_USAGE(SAZUMI_CURRENT_PROXY);
        return true;
    } finally {
        if (SAZUMI_DRIVER) {
            await SAZUMI_DRIVER.quit();
            console.log('[INFO] Browser closed');
        }
    }
}

async function SAZUMI_START_AUTOMATION_LOOP() {
    console.log('[INFO] Starting continuous automation...');
    let SAZUMI_CONTINUE = true;
    
    while (SAZUMI_CONTINUE) {
        SAZUMI_CONTINUE = await SAZUMI_AUTOMATION_PROCESS();
        if (SAZUMI_CONTINUE) {
            console.log('[INFO] Restarting automation in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log('[INFO] Automation stopped - all proxies exhausted');
}

SAZUMI_LOAD_PROXIES();

SAZUMI_APP.listen(SAZUMI_PORT, () => {
    console.log(`[INFO] Server started on port ${SAZUMI_PORT}`);
    console.log('[INFO] Starting PicWish automation...');
    SAZUMI_START_AUTOMATION_LOOP();
});

module.exports = SAZUMI_APP;
