const express = require('express');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const UserAgent = require('user-agents');
const crypto = require('crypto');
const os = require('os');

const SAZUMI_APP = express();
const SAZUMI_PORT = 3000;

const SAZUMI_EMAIL_API = 'https://p01--emailtemp--nrrxdm82tt8g.code.run/new-email';
const SAZUMI_MSG_API = 'https://p01--emailtemp--nrrxdm82tt8g.code.run/msg';
const SAZUMI_TARGET_URL = 'https://wangxutechnologyhkcolimited.pxf.io/MAzYVP';
const SAZUMI_IP_API = 'https://ipinfo.io/json';

let SAZUMI_DRIVER;
let SAZUMI_EMAIL_DATA;
let SAZUMI_SESSION_COUNT = 0;
let SAZUMI_FINGERPRINT_CACHE = new Map();
let SAZUMI_REQUEST_COUNT = 0;
let SAZUMI_LAST_REQUEST_TIME = 0;
let SAZUMI_COOLDOWN_ACTIVE = false;

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

function SAZUMI_GENERATE_BROWSER_FINGERPRINT() {
    const SAZUMI_RANDOM_ID = crypto.randomBytes(16).toString('hex');
    const SAZUMI_CANVAS_NOISE = Math.floor(Math.random() * 1000000);
    const SAZUMI_WEBGL_VENDOR = ['Intel Inc.', 'NVIDIA Corporation', 'AMD', 'Qualcomm'][Math.floor(Math.random() * 4)];
    const SAZUMI_PLATFORM = ['Win32', 'MacIntel', 'Linux x86_64'][Math.floor(Math.random() * 3)];
    const SAZUMI_LANGUAGE = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES'][Math.floor(Math.random() * 5)];
    
    return {
        id: SAZUMI_RANDOM_ID,
        canvasNoise: SAZUMI_CANVAS_NOISE,
        webglVendor: SAZUMI_WEBGL_VENDOR,
        platform: SAZUMI_PLATFORM,
        language: SAZUMI_LANGUAGE,
        timezone: Math.floor(Math.random() * 24) - 12
    };
}

function SAZUMI_GENERATE_MAC_ADDRESS() {
    const SAZUMI_MAC_PARTS = [];
    for (let i = 0; i < 6; i++) {
        SAZUMI_MAC_PARTS.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
    }
    return SAZUMI_MAC_PARTS.join(':');
}

function SAZUMI_GENERATE_SYSTEM_SPECS() {
    const SAZUMI_PROCESSORS = ['Intel Core i7-10700K', 'AMD Ryzen 7 3700X', 'Intel Core i5-11400F', 'AMD Ryzen 5 5600X'];
    const SAZUMI_MEMORY_SIZES = [8, 16, 32, 64];
    const SAZUMI_GPU_MODELS = ['NVIDIA GeForce RTX 3070', 'AMD Radeon RX 6700 XT', 'NVIDIA GeForce GTX 1660', 'AMD Radeon RX 580'];
    
    return {
        processor: SAZUMI_PROCESSORS[Math.floor(Math.random() * SAZUMI_PROCESSORS.length)],
        memory: SAZUMI_MEMORY_SIZES[Math.floor(Math.random() * SAZUMI_MEMORY_SIZES.length)],
        gpu: SAZUMI_GPU_MODELS[Math.floor(Math.random() * SAZUMI_GPU_MODELS.length)],
        macAddress: SAZUMI_GENERATE_MAC_ADDRESS()
    };
}

function SAZUMI_CALCULATE_ADAPTIVE_DELAY() {
    const SAZUMI_BASE_DELAY = 60000;
    const SAZUMI_MULTIPLIER = Math.min(SAZUMI_REQUEST_COUNT / 5, 10);
    const SAZUMI_RANDOM_FACTOR = Math.random() * 0.5 + 0.75;
    return Math.floor(SAZUMI_BASE_DELAY * SAZUMI_MULTIPLIER * SAZUMI_RANDOM_FACTOR);
}

