const axios = require('axios');
const cache = require('../_eleventy/cache');
const _ = require('lodash');

const url = 'https://getpocket.com/v3/get';

const getTaggedLinks = async (tag, count = undefined) => {
    if (!process.env.POCKET_ACCESS_TOKEN) {
        throw new Error('missing Pocket API access token')
    }

    try {
        const {data} = await axios.post(url, {
            consumer_key: process.env.POCKET_CONSUMER_KEY,
            access_token: process.env.POCKET_ACCESS_TOKEN,
            tag,
            count,
            detailType: 'simple',
        });
        return data;
    } catch (e) {
        throw new Error('Cannot fetch links from Pocket API. ' + e);
    }
};

module.exports = async () => {
    let data = await cache.get(url, () => getTaggedLinks('fav'));
    let links = _.values(data.list).map(it => ({
        url: it.resolved_url,
        title: it.resolved_title || new URL(it.resolved_url).host,
        favorite: it.favorite === '1',
        summary: it.excerpt,
        hasImage: it.has_image === '1',
        domain: _.get(it, 'domain_metadata.name') || new URL(it.resolved_url).host,
        domainLogo: _.get(it, 'domain_metadata.logo'),
    }));

    return {links};
};

if (!module.parent) {
    getTaggedLinks('fav').then(console.log)
}


