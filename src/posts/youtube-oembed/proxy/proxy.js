const axios = require('axios');

const fetchOembed = async url => {
    const {data} = await axios.get(`http://www.youtube.com/oembed`, {params: {url}});
    return data;
};

module.exports = async (req, res) => {
    const {url} = req.query;
    if (!url) {
        res.status(400).json({error: 'missing url'});
        return;
    }
    try {
        const oembed = await fetchOembed(url);
        res.json(oembed);
    } catch (e) {
        res.status(500).json({error: 'error while fetching oembed'});
    }
};
