const axios = require('axios');
const {get} = require('../../_eleventy/cache');

const sqliteDownloadUrl = 'https://www.sqlite.org/download.html#win32';

const parseDownloadPage = async () => {
    const {data} = await axios.get(sqliteDownloadUrl);
    const urls = data.match(/(\d+\/[^.]+.zip)/gm)
        .filter(path => /dll-win/.test(path))
        .map(path => `https://www.sqlite.org/${path}`);

    return urls;
}

module.exports = async () => {
    const dllUrls = await get(sqliteDownloadUrl, () => parseDownloadPage());
    return {
        sqliteDownloadUrl,
        dllUrls,
    }
}

if (!module.parent) {
    parseDownloadPage().then(console.log);
}