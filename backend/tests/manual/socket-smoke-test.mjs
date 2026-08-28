import jwt from 'jsonwebtoken';
import { io as ioClient } from 'socket.io-client';

const SECRET = 'dev-only-access-secret-do-not-use-in-prod'; // matches env.js's dev fallback
const validToken = jwt.sign({ sub: 'user123', type: 'access' }, SECRET, { expiresIn: '5m' });

let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    console.log(`PASS: ${label}`);
    passed++;
  } else {
    console.log(`FAIL: ${label}`);
    failed++;
  }
}

async function main() {
  // --- No token: should be rejected ---
  await new Promise((resolve) => {
    const socket = ioClient('http://localhost:5000', { reconnection: false, timeout: 3000 });
    socket.on('connect', () => {
      check('rejects connection with no token', false);
      socket.disconnect();
      resolve();
    });
    socket.on('connect_error', (err) => {
      check('rejects connection with no token', err.message === 'Not authenticated');
      resolve();
    });
  });

  // --- Valid token: should succeed ---
  await new Promise((resolve) => {
    const socket = ioClient('http://localhost:5000', {
      reconnection: false,
      timeout: 3000,
      auth: { token: validToken },
    });
    socket.on('connect', () => {
      check('accepts connection with a valid token', true);
      socket.disconnect();
      resolve();
    });
    socket.on('connect_error', (err) => {
      check('accepts connection with a valid token', false);
      console.log('  error was:', err.message);
      resolve();
    });
  });

  // --- Invalid token: should be rejected ---
  await new Promise((resolve) => {
    const socket = ioClient('http://localhost:5000', {
      reconnection: false,
      timeout: 3000,
      auth: { token: 'garbage.not.a.jwt' },
    });
    socket.on('connect', () => {
      check('rejects connection with a garbage token', false);
      socket.disconnect();
      resolve();
    });
    socket.on('connect_error', (err) => {
      check('rejects connection with a garbage token', err.message === 'Invalid or expired token');
      resolve();
    });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
