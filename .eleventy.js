require('dotenv').config();
require('module-alias/register');

const TemplateCollection = require('@11ty/eleventy/src/TemplateCollection')

const fs = require('fs');
const _ = require('lodash');
const tmpl = require('./src/_eleventy/templating');
const yaml = require('js-yaml');

const hljs = require('highlight.js');
const siteData = yaml.load(fs.readFileSync('./src/_data/site.yaml', 'utf-8'));

/** @param {import('@11ty/eleventy/src/UserConfig')} config */
module.exports = (config) => {
    
    _.forEach(tmpl.transforms, (f, key) => config.addTransform(key, f));
    _.forEach(tmpl.filters, (f, key) => config.addFilter(key, f));
    _.forEach(tmpl.shortcodes, (f, key) => {
        if (f.constructor.name === 'AsyncFunction') {
            config.addAsyncShortcode(key, f)
        } else {
            config.addShortcode(key, f);
        }
    });
    _.forEach(tmpl.pairedShortcodes, (f, key) => config.addPairedShortcode(key, f));
    config.addFilter('published', (arr) => arr.filter(isPublished));

    ['yaml', 'yml'].forEach(ext => config.addDataExtension(ext, yaml.load));
    config.setLibrary('md', markdownFactory());

    config.addPassthroughCopy({
        'src/_assets/**/*.{css,map}': 'assets/css',
        'src/_assets/fonts/*': 'assets/fonts',
        'src/_assets/**/*.{js,map}': 'assets/js',
        'admin/*': 'admin'
    });

    config.addPassthroughCopy('src/**/*.{jpg,png,jpeg,svg,gif,webm}');
    config.addPassthroughCopy('src/[^_]*/**/*[^.]+.js');


    const now = new Date;
    function isPublished(p) {
        return p.date <= now && !p.data.draft;
    }

    config.addCollection('updates', function (collectionApi) {
        /** @var {TemplateCollection} collectionApi */
        return collectionApi
            .getFilteredByGlob([
                'src/{posts,projects}/**/*.md',
            ])
            .filter(isPublished)
            .map(page => {
                page.urlAbsolute = `${siteData.baseUrl}${page.url}`;
                page.dateModified = fs.statSync(page.inputPath).mtime;
                return page;
            })
            .reverse();
    });

    config.addCollection('sitemap', function (collectionApi) {
        /** @var {TemplateCollection} collectionApi */

        /** @var {object[]} pages */
        let pages = collectionApi
            .getAll()
            .filter(p => isPublished(p) && p.data.sitemap !== false && p.url !== false)
            .map(page => {
                page.urlAbsolute = `${siteData.baseUrl}${page.url}`;
                page.dateModified = fs.statSync(page.inputPath).mtime;
                return page;
            });
        pages = _.sortBy(pages, ['date']).reverse();
        return pages;
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
            .map(it => ({ from: it.data.$aliases, to: it.url }));

        buildCaddyConfig(redirects);
    });


    config.setUseGitIgnore(false);
    config.setBrowserSyncConfig({
        ui: { port: 3333 }
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
    /**
     * @param {string} ranges 
     * @returns {Set<number>}
     */
    const parseLineNumbers = (ranges) => {
        const lines = new Set();
        ranges.split(',').forEach(range => {
            const [start, end] = range.split('-').map(i => parseInt(i, 10));
            if (!start) return;
            let linesWithinRange = end ?
                // set of numbers from start -> end
                [...new Array(Math.abs(end - start) + 1)].map((_, i) => start + i)
                : [start];
            linesWithinRange.forEach(lineNum => lines.add(lineNum));
        });
        return lines;
    }

    let options = {
        html: true,
        breaks: false,
        linkify: false,
        highlight(code, lang) {
            let actualLang = lang || 'text';
            let highlightedLines = new Set();

            if (actualLang.includes('lines')) {
                const [_, lang, ranges] = actualLang.match(/(.*)\Wlines=(\S+)/);
                actualLang = lang;
                highlightedLines = parseLineNumbers(ranges);
            }

            if (hljs.getLanguage(actualLang)) {
                try {
                    code = hljs.highlight(actualLang, code).value;
                } catch (e) {
                }
            }

            if (highlightedLines.size) {
                code = code
                    .split(/\r\n|\r|\n/g)
                    .map((line, i) => `<span class="${highlightedLines.has(i + 1) ? 'line--highlighted' : 'line'}" data-line="${i + 1}">${line}</span>`)
                    .join('\n');
            }

            return `<pre class='snippet hljs language-${actualLang}' data-lang='${actualLang}'><code>${code}</code></pre>`;
        }
    };

    return require("markdown-it")(options)
        .use(require('markdown-it-attrs'))
        .use(require('markdown-it-footnote'))
        .use(require('markdown-it-task-lists'))
        .use(require('markdown-it-anchor'))
        .use(require('markdown-it-kbd'))
        .use(require('markdown-it-table-of-contents'), {
            includeLevel: [2, 3, 4]
        })
        .use(require('markdown-it-container'), '', {
            validate: params => true,
            render(tokens, idx, _options, env, slf) {
                if (tokens[idx].nesting === 1) {
                    tokens[idx].attrJoin('class', tokens[idx].info.trim());
                }

                return slf.renderToken(tokens, idx, _options, env, slf);
            }
        })
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