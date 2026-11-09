-- ==========================================================
-- ข้อมูลทดสอบ (รันซ้ำได้ — ลบข้อมูลทดสอบเดิมก่อนแล้วสร้างใหม่)
-- ผู้ใช้ทดสอบทุกคนรหัสผ่าน: user1234
-- วันครบกำหนดอิงจาก "วันนี้" เสมอ → ใกล้กำหนด/เลยกำหนด จะแสดงถูกทุกครั้งที่รัน
-- ==========================================================
SET NAMES utf8mb4;

DELETE FROM Users WHERE Email IN ('user1@test.com', 'user2@test.com', 'user3@test.com');

INSERT INTO Users (FullName, Email, Password, Role) VALUES
  ('สมชาย ใจดี',   'user1@test.com', '$2a$10$N4XwU1Ui/uky3WtNdPyHe.Ys5meSQgZXUUudPjWyd0inNB9bmzRN2', 'User'),
  ('สมหญิง รักงาน', 'user2@test.com', '$2a$10$N4XwU1Ui/uky3WtNdPyHe.Ys5meSQgZXUUudPjWyd0inNB9bmzRN2', 'User'),
  ('มานะ ว่างงาน',  'user3@test.com', '$2a$10$N4XwU1Ui/uky3WtNdPyHe.Ys5meSQgZXUUudPjWyd0inNB9bmzRN2', 'User');

-- ---------- งานของ user1 (มีครบทุกกรณี) ----------
SET @u1 = (SELECT UserID FROM Users WHERE Email = 'user1@test.com');
INSERT INTO Tasks (UserID, Title, Description, DueDate, Status) VALUES
  (@u1, 'ส่งรายงาน Data Warehouse',  'บทที่ 1-3 พร้อม ER Diagram', CURDATE() - INTERVAL 3 DAY, 'To Do'),  -- เลยกำหนด
  (@u1, 'แก้บั๊กหน้า Login',          NULL,                         CURDATE() - INTERVAL 1 DAY, 'Doing'),  -- เลยกำหนด
  (@u1, 'ทำแล็บ Kubernetes',          'Deployment + Service',       CURDATE(),                  'Doing'),  -- ใกล้ (วันนี้)
  (@u1, 'อ่านสไลด์ Cloud บทที่ 5',     NULL,                         CURDATE() + INTERVAL 2 DAY, 'To Do'),  -- ใกล้
  (@u1, 'เตรียมพรีเซนต์โปรเจกต์',      'ทำสไลด์ 10 หน้า',            CURDATE() + INTERVAL 3 DAY, 'To Do'),  -- ใกล้ (ขอบ 3 วัน)
  (@u1, 'สอบกลางภาค',                 NULL,                         CURDATE() + INTERVAL 10 DAY,'To Do'),  -- ยังไม่ใกล้
  (@u1, 'ติดตั้ง Docker Desktop',      NULL,                         CURDATE() - INTERVAL 5 DAY, 'Done'),   -- เสร็จแล้ว (ไม่นับเลยกำหนด)
  (@u1, 'สมัครชมรม',                  'ไม่มีกำหนดส่ง',              NULL,                       'To Do');  -- ไม่มีวันครบกำหนด

-- ---------- งานของ user2 (ใช้ทดสอบว่า user1 มองไม่เห็น) ----------
SET @u2 = (SELECT UserID FROM Users WHERE Email = 'user2@test.com');
INSERT INTO Tasks (UserID, Title, Description, DueDate, Status) VALUES
  (@u2, 'งานลับของ user2', 'user1 ต้องมองไม่เห็นงานนี้', CURDATE() + INTERVAL 1 DAY, 'To Do'),
  (@u2, 'ซื้อของเข้าหอ',   NULL,                        CURDATE() + INTERVAL 5 DAY, 'Done');

-- user3 ไม่มีงานเลย → ใช้ทดสอบหน้าว่าง (empty state)
