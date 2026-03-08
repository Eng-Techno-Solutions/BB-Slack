const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/slack-api',
    createProxyMiddleware({
      target: 'https://slack.com',
      changeOrigin: true,
      pathRewrite: function (path) {
        return path.replace('/slack-api', '/api');
      },
      secure: true,
      logLevel: 'debug',
    })
  );

  app.get('/slack-file', function (req, res) {
    const fileUrl = req.query.url;
    const token = req.query.token;
    if (!fileUrl || !token) {
      res.status(400).send('Missing url or token');
      return;
    }

    try {
      new URL(fileUrl);
    } catch (e) {
      res.status(400).send('Invalid URL');
      return;
    }

    const { Readable } = require('stream');

    fetch(fileUrl, {
      headers: { 'Authorization': 'Bearer ' + token },
      redirect: 'follow',
    })
      .then(function (proxyRes) {
        if (!proxyRes.ok) {
          res.status(proxyRes.status).send('Upstream error: ' + proxyRes.status);
          return;
        }
        let ct = proxyRes.headers.get('content-type') || 'application/octet-stream';
        const reqUrl = req.query.url || '';
        if (reqUrl.match(/audio.*\.mp4/) || reqUrl.match(/\.m4a/)) {
          ct = 'audio/mp4';
        }
        res.set('Content-Type', ct);
        res.set('Cache-Control', 'public, max-age=3600');
        const nodeStream = Readable.fromWeb(proxyRes.body);
        nodeStream.pipe(res);
      })
      .catch(function (err) {
        console.error('slack-file proxy error:', err.message);
        res.status(502).send('Proxy error');
      });
  });
};
