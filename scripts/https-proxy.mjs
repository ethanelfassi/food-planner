import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
const TARGET_HOST = process.env.TARGET_HOST || '127.0.0.1';
const TARGET_PORT = Number(process.env.TARGET_PORT || 3000);

const CERT_DIR = path.resolve(process.cwd(), '.certs');
const CERT_PATH = path.join(CERT_DIR, 'cert.pem');
const KEY_PATH = path.join(CERT_DIR, 'key.pem');
const OPENSSL_CNF_PATH = path.join(CERT_DIR, 'openssl.cnf');

function ensureTlsCertificates() {
  if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
    return;
  }

  fs.mkdirSync(CERT_DIR, { recursive: true });
  const cnf = [
    '[req]',
    'default_bits = 2048',
    'prompt = no',
    'default_md = sha256',
    'x509_extensions = v3_req',
    'distinguished_name = dn',
    '',
    '[dn]',
    'CN = FoodPlanner Local',
    '',
    '[v3_req]',
    'subjectAltName = IP:192.168.1.88,IP:100.96.98.124,DNS:localhost,DNS:raspberrypi.local,DNS:raspberrypi.tail1bc6fc.ts.net',
    '',
  ].join('\n');

  fs.writeFileSync(OPENSSL_CNF_PATH, cnf, 'utf8');
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-nodes',
      '-days',
      '825',
      '-newkey',
      'rsa:2048',
      '-keyout',
      KEY_PATH,
      '-out',
      CERT_PATH,
      '-config',
      OPENSSL_CNF_PATH,
    ],
    { stdio: 'inherit' }
  );
  console.log(`[https-proxy] Certificat TLS auto-signe genere dans ${CERT_DIR}`);
}

ensureTlsCertificates();

const tlsOptions = {
  key: fs.readFileSync(KEY_PATH),
  cert: fs.readFileSync(CERT_PATH),
};

const server = https.createServer(tlsOptions, (req, res) => {
  const headers = {
    ...req.headers,
    'x-forwarded-proto': 'https',
    'x-forwarded-host': req.headers.host || '',
    'x-forwarded-for': req.socket.remoteAddress || '',
  };

  const proxyReq = http.request(
    {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  proxyReq.on('error', (err) => {
    console.error('[https-proxy] Upstream error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Upstream FoodPlanner indisponible.');
  });

  req.pipe(proxyReq, { end: true });
});

server.on('upgrade', (req, clientSocket, head) => {
  const upstreamSocket = net.connect(TARGET_PORT, TARGET_HOST, () => {
    const rawHeaders = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\r\n');
    upstreamSocket.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${rawHeaders}\r\n\r\n`
    );
    if (head && head.length > 0) {
      upstreamSocket.write(head);
    }
    upstreamSocket.pipe(clientSocket);
    clientSocket.pipe(upstreamSocket);
  });

  upstreamSocket.on('error', () => {
    clientSocket.destroy();
  });
  clientSocket.on('error', () => {
    upstreamSocket.destroy();
  });
});

server.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(
    `[https-proxy] Ecoute sur https://0.0.0.0:${HTTPS_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`
  );
});
