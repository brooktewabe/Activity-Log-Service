import autocannon from 'autocannon';
import { randomBytes } from 'crypto';
import { writeFileSync } from 'fs';

const services = ['auth', 'payment', 'inventory', 'notification'];
const actions = ['create', 'update', 'delete', 'read'];
const severities = ['info', 'warn', 'error', 'critical'];

function generateLog() {
  return {
    service: services[Math.floor(Math.random() * services.length)],
    action: `${actions[Math.floor(Math.random() * actions.length)]}.resource`,
    userId: `user_${randomBytes(4).toString('hex')}`,
    metadata: {
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'BenchmarkTest/1.0',
      sessionId: `session_${randomBytes(8).toString('hex')}`,
    },
    severity: severities[Math.floor(Math.random() * severities.length)],
    timestamp: new Date().toISOString(),
  };
}

async function runTest(name, port) {
  console.log(`\n Testing ${name}...`);

  return new Promise((resolve) => {
    const instance = autocannon(
      {
        url: `http://localhost:${port}`,
        connections: 1000,
        duration: 30,
        pipelining: 10,
        requests: [
          {
            method: 'POST',
            path: '/api/v1/logs',
            headers: {
              'Content-Type': 'application/json',
            },
            setupRequest: (req) => {
              req.body = JSON.stringify(generateLog());
              return req;
            },
          },
        ],
      },
      (err, results) => {
        if (err) {
          console.error(`${name} test error:`, err);
          resolve(null);
          return;
        }
        resolve({ name, results });
      }
    );

    autocannon.track(instance, { renderProgressBar: true });
  });
}

function printComparison(nodeResults, rustResults) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PERFORMANCE COMPARISON: Node.js vs Rust');
  console.log('='.repeat(80));

  const metrics = [
    {
      name: 'Total Requests',
      node: nodeResults.requests.total,
      rust: rustResults.requests.total,
    },
    {
      name: 'Requests/sec',
      node: nodeResults.requests.mean.toFixed(2),
      rust: rustResults.requests.mean.toFixed(2),
    },
    {
      name: 'Avg Latency (ms)',
      node: nodeResults.latency.mean.toFixed(2),
      rust: rustResults.latency.mean.toFixed(2),
    },
    {
      name: 'p50 Latency (ms)',
      node: nodeResults.latency.p50.toFixed(2),
      rust: rustResults.latency.p50.toFixed(2),
    },
    {
      name: 'p95 Latency (ms)',
      node: nodeResults.latency.p95.toFixed(2),
      rust: rustResults.latency.p95.toFixed(2),
    },
    {
      name: 'p99 Latency (ms)',
      node: nodeResults.latency.p99.toFixed(2),
      rust: rustResults.latency.p99.toFixed(2),
    },
    {
      name: 'Throughput (MB/s)',
      node: (nodeResults.throughput.mean / 1024 / 1024).toFixed(2),
      rust: (rustResults.throughput.mean / 1024 / 1024).toFixed(2),
    },
    {
      name: 'Errors',
      node: nodeResults.errors,
      rust: rustResults.errors,
    },
  ];

  console.log('\n' + '-'.repeat(80));
  console.log(
    'Metric'.padEnd(25) +
      'Node.js'.padEnd(20) +
      'Rust'.padEnd(20) +
      'Winner'.padEnd(15)
  );
  console.log('-'.repeat(80));

  metrics.forEach((metric) => {
    const nodeVal = parseFloat(metric.node);
    const rustVal = parseFloat(metric.rust);
    let winner = '—';

    if (!isNaN(nodeVal) && !isNaN(rustVal)) {
      if (metric.name.includes('Latency') || metric.name === 'Errors') {
        winner = nodeVal < rustVal ? '🟢 Node.js' : '🟢 Rust';
      } else {
        winner = nodeVal > rustVal ? '🟢 Node.js' : '🟢 Rust';
      }
    }

    console.log(
      metric.name.padEnd(25) +
        String(metric.node).padEnd(20) +
        String(metric.rust).padEnd(20) +
        winner.padEnd(15)
    );
  });

  console.log('-'.repeat(80));

  // Calculate performance difference
  const reqsPerSecDiff =
    ((rustResults.requests.mean - nodeResults.requests.mean) /
      nodeResults.requests.mean) *
    100;
  const latencyDiff =
    ((nodeResults.latency.mean - rustResults.latency.mean) /
      nodeResults.latency.mean) *
    100;

  console.log('\n📈 Summary:');
  console.log(
    `  • Rust is ${Math.abs(reqsPerSecDiff).toFixed(1)}% ${reqsPerSecDiff > 0 ? 'FASTER' : 'SLOWER'} in requests/sec`
  );
  console.log(
    `  • Rust has ${Math.abs(latencyDiff).toFixed(1)}% ${latencyDiff > 0 ? 'LOWER' : 'HIGHER'} latency`
  );
  console.log('='.repeat(80) + '\n');
}

async function main() {
  console.log('   Starting Performance Benchmark');
  console.log('   Configuration:');
  console.log('   • Duration: 30 seconds');
  console.log('   • Connections: 1000 concurrent');
  console.log('   • Pipelining: 10 requests per connection');
  console.log('   • Total: ~30,000 requests expected per service\n');

  const nodeTest = await runTest('Node.js Service', 3000);
  await new Promise((resolve) => setTimeout(resolve, 5000)); // Cool down

  const rustTest = await runTest('Rust Service', 3001);

  if (nodeTest && rustTest) {
    printComparison(nodeTest.results, rustTest.results);

    // Save results to file
    const report = {
      timestamp: new Date().toISOString(),
      node: nodeTest.results,
      rust: rustTest.results,
    };

    writeFileSync('benchmark-results.json', JSON.stringify(report, null, 2));
    console.log('💾 Results saved to benchmark-results.json\n');
  } else {
    console.error('❌ One or both tests failed');
  }
}

main().catch(console.error);