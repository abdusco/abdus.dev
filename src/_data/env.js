module.exports = {
    prod: process.env.NODE_ENV === 'production',
    ...process.env
}