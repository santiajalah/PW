const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

let SAZUMI_PROXY_LIST = [];
let SAZUMI_PROXY_USAGE = new Map();

function SAZUMI_LOAD_PROXIES() {
    try {
        const SAZUMI_PROXY_DATA = fs.readFileSync(path.join(__dirname, 'proxy.txt'), 'utf8');
        SAZUMI_PROXY_LIST = SAZUMI_PROXY_DATA.split('\n').filter(line => line.trim());
        console.log(`[INFO] Loaded ${SAZUMI_PROXY_LIST.length} proxies`);
    } catch (error) {
        console.log('[ERROR] Failed to load proxy.txt');
        process.exit(1);
    }
}

function SAZUMI_GET_RANDOM_PROXY() {
    if (SAZUMI_PROXY_LIST.length === 0) {
        console.log('[ERROR] No proxies available');
        process.exit(1);
    }
    
    const SAZUMI_RANDOM_INDEX = Math.floor(Math.random() * SAZUMI_PROXY_LIST.length);
    const SAZUMI_SELECTED_PROXY = SAZUMI_PROXY_LIST[SAZUMI_RANDOM_INDEX];
    
    const SAZUMI_CURRENT_USAGE = SAZUMI_PROXY_USAGE.get(SAZUMI_SELECTED_PROXY) || 0;
    SAZUMI_PROXY_USAGE.set(SAZUMI_SELECTED_PROXY, SAZUMI_CURRENT_USAGE + 1);
    
    if (SAZUMI_CURRENT_USAGE + 1 >= 9) {
        SAZUMI_PROXY_LIST.splice(SAZUMI_RANDOM_INDEX, 1);
        SAZUMI_PROXY_USAGE.delete(SAZUMI_SELECTED_PROXY);
        
        fs.writeFileSync(path.join(__dirname, 'proxy.txt'), SAZUMI_PROXY_LIST.join('\n'));
        console.log(`[INFO] Proxy ${SAZUMI_SELECTED_PROXY} removed after 9 uses`);
    }
    
    console.log(`[INFO] Using proxy: ${SAZUMI_SELECTED_PROXY} (Usage: ${SAZUMI_CURRENT_USAGE + 1}/9)`);
    return SAZUMI_SELECTED_PROXY;
}

