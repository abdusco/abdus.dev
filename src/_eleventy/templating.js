const _ = require('lodash');
const {resolve} = require('path');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/relativeTime'));
dayjs.extend(require('dayjs/plugin/utc'));

const filters = {
    json: (val) => JSON.stringify(val, null, 4),
    dump: (val) => {
        let cleaned = _.omit(val, ['collections', 'pkg', 'eleventyComputed']);
        return JSON.stringify({
            __type__: typeof cleaned,
            ...cleaned
        }, null, 4);
    },
    date: (date) => dayjs(date).format('YYYY-MM-DD'),
    dateIso: (date) => date.toISOString(),
    dateAgo: (date) => dayjs().to(dayjs(date).local()),
    cachebust: (val) => `${val}?${+new Date}`,
    isRecent: (date) => dayjs(date).diff(dayjs(), "days") <= 7,
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
