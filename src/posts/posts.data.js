module.exports = {
    eleventyComputed: {
        permalink: data => data.slug ? `/posts/${data.slug}/` : data.page.url
    },
    layout: 'single'
};