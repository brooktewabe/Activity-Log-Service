import autocannon from 'autocannon';
import { randomBytes } from 'crypto';

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
            userAgent: 'LoadTest/1.0',
            sessionId: `session_${randomBytes(8).toString('hex')}`,
        },
        severity: severities[Math.floor(Math.random() * severities.length)],
        // timestamp: new Date().toISOString(), // Rust adds timestamp if missing
    };
}

const instance = autocannon(
    {
        url: 'http://localhost:3001', // Rust port
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
                body: JSON.stringify(generateLog()),
                setupRequest: (req) => {
                    req.body = JSON.stringify(generateLog());
                    return req;
                },
            },
        ],
    },
    (err, results) => {
        if (err) {
            console.error('Load test error:', err);
            return;
        }

        console.log('\n🦀 Load Test Results (Rust Service)');
        console.log('=====================================');
        console.log(`Duration: ${results.duration}s`);
        console.log(`Requests: ${results.requests.total}`);
        console.log(`Requests/sec: ${results.requests.mean}`);
        console.log(`Latency (ms):`);
        console.log(`  Average: ${results.latency.mean}`);
        console.log(`  p50: ${results.latency.p50}`);
        console.log(`  p95: ${results.latency.p95}`);
        console.log(`  p99: ${results.latency.p99}`);
        console.log(`Throughput: ${(results.throughput.mean / 1024 / 1024).toFixed(2)} MB/s`);
        console.log(`Errors: ${results.errors}`);
        console.log(`Timeouts: ${results.timeouts}`);
        console.log('=====================================\n');
    }
);

autocannon.track(instance, { renderProgressBar: true });
