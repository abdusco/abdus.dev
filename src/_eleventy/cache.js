const cacheManager = require('cache-manager');
const fsStore = require('cache-manager-fs-hash');

const cache = cacheManager.caching({
    store: fsStore,
    options: {
        path: process.cwd() + '/.cache',
        ttl: 60 * 60 * 48,
        subdirs: false,
    }
});

module.exports = {
    async get(k, generator) {
        if (process.env.NODE_ENV === 'production') {
            return await generator();
        }
        return cache.wrap(k, generator);
    }
};
