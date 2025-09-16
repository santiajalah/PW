const express = require('express');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const UserAgent = require('user-agents');

const SAZUMI_APP = express();
const SAZUMI_PORT = 3000;

const SAZUMI_EMAIL_API = 'https://dumdaduma.zeabur.app/new-email';
const SAZUMI_MSG_API = 'https://dumdaduma.zeabur.app/msg';
const SAZUMI_TARGET_URL = 'https://wangxutechnologyhkcolimited.pxf.io/MAzYVP';
const SAZUMI_IP_API = 'https://ipinfo.io/json';

let SAZUMI_DRIVER;
let SAZUMI_EMAIL_DATA;

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
        '1920,1080', '1366,768', '1440,900', '1536,864', '1280,720',
        '1600,900', '1024,768', '1680,1050', '1280,1024', '1360,768'
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
    const SAZUMI_MAX_ATTEMPTS = 10;
    let SAZUMI_ATTEMPTS = 0;
    while (SAZUMI_ATTEMPTS < SAZUMI_MAX_ATTEMPTS) {
        try {
            const SAZUMI_RESPONSE = await axios.get(`${SAZUMI_MSG_API}?email=${email}`);
            if (SAZUMI_RESPONSE.data && SAZUMI_RESPONSE.data.message) {
                const SAZUMI_MESSAGE = SAZUMI_RESPONSE.data.message;
                const SAZUMI_CODE_MATCH = SAZUMI_MESSAGE.match(/(\d{4,6})/);
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
    console.log(`[INFO] Using User Agent: ${SAZUMI_USER_AGENT}`);
    console.log(`[INFO] Using Viewport: ${SAZUMI_VIEWPORT}`);
    const SAZUMI_OPTIONS = new chrome.Options();
    SAZUMI_OPTIONS.addArguments('--headless');
    SAZUMI_OPTIONS.addArguments('--no-sandbox');
    SAZUMI_OPTIONS.addArguments('--disable-dev-shm-usage');
    SAZUMI_OPTIONS.addArguments('--disable-gpu');
    SAZUMI_OPTIONS.addArguments('--disable-blink-features=AutomationControlled');
    SAZUMI_OPTIONS.addArguments(`--window-size=${SAZUMI_VIEWPORT}`);
    SAZUMI_OPTIONS.addArguments(`--user-agent=${SAZUMI_USER_AGENT}`);
    SAZUMI_OPTIONS.addArguments('--disable-web-security');
    SAZUMI_OPTIONS.addArguments('--disable-features=VizDisplayCompositor');
    SAZUMI_OPTIONS.addArguments('--disable-extensions');
    SAZUMI_OPTIONS.excludeSwitches(['enable-automation']);
    SAZUMI_DRIVER = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(SAZUMI_OPTIONS)
        .build();
    await SAZUMI_DRIVER.executeScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
}

async function SAZUMI_SINGLE_REGISTRATION() {
    let success = false;
    try {
        await SAZUMI_INIT_DRIVER();
        const SAZUMI_EMAIL = await SAZUMI_GET_EMAIL();
        await SAZUMI_DRIVER.get(SAZUMI_TARGET_URL);
        await SAZUMI_DRIVER.wait(until.elementLocated(By.css('body')), 15000);

        // 1. Klik tombol LOGIN/Sign In (gunakan selector yang lebih general dan fallback)
        let SAZUMI_LOGIN_BTN;
        try {
            SAZUMI_LOGIN_BTN = await SAZUMI_DRIVER.wait(
                until.elementLocated(By.xpath("//span[contains(text(), 'Login') or contains(text(), 'Sign in') or contains(text(), 'Masuk') or contains(@class, 'bg-theme')]")),
                15000
            );
        } catch {
            SAZUMI_LOGIN_BTN = await SAZUMI_DRIVER.findElement(By.css('span.bg-theme, span.text-white.bg-theme'));
        }
        await SAZUMI_LOGIN_BTN.click();
        await SAZUMI_DRIVER.sleep(1500);

        // 2. Input email
        const SAZUMI_EMAIL_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="account"], input[type="email"]')), 15000
        );
        await SAZUMI_EMAIL_INPUT.clear();
        await SAZUMI_EMAIL_INPUT.sendKeys(SAZUMI_EMAIL);

        // 3. Klik tombol SEND
        let SAZUMI_SEND_BTN;
        try {
            SAZUMI_SEND_BTN = await SAZUMI_DRIVER.wait(
                until.elementLocated(By.xpath("//button[.//span[contains(text(), 'Send') or contains(text(), 'Verifikasi') or contains(text(), 'Kirim') or contains(text(), 'Get') or contains(text(), 'Dapatkan')]]")),
                10000
            );
        } catch {
            SAZUMI_SEND_BTN = await SAZUMI_DRIVER.findElement(By.css('button span.text-theme'));
        }
        await SAZUMI_SEND_BTN.click();

        // 4. Tunggu kode OTP
        const SAZUMI_CODE = await SAZUMI_GET_VERIFICATION_CODE(SAZUMI_EMAIL);
        if (!SAZUMI_CODE) throw new Error('No verification code');

        // 5. Input OTP/code
        const SAZUMI_CODE_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="captcha"], input[type="tel"]')), 10000
        );
        await SAZUMI_CODE_INPUT.clear();
        await SAZUMI_CODE_INPUT.sendKeys(SAZUMI_CODE);

        // 6. Generate password dan input password
        const SAZUMI_PASSWORD = SAZUMI_GENERATE_PASSWORD();
        const SAZUMI_PASSWORD_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="password"], input[type="password"]')), 10000
        );
        await SAZUMI_PASSWORD_INPUT.clear();
        await SAZUMI_PASSWORD_INPUT.sendKeys(SAZUMI_PASSWORD);

        // 7. Klik Sign Up/Register
        let SAZUMI_SIGNUP_BTN;
        try {
            SAZUMI_SIGNUP_BTN = await SAZUMI_DRIVER.wait(
                until.elementLocated(By.xpath("//button[contains(@id, 'loginRegisterBtn') or contains(text(), 'Sign up') or contains(text(), 'Register') or contains(text(), 'Daftar') or contains(text(), 'Buat') or contains(text(), 'Gabung')]")),
                10000
            );
        } catch {
            SAZUMI_SIGNUP_BTN = await SAZUMI_DRIVER.findElement(By.css('#loginRegisterBtn'));
        }
        await SAZUMI_SIGNUP_BTN.click();

        await SAZUMI_DRIVER.sleep(5000);
        console.log('[INFO] SUCCESS - Account created successfully!');
        console.log(`[INFO] Email: ${SAZUMI_EMAIL}`);
        console.log(`[INFO] Password: ${SAZUMI_PASSWORD}`);
        console.log(`[INFO] Username: ${SAZUMI_EMAIL_DATA.username}`);
        success = true;
    } catch (error) {
        console.log(`[ERROR] Registration failed: ${error.message}`);
    } finally {
        if (SAZUMI_DRIVER) {
            await SAZUMI_DRIVER.quit();
            console.log('[INFO] Browser closed');
        }
    }
    return success;
}

async function SAZUMI_CONTINUOUS_REGISTRATION() {
    await SAZUMI_GET_IP_INFO();
    while (true) {
        const result = await SAZUMI_SINGLE_REGISTRATION();
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
