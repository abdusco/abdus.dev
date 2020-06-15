const axios = require('axios');
const {get} = require('../../_eleventy/cache');

const sqliteDownloadUrl = 'https://www.sqlite.org/download.html#win32';

const parseDownloadPage = async () => {
    const {data} = await axios.get(sqliteDownloadUrl);
    return data.match(/(\d+\/[^.]+.zip)/gm)
        .filter(path => /dll-win/.test(path))
        .map(path => `https://www.sqlite.org/${path}`);
}

module.exports = async () => {
    const downloadUrls = await get(sqliteDownloadUrl, () => parseDownloadPage());
    return {
        sqliteDownloadUrl,
        downloadUrls,
    }
}

if (!module.parent) {
    parseDownloadPage().then(console.log);
}

