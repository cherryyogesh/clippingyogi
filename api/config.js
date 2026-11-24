module.exports = (req, res) => {
  const backend = (
    process.env.BACKEND_URL ||
    process.env.CLIPPING_YOGI_API_BASE ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://clippingyogi-1.onrender.com'
  ).trim().replace(/\/+$/, '');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.status(200).json({ backend });
};
