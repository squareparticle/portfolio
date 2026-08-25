(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.PortfolioRules = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    function join(base, path) {
        // An empty base represents the site root (used by nested job portfolios),
        // while `.` deliberately remains relative to the current portfolio.
        if (base === '') return '/' + path.replace(/^\.\//, '');
        if (!base || base === '.') return path;
        return base.replace(/\/$/, '') + '/' + path.replace(/^\.\//, '');
    }

    function resourceCandidates(jobBase, sharedBase, localPath, sharedPath) {
        return [join(jobBase, localPath), join(sharedBase, sharedPath || localPath)];
    }

    function categoryLocations(manifest) {
        var locations = {};
        (manifest.categories || []).forEach(function (category) {
            (category.skills || []).forEach(function (ref) {
                (locations[ref] = locations[ref] || []).push(category);
            });
        });
        return locations;
    }

    function validateManifest(manifest) {
        var locations = categoryLocations(manifest), errors = [];
        Object.keys(locations).forEach(function (ref) {
            var categories = locations[ref];
            if (categories.length > 1 && !categories.every(function (category) { return category.allowDuplicateSkills === true; })) {
                errors.push('Skill appears in multiple categories: ' + ref);
            }
        });
        (manifest.featured || []).forEach(function (ref) {
            if ((locations[ref] || []).length !== 1) errors.push('Featured skill must resolve to exactly one normal category: ' + ref);
        });
        return errors;
    }

    function normalSkillView(skill) {
        var media = skill.media || {};
        var primary = media.primary || null;
        var items = media.items || [];
        var platform = skill.platform || {};
        var metadata = [];
        if (platform.values && platform.values.length) metadata.push(platform.values.join(', '));
        if (skill.technologies && skill.technologies.length) metadata.push(skill.technologies.join(', '));
        if (skill.date && skill.date.display) {
            var dates = [skill.date.from, skill.date.to].filter(Boolean);
            if (dates.length) metadata.push(dates.join(' – '));
        }
        return {
            subtitle: metadata.join(' · '),
            description: skill.description || '',
            primary: primary,
            gallery: items.filter(function (item) { return item.type === 'image'; }).map(function (item) { return item.src; })
        };
    }

    function skillView(skill) {
        if (skill.description !== undefined || (skill.media && skill.media.primary)) return normalSkillView(skill);
        var media = skill.media || {};
        return {
            subtitle: skill.subtitle || '',
            description: skill.text || '',
            primary: media.image ? {type: 'image', src: media.image} : (media.youtube ? {type: 'youtube', src: media.youtube} : null),
            gallery: media.gallery || []
        };
    }

    return { resourceCandidates: resourceCandidates, categoryLocations: categoryLocations, validateManifest: validateManifest, skillView: skillView };
});
