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

async function pageAt(url, paths, routes) {
    const page = await browser.newPage();
    const consoleErrors = [], failed = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', request => failed.push(request.url()));
    if (paths) await page.addInitScript(value => { window.PORTFOLIO_PATHS = value; }, paths);
    for (const route of routes || []) await page.route(route.pattern, route.handler);
    await page.goto(url, {waitUntil:'domcontentloaded'});
    return {page, consoleErrors, failed};
}

async function assertCategoryHoverTargetsOwnIcon(page) {
    const icons = page.locator('#Categories img');
    assert.ok(await icons.count() >= 3);
    async function animatedIds() {
        return await icons.evaluateAll(elements => elements
            .filter(element => element.classList.contains('animated') && element.classList.contains('bounceIn'))
            .map(element => element.id));
    }

    await page.locator('#MobileThumb').hover();
    assert.deepEqual(await animatedIds(), ['MobileImg']);
    await page.waitForTimeout(1100);

    await page.locator('#ModelingThumb').hover();
    assert.deepEqual(await animatedIds(), ['ModelingImg']);
    assert.ok(!(await animatedIds()).includes('CompanyImg'));
}

test('default portfolio renders and Featured Read More navigates to its skill', {timeout: 10000}, async () => {
    const {page, consoleErrors} = await pageAt(baseUrl + '/');
    await page.locator('#featuredReadMore').waitFor({state:'visible'});
    await page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    assert.ok((await page.locator('body').innerText()).trim().length > 100);
    assert.equal(await page.locator('#featuredSlides .item').count(), 5);
    assert.equal(await page.locator('#featuredSlides .item.active img').count(), 1);
    assert.equal(await page.locator('#featuredSupporting img').count(), 3);
    assert.match(await page.locator('#featuredSlides .item.active .carousel-caption').innerText(), /Web Design/);
    assert.match(await page.locator('#Description_lg').innerText(), /Designed and developed the UI and UX/);
    for (let index = 1; index < 5; index++) {
        await page.locator('.right.carousel-control').click();
        await page.locator(`#featuredSlides .item.active[data-feature-index="${index}"]`).waitFor({state:'visible'});
        assert.equal(await page.locator('#featuredSlides .item.active img').count(), 1);
        assert.equal(await page.locator('#featuredSupporting img').count(), 3);
        assert.ok((await page.locator('#featuredSlides .item.active .carousel-caption').innerText()).trim().length > 0);
        assert.ok((await page.locator('#Description_lg').innerText()).trim().length > 0);
    }
    const activeRef = await page.locator('#featuredReadMore').evaluate(() => window.jsonData.featured[window.currentFeaturedIndex]);
    await page.locator('#featuredReadMore').click();
    await page.locator('#' + ('skill-' + activeRef.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase())).waitFor({state:'visible'});
    assert.equal(consoleErrors.filter(text => /Portfolio data could not|Unable to load/.test(text)).length, 0);
    await page.close();
});

test('category hover animates only the hovered icon in root and nested portfolios', {timeout: 10000}, async () => {
    const root = await pageAt(baseUrl + '/');
    await root.page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    await assertCategoryHoverTargetsOwnIcon(root.page);
    await root.page.close();

    const nested = await pageAt(baseUrl + '/jobs/_template/');
    await nested.page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    await assertCategoryHoverTargetsOwnIcon(nested.page);
    await nested.page.close();
});

test('default About Me renders migrated content and nested jobs fall back to it', {timeout: 10000}, async () => {
    const {page} = await pageAt(baseUrl + '/');
    await page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    await page.locator('#aboutNav').click();
    await page.locator('#aboutSections .jumbotron').first().waitFor({state:'visible'});
    assert.equal(await page.locator('#aboutSections .jumbotron').count(), 6);
    assert.match(await page.locator('#aboutHeadline').innerText(), /Coding and being creative/);
    assert.match(await page.locator('#aboutSections').innerText(), /Before College/);
    await page.close();

    const nested = await pageAt(baseUrl + '/jobs/_template/');
    await nested.page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    await nested.page.locator('#aboutNav').click();
    await nested.page.locator('#aboutSections .jumbotron').first().waitFor({state:'visible'});
    assert.equal(await nested.page.locator('#aboutSections .jumbotron').count(), 6);
    assert.match(await nested.page.locator('#aboutHeadline').innerText(), /Coding and being creative/);
    await nested.page.close();
});