function SAZUMI_CHECK_RATE_LIMIT_THRESHOLD() {
    const SAZUMI_CURRENT_TIME = Date.now();
    const SAZUMI_TIME_WINDOW = 300000;
    
    if (SAZUMI_CURRENT_TIME - SAZUMI_LAST_REQUEST_TIME < SAZUMI_TIME_WINDOW) {
        SAZUMI_REQUEST_COUNT++;
        if (SAZUMI_REQUEST_COUNT >= 8) {
            SAZUMI_COOLDOWN_ACTIVE = true;
            return true;
        }
    } else {
        SAZUMI_REQUEST_COUNT = 1;
    }
    
    SAZUMI_LAST_REQUEST_TIME = SAZUMI_CURRENT_TIME;
    return false;
}

async function SAZUMI_ADAPTIVE_COOLDOWN() {
    if (SAZUMI_COOLDOWN_ACTIVE) {
        const SAZUMI_COOLDOWN_TIME = SAZUMI_CALCULATE_ADAPTIVE_DELAY();
        console.log(`[INFO] Adaptive cooldown activated - waiting ${SAZUMI_COOLDOWN_TIME / 1000} seconds`);
        await new Promise(resolve => setTimeout(resolve, SAZUMI_COOLDOWN_TIME));
        SAZUMI_REQUEST_COUNT = 0;
        SAZUMI_COOLDOWN_ACTIVE = false;
    }
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

async function SAZUMI_INJECT_ADVANCED_SPOOFING(driver, fingerprint, systemSpecs) {
    await driver.executeScript(`
        Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        Object.defineProperty(navigator, 'platform', {get: () => '${fingerprint.platform}'});
        Object.defineProperty(navigator, 'language', {get: () => '${fingerprint.language}'});
        Object.defineProperty(navigator, 'languages', {get: () => ['${fingerprint.language}', 'en']});
        
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(contextType) {
            const context = getContext.call(this, contextType);
            if (contextType === '2d') {
                const imageData = context.getImageData;
                context.getImageData = function() {
                    const data = imageData.apply(this, arguments);
                    for (let i = 0; i < data.data.length; i += 4) {
                        data.data[i] += ${fingerprint.canvasNoise} % 10;
                        data.data[i + 1] += ${fingerprint.canvasNoise} % 8;
                        data.data[i + 2] += ${fingerprint.canvasNoise} % 12;
                    }
                    return data;
                };
            }
            return context;
        };
        
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return '${fingerprint.webglVendor}';
            if (parameter === 37446) return 'ANGLE (${fingerprint.webglVendor}, ${systemSpecs.gpu})';
            if (parameter === 7936) return '${systemSpecs.gpu}';
            if (parameter === 7937) return '${systemSpecs.gpu} Direct3D11 vs_5_0 ps_5_0';
            return getParameter.call(this, parameter);
        };
        
        Date.prototype.getTimezoneOffset = function() {
            return ${fingerprint.timezone * 60};
        };
        
        Object.defineProperty(screen, 'colorDepth', {get: () => ${Math.floor(Math.random() * 8) + 24}});
        Object.defineProperty(navigator, 'deviceMemory', {get: () => ${systemSpecs.memory}});
        Object.defineProperty(navigator, 'hardwareConcurrency', {get: () => ${Math.floor(Math.random() * 8) + 4}});
        Object.defineProperty(navigator, 'maxTouchPoints', {get: () => ${Math.floor(Math.random() * 5)}});
        
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);
            if (tagName.toLowerCase() === 'canvas') {
                const originalToDataURL = element.toDataURL;
                element.toDataURL = function() {
                    const result = originalToDataURL.apply(this, arguments);
                    const noise = '${fingerprint.id}'.slice(0, 8);
                    return result.replace(/data:image\/png;base64,/, 'data:image/png;base64,' + noise);
                };
            }
            return element;
        };
        
        const originalGetEntriesByType = performance.getEntriesByType;
        performance.getEntriesByType = function(type) {
            const entries = originalGetEntriesByType.call(this, type);
            if (type === 'navigation') {
                entries.forEach(entry => {
                    entry.loadEventEnd += Math.random() * 100;
                    entry.domContentLoadedEventEnd += Math.random() * 50;
                });
            }
            return entries;
        };
        
        Object.defineProperty(window, 'chrome', {
            get: () => ({
                runtime: {
                    onConnect: null,
                    onMessage: null
                },
                app: {
                    isInstalled: false
                }
            })
        });
        
        window.requestIdleCallback = window.requestIdleCallback || function(cb) {
            return setTimeout(cb, Math.random() * 50);
        };
        
        const mediaDevices = navigator.mediaDevices;
        if (mediaDevices && mediaDevices.enumerateDevices) {
            const originalEnumerateDevices = mediaDevices.enumerateDevices;
            mediaDevices.enumerateDevices = function() {
                return originalEnumerateDevices.call(this).then(devices => {
                    return devices.map(device => ({
                        ...device,
                        deviceId: '${crypto.randomBytes(32).toString('hex')}',
                        groupId: '${crypto.randomBytes(16).toString('hex')}'
                    }));
                });
            };
        }
    `);
}

async function SAZUMI_SIMULATE_REALISTIC_BEHAVIOR(driver) {
    const SAZUMI_SCROLL_COUNT = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < SAZUMI_SCROLL_COUNT; i++) {
        const SAZUMI_SCROLL_Y = Math.floor(Math.random() * 800) + 200;
        await driver.executeScript(`window.scrollTo({top: ${SAZUMI_SCROLL_Y}, behavior: 'smooth'});`);
        await driver.sleep(Math.floor(Math.random() * 1500) + 800);
    }
    
    const SAZUMI_MOUSE_MOVES = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < SAZUMI_MOUSE_MOVES; i++) {
        const SAZUMI_X = Math.floor(Math.random() * 1000) + 100;
        const SAZUMI_Y = Math.floor(Math.random() * 700) + 100;
        await driver.executeScript(`
            const event = new MouseEvent('mousemove', {
                clientX: ${SAZUMI_X}, 
                clientY: ${SAZUMI_Y},
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        `);
        await driver.sleep(Math.floor(Math.random() * 600) + 300);
    }
    
    await driver.executeScript(`
        const focusEvent = new FocusEvent('focus');
        document.dispatchEvent(focusEvent);
        const visibilityEvent = new Event('visibilitychange');
        document.dispatchEvent(visibilityEvent);
    `);
    await driver.sleep(Math.floor(Math.random() * 1000) + 500);
}

