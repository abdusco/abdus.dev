const sass = require('node-sass');

const bool = (val) => val ? sass.types.Boolean.TRUE: sass.types.Boolean.FALSE;
const str = (val) => new sass.types.String(val);
const isStr = (val) => val instanceof sass.types.String;

let env = (process.env.NODE_ENV || '').trim().toLowerCase();

module.exports = {
    'isProd()': () => bool(env === 'production'),
    'isDev()': () => bool(env !== 'production'),
    'env($env)': (val) => {
        if (!isStr(val)) {
            throw '$env must be a string';
        }
        const env = val.getValue();
        return str(process.env[env]);
    },
}