test('nested jobs resolve shared category icons and intro graphics from the site root', {timeout: 10000}, async () => {
    const {page} = await pageAt(baseUrl + '/jobs/_template/');
    await page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    await page.locator('#MobileImg').waitFor({state:'visible'});
    assert.equal(new URL(await page.locator('#MobileImg').getAttribute('src'), baseUrl).pathname, '/images/categories/andriod.png');
    await page.locator('#MobileThumb').click();
    await page.locator('#subjectIMG').waitFor({state:'visible'});
    assert.equal(new URL(await page.locator('#subjectIMG').getAttribute('src'), baseUrl).pathname, '/images/skills/mobile/title.png');
    await page.close();
});

test('root portfolio category assets still resolve from its own root', {timeout: 10000}, async () => {
    const root = await pageAt(baseUrl + '/');
    await root.page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    await root.page.locator('#ModelingImg').waitFor({state:'visible'});
    assert.equal(new URL(await root.page.locator('#ModelingImg').getAttribute('src'), baseUrl).pathname, '/images/categories/blender.png');
    await root.page.locator('#MobileThumb').click();
    await root.page.locator('#subjectIMG').waitFor({state:'visible'});
    assert.equal(new URL(await root.page.locator('#subjectIMG').getAttribute('src'), baseUrl).pathname, '/images/skills/mobile/title.png');
    await root.page.close();
});

test('category intro image falls back to the icon and honours an explicit override', {timeout: 10000}, async () => {
    const {page} = await pageAt(baseUrl + '/');
    await page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    await page.evaluate(async () => {
        const category = window.jsonData.categories.find(value => value.id === 'Mobile');
        delete category.intro.image;
        await window.changePanel('Mobile');
    });
    await page.locator('#subjectIMG').waitFor({state:'visible'});
    assert.equal(new URL(await page.locator('#subjectIMG').getAttribute('src'), baseUrl).pathname, '/images/categories/andriod.png');
    await page.evaluate(async () => {
        const category = window.jsonData.categories.find(value => value.id === 'Mobile');
        category.intro.image = 'images/skills/mobile/title.png';
        await window.changePanel('Mobile');
    });
    assert.equal(new URL(await page.locator('#subjectIMG').getAttribute('src'), baseUrl).pathname, '/images/skills/mobile/title.png');
    await page.close();
});

test('Health Holder renders from the normal skill schema', {timeout: 10000}, async () => {
    const {page} = await pageAt(baseUrl + '/');
    await page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    await page.locator('#CompanyThumb').click();
    const skill = page.locator('#skill-independent-health-holder-application');
    await skill.waitFor({state:'visible'});
    assert.match(await skill.innerText(), /Health Holder/);
    assert.equal(await skill.locator('.skill-platform').innerText(), 'Desktop Application');
    assert.equal(await skill.locator('.skill-technologies').innerText(), 'Java');
    assert.match(await skill.innerText(), /food-group targets and detailed nutritional values/);
    assert.doesNotMatch(await skill.innerText(), /1\.2/);
    assert.equal(await skill.locator('img').count(), 5);
    await page.close();
});

