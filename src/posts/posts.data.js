const dayjs = require('dayjs');

module.exports = {
    eleventyComputed: {
        permalink: data => data.slug ? `/posts/${data.slug}/`: undefined
    },
    layout: 'single',
    today: dayjs(),
};