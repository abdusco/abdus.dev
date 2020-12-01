const _ = require('lodash');
const dayjs = require('dayjs');

const filters = {
    json: (val) => JSON.stringify(val, null, 4),
    dump: (val) => {
        let cleaned = _.omit(val, ['collections', 'pkg', 'eleventyComputed']);
        return JSON.stringify({
            __type__: typeof cleaned,
            ...cleaned
        }, null, 4);
    },
    date: (val) => dayjs(val).format('YYYY-MM-DD'),
    cachebust: (val) => `${val}?${+new Date}`
};
const pairedShortcodes = {};
const shortcodes = {};
const transforms = {};

module.exports = {
    transforms,
    filters,
    shortcodes,
    pairedShortcodes
};
