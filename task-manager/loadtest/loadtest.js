// ==========================================================
// Load test ด้วย k6 — ยิงคำขออัตราคงที่ RATE req/s (แบบ "ยิง R req/s" ใน Week 2)
// วัด: p95 (ms), throughput (req/s ที่สำเร็จ), error rate, และสัดส่วนที่ web1/web2 รับ
//
// รัน (PowerShell ในโฟลเดอร์ task-manager):
//   docker run --rm --network task-manager_default -v "${PWD}/loadtest:/scripts" `
//     -e RATE=300 -e LABEL=2web-300 grafana/k6 run /scripts/loadtest.js
// ==========================================================
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE = __ENV.BASE || 'http://frontend';          // ยิงผ่าน Load Balancer (ชื่อ service ใน compose)
const RATE = Number(__ENV.RATE || 200);                  // คำขอต่อวินาทีที่ต้องการยิง
const DURATION = __ENV.DURATION || '30s';
const LABEL = __ENV.LABEL || `rate-${RATE}`;
const EMAIL = __ENV.EMAIL || 'user1@test.com';
const PASSWORD = __ENV.PASSWORD || 'user1234';

// นับว่าแต่ละ backend รับไปกี่คำขอ
const hitsWeb1 = new Counter('hits_web1');
const hitsWeb2 = new Counter('hits_web2');
const hitsOther = new Counter('hits_other');

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-arrival-rate',   // ยิงอัตราคงที่ ไม่ขึ้นกับว่าเซิร์ฟเวอร์ตอบเร็วหรือช้า
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 100,
      maxVUs: 600,
    },
  },
  summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'max'],
};

// ---------- ขั้นเตรียม: ล็อกอินครั้งเดียว เอา token ไปใช้ทุกคำขอ ----------
export function setup() {
  const login = () => http.post(`${BASE}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } });

  let res = login();
  if (res.status !== 200) {
    // ยังไม่มีบัญชีทดสอบ → สมัครให้อัตโนมัติ
    http.post(`${BASE}/api/auth/register`,
      JSON.stringify({ fullName: 'Load Test', email: EMAIL, password: PASSWORD }),
      { headers: { 'Content-Type': 'application/json' } });
    res = login();
  }
  if (res.status !== 200) throw new Error(`ล็อกอินไม่สำเร็จ (${res.status}) — เช็กว่าระบบรันอยู่`);
  return { token: res.json('token') };
}

// ---------- แต่ละคำขอ: สลับ 2 API ที่หน้า Dashboard/บอร์ดใช้จริง ----------
export default function (data) {
  const params = { headers: { Authorization: `Bearer ${data.token}` }, timeout: '10s' };
  const path = __ITER % 2 === 0 ? '/api/tasks/summary' : '/api/tasks?sort=due_asc';
  const res = http.get(`${BASE}${path}`, params);

  check(res, { 'status 200': (r) => r.status === 200 });

  const backend = res.headers['X-Backend'];
  if (backend === 'web1') hitsWeb1.add(1);
  else if (backend === 'web2') hitsWeb2.add(1);
  else hitsOther.add(1);
}

// ---------- สรุปผลเป็นตารางอ่านง่าย + บันทึกไฟล์ JSON ไว้ทำรายงาน ----------
export function handleSummary(data) {
  const m = data.metrics;
  const v = (name, key) => (m[name] && m[name].values[key]) || 0;
  const total = v('http_reqs', 'count');
  const failRate = v('http_req_failed', 'rate');
  const ok = total * (1 - failRate);
  const secs = data.state.testRunDurationMs / 1000;
  const w1 = v('hits_web1', 'count');
  const w2 = v('hits_web2', 'count');
  const other = v('hits_other', 'count');
  const dropped = v('dropped_iterations', 'count');
  const pct = (n) => (total ? ((n / total) * 100).toFixed(1) : '0.0');

  const result = {
    label: LABEL,
    target_rate: RATE,
    duration_s: Number(secs.toFixed(1)),
    requests_sent: total,
    throughput_ok_per_s: Number((ok / secs).toFixed(1)),
    p50_ms: Number(v('http_req_duration', 'p(50)').toFixed(1)),
    p95_ms: Number(v('http_req_duration', 'p(95)').toFixed(1)),
    max_ms: Number(v('http_req_duration', 'max').toFixed(1)),
    error_rate_pct: Number((failRate * 100).toFixed(2)),
    dropped_iterations: dropped,
    web1: w1, web2: w2, other,
  };

  const text = `
==================== ผลทดสอบ: ${LABEL} ====================
ยิงเป้าหมาย       : ${RATE} req/s นาน ${result.duration_s} s
ส่งจริง            : ${total} คำขอ (ยิงไม่ทัน/ตกหล่น ${dropped})
Throughput สำเร็จ  : ${result.throughput_ok_per_s} req/s
Latency p50 / p95 : ${result.p50_ms} / ${result.p95_ms} ms (สูงสุด ${result.max_ms} ms)
Error rate        : ${result.error_rate_pct} %
กระจายไป backend  : web1 ${w1} (${pct(w1)}%) · web2 ${w2} (${pct(w2)}%) · อื่น/ไม่มีคำตอบ ${other}
==============================================================
`;
  return {
    stdout: text,
    [`/scripts/results/${LABEL}.json`]: JSON.stringify(result, null, 2),
  };
}