async function SAZUMI_INIT_DRIVER() {
    const SAZUMI_USER_AGENT = SAZUMI_GET_RANDOM_USER_AGENT();
    const SAZUMI_VIEWPORT = SAZUMI_GET_RANDOM_VIEWPORT();
    const SAZUMI_FINGERPRINT = SAZUMI_GENERATE_BROWSER_FINGERPRINT();
    const SAZUMI_SYSTEM_SPECS = SAZUMI_GENERATE_SYSTEM_SPECS();
    
    console.log(`[INFO] Initializing browser with User Agent: ${SAZUMI_USER_AGENT}`);
    console.log(`[INFO] Using Viewport: ${SAZUMI_VIEWPORT.width}x${SAZUMI_VIEWPORT.height}`);
    console.log(`[INFO] Fingerprint ID: ${SAZUMI_FINGERPRINT.id}`);
    console.log(`[INFO] System MAC: ${SAZUMI_SYSTEM_SPECS.macAddress}`);
    
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
    SAZUMI_OPTIONS.addArguments('--disable-plugins-discovery');
    SAZUMI_OPTIONS.addArguments('--disable-default-apps');
    SAZUMI_OPTIONS.addArguments('--no-first-run');
    SAZUMI_OPTIONS.addArguments('--disable-background-timer-throttling');
    SAZUMI_OPTIONS.addArguments('--disable-renderer-backgrounding');
    SAZUMI_OPTIONS.addArguments('--disable-backgrounding-occluded-windows');
    SAZUMI_OPTIONS.addArguments('--disable-ipc-flooding-protection');
    SAZUMI_OPTIONS.addArguments('--disable-client-side-phishing-detection');
    SAZUMI_OPTIONS.addArguments('--disable-component-update');
    SAZUMI_OPTIONS.addArguments('--disable-domain-reliability');
    SAZUMI_OPTIONS.addArguments('--disable-sync');
    SAZUMI_OPTIONS.addArguments('--metrics-recording-only');
    SAZUMI_OPTIONS.addArguments('--no-report-upload');
    SAZUMI_OPTIONS.excludeSwitches(['enable-automation']);
    SAZUMI_OPTIONS.setUserPreferences({
        'profile.default_content_setting_values.notifications': 2,
        'profile.managed_default_content_settings.images': 2,
        'profile.default_content_settings.popups': 0,
        'profile.managed_default_content_settings.media_stream': 2
    });
    
    SAZUMI_DRIVER = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(SAZUMI_OPTIONS)
        .build();
    
    await SAZUMI_INJECT_ADVANCED_SPOOFING(SAZUMI_DRIVER, SAZUMI_FINGERPRINT, SAZUMI_SYSTEM_SPECS);
    SAZUMI_FINGERPRINT_CACHE.set(SAZUMI_SESSION_COUNT, {fingerprint: SAZUMI_FINGERPRINT, specs: SAZUMI_SYSTEM_SPECS});
}

async function SAZUMI_ADVANCED_RESET_IDENTITY() {
    try {
        await SAZUMI_ADAPTIVE_COOLDOWN();
        
        const SAZUMI_USER_AGENT = SAZUMI_GET_RANDOM_USER_AGENT();
        const SAZUMI_VIEWPORT = SAZUMI_GET_RANDOM_VIEWPORT();
        const SAZUMI_NEW_FINGERPRINT = SAZUMI_GENERATE_BROWSER_FINGERPRINT();
        const SAZUMI_NEW_SYSTEM_SPECS = SAZUMI_GENERATE_SYSTEM_SPECS();
        
        console.log(`[INFO] Advanced identity reset initiated`);
        console.log(`[INFO] New User Agent: ${SAZUMI_USER_AGENT}`);
        console.log(`[INFO] New Viewport: ${SAZUMI_VIEWPORT.width}x${SAZUMI_VIEWPORT.height}`);
        console.log(`[INFO] New Fingerprint ID: ${SAZUMI_NEW_FINGERPRINT.id}`);
        console.log(`[INFO] New System MAC: ${SAZUMI_NEW_SYSTEM_SPECS.macAddress}`);
        
        await SAZUMI_DRIVER.manage().deleteAllCookies();
        
        await SAZUMI_DRIVER.executeScript(`
            localStorage.clear();
            sessionStorage.clear();
            indexedDB.databases().then(databases => {
                databases.forEach(db => {
                    indexedDB.deleteDatabase(db.name);
                });
            });
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
            if (window.webkitStorageInfo) {
                window.webkitStorageInfo.requestQuota(0, 0, function(){}, function(){});
            }
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
        `);
        
        await SAZUMI_INJECT_ADVANCED_SPOOFING(SAZUMI_DRIVER, SAZUMI_NEW_FINGERPRINT, SAZUMI_NEW_SYSTEM_SPECS);
        
        await SAZUMI_DRIVER.executeScript(`
            Object.defineProperty(navigator, 'userAgent', {
                get: () => '${SAZUMI_USER_AGENT}'
            });
            history.replaceState(null, null, '/');
        `);
        
        await SAZUMI_DRIVER.manage().window().setRect({
            width: SAZUMI_VIEWPORT.width,
            height: SAZUMI_VIEWPORT.height
        });
        
        SAZUMI_SESSION_COUNT++;
        SAZUMI_FINGERPRINT_CACHE.set(SAZUMI_SESSION_COUNT, {fingerprint: SAZUMI_NEW_FINGERPRINT, specs: SAZUMI_NEW_SYSTEM_SPECS});
        
        console.log(`[INFO] Advanced identity reset completed - Session: ${SAZUMI_SESSION_COUNT}`);
    } catch (error) {
        console.log(`[ERROR] Failed advanced identity reset: ${error.message}`);
    }
}

async function SAZUMI_DEEP_BROWSER_RESTART() {
    try {
        console.log(`[INFO] Deep browser restart - Complete environment reset`);
        if (SAZUMI_DRIVER) {
            await SAZUMI_DRIVER.quit();
        }
        
        const SAZUMI_EXTENDED_COOLDOWN = Math.floor(Math.random() * 30000) + 60000;
        console.log(`[INFO] Extended cooldown: ${SAZUMI_EXTENDED_COOLDOWN / 1000} seconds`);
        await new Promise(resolve => setTimeout(resolve, SAZUMI_EXTENDED_COOLDOWN));
        
        await SAZUMI_INIT_DRIVER();
        SAZUMI_SESSION_COUNT++;
        SAZUMI_REQUEST_COUNT = 0;
        SAZUMI_COOLDOWN_ACTIVE = false;
        console.log(`[INFO] Deep browser restart completed - Session: ${SAZUMI_SESSION_COUNT}`);
    } catch (error) {
        console.log(`[ERROR] Failed deep browser restart: ${error.message}`);
        throw error;
    }
}

