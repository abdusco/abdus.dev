require('dotenv').config();
require('module-alias/register');

const UserConfig = require('@11ty/eleventy/src/UserConfig')
const TemplateCollection = require('@11ty/eleventy/src/TemplateCollection')

const fs = require('fs');
const _ = require('lodash');
const tmpl = require('./src/_eleventy/templating');
const yaml = require('js-yaml');

const hljs = require('highlight.js');
const markdownIt = require("markdown-it");
const markdownItAttrs = require('markdown-it-attrs');
const markdownItFootnote = require('markdown-it-footnote');
const markdownItTaskList = require('markdown-it-task-lists');
const markdownItLinkAttributes = require('markdown-it-link-attributes');
const markdownItContainer = require('markdown-it-container');
const markdownItToc = require('markdown-it-table-of-contents');
const markdownItAnchor = require('markdown-it-anchor');

const siteData = yaml.safeLoad(fs.readFileSync('./src/_data/site.yaml', 'utf-8'));

/** @param {UserConfig} config */
module.exports = (config) => {
    _.forEach(tmpl.transforms, (f, k) => config.addTransform(k, f));
    _.forEach(tmpl.filters, (f, k) => config.addFilter(k, f));
    _.forEach(tmpl.shortcodes, (f, k) => config.addShortcode(k, f));
    _.forEach(tmpl.pairedShortcodes, (f, k) => config.addPairedShortcode(k, f));
    config.addFilter('published', (arr) => arr.filter(isPublished));

    ['yaml', 'yml'].forEach(ext => config.addDataExtension(ext, yaml.safeLoad));
    config.setLibrary('md', markdownFactory());

    config.addPassthroughCopy({
        'src/_assets/css': 'assets/css',
        'src/_assets/fonts': 'assets/fonts',
        'src/_assets/js': 'assets/js',
        'admin': 'admin'
    });

    config.addPassthroughCopy('src/**/*.{jpg,png,jpeg,svg,gif}');
    config.addPassthroughCopy('src/[^_]*/**/*[^.]+.js');


    const now = new Date;

    function isPublished(p) {
        return p.date <= now && !p.data.draft;
    }

    config.addCollection('updates', function (collectionApi) {
        /** @var {TemplateCollection} collectionApi */
        return collectionApi.getFilteredByGlob([
            'src/posts/*.md',
            'src/posts/**/*.md',
            'src/projects/**/*.md',
            'src/projects/**/*.md',
        ]).filter(isPublished).reverse();
    });

    config.addCollection('tags', (collectionApi) => {
        const slugify = config.getFilter('slug');
        /** @var {TemplateCollection} collectionApi */
        let uniqueTags = _.uniq(_.flatten(collectionApi.items.map(it => it.data.tags || [])));
        return uniqueTags.map(t => ({
            name: t,
            url: `/posts/~${slugify(t)}/`,
        }));
    });

    config.addCollection('redirects', (collectionApi) => {
        let aliased = collectionApi.items
            .filter(it => it.data.$aliases)
            .map(it => {
                return (it.data.$aliases || []).map(url => ({
                    redirectTo: `${siteData.baseUrl}${it.url}`,
                    title: it.data.title,
                    url,
                }));
            });
        config._collectionApi = collectionApi;
        return _.flatten(aliased);
    });

    config.on('afterBuild', () => {
        /** @var {TemplateCollection} api  */
        const api = config._collectionApi;

        const redirects = api.getAll().filter(it => it.data.$aliases)
            .map(it => ({from: it.data.$aliases, to: it.url}));

        buildCaddyConfig(redirects);
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

/**
 * @param {{from: string[], to: string}[]} items
 */
function buildCaddyConfig(items) {
    const normalizePath = p => `/${p.replace(/^\/|\/$/, '')}/`;
    const renderRedirect = (from, to) => `redir ${from} ${to} permanent`
    const lines = [];
    items.forEach(it => it.from.map(normalizePath).forEach(from => lines.push(renderRedirect(from, it.to))));

    // dont write empty file
    if (lines.length === 0) {
        lines.push('#')
    }
    const contents = lines.join('\n');
    fs.writeFileSync(__dirname + '/dist/.redirects.caddy', contents);
}

function markdownFactory() {
    let options = {
        html: true,
        breaks: false,
        linkify: false,
        highlight(code, lang) {
            if (!lang) lang = 'text';

            if (hljs.getLanguage(lang)) {
                try {
                    code = hljs.highlight(lang, code).value;
                } catch (e) {
                }
            }

            return `<pre class='snippet hljs language-${lang}' data-lang='${lang}'><code>${code}</code></pre>`;
        }
    };

    return markdownIt(options)
        .use(markdownItAttrs)
        .use(markdownItFootnote)
        .use(markdownItTaskList)
        .use(markdownItAnchor)
        .use(markdownItToc, {
            includeLevel: [2, 3, 4]
        })
        .use(markdownItContainer, 'tip')
        .use(markdownItContainer, 'download')
        .use(markdownItLinkAttributes, {
            pattern: /^https?:/,
            attrs: {
                class: 'link--ext',
                target: '_blank',
                rel: 'noopener'
            }
        })
        .disable('code');
}