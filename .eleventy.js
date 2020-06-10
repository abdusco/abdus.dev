const UserConfig = require('@11ty/eleventy/src/UserConfig')
require('module-alias/register');
require('dotenv').config();
const _ = require('lodash');
const ext = require('./src/_eleventyextensions');
const yaml = require('js-yaml');

/** @param {UserConfig} config */
module.exports = (config) => {
    _.forEach(ext.transforms, (f, k) => config.addTransform(k, f));
    _.forEach(ext.transforms, (f, k) => config.addFilter(k, f));
    _.forEach(ext.transforms, (f, k) => config.addShortcode(k, f));
    _.forEach(ext.transforms, (f, k) => config.addPairedShortcode(k, f));


    config.addPassthroughCopy({
        'src/assets/css': 'styles',
        'src/assets/js': 'js',
    });

    config.addPassthroughCopy('src/**/*.{jpg,png,jpeg,svg}');

    ['yaml', 'yml'].forEach(ext => config.addDataExtension(ext, yaml.safeLoad));

    config.setBrowserSyncConfig({
        ui: { port: 3333 }
    });
    return {
        dir: {
            input: 'src',
            output: 'dist',

            data: '_data',
            layouts: '_layouts',
            includes: '_includes',
        },
        pathPrefix: '/',
        jsDataFileSuffix: '.data',
        markdownTemplateEngine: 'njk',
    }
};