async function SAZUMI_SINGLE_REGISTRATION() {
    let success = false;
    try {
        if (SAZUMI_CHECK_RATE_LIMIT_THRESHOLD()) {
            await SAZUMI_ADAPTIVE_COOLDOWN();
        }
        
        if (!SAZUMI_DRIVER) {
            await SAZUMI_INIT_DRIVER();
        } else if (SAZUMI_SESSION_COUNT % 2 === 0 && SAZUMI_SESSION_COUNT > 0) {
            await SAZUMI_DEEP_BROWSER_RESTART();
        } else {
            await SAZUMI_ADVANCED_RESET_IDENTITY();
        }
        
        const SAZUMI_EMAIL = await SAZUMI_GET_EMAIL();
        
        await SAZUMI_DRIVER.get('about:blank');
        await SAZUMI_DRIVER.sleep(Math.floor(Math.random() * 2000) + 2000);
        
        await SAZUMI_DRIVER.get(SAZUMI_TARGET_URL);
        await SAZUMI_DRIVER.sleep(Math.floor(Math.random() * 2000) + 3000);
        
        await SAZUMI_SIMULATE_REALISTIC_BEHAVIOR(SAZUMI_DRIVER);
        
        const SAZUMI_LOGIN_BTN = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('span.text-white.bg-theme')), 10000
        );
        
        await SAZUMI_DRIVER.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", SAZUMI_LOGIN_BTN);
        await SAZUMI_DRIVER.sleep(Math.floor(Math.random() * 1000) + 1500);
        
        await SAZUMI_LOGIN_BTN.click();
        await SAZUMI_DRIVER.sleep(Math.floor(Math.random() * 1000) + 2000);
        
        const SAZUMI_EMAIL_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="account"]')), 10000
        );
        
        await SAZUMI_EMAIL_INPUT.clear();
        
        for (let char of SAZUMI_EMAIL) {
            await SAZUMI_EMAIL_INPUT.sendKeys(char);
            await SAZUMI_DRIVER.sleep(Math.floor(Math.random() * 120) + 80);
        }
        
        await SAZUMI_DRIVER.sleep(Math.floor(Math.random() * 1000) + 1500);
        
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
        
        for (let char of SAZUMI_CODE) {
            await SAZUMI_CODE_INPUT.sendKeys(char);
            await SAZUMI_DRIVER.sleep(Math.floor(Math.random() * 200) + 150);
        }
        
        const SAZUMI_PASSWORD = SAZUMI_GENERATE_PASSWORD();
        const SAZUMI_PASSWORD_INPUT = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.css('input[name="password"]')), 10000
        );
        await SAZUMI_PASSWORD_INPUT.clear();
        
        for (let char of SAZUMI_PASSWORD) {
            await SAZUMI_PASSWORD_INPUT.sendKeys(char);
            await SAZUMI_DRIVER.sleep(Math.floor(Math.random() * 100) + 60);
        }
        
        await SAZUMI_DRIVER.sleep(Math.floor(Math.random() * 1500) + 2000);
        
        const SAZUMI_SIGNUP_BTN = await SAZUMI_DRIVER.wait(
            until.elementLocated(By.id('loginRegisterBtn')), 10000
        );
        await SAZUMI_SIGNUP_BTN.click();
        await SAZUMI_DRIVER.sleep(Math.floor(Math.random() * 2000) + 5000);
        
        console.log('[INFO] SUCCESS - Account created successfully!');
        console.log(`[INFO] Email: ${SAZUMI_EMAIL}`);
        console.log(`[INFO] Password: ${SAZUMI_PASSWORD}`);
        console.log(`[INFO] Username: ${SAZUMI_EMAIL_DATA.username}`);
        console.log(`[INFO] Session: ${SAZUMI_SESSION_COUNT}, Requests: ${SAZUMI_REQUEST_COUNT}`);
        success = true;
    } catch (error) {
        console.log(`[ERROR] Registration failed: ${error.message}`);
        if (error.message.includes('rate limit') || error.message.includes('GatewayBlocked')) {
            console.log(`[INFO] Rate limit detected - activating deep restart protocol`);
            SAZUMI_REQUEST_COUNT += 5;
            SAZUMI_COOLDOWN_ACTIVE = true;
            await SAZUMI_DEEP_BROWSER_RESTART();
        }
    }
    return success;
}

async function SAZUMI_CONTINUOUS_REGISTRATION() {
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
