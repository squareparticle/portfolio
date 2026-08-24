(function (global) {
    function normalizeBase(base) {
        if (base === '/') return '';
        if (!base || base === '.') return '.';
        return base.replace(/\/$/, '');
    }

    var settings = global.PORTFOLIO_PATHS || {};
    var jobBase = normalizeBase(settings.jobBase || '.');
    var sharedBase = normalizeBase(settings.sharedBase || '.');

    function join(base, path) {
        if (/^(https?:)?\/\//i.test(path) || path.charAt(0) === '/') return path;
        if (base === '.') return path;
        if (base === '') return '/' + path.replace(/^\.\//, '');
        return base + '/' + path.replace(/^\.\//, '');
    }

    function candidates(localPath, sharedPath) {
        return global.PortfolioRules.resourceCandidates(jobBase, sharedBase, localPath, sharedPath);
    }

    function ajaxJson(url) {
        return new Promise(function (resolve, reject) {
            $.ajax({url:url, dataType:'json', cache:false})
                .done(resolve)
                .fail(function (xhr) { reject({url:url, status:xhr.status}); });
        });
    }

    async function firstJson(urls) {
        var lastError = null;
        for (var i=0; i<urls.length; i++) {
            try {
                var data = await ajaxJson(urls[i]);
                return {data:data, url:urls[i], base:urls[i].substring(0, urls[i].lastIndexOf('/')) || '.'};
            } catch (e) { lastError = e; }
        }
        throw lastError || new Error('JSON resource not found');
    }

    async function loadManifest() {
        var result = await firstJson(candidates('data.json'));
        result.data._resourceBase = result.url.indexOf(join(jobBase, 'data.json')) === 0 ? jobBase : sharedBase;
        return result.data;
    }

    async function loadPageJson(name) {
        var result = await firstJson(candidates(name + '.json', 'defaults/' + name + '.json'));
        result.data._resourceBase = result.url.indexOf(join(jobBase, name + '.json')) === 0 ? jobBase : sharedBase;
        return result.data;
    }

    async function loadSkill(ref) {
        var result = await firstJson(candidates('skills/' + ref + '.json'));
        result.data._resourceBase = result.url.indexOf(join(jobBase, 'skills/')) === 0 ? jobBase : sharedBase;
        result.data._ref = ref;
        return result.data;
    }

    function asset(path, base) {
        if (!path) return path;
        return join(base || sharedBase, path);
    }

    function sharedAsset(path) { return asset(path, sharedBase); }
    function localAsset(path) { return asset(path, jobBase); }

    function resumeCandidates() {
        return [join(jobBase, 'resume.pdf'), join(sharedBase, 'defaults/resume.pdf')];
    }

    // Browser-friendly existence check used for optional PDF/local assets.
    function exists(url) {
        return new Promise(function(resolve) {
            $.ajax({url:url, method:'HEAD', cache:false}).done(function(){resolve(true);}).fail(function(){resolve(false);});
        });
    }

    async function resolveResume() {
        var candidates=resumeCandidates();
        for (var i=0;i<candidates.length;i++) if (await exists(candidates[i])) return candidates[i];
        return null;
    }

    global.PortfolioResources = {
        jobBase: jobBase,
        sharedBase: sharedBase,
        loadManifest: loadManifest,
        loadPageJson: loadPageJson,
        loadSkill: loadSkill,
        asset: asset,
        sharedAsset: sharedAsset,
        localAsset: localAsset,
        resolveResume: resolveResume
    };
})(window);
