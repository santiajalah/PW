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

let SAZUMI_DRIVER;
let SAZUMI_EMAIL_DATA;
let SAZUMI_PROXY_LIST = [];
let SAZUMI_PROXY_USAGE = {};
let SAZUMI_CURRENT_PROXY_INDEX = 0;

function SAZUMI_LOAD_PROXIES() {
    try {
        console.log('[INFO] Loading proxy list...');
        const SAZUMI_PROXY_DATA = fs.readFileSync('proxy.txt', 'utf8');
        SAZUMI_PROXY_LIST = SAZUMI_PROXY_DATA.split('\n').filter(proxy => proxy.trim() !== '');
        
        SAZUMI_PROXY_LIST.forEach(proxy => {
            SAZUMI_PROXY_USAGE[proxy] = 0;
        });
        
        console.log(`[INFO] Loaded ${SAZUMI_PROXY_LIST.length} proxies`);
    } catch (error) {
        console.log(`[ERROR] Failed to load proxies: ${error.message}`);
        throw error;
    }
}

function SAZUMI_GET_NEXT_PROXY() {
    while (SAZUMI_CURRENT_PROXY_INDEX < SAZUMI_PROXY_LIST.length) {
        const SAZUMI_PROXY = SAZUMI_PROXY_LIST[SAZUMI_CURRENT_PROXY_INDEX];
        
        if (SAZUMI_PROXY_USAGE[SAZUMI_PROXY] < 9) {
            SAZUMI_PROXY_USAGE[SAZUMI_PROXY]++;
            console.log(`[INFO] Using proxy: ${SAZUMI_PROXY} (Usage: ${SAZUMI_PROXY_USAGE[SAZUMI_PROXY]}/9)`);
            return SAZUMI_PROXY;
        } else {
            console.log(`[INFO] Proxy ${SAZUMI_PROXY} reached max usage (9/9), switching to next proxy`);
            SAZUMI_CURRENT_PROXY_INDEX++;
        }
    }
    
    throw new Error('All proxies have been exhausted');
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


async function SAZUMI_SINGLE_AUTOMATION() {
    let SAZUMI_DRIVER_LOCAL;
    try {
        console.log('[INFO] Initializing Chrome driver in headless mode...');
        const SAZUMI_PROXY = SAZUMI_GET_NEXT_PROXY();
        const SAZUMI_OPTIONS = new chrome.Options();
        SAZUMI_OPTIONS.addArguments('--headless');
        SAZUMI_OPTIONS.addArguments('--no-sandbox');
        SAZUMI_OPTIONS.addArguments('--disable-dev-shm-usage');
        SAZUMI_OPTIONS.addArguments('--disable-gpu');
        SAZUMI_OPTIONS.addArguments('--disable-blink-features=AutomationControlled');
        SAZUMI_OPTIONS.addArguments('--window-size=1920,1080');
        SAZUMI_OPTIONS.addArguments(`--proxy-server=http://${SAZUMI_PROXY}`);
        SAZUMI_OPTIONS.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        SAZUMI_DRIVER_LOCAL = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(SAZUMI_OPTIONS)
            .build();
        
        console.log('[INFO] Chrome driver initialized successfully with proxy in background');
        
        const SAZUMI_EMAIL = await SAZUMI_GET_EMAIL();
        
        console.log('[INFO] Navigating to PicWish...');
        await SAZUMI_DRIVER_LOCAL.get(SAZUMI_TARGET_URL);
        await SAZUMI_DRIVER_LOCAL.sleep(5000);
        
        console.log('[INFO] Waiting for page to fully load...');
        await SAZUMI_DRIVER_LOCAL.wait(until.titleContains('PicWish'), 15000);
        
        console.log('[INFO] Looking for Login button...');
        let SAZUMI_LOGIN_BTN;
        try {
            SAZUMI_LOGIN_BTN = await SAZUMI_DRIVER_LOCAL.wait(
                until.elementLocated(By.xpath("//span[contains(@class, 'text-white') and contains(@class, 'bg-theme') and text()='Log in']")), 
                5000
            );
        } catch (error) {
            console.log('[INFO] First selector failed, trying alternative selectors...');
            try {
                SAZUMI_LOGIN_BTN = await SAZUMI_DRIVER_LOCAL.wait(
                    until.elementLocated(By.xpath("//span[text()='Log in']")), 
                    5000
                );
            } catch (error2) {
                try {
                    SAZUMI_LOGIN_BTN = await SAZUMI_DRIVER_LOCAL.wait(
                        until.elementLocated(By.css('span.text-white.bg-theme')), 
                        5000
                    );
                } catch (error3) {
                    SAZUMI_LOGIN_BTN = await SAZUMI_DRIVER_LOCAL.wait(
                        until.elementLocated(By.xpath("//span[contains(@class, 'bg-theme')]")), 
                        5000
                    );
                }
            }
        }
        
        console.log('[INFO] Login button found, clicking...');
        await SAZUMI_LOGIN_BTN.click();
        await SAZUMI_DRIVER_LOCAL.sleep(3000);
        
        console.log('[INFO] Entering email address...');
        const SAZUMI_EMAIL_INPUT = await SAZUMI_DRIVER_LOCAL.wait(
            until.elementLocated(By.css('input[name="account"]')), 
            10000
        );
        await SAZUMI_EMAIL_INPUT.clear();
        await SAZUMI_EMAIL_INPUT.sendKeys(SAZUMI_EMAIL);
        
        console.log('[INFO] Looking for Send button...');
        let SAZUMI_SEND_BTN;
        try {
            SAZUMI_SEND_BTN = await SAZUMI_DRIVER_LOCAL.wait(
                until.elementLocated(By.xpath("//button[@type='button']//span[contains(@class, 'text-theme') and text()='Send']")), 
                5000
            );
        } catch (error) {
            console.log('[INFO] First Send selector failed, trying alternatives...');
            try {
                SAZUMI_SEND_BTN = await SAZUMI_DRIVER_LOCAL.wait(
                    until.elementLocated(By.xpath("//span[text()='Send']")), 
                    5000
                );
            } catch (error2) {
                try {
                    SAZUMI_SEND_BTN = await SAZUMI_DRIVER_LOCAL.wait(
                        until.elementLocated(By.css('button[type="button"]')), 
                        5000
                    );
                } catch (error3) {
                    SAZUMI_SEND_BTN = await SAZUMI_DRIVER_LOCAL.wait(
                        until.elementLocated(By.xpath("//button[contains(., 'Send')]")), 
                        5000
                    );
                }
            }
        }
        
        console.log('[INFO] Send button found, clicking...');
        await SAZUMI_SEND_BTN.click();
        
        console.log('[INFO] Waiting for verification code...');
        const SAZUMI_CODE = await SAZUMI_GET_VERIFICATION_CODE(SAZUMI_EMAIL);
        
        console.log('[INFO] Entering verification code...');
        const SAZUMI_CODE_INPUT = await SAZUMI_DRIVER_LOCAL.wait(
            until.elementLocated(By.css('input[name="captcha"]')), 
            10000
        );
        await SAZUMI_CODE_INPUT.clear();
        await SAZUMI_CODE_INPUT.sendKeys(SAZUMI_CODE);
        
        const SAZUMI_PASSWORD = SAZUMI_GENERATE_PASSWORD();
        console.log(`[INFO] Generated password: ${SAZUMI_PASSWORD}`);
        
        console.log('[INFO] Entering password...');
        const SAZUMI_PASSWORD_INPUT = await SAZUMI_DRIVER_LOCAL.wait(
            until.elementLocated(By.css('input[name="password"]')), 
            10000
        );
        await SAZUMI_PASSWORD_INPUT.clear();
        await SAZUMI_PASSWORD_INPUT.sendKeys(SAZUMI_PASSWORD);
        
        console.log('[INFO] Clicking Sign up button...');
        const SAZUMI_SIGNUP_BTN = await SAZUMI_DRIVER_LOCAL.wait(
            until.elementLocated(By.id('loginRegisterBtn')), 
            10000
        );
        await SAZUMI_SIGNUP_BTN.click();
        
        await SAZUMI_DRIVER_LOCAL.sleep(5000);
        
        console.log('[INFO] SUCCESS - Account created successfully!');
        console.log(`[INFO] Email: ${SAZUMI_EMAIL}`);
        console.log(`[INFO] Password: ${SAZUMI_PASSWORD}`);
        console.log(`[INFO] Username: ${SAZUMI_EMAIL_DATA.username}`);
        
        return true;
        
    } catch (error) {
        console.log(`[ERROR] Automation failed: ${error.message}`);
        return false;
    } finally {
        if (SAZUMI_DRIVER_LOCAL) {
            await SAZUMI_DRIVER_LOCAL.quit();
            console.log('[INFO] Browser closed');
        }
    }
}

async function SAZUMI_AUTOMATION_PROCESS() {
    let SAZUMI_ACCOUNT_COUNT = 0;
    
    while (true) {
        try {
            console.log(`[INFO] Starting automation attempt #${SAZUMI_ACCOUNT_COUNT + 1}...`);
            
            const SAZUMI_SUCCESS = await SAZUMI_SINGLE_AUTOMATION();
            
            if (SAZUMI_SUCCESS) {
                SAZUMI_ACCOUNT_COUNT++;
                console.log(`[INFO] Total accounts created: ${SAZUMI_ACCOUNT_COUNT}`);
                console.log('[INFO] Waiting 3 seconds before next attempt...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                console.log('[ERROR] Attempt failed, retrying immediately...');
            }
            
        } catch (error) {
            if (error.message === 'All proxies have been exhausted') {
                console.log('[INFO] All proxies exhausted. Stopping automation.');
                console.log(`[INFO] Final total accounts created: ${SAZUMI_ACCOUNT_COUNT}`);
                break;
            } else {
                console.log(`[ERROR] Unexpected error: ${error.message}`);
                console.log('[ERROR] Retrying in 5 seconds...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
}

SAZUMI_APP.listen(SAZUMI_PORT, () => {
    console.log(`[INFO] Server started on port ${SAZUMI_PORT}`);
    console.log('[INFO] Loading proxies and starting PicWish automation...');
    SAZUMI_LOAD_PROXIES();
    SAZUMI_AUTOMATION_PROCESS();
});

module.exports = SAZUMI_APP;
