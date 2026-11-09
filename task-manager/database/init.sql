-- ==========================================================
-- Data Tier: สร้างตาราง Users และ Tasks (รันอัตโนมัติครั้งแรกที่ MySQL เริ่ม)
-- ความสัมพันธ์: Users 1 : N Tasks
-- ==========================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS Users (
  UserID     INT AUTO_INCREMENT PRIMARY KEY,
  FullName   VARCHAR(100) NOT NULL,
  Email      VARCHAR(150) NOT NULL UNIQUE,
  Password   VARCHAR(255) NOT NULL,                     -- เก็บแบบ bcrypt hash
  Role       ENUM('User','Admin') NOT NULL DEFAULT 'User',
  CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Tasks (
  TaskID      INT AUTO_INCREMENT PRIMARY KEY,
  UserID      INT NOT NULL,
  Title       VARCHAR(200) NOT NULL,
  Description TEXT,
  DueDate     DATE NULL,
  Status      ENUM('To Do','Doing','Done') NOT NULL DEFAULT 'To Do',
  CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_user FOREIGN KEY (UserID)
    REFERENCES Users(UserID) ON DELETE CASCADE,         -- ลบผู้ใช้ งานของเขาหายตาม
  INDEX idx_tasks_user_status (UserID, Status),
  INDEX idx_tasks_user_due (UserID, DueDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
