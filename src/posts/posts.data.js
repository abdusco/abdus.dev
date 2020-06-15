const dayjs = require('dayjs');

module.exports = {
    eleventyComputed: {
        permalink: ({permalink, slug}) => {
            if (permalink) return permalink;
            if (slug) return `/posts/${slug}/`;
        },
        category: ({category, tags = []}) => {
            if (category) return category;
            const actualTags = tags.filter(t => !['post'].includes(t));
            if (actualTags.length === 1) {
                return actualTags[0] || undefined;
            }
        }
    },
    layout: 'single',
    today: dayjs(),
};