test('skill details support concise cards, single sections, and multi-section disclosure', {timeout: 10000}, async () => {
    const {page} = await pageAt(baseUrl + '/');
    await page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    await page.locator('#MobileThumb').click();
    const h0p3 = page.locator('#skill-squareparticle-h0p3-mobile-release');
    await h0p3.waitFor({state:'visible'});
    assert.equal(await page.locator('#skill-squareparticle-flag-hunt-mobile-release .skill-details-toggle').count(), 0);
    assert.equal(await h0p3.locator('.skill-details-toggle').count(), 1);
    assert.equal(await h0p3.locator('.skill-details-section-toggle').count(), 3);
    assert.equal(await h0p3.locator('.skill-meta .skill-platform').innerText(), 'Mobile Game');
    assert.equal(await h0p3.locator('.skill-meta .skill-technologies').innerText(), 'JavaME, BlackBerry SDK');
    assert.equal(await h0p3.locator('.skill-meta .skill-date').innerText(), '2009');
    assert.deepEqual(await h0p3.locator('.skill-meta').evaluate(node => ({display:getComputedStyle(node).display, wrap:getComputedStyle(node).flexWrap})), {display:'flex', wrap:'wrap'});
    assert.equal(await h0p3.locator('.skill-details').evaluate(node => {
        const gallery = node.closest('.jumbotron').querySelector('[id$="_table"]');
        return Boolean(node.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING);
    }), true);
    assert.doesNotMatch(await h0p3.innerText(), /primarily an early mobile release/);
    await h0p3.locator('.skill-details-toggle').click();
    await h0p3.locator('.skill-details-section-toggle', {hasText:'Game Systems'}).click();
    assert.match(await h0p3.locator('.skill-details-section-content').nth(1).innerText(), /Commodity trading/);
    await h0p3.locator('.skill-details-section-toggle', {hasText:'Game Systems'}).click();
    assert.equal(await h0p3.locator('.skill-details-section-content').nth(1).evaluate(node => node.classList.contains('in')), false);

    await page.evaluate(async () => {
        const original = await window.loadSkill('squareparticle/h0p3/mobile-release');
        const cloneRef = 'squareparticle/flag-hunt/mobile-release';
        window.skillCache[cloneRef] = Promise.resolve(Object.assign({}, original, {
            id: cloneRef,
            title: 'Single details example',
            details: {sections: [{title: 'One section', paragraphs: ['Single-section content.'], items: ['One item']}]}
        }));
        const category = window.jsonData.categories.find(value => value.id === 'Mobile');
        category.skills = ['squareparticle/h0p3/mobile-release', cloneRef];
        await window.changePanel('Mobile');
    });
    const single = page.locator('#skill-squareparticle-flag-hunt-mobile-release');
    await single.waitFor({state:'visible'});
    const ids = await page.locator('.skill-details [id]').evaluateAll(nodes => nodes.map(node => node.id));
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(await single.locator('.skill-details-section-toggle').count(), 0);
    await single.locator('.skill-details-toggle').click();
    assert.match(await single.locator('.skill-details-content').innerText(), /One section/);
    assert.match(await single.locator('.skill-details-content').innerText(), /One item/);
    await page.close();
});

test('C.E.L.L. v2 engine and editor render without exposing metadata', {timeout: 10000}, async () => {
    const {page} = await pageAt(baseUrl + '/');
    await page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    await page.locator('#EnginesThumb').click();
    const engine = page.locator('#skill-squareparticle-cell-engine');
    await engine.waitFor({state:'visible'});
    assert.match(await engine.innerText(), /Cross Emulation Library Layer/);
    assert.equal(await engine.locator('img').count(), 5);
    assert.doesNotMatch(await engine.innerText(), /architectureLineage/);
    await page.locator('#ToolsThumb').click();
    const editor = page.locator('#skill-squareparticle-cell-editor');
    await editor.waitFor({state:'visible'});
    assert.match(await editor.innerText(), /Visual Game Editor/);
    assert.equal(await editor.locator('iframe').count(), 1);
    await page.close();
});

test('Hydra-Gen v2 skills render galleries and keep metadata hidden', {timeout: 10000}, async () => {
    const {page} = await pageAt(baseUrl + '/');
    await page.locator('#featuredSlides .item').first().waitFor({state:'visible'});
    await page.locator('#EnginesThumb').click();
    const engine = page.locator('#skill-essentialskills-hydragen-engine');
    await engine.waitFor({state:'visible'});
    assert.match(await engine.innerText(), /Content Authoring System/);
    assert.equal(await engine.locator('img').count(), 9);
    assert.doesNotMatch(await engine.innerText(), /architectureTerminology/);
    await page.locator('#ToolsThumb').click();
    const builder = page.locator('#skill-essentialskills-hydragen-activity-builder');
    await builder.waitFor({state:'visible'});
    assert.match(await builder.innerText(), /non-developers to build their own programs/);
    assert.equal(await builder.locator('img').count(), 4);
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

test('Featured carousel remains usable when one supporting image is missing', {timeout: 10000}, async () => {
    const {page} = await pageAt(baseUrl + '/');
    await page.route('**/images/Design_2.jpg', route => route.fulfill({status:404, body:'missing'}));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#featuredReadMore').waitFor({state:'visible'});
    assert.equal(await page.locator('#featuredSlides .item.active img').count(), 1);
    assert.equal(await page.locator('#featuredSupporting img').count(), 3);
    assert.match(await page.locator('#Description_lg').innerText(), /Designed and developed the UI and UX/);
    await page.close();
});

test('invalid startup data produces a visible error instead of a blank page', {timeout: 10000}, async () => {
    const {page} = await pageAt(baseUrl + '/', {jobBase:'invalid', sharedBase:'invalid'});
    await page.locator('.alert-danger').waitFor({state:'visible'});
    assert.match(await page.locator('.alert-danger').innerText(), /Portfolio data could not be loaded/);
    await page.close();
});
