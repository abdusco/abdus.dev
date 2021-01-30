const dayjs = require('dayjs');
const { execFileSync, execFile } = require('child_process');
const { resolve } = require('path');

/** 
 * @param {string} filePath
 * @returns {Date|null}
*/
function getFileCommitDate(filePath) {
    const stdout = execFileSync('git', ['log', '-1', '--format=%ct', filePath]).toString();
    if (!stdout.trim()) {
        return null;
    }
    const modified = new Date(+stdout.trim() * 1000);
    return modified;
}

module.exports = {
    eleventyComputed: {
        permalink({ permalink, slug }) {
            if (permalink !== undefined) return permalink;
            if (slug) return `/posts/${slug}/`;
        },
        category({ category, tags = [] }) {
            if (category) return category;
            const actualTags = tags.filter(t => !['post'].includes(t));
            if (actualTags.length === 1) {
                return actualTags[0] || undefined;
            }
        },
        updatedAt({page: {inputPath}}) {
            const f = resolve(inputPath);
            return getFileCommitDate(f);
        },
        isPost(data) {
            const {tags = []} = data;
            return tags.includes('post');
        },
    },
    layout: 'post',
    today: dayjs(),
};