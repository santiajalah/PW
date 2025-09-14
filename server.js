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
let SAZUMI_CURRENT_PROXY_INDEX = 0;

function SAZUMI_LOAD_PROXIES() {
    try {
        const SAZUMI_PROXY_DATA = fs.readFileSync('proxy.txt', 'utf8');
        SAZUMI_PROXY_LIST = SAZUMI_PROXY_DATA.split('\n').filter(proxy => proxy.trim());
        console.log(`[INFO] Loaded ${SAZUMI_PROXY_LIST.length} proxies`);
    } catch (error) {
        console.log(`[ERROR] Failed to load proxies: ${error.message}`);
    }
}

function SAZUMI_GET_NEXT_PROXY() {
    while (SAZUMI_CURRENT_PROXY_INDEX < SAZUMI_PROXY_LIST.length) {
        const SAZUMI_PROXY = SAZUMI_PROXY_LIST[SAZUMI_CURRENT_PROXY_INDEX];
        const SAZUMI_USAGE_COUNT = SAZUMI_PROXY_USAGE.get(SAZUMI_PROXY) || 0;
        
        if (SAZUMI_USAGE_COUNT < 9) {
            SAZUMI_PROXY_USAGE.set(SAZUMI_PROXY, SAZUMI_USAGE_COUNT + 1);
            console.log(`[INFO] Using proxy: ${SAZUMI_PROXY} (Usage: ${SAZUMI_USAGE_COUNT + 1}/9)`);
            return SAZUMI_PROXY;
        }
        
        SAZUMI_CURRENT_PROXY_INDEX++;
    }
    
    console.log('[ERROR] All proxies exhausted!');
    return null;
}

async function SAZUMI_GET_IP_INFO() {
    try {
        console.log('[INFO] Getting current IP information...');
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
        console.log('[INFO] Getting temporary email...');
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
    const SAZUMI_MAX_ATTEMPTS = 30;
    let SAZUMI_ATTEMPTS = 0;
    
    while (SAZUMI_ATTEMPTS < SAZUMI_MAX_ATTEMPTS) {
        try {
            console.log(`[INFO] Checking for verification code... Attempt ${SAZUMI_ATTEMPTS + 1}`);
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
    const SAZUMI_PROXY = SAZUMI_GET_NEXT_PROXY();
    if (!SAZUMI_PROXY) {
        throw new Error('No available proxies');
    }
    
    console.log('[INFO] Initializing Chrome driver with proxy...');
    const SAZUMI_OPTIONS = new chrome.Options();
    SAZUMI_OPTIONS.addArguments('--headless');
    SAZUMI_OPTIONS.addArguments('--no-sandbox');
    SAZUMI_OPTIONS.addArguments('--disable-dev-shm-usage');
    SAZUMI_OPTIONS.addArguments('--disable-gpu');
    SAZUMI_OPTIONS.addArguments('--disable-blink-features=AutomationControlled');
    SAZUMI_OPTIONS.addArguments('--window-size=1920,1080');
    SAZUMI_OPTIONS.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    SAZUMI_OPTIONS.addArguments(`--proxy-server=http://${SAZUMI_PROXY}`);
    
    SAZUMI_DRIVER = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(SAZUMI_OPTIONS)
        .build();
    
    console.log('[INFO] Chrome driver initialized with proxy');
}

async function SAZUMI_AUTOMATION_PROCESS() {
    try {
        await SAZUMI_GET_IP_INFO();
        
        await SAZUMI_INIT_DRIVER();
        
        const SAZUMI_EMAIL = await SAZUMI_GET_EMAIL();
        
        console.log('[INFO] Navigating to PicWish...');
        await SAZUMI_DRIVER.get(SAZUMI_TARGET_URL);
        await SAZUMI_DRIVER.sleep(3000);
        
        console.log('[INFO] Clicking Login button...');
        const SAZUMI_LOGIN_BTN = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('span.text-white.bg-theme')), 
            10000
        );
        await SAZUMI_LOGIN_BTN.click();
        await SAZUMI_DRIVER.sleep(2000);
        
        console.log('[INFO] Entering email address...');
        const SAZUMI_EMAIL_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="account"]')), 
            10000
        );
        await SAZUMI_EMAIL_INPUT.clear();
        await SAZUMI_EMAIL_INPUT.sendKeys(SAZUMI_EMAIL);
        
        console.log('[INFO] Clicking Send button...');
        const SAZUMI_SEND_BTN = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('button span.text-theme')), 
            10000
        );
        await SAZUMI_SEND_BTN.click();
        
        console.log('[INFO] Waiting for verification code...');
        const SAZUMI_CODE = await SAZUMI_GET_VERIFICATION_CODE(SAZUMI_EMAIL);
        
        console.log('[INFO] Entering verification code...');
        const SAZUMI_CODE_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="captcha"]')), 
            10000
        );
        await SAZUMI_CODE_INPUT.clear();
        await SAZUMI_CODE_INPUT.sendKeys(SAZUMI_CODE);
        
        const SAZUMI_PASSWORD = SAZUMI_GENERATE_PASSWORD();
        console.log(`[INFO] Generated password: ${SAZUMI_PASSWORD}`);
        
        console.log('[INFO] Entering password...');
        const SAZUMI_PASSWORD_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="password"]')), 
            10000
        );
        await SAZUMI_PASSWORD_INPUT.clear();
        await SAZUMI_PASSWORD_INPUT.sendKeys(SAZUMI_PASSWORD);
        
        console.log('[INFO] Clicking Sign up button...');
        const SAZUMI_SIGNUP_BTN = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.id('loginRegisterBtn')), 
            10000
        );
        await SAZUMI_SIGNUP_BTN.click();
        
        await SAZUMI_DRIVER.sleep(5000);
        
        console.log('[INFO] SUCCESS - Account created successfully!');
        console.log(`[INFO] Email: ${SAZUMI_EMAIL}`);
        console.log(`[INFO] Password: ${SAZUMI_PASSWORD}`);
        console.log(`[INFO] Username: ${SAZUMI_EMAIL_DATA.username}`);
        
        return true;
        
    } catch (error) {
        console.log(`[ERROR] Automation failed: ${error.message}`);
        return false;
    } finally {
        if (SAZUMI_DRIVER) {
            await SAZUMI_DRIVER.quit();
        }
    }
}

async function SAZUMI_CONTINUOUS_PROCESS() {
    SAZUMI_LOAD_PROXIES();
    
    while (SAZUMI_CURRENT_PROXY_INDEX < SAZUMI_PROXY_LIST.length) {
        console.log('[INFO] Starting new account creation cycle...');
        
        const SAZUMI_SUCCESS = await SAZUMI_AUTOMATION_PROCESS();
        
        if (SAZUMI_SUCCESS) {
            console.log('[INFO] Account created successfully, starting next cycle...');
        } else {
            console.log('[INFO] Failed, retrying with next proxy...');
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('[INFO] All proxies exhausted. Process completed.');
}

SAZUMI_APP.listen(SAZUMI_PORT, () => {
    console.log(`[INFO] Server started on port ${SAZUMI_PORT}`);
    console.log('[INFO] Starting continuous PicWish automation...');
    SAZUMI_CONTINUOUS_PROCESS();
});

module.exports = SAZUMI_APP;
