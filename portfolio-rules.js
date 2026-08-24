(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.PortfolioRules = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    function join(base, path) {
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

    return { resourceCandidates: resourceCandidates, categoryLocations: categoryLocations, validateManifest: validateManifest };
});
