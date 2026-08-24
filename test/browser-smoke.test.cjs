const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = {'.css':'text/css','.gif':'image/gif','.htm':'text/html','.html':'text/html','.jpg':'image/jpeg','.js':'text/javascript','.json':'application/json','.png':'image/png','.pdf':'application/pdf'};
const invalidManifest = JSON.stringify({categories:[{id:'one',skills:['same']},{id:'two',skills:['same']}],featured:[]});

function startServer() {
    return new Promise(resolve => {
        const server = http.createServer((req, res) => {
            const pathname = decodeURIComponent(req.url.split('?')[0]);
            if (pathname === '/invalid/data.json') {
                res.writeHead(200, {'Content-Type':'application/json'}); return res.end(invalidManifest);
            }
            let filename = path.join(root, pathname.replace(/^\//, ''));
            if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) filename = path.join(filename, 'index.htm');
            fs.readFile(filename, (error, data) => {
                res.writeHead(error ? 404 : 200, {'Content-Type': mime[path.extname(filename)] || 'application/octet-stream'});
                res.end(error ? 'Not found' : data);
            });
        }).listen(0, '127.0.0.1', () => resolve(server));
    });
}

let server, browser, baseUrl;
test.before(async () => {
    server = await startServer();
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({headless:true});
});
test.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });

async function pageAt(url, paths) {
    const page = await browser.newPage();
    const consoleErrors = [], failed = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', request => failed.push(request.url()));
    if (paths) await page.addInitScript(value => { window.PORTFOLIO_PATHS = value; }, paths);
    await page.goto(url, {waitUntil:'domcontentloaded'});
    return {page, consoleErrors, failed};
}

test('default portfolio renders and Featured Read More navigates to its skill', {timeout: 10000}, async () => {
    const {page, consoleErrors} = await pageAt(baseUrl + '/');
    await page.locator('#featuredReadMore').waitFor({state:'visible'});
    assert.ok((await page.locator('body').innerText()).trim().length > 100);
    const firstRef = await page.locator('#featuredReadMore').evaluate(() => window.jsonData.featured[0]);
    await page.locator('#featuredReadMore').evaluate((button, ref) => {
        window.openFeaturedSkill(ref);
        button.click();
    }, firstRef);
    await page.locator('#' + ('skill-' + firstRef.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase())).waitFor({state:'visible'});
    assert.equal(consoleErrors.filter(text => /Portfolio data could not|Unable to load/.test(text)).length, 0);
    await page.close();
});

test('missing portfolio media does not prevent visible content', {timeout: 10000}, async () => {
    const {page} = await pageAt(baseUrl + '/');
    await page.route('**/images/**', route => route.fulfill({status:404, body:'missing'}));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#featuredReadMore').waitFor({state:'visible'});
    assert.ok((await page.locator('body').innerText()).trim().length > 100);
    await page.close();
});

test('invalid startup data produces a visible error instead of a blank page', {timeout: 10000}, async () => {
    const {page} = await pageAt(baseUrl + '/', {jobBase:'invalid', sharedBase:'invalid'});
    await page.locator('.alert-danger').waitFor({state:'visible'});
    assert.match(await page.locator('.alert-danger').innerText(), /Portfolio data could not be loaded/);
    await page.close();
});
