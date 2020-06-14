const filters = {
    json: (val) => JSON.stringify(val, null, 4)
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