require('dotenv').config();
require('module-alias/register');
const UserConfig = require('@11ty/eleventy/src/UserConfig')
const TemplateCollection = require('@11ty/eleventy/src/TemplateCollection')

const _ = require('lodash');
const tmpl = require('./src/_eleventy/templating');
const yaml = require('js-yaml');
const markdownIt = require("markdown-it");
const markdownItAttrs = require('markdown-it-attrs');

/** @param {UserConfig} config */
module.exports = (config) => {
    _.forEach(tmpl.transforms, (f, k) => config.addTransform(k, f));
    _.forEach(tmpl.filters, (f, k) => config.addFilter(k, f));
    _.forEach(tmpl.shortcodes, (f, k) => config.addShortcode(k, f));
    _.forEach(tmpl.pairedShortcodes, (f, k) => config.addPairedShortcode(k, f));

    config.setLibrary('md', markdownFactory());

    config.addPassthroughCopy({
        'src/_assets/css': 'assets/css',
        'src/_assets/fonts': 'assets/fonts',
        'src/_assets/js': 'assets/js',
    });

    config.addPassthroughCopy('src/**/*.{jpg,png,jpeg,svg}');

    ['yaml', 'yml'].forEach(ext => config.addDataExtension(ext, yaml.safeLoad));

    config.addCollection('updates', function (collectionApi) {
        /** @var {TemplateCollection} collectionApi */
        return collectionApi.getFilteredByGlob([
            'posts/*.md',
            'posts/**/*.md',
            'projects/**/*.md',
            'projects/**/*.md',
        ]);
    });

    config.setBrowserSyncConfig({
        ui: {port: 3333}
    });
    return {
        dir: {
            input: 'src',
            output: 'dist',

            data: '_data',
            layouts: '_views',
            includes: '_views',
        },
        pathPrefix: '/',
        jsDataFileSuffix: '.data',
        markdownTemplateEngine: 'njk',
    }
};


function markdownFactory() {
    const hljs = require('highlight.js');

    let options = {
        html: true,
        breaks: true,
        linkify: false,
        highlight: function (str, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    const highlighted = hljs.highlight(lang, str).value;
                    return `<pre class='hljs language-${lang}' data-lang='${lang}'><code>${highlighted}</code></pre>`;
                } catch (e) {
                }
            }
            console.warn(`Missing code highlighter for language ${lang}`);
            return `<pre class='hljs language-${lang || 'text'}' data-lang='${lang || 'text'}'><code>${str}</code></pre>`;
        }
    };

    return markdownIt(options)
        .use(markdownItAttrs)
        .use(require('markdown-it-footnote'))
        .use(require('markdown-it-attrs'))
        .use(require('markdown-it-task-lists'))
        .use(require('markdown-it-link-attributes'), {
            pattern: /^https?:/,
            attrs: {
                class: 'link--ext',
                target: '_blank',
                rel: 'noopener'
            }
        })
        .disable('code');
}