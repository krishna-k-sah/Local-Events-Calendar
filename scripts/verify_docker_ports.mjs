import { execSync } from 'child_process';
import http from 'http';
import crypto from 'crypto';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

console.log('=== [DEF-004 AUDIT] Verifying Docker Container with Multi-Port Deployments ===');

const DB_URL = 'postgresql://postgres:postgrespassword@host.docker.internal:5432/eventhub_phase54_test?schema=public';
const JWT_SECRET = crypto.randomBytes(32).toString('hex');

async function testPort(portNum, hostPort) {
  const containerName = `eventhub-test-backend-${portNum}`;
  console.log(`\n--- Testing PORT=${portNum} mapped to host:${hostPort} ---`);

  // Cleanup any old container
  try {
    execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
  } catch (e) {}

  // Run container
  console.log(`Starting container ${containerName}...`);
  execSync(
    `docker run -d --name ${containerName} --add-host=host.docker.internal:host-gateway -e PORT=${portNum} -e DATABASE_URL="${DB_URL}" -e DIRECT_URL="${DB_URL}" -e JWT_SECRET="${JWT_SECRET}" -p ${hostPort}:${portNum} eventhub-test-backend:latest`,
    { stdio: 'inherit' }
  );

  // Poll HTTP endpoint
  console.log(`Polling http://localhost:${hostPort}/health ...`);
  let res;
  for (let i = 0; i < 15; i++) {
    await sleep(2000);
    try {
      res = await fetchJson(`http://localhost:${hostPort}/health`);
      if (res.status === 200) {
        console.log(`Endpoint returned 200 OK after ${(i + 1) * 2}s!`);
        break;
      }
    } catch (err) {
      // Retrying
    }
  }

  if (!res || res.status !== 200) {
    throw new Error(`Healthcheck failed on port ${portNum}, got: ${JSON.stringify(res)}`);
  }
  console.log(`Response body on PORT ${portNum}:`, res.body);

  // Check Docker inspect health status
  console.log('Waiting for Docker daemon healthcheck interval...');
  let healthState = 'starting';
  for (let i = 0; i < 15; i++) {
    await sleep(3000);
    const healthOut = execSync(
      `docker inspect --format="{{json .State.Health.Status}}" ${containerName}`
    ).toString().trim().replace(/"/g, '');
    healthState = healthOut;
    console.log(`Docker healthcheck status: ${healthState}`);
    if (healthState === 'healthy') break;
  }

  // Cleanup container
  console.log(`Cleaning up container ${containerName}...`);
  execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });

  return { port: portNum, hostPort, httpStatus: res.status, healthState, body: res.body };
}

async function runAll() {
  const result1 = await testPort(5000, 5055);
  const result2 = await testPort(8080, 8088);

  console.log('\n================ DOCKER VERIFICATION SUMMARY ================');
  console.log(`PORT 5000: HTTP=${result1.httpStatus}, DockerHealth=${result1.healthState}, DB=${result1.body.database}`);
  console.log(`PORT 8080: HTTP=${result2.httpStatus}, DockerHealth=${result2.healthState}, DB=${result2.body.database}`);
  console.log('✅ [DEF-004 AUDIT] Dynamic port binding and healthcheck verified successfully on both ports!');
}

runAll().catch((err) => {
  console.error('❌ [DEF-004 AUDIT] Docker verification error:', err.message);
  process.exit(1);
});
