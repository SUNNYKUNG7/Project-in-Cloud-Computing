// เชื่อมต่อ MySQL แบบ Connection Pool
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'taskuser',
  password: process.env.DB_PASSWORD || 'taskpass',
  database: process.env.DB_NAME || 'taskdb',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,   // คืนค่า DATE/DATETIME เป็น string ('2026-11-09') กันปัญหา timezone เพี้ยน
  charset: 'utf8mb4',
});

// รอจนกว่า DB จะพร้อม (ตอน K8s pod ขึ้นพร้อมกัน DB อาจยังไม่พร้อม)
async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
      return;
    } catch (err) {
      console.log(`⏳ รอฐานข้อมูล... (${i}/${retries}) ${err.code || err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('เชื่อมต่อฐานข้อมูลไม่สำเร็จ');
}

module.exports = { pool, waitForDb };
