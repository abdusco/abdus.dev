require('dotenv').config();
require('module-alias/register');
const UserConfig = require('@11ty/eleventy/src/UserConfig')

const _ = require('lodash');
const tmpl = require('./src/_eleventy/templating');
const yaml = require('js-yaml');
const markdownIt = require("markdown-it");
const markdownItAttrs = require('markdown-it-attrs');

/** @param {UserConfig} config */
module.exports = (config) => {
    _.forEach(tmpl.transforms, (f, k) => config.addTransform(k, f));
    _.forEach(tmpl.transforms, (f, k) => config.addFilter(k, f));
    _.forEach(tmpl.transforms, (f, k) => config.addShortcode(k, f));
    _.forEach(tmpl.transforms, (f, k) => config.addPairedShortcode(k, f));

    config.setLibrary('md', markdownFactory());

    config.addPassthroughCopy({
        'src/assets/css': 'styles',
        'src/assets/js': 'js',
    });

    config.addPassthroughCopy('src/**/*.{jpg,png,jpeg,svg}');

    ['yaml', 'yml'].forEach(ext => config.addDataExtension(ext, yaml.safeLoad));

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
    let options = {
        html: true,
        breaks: true,
        linkify: false,
    };

    return markdownIt(options)
        .use(markdownItAttrs)
        .disable('code');
}