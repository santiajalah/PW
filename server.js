const express = require('express');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const UserAgent = require('user-agents');
const fs = require('fs');

const SAZUMI_APP = express();
const SAZUMI_PORT = 3000;

const SAZUMI_EMAIL_API = 'https://p01--emailtemp--nrrxdm82tt8g.code.run/new-email';
const SAZUMI_MSG_API = 'https://p01--emailtemp--nrrxdm82tt8g.code.run/msg';
const SAZUMI_TARGET_URL = 'https://wangxutechnologyhkcolimited.pxf.io/MAzYVP';
const SAZUMI_IP_API = 'https://ipinfo.io/json';

let SAZUMI_DRIVER;
let SAZUMI_EMAIL_DATA;
let SAZUMI_PROXY_LIST = [];
let SAZUMI_CURRENT_PROXY_INDEX = 0;
let SAZUMI_ACCOUNT_COUNT_PER_PROXY = 0;
let SAZUMI_MAX_ACCOUNTS_PER_PROXY = 9;

function SAZUMI_LOAD_PROXIES() {
    try {
        const SAZUMI_PROXY_DATA = fs.readFileSync('proxy.txt', 'utf8');
        SAZUMI_PROXY_LIST = SAZUMI_PROXY_DATA.split('\n').filter(line => line.trim() !== '');
        console.log(`[INFO] Loaded ${SAZUMI_PROXY_LIST.length} proxies`);
    } catch (error) {
        console.log(`[ERROR] Failed to load proxies: ${error.message}`);
        SAZUMI_PROXY_LIST = [];
    }
}

function SAZUMI_GET_CURRENT_PROXY() {
    if (SAZUMI_PROXY_LIST.length === 0) return null;
    return SAZUMI_PROXY_LIST[SAZUMI_CURRENT_PROXY_INDEX];
}

function SAZUMI_SWITCH_TO_NEXT_PROXY() {
    SAZUMI_CURRENT_PROXY_INDEX++;
    SAZUMI_ACCOUNT_COUNT_PER_PROXY = 0;
    if (SAZUMI_CURRENT_PROXY_INDEX >= SAZUMI_PROXY_LIST.length) {
        console.log('[INFO] All proxies used. Pausing registration...');
        return false;
    }
    console.log(`[INFO] Switched to proxy ${SAZUMI_CURRENT_PROXY_INDEX + 1}/${SAZUMI_PROXY_LIST.length}`);
    return true;
}

function SAZUMI_RANDOM_DELAY() {
    const SAZUMI_MIN = 10000;
    const SAZUMI_MAX = 40000;
    return Math.floor(Math.random() * (SAZUMI_MAX - SAZUMI_MIN + 1)) + SAZUMI_MIN;
}

function SAZUMI_GET_RANDOM_USER_AGENT() {
    const SAZUMI_USER_AGENT = new UserAgent();
    return SAZUMI_USER_AGENT.toString();
}

function SAZUMI_GET_RANDOM_VIEWPORT() {
    const SAZUMI_VIEWPORTS = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1536, height: 864 },
        { width: 1280, height: 720 },
        { width: 1600, height: 900 },
        { width: 1024, height: 768 },
        { width: 1680, height: 1050 },
        { width: 1280, height: 1024 },
        { width: 1360, height: 768 }
    ];
    return SAZUMI_VIEWPORTS[Math.floor(Math.random() * SAZUMI_VIEWPORTS.length)];
}

async function SAZUMI_GET_IP_INFO() {
    try {
        const SAZUMI_RESPONSE = await axios.get(SAZUMI_IP_API);
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
        const SAZUMI_RESPONSE = await axios.get(SAZUMI_EMAIL_API);
        SAZUMI_EMAIL_DATA = SAZUMI_RESPONSE.data;
        console.log(`[INFO] Email obtained: ${SAZUMI_EMAIL_DATA.email}`);
        return SAZUMI_EMAIL_DATA.email;
    } catch (error) {
        console.log(`[ERROR] Failed to get email: ${error.message}`);
        throw error;
    }
}

async function SAZUMI_GET_VERIFICATION_CODE(email) {
    const SAZUMI_MAX_ATTEMPTS = 5;
    let SAZUMI_ATTEMPTS = 0;
    while (SAZUMI_ATTEMPTS < SAZUMI_MAX_ATTEMPTS) {
        try {
            const SAZUMI_RESPONSE = await axios.get(`${SAZUMI_MSG_API}?email=${email}`);
            if (SAZUMI_RESPONSE.data && SAZUMI_RESPONSE.data.message) {
                const SAZUMI_MESSAGE = SAZUMI_RESPONSE.data.message;
                const SAZUMI_CODE_MATCH = SAZUMI_MESSAGE.match(/(\d{4})/);
                if (SAZUMI_CODE_MATCH) {
                    const SAZUMI_CODE = SAZUMI_CODE_MATCH[1];
                    console.log(`[INFO] Verification code found: ${SAZUMI_CODE}`);
                    return SAZUMI_CODE;
                }
            }
        } catch (error) {}
        SAZUMI_ATTEMPTS++;
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    return null;
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
    const SAZUMI_USER_AGENT = SAZUMI_GET_RANDOM_USER_AGENT();
    const SAZUMI_VIEWPORT = SAZUMI_GET_RANDOM_VIEWPORT();
    const SAZUMI_CURRENT_PROXY = SAZUMI_GET_CURRENT_PROXY();
    
    console.log(`[INFO] Initializing browser with User Agent: ${SAZUMI_USER_AGENT}`);
    console.log(`[INFO] Using Viewport: ${SAZUMI_VIEWPORT.width}x${SAZUMI_VIEWPORT.height}`);
    console.log(`[INFO] Using Proxy: ${SAZUMI_CURRENT_PROXY || 'None'}`);
    
    const SAZUMI_OPTIONS = new chrome.Options();
    SAZUMI_OPTIONS.addArguments('--headless');
    SAZUMI_OPTIONS.addArguments('--no-sandbox');
    SAZUMI_OPTIONS.addArguments('--disable-dev-shm-usage');
    SAZUMI_OPTIONS.addArguments('--disable-gpu');
    SAZUMI_OPTIONS.addArguments('--disable-blink-features=AutomationControlled');
    SAZUMI_OPTIONS.addArguments(`--window-size=${SAZUMI_VIEWPORT.width},${SAZUMI_VIEWPORT.height}`);
    SAZUMI_OPTIONS.addArguments(`--user-agent=${SAZUMI_USER_AGENT}`);
    SAZUMI_OPTIONS.addArguments('--disable-web-security');
    SAZUMI_OPTIONS.addArguments('--disable-features=VizDisplayCompositor');
    SAZUMI_OPTIONS.addArguments('--disable-extensions');
    SAZUMI_OPTIONS.addArguments('--enable-local-storage');
    SAZUMI_OPTIONS.excludeSwitches(['enable-automation']);
    
    if (SAZUMI_CURRENT_PROXY) {
        SAZUMI_OPTIONS.addArguments(`--proxy-server=${SAZUMI_CURRENT_PROXY}`);
    }
    
    SAZUMI_DRIVER = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(SAZUMI_OPTIONS)
        .build();
    
    await SAZUMI_DRIVER.executeScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
}

async function SAZUMI_CLEAR_BROWSER_DATA() {
    try {
        const SAZUMI_USER_AGENT = SAZUMI_GET_RANDOM_USER_AGENT();
        const SAZUMI_VIEWPORT = SAZUMI_GET_RANDOM_VIEWPORT();
        
        console.log(`[INFO] Clearing browser data and setting new identity`);
        console.log(`[INFO] New User Agent: ${SAZUMI_USER_AGENT}`);
        console.log(`[INFO] New Viewport: ${SAZUMI_VIEWPORT.width}x${SAZUMI_VIEWPORT.height}`);
        
        await SAZUMI_DRIVER.manage().deleteAllCookies();
        
        await SAZUMI_DRIVER.executeScript(`
            localStorage.clear();
            sessionStorage.clear();
            indexedDB.databases().then(databases => {
                databases.forEach(db => {
                    indexedDB.deleteDatabase(db.name);
                });
            });
        `);
        
        await SAZUMI_DRIVER.executeScript(`
            Object.defineProperty(navigator, 'userAgent', {
                get: () => '${SAZUMI_USER_AGENT}'
            });
        `);
        
        await SAZUMI_DRIVER.manage().window().setRect({
            width: SAZUMI_VIEWPORT.width,
            height: SAZUMI_VIEWPORT.height
        });
        
        console.log(`[INFO] Browser data cleared successfully`);
    } catch (error) {
        console.log(`[ERROR] Failed to clear browser data: ${error.message}`);
    }
}

async function SAZUMI_SINGLE_REGISTRATION() {
    let success = false;
    try {
        if (!SAZUMI_DRIVER) {
            await SAZUMI_INIT_DRIVER();
        } else {
            await SAZUMI_CLEAR_BROWSER_DATA();
        }
        
        const SAZUMI_EMAIL = await SAZUMI_GET_EMAIL();
        await SAZUMI_DRIVER.get(SAZUMI_TARGET_URL);
        await SAZUMI_DRIVER.sleep(3000);
        
        const SAZUMI_LOGIN_BTN = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('span.text-white.bg-theme')), 10000
        );
        await SAZUMI_LOGIN_BTN.click();
        await SAZUMI_DRIVER.sleep(2000);
        
        const SAZUMI_EMAIL_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="account"]')), 10000
        );
        await SAZUMI_EMAIL_INPUT.clear();
        await SAZUMI_EMAIL_INPUT.sendKeys(SAZUMI_EMAIL);
        
        const SAZUMI_SEND_BTN = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('button span.text-theme')), 10000
        );
        await SAZUMI_SEND_BTN.click();
        
        const SAZUMI_CODE = await SAZUMI_GET_VERIFICATION_CODE(SAZUMI_EMAIL);
        if (!SAZUMI_CODE) throw new Error('No verification code');
        
        const SAZUMI_CODE_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="captcha"]')), 10000
        );
        await SAZUMI_CODE_INPUT.clear();
        await SAZUMI_CODE_INPUT.sendKeys(SAZUMI_CODE);
        
        const SAZUMI_PASSWORD = SAZUMI_GENERATE_PASSWORD();
        const SAZUMI_PASSWORD_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="password"]')), 10000
        );
        await SAZUMI_PASSWORD_INPUT.clear();
        await SAZUMI_PASSWORD_INPUT.sendKeys(SAZUMI_PASSWORD);
        
        const SAZUMI_SIGNUP_BTN = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.id('loginRegisterBtn')), 10000
        );
        await SAZUMI_SIGNUP_BTN.click();
        await SAZUMI_DRIVER.sleep(5000);
        
        console.log('[INFO] SUCCESS - Account created successfully!');
        console.log(`[INFO] Email: ${SAZUMI_EMAIL}`);
        console.log(`[INFO] Password: ${SAZUMI_PASSWORD}`);
        console.log(`[INFO] Username: ${SAZUMI_EMAIL_DATA.username}`);
        success = true;
        SAZUMI_ACCOUNT_COUNT_PER_PROXY++;
    } catch (error) {
        console.log(`[ERROR] Registration failed: ${error.message}`);
        if (SAZUMI_DRIVER) {
            await SAZUMI_DRIVER.quit();
            SAZUMI_DRIVER = null;
        }
    }
    return success;
}

async function SAZUMI_CONTINUOUS_REGISTRATION() {
    SAZUMI_LOAD_PROXIES();
    
    if (SAZUMI_PROXY_LIST.length === 0) {
        console.log('[ERROR] No proxies available. Please add proxies to proxy.txt');
        return;
    }
    
    await SAZUMI_GET_IP_INFO();
    
    process.on('SIGINT', async () => {
        console.log('[INFO] Shutting down...');
        if (SAZUMI_DRIVER) {
            await SAZUMI_DRIVER.quit();
            console.log('[INFO] Browser closed');
        }
        process.exit(0);
    });
    
    while (true) {
        if (SAZUMI_CURRENT_PROXY_INDEX >= SAZUMI_PROXY_LIST.length) {
            console.log('[INFO] All proxies exhausted. Waiting for proxy.txt update...');
            while (true) {
                SAZUMI_LOAD_PROXIES();
                if (SAZUMI_PROXY_LIST.length > 0) {
                    SAZUMI_CURRENT_PROXY_INDEX = 0;
                    SAZUMI_ACCOUNT_COUNT_PER_PROXY = 0;
                    console.log('[INFO] New proxies loaded. Resuming registration...');
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }
        
        const result = await SAZUMI_SINGLE_REGISTRATION();
        
        if (result && SAZUMI_ACCOUNT_COUNT_PER_PROXY >= SAZUMI_MAX_ACCOUNTS_PER_PROXY) {
            console.log(`[INFO] Reached ${SAZUMI_MAX_ACCOUNTS_PER_PROXY} accounts for current proxy. Switching...`);
            if (SAZUMI_DRIVER) {
                await SAZUMI_DRIVER.quit();
                SAZUMI_DRIVER = null;
            }
            SAZUMI_SWITCH_TO_NEXT_PROXY();
        } else if (!result) {
            console.log('[INFO] Registration failed. Switching to next proxy...');
            if (SAZUMI_DRIVER) {
                await SAZUMI_DRIVER.quit();
                SAZUMI_DRIVER = null;
            }
            if (!SAZUMI_SWITCH_TO_NEXT_PROXY()) {
                continue;
            }
        }
        
        if (result) {
            const SAZUMI_NEXT_DELAY = SAZUMI_RANDOM_DELAY();
            console.log(`[INFO] Waiting ${SAZUMI_NEXT_DELAY / 1000} seconds before next registration...`);
            await new Promise(resolve => setTimeout(resolve, SAZUMI_NEXT_DELAY));
        }
    }
}

SAZUMI_APP.listen(SAZUMI_PORT, () => {
    console.log(`[INFO] Server started on port ${SAZUMI_PORT}`);
    SAZUMI_CONTINUOUS_REGISTRATION();
});

module.exports = SAZUMI_APP;
