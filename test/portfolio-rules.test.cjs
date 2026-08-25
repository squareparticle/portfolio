const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../portfolio-rules.js');

test('shared skills resolve after job-local candidates', () => {
    assert.deepEqual(rules.resourceCandidates('jobs/acme', '.', 'skills/example.json'), [
        'jobs/acme/skills/example.json', 'skills/example.json'
    ]);
});

test('job-local skills and page resources precede shared defaults', () => {
    assert.deepEqual(rules.resourceCandidates('jobs/acme', '.', 'skills/example.json'), [
        'jobs/acme/skills/example.json', 'skills/example.json'
    ]);
    assert.deepEqual(rules.resourceCandidates('jobs/acme', '.', 'banner.json', 'defaults/banner.json'), [
        'jobs/acme/banner.json', 'defaults/banner.json'
    ]);
    assert.deepEqual(rules.resourceCandidates('jobs/acme', '.', 'aboutme.json', 'defaults/aboutme.json'), [
        'jobs/acme/aboutme.json', 'defaults/aboutme.json'
    ]);
});

test('missing local banner and aboutme resources fall back to defaults', () => {
    assert.equal(rules.resourceCandidates('jobs/acme', '.', 'banner.json', 'defaults/banner.json')[1], 'defaults/banner.json');
    assert.equal(rules.resourceCandidates('jobs/acme', '.', 'aboutme.json', 'defaults/aboutme.json')[1], 'defaults/aboutme.json');
});

test('nested job portfolios resolve shared defaults from the site root', () => {
    assert.deepEqual(rules.resourceCandidates('.', '', 'aboutme.json', 'defaults/aboutme.json'), [
        'aboutme.json', '/defaults/aboutme.json'
    ]);
    assert.deepEqual(rules.resourceCandidates('.', '', 'skills/example.json'), [
        'skills/example.json', '/skills/example.json'
    ]);
});

test('job-local icon candidates take precedence over shared category assets', () => {
    assert.deepEqual(rules.resourceCandidates('.', '', 'images/logo/custom.png'), [
        'images/logo/custom.png', '/images/logo/custom.png'
    ]);
    assert.deepEqual(rules.resourceCandidates('.', '', 'images/skills/custom/title.png'), [
        'images/skills/custom/title.png', '/images/skills/custom/title.png'
    ]);
});

test('every Featured skill resolves to one normal category', () => {
    assert.deepEqual(rules.validateManifest({ categories: [{id: 'web', skills: ['a']}], featured: ['a'] }), []);
    assert.match(rules.validateManifest({ categories: [{id: 'web', skills: ['a']}], featured: ['missing'] })[0], /Featured skill/);
});

test('duplicate normal-category skills require explicit schema support', () => {
    assert.match(rules.validateManifest({categories: [{id: 'a', skills: ['same']}, {id: 'b', skills: ['same']}]} )[0], /multiple categories/);
    assert.deepEqual(rules.validateManifest({categories: [
        {id: 'a', allowDuplicateSkills: true, skills: ['same']},
        {id: 'b', allowDuplicateSkills: true, skills: ['same']}
    ]}), []);
});

test('normal-schema skills render platform, technologies, primary media, and gallery', () => {
    const view = rules.skillView({
        title: 'Health Holder',
        platform: {label: 'Platform', values: ['Desktop Application']},
        technologies: ['Java'],
        date: {from: null, to: null, display: false},
        description: 'A desktop nutrition application.',
        media: {
            primary: {type: 'image', src: 'health.jpg'},
            items: [{type: 'image', src: 'health_1.jpg'}, {type: 'youtube', id: 'abc123'}]
        }
    });
    assert.equal(view.subtitle, 'Desktop Application · Java');
    assert.equal(view.description, 'A desktop nutrition application.');
    assert.deepEqual(view.primary, {type: 'image', src: 'health.jpg'});
    assert.deepEqual(view.gallery, ['health_1.jpg']);
});

test('normal-schema media defaults to visible and preserves roles for Featured selection', () => {
    const skill = {
        title: 'Example',
        description: 'Public description',
        media: {
            thumbnail: 'thumbnail.jpg',
            items: [
                {type: 'image', src: 'hero.jpg', display: false, roles: ['featureHero']},
                {type: 'image', src: 'support-1.jpg', roles: ['featureSupporting']},
                {type: 'image', src: 'support-2.jpg', roles: ['featureSupporting']}
            ]
        },
        meta: {technologyVersions: {java: '1.2'}}
    };
    const view = rules.skillView(skill);
    const feature = rules.featureMedia(skill);
    assert.deepEqual(view.gallery, ['support-1.jpg', 'support-2.jpg']);
    assert.equal(view.items[0].roles[0], 'featureHero');
    assert.deepEqual(feature.hero, skill.media.items[0]);
    assert.deepEqual(feature.supporting, skill.media.items.slice(1));
    assert.notEqual(feature.hero.src, skill.media.thumbnail);
    assert.equal(view.description.includes('1.2'), false);
});

test('legacy skill media and copy remain supported', () => {
    const view = rules.skillView({subtitle: 'Java 1.2', text: 'Legacy copy', media: {image: 'legacy.jpg', gallery: ['detail.jpg']}});
    assert.equal(view.subtitle, 'Java 1.2');
    assert.equal(view.description, 'Legacy copy');
    assert.deepEqual(view.primary, {type: 'image', src: 'legacy.jpg'});
    assert.deepEqual(view.gallery, ['detail.jpg']);
});