async function SAZUMI_AUTO_CREATE_ACCOUNT() {
    let SAZUMI_DRIVER;
    
    try {
        const SAZUMI_PROXY = SAZUMI_GET_RANDOM_PROXY();
        console.log('[INFO] Initializing browser with proxy');
        
        const SAZUMI_CHROME_OPTIONS = new chrome.Options();
        SAZUMI_CHROME_OPTIONS.addArguments('--headless');
        SAZUMI_CHROME_OPTIONS.addArguments('--no-sandbox');
        SAZUMI_CHROME_OPTIONS.addArguments('--disable-dev-shm-usage');
        SAZUMI_CHROME_OPTIONS.addArguments('--disable-blink-features=AutomationControlled');
        SAZUMI_CHROME_OPTIONS.addArguments('--disable-web-security');
        SAZUMI_CHROME_OPTIONS.addArguments('--disable-features=VizDisplayCompositor');
        SAZUMI_CHROME_OPTIONS.addArguments('--disable-gpu');
        SAZUMI_CHROME_OPTIONS.addArguments('--disable-extensions');
        SAZUMI_CHROME_OPTIONS.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        SAZUMI_CHROME_OPTIONS.addArguments('--window-size=1920,1080');
        SAZUMI_CHROME_OPTIONS.addArguments(`--proxy-server=http://${SAZUMI_PROXY}`);
        
        SAZUMI_DRIVER = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(SAZUMI_CHROME_OPTIONS)
            .build();
        
        console.log('[INFO] Browser initialized with full size');
        
        console.log('[INFO] Accessing target URL');
        await SAZUMI_DRIVER.get('https://wangxutechnologyhkcolimited.pxf.io/MAzYVP');
        
        await SAZUMI_DRIVER.wait(until.elementLocated(By.css('body')), 15000);
        await SAZUMI_DRIVER.sleep(4000);
        console.log('[INFO] Page loaded completely');
        
        console.log('[INFO] Looking for Login button');
        const SAZUMI_LOGIN_SELECTORS = [
            "//span[contains(@class, 'text-white') and contains(@class, 'bg-theme') and contains(text(), 'Log in')]",
            "//span[contains(text(), 'Log in') and contains(@class, 'bg-theme')]",
            "span.text-white.bg-theme",
            "span[class*='bg-theme'][class*='text-white']"
        ];
        
        let SAZUMI_LOGIN_CLICKED = false;
        for (const SAZUMI_SELECTOR of SAZUMI_LOGIN_SELECTORS) {
            try {
                let SAZUMI_LOGIN_BUTTON;
                if (SAZUMI_SELECTOR.startsWith('//')) {
                    SAZUMI_LOGIN_BUTTON = await SAZUMI_DRIVER.wait(
                        until.elementLocated(By.xpath(SAZUMI_SELECTOR)), 
                        5000
                    );
                } else {
                    SAZUMI_LOGIN_BUTTON = await SAZUMI_DRIVER.wait(
                        until.elementLocated(By.css(SAZUMI_SELECTOR)), 
                        5000
                    );
                }
                await SAZUMI_DRIVER.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", SAZUMI_LOGIN_BUTTON);
                await SAZUMI_DRIVER.sleep(1500);
                await SAZUMI_DRIVER.executeScript("arguments[0].click();", SAZUMI_LOGIN_BUTTON);
                console.log('[INFO] Login button clicked successfully');
                SAZUMI_LOGIN_CLICKED = true;
                break;
            } catch (e) {
                console.log(`[INFO] Login selector failed: ${SAZUMI_SELECTOR}`);
                continue;
            }
        }
        
        if (!SAZUMI_LOGIN_CLICKED) {
            throw new Error('Could not find or click login button');
        }
        
        await SAZUMI_DRIVER.sleep(4000);
        
        console.log('[INFO] Getting email from API with retry');
        let SAZUMI_EMAIL;
        let SAZUMI_EMAIL_ATTEMPTS = 0;
        
        while (SAZUMI_EMAIL_ATTEMPTS < 5) {
            try {
                console.log(`[INFO] Email API attempt ${SAZUMI_EMAIL_ATTEMPTS + 1}`);
                const SAZUMI_EMAIL_RESPONSE = await axios.get('https://dumdaduma.zeabur.app/new-email', {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                SAZUMI_EMAIL = SAZUMI_EMAIL_RESPONSE.data.email;
                console.log(`[INFO] Got email: ${SAZUMI_EMAIL}`);
                break;
            } catch (error) {
                console.log(`[WARNING] Email API failed: ${error.message}`);
                SAZUMI_EMAIL_ATTEMPTS++;
                if (SAZUMI_EMAIL_ATTEMPTS < 5) {
                    await SAZUMI_DRIVER.sleep(3000);
                }
            }
        }
        
        if (!SAZUMI_EMAIL) {
            throw new Error('Failed to get email from API after multiple attempts');
        }
        
        console.log('[INFO] Looking for email input field');
        const SAZUMI_EMAIL_SELECTORS = [
            'input[name="account"]',
            'input[placeholder="Email"]',
            'input[class*="w-full"][class*="px-3"][class*="py-3"]',
            'input[type="text"][placeholder="Email"]'
        ];
        
        let SAZUMI_EMAIL_FILLED = false;
        for (const SAZUMI_SELECTOR of SAZUMI_EMAIL_SELECTORS) {
            try {
                const SAZUMI_EMAIL_INPUT = await SAZUMI_DRIVER.wait(
                    until.elementLocated(By.css(SAZUMI_SELECTOR)), 
                    10000
                );
                await SAZUMI_DRIVER.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", SAZUMI_EMAIL_INPUT);
                await SAZUMI_EMAIL_INPUT.clear();
                await SAZUMI_EMAIL_INPUT.sendKeys(SAZUMI_EMAIL);
                console.log('[INFO] Email filled successfully');
                SAZUMI_EMAIL_FILLED = true;
                break;
            } catch (e) {
                console.log(`[INFO] Email selector failed: ${SAZUMI_SELECTOR}`);
                continue;
            }
        }
        
        if (!SAZUMI_EMAIL_FILLED) {
            throw new Error('Could not find or fill email input');
        }
        
        await SAZUMI_DRIVER.sleep(2000);
        
        console.log('[INFO] Looking for Send button');
        const SAZUMI_SEND_SELECTORS = [
            "//button[.//span[contains(@class, 'text-theme') and contains(text(), 'Send')]]",
            "//span[contains(@class, 'text-theme') and contains(text(), 'Send')]/parent::button",
            "button[class*='absolute'][class*='top-0'][class*='right-0']",
            "//span[text()='Send']/ancestor::button[1]"
        ];
        
        let SAZUMI_SEND_CLICKED = false;
        for (const SAZUMI_SELECTOR of SAZUMI_SEND_SELECTORS) {
            try {
                let SAZUMI_SEND_BUTTON;
                if (SAZUMI_SELECTOR.startsWith('//')) {
                    SAZUMI_SEND_BUTTON = await SAZUMI_DRIVER.wait(
                        until.elementLocated(By.xpath(SAZUMI_SELECTOR)), 
                        8000
                    );
                } else {
                    SAZUMI_SEND_BUTTON = await SAZUMI_DRIVER.wait(
                        until.elementLocated(By.css(SAZUMI_SELECTOR)), 
                        8000
                    );
                }
                
                // Pastikan element visible dan clickable
                await SAZUMI_DRIVER.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", SAZUMI_SEND_BUTTON);
                await SAZUMI_DRIVER.sleep(1500);
                
                // Coba multiple click method
                try {
                    await SAZUMI_SEND_BUTTON.click();
                    console.log('[INFO] Send button clicked with normal click');
                } catch (clickError) {
                    await SAZUMI_DRIVER.executeScript("arguments[0].click();", SAZUMI_SEND_BUTTON);
                    console.log('[INFO] Send button clicked with JavaScript click');
                }
                
                SAZUMI_SEND_CLICKED = true;
                break;
            } catch (e) {
                console.log(`[INFO] Send selector failed: ${SAZUMI_SELECTOR}`);
                continue;
            }
        }
        
        if (!SAZUMI_SEND_CLICKED) {
            console.log('[ERROR] SEND BUTTON TIDAK BERHASIL DIKLIK! Mencoba cara lain...');
            
            // Fallback: cari semua button dan klik yang ada text "Send"
            try {
                const SAZUMI_ALL_BUTTONS = await SAZUMI_DRIVER.findElements(By.css('button'));
                for (const SAZUMI_BUTTON of SAZUMI_ALL_BUTTONS) {
                    try {
                        const SAZUMI_BUTTON_TEXT = await SAZUMI_BUTTON.getText();
                        if (SAZUMI_BUTTON_TEXT.includes('Send')) {
                            await SAZUMI_DRIVER.executeScript("arguments[0].click();", SAZUMI_BUTTON);
                            console.log('[INFO] Send button found and clicked via fallback method');
                            SAZUMI_SEND_CLICKED = true;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            } catch (fallbackError) {
                throw new Error('GAGAL TOTAL - Send button tidak bisa diklik dengan semua metode');
            }
        }
        
        console.log('[INFO] Waiting for verification code');
        await SAZUMI_DRIVER.sleep(8000);
        
        let SAZUMI_VERIFICATION_CODE = null;
        let SAZUMI_CODE_ATTEMPTS = 0;
        
        while (!SAZUMI_VERIFICATION_CODE && SAZUMI_CODE_ATTEMPTS < 15) {
            try {
                console.log(`[INFO] Checking for verification code - attempt ${SAZUMI_CODE_ATTEMPTS + 1}`);
                const SAZUMI_CODE_RESPONSE = await axios.get(`https://dumdaduma.zeabur.app/msg?email=${SAZUMI_EMAIL}`, {
                    timeout: 8000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (SAZUMI_CODE_RESPONSE.data.message) {
                    const SAZUMI_MESSAGE = SAZUMI_CODE_RESPONSE.data.message;
                    const SAZUMI_CODE_MATCH = SAZUMI_MESSAGE.match(/\b\d{4}\b/);
                    
                    if (SAZUMI_CODE_MATCH) {
                        SAZUMI_VERIFICATION_CODE = SAZUMI_CODE_MATCH[0];
                        console.log(`[INFO] Got verification code: ${SAZUMI_VERIFICATION_CODE}`);
                    }
                }
            } catch (error) {
                console.log(`[INFO] No message yet or network issue, waiting...`);
            }
            
            if (!SAZUMI_VERIFICATION_CODE) {
                await SAZUMI_DRIVER.sleep(4000);
            }
            SAZUMI_CODE_ATTEMPTS++;
        }
        
        if (!SAZUMI_VERIFICATION_CODE) {
            throw new Error('Failed to get verification code');
        }
        
        console.log('[INFO] Looking for verification code input');
        const SAZUMI_CODE_SELECTORS = [
            'input[name="captcha"]',
            'input[placeholder="Verification Code"]',
            'input[maxlength="4"]',
            'input[type="text"][placeholder="Verification Code"]'
        ];
        
        let SAZUMI_CODE_FILLED = false;
        for (const SAZUMI_SELECTOR of SAZUMI_CODE_SELECTORS) {
            try {
                const SAZUMI_CODE_INPUT = await SAZUMI_DRIVER.wait(
                    until.elementLocated(By.css(SAZUMI_SELECTOR)), 
                    8000
                );
                await SAZUMI_DRIVER.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", SAZUMI_CODE_INPUT);
                await SAZUMI_CODE_INPUT.clear();
                await SAZUMI_CODE_INPUT.sendKeys(SAZUMI_VERIFICATION_CODE);
                console.log('[INFO] Verification code filled successfully');
                SAZUMI_CODE_FILLED = true;
                break;
            } catch (e) {
                console.log(`[INFO] Code selector failed: ${SAZUMI_SELECTOR}`);
                continue;
            }
        }
        
        if (!SAZUMI_CODE_FILLED) {
            throw new Error('Could not find or fill verification code input');
        }
        
        console.log('[INFO] Generating password');
        const SAZUMI_PASSWORD = SAZUMI_GENERATE_PASSWORD();
        console.log(`[INFO] Generated password: ${SAZUMI_PASSWORD}`);
        
        console.log('[INFO] Looking for password input');
        const SAZUMI_PASSWORD_SELECTORS = [
            'input[name="password"]',
            'input[placeholder="Password"]',
            'input[maxlength="20"]',
            'input[type="text"][placeholder="Password"]'
        ];
        
        let SAZUMI_PASSWORD_FILLED = false;
        for (const SAZUMI_SELECTOR of SAZUMI_PASSWORD_SELECTORS) {
            try {
                const SAZUMI_PASSWORD_INPUT = await SAZUMI_DRIVER.wait(
                    until.elementLocated(By.css(SAZUMI_SELECTOR)), 
                    8000
                );
                await SAZUMI_DRIVER.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", SAZUMI_PASSWORD_INPUT);
                await SAZUMI_PASSWORD_INPUT.clear();
                await SAZUMI_PASSWORD_INPUT.sendKeys(SAZUMI_PASSWORD);
                console.log('[INFO] Password filled successfully');
                SAZUMI_PASSWORD_FILLED = true;
                break;
            } catch (e) {
                console.log(`[INFO] Password selector failed: ${SAZUMI_SELECTOR}`);
                continue;
            }
        }
        
        if (!SAZUMI_PASSWORD_FILLED) {
            throw new Error('Could not find or fill password input');
        }
        
        await SAZUMI_DRIVER.sleep(2000);
        
        console.log('[INFO] Looking for Sign up button');
        const SAZUMI_SIGNUP_SELECTORS = [
            'button#loginRegisterBtn',
            'button[id="loginRegisterBtn"]',
            "//button[contains(@class, 'btn') and contains(@class, 'bg-theme') and contains(text(), 'Sign up')]",
            'button[class*="btn"][class*="bg-theme"]'
        ];
        
        let SAZUMI_SIGNUP_CLICKED = false;
        for (const SAZUMI_SELECTOR of SAZUMI_SIGNUP_SELECTORS) {
            try {
                let SAZUMI_SIGNUP_BUTTON;
                if (SAZUMI_SELECTOR.startsWith('//')) {
                    SAZUMI_SIGNUP_BUTTON = await SAZUMI_DRIVER.wait(
                        until.elementLocated(By.xpath(SAZUMI_SELECTOR)), 
                        8000
                    );
                } else {
                    SAZUMI_SIGNUP_BUTTON = await SAZUMI_DRIVER.wait(
                        until.elementLocated(By.css(SAZUMI_SELECTOR)), 
                        8000
                    );
                }
                
                await SAZUMI_DRIVER.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", SAZUMI_SIGNUP_BUTTON);
                await SAZUMI_DRIVER.sleep(1500);
                
                // Multiple click attempts
                try {
                    await SAZUMI_SIGNUP_BUTTON.click();
                    console.log('[INFO] Sign up button clicked with normal click');
                } catch (clickError) {
                    await SAZUMI_DRIVER.executeScript("arguments[0].click();", SAZUMI_SIGNUP_BUTTON);
                    console.log('[INFO] Sign up button clicked with JavaScript click');
                }
                
                SAZUMI_SIGNUP_CLICKED = true;
                break;
            } catch (e) {
                console.log(`[INFO] Signup selector failed: ${SAZUMI_SELECTOR}`);
                continue;
            }
        }
        
        if (!SAZUMI_SIGNUP_CLICKED) {
            console.log('[ERROR] SIGN UP BUTTON TIDAK BERHASIL DIKLIK!');
            throw new Error('Sign up button tidak bisa diklik');
        }
        
        await SAZUMI_DRIVER.sleep(6000);
        
        console.log('[INFO] ========== ACCOUNT CREATION COMPLETED ==========');
        console.log(`[SUCCESS] Email: ${SAZUMI_EMAIL}`);
        console.log(`[SUCCESS] Password: ${SAZUMI_PASSWORD}`);
        console.log('[INFO] ================================================');
        
    } catch (error) {
        console.log(`[ERROR] ${error.message}`);
    } finally {
        if (SAZUMI_DRIVER) {
            await SAZUMI_DRIVER.quit();
            console.log('[INFO] Browser closed');
        }
    }
}

function SAZUMI_GENERATE_PASSWORD() {
    const SAZUMI_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const SAZUMI_SPECIAL = '@#$%';
    let SAZUMI_PASSWORD = '';
    
    for (let i = 0; i < 8; i++) {
        SAZUMI_PASSWORD += SAZUMI_CHARS.charAt(Math.floor(Math.random() * SAZUMI_CHARS.length));
    }
    
    SAZUMI_PASSWORD += SAZUMI_SPECIAL.charAt(Math.floor(Math.random() * SAZUMI_SPECIAL.length));
    SAZUMI_PASSWORD += Math.floor(Math.random() * 100);
    
    return SAZUMI_PASSWORD;
}

async function SAZUMI_START_LOOP() {
    SAZUMI_LOAD_PROXIES();
    
    while (true) {
        console.log('[INFO] Starting new account creation cycle');
        await SAZUMI_AUTO_CREATE_ACCOUNT();
        console.log('[INFO] Waiting 5 seconds before next cycle');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

SAZUMI_START_LOOP();
