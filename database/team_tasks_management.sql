CREATE DATABASE team_task_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE team_task_management;

select * from user
select * from `group`
select * from group_user


-- Bảng user
CREATE TABLE user (
    id BINARY(16) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('admin','member') DEFAULT 'member',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    name VARCHAR(100),
    dob DATE,
    gender ENUM('male','female','other'),
    phoneNumber VARCHAR(20),
    address VARCHAR(255),
    avatarPath VARCHAR(255),
    backgroundPath VARCHAR(255)
);

-- Bảng group
CREATE TABLE `group` (
    id BINARY(16) PRIMARY KEY,
    groupName VARCHAR(100) NOT NULL,
    memberCount INT DEFAULT 0,
    taskCount INT DEFAULT 0,
    leaderId BINARY(16),
    createdBy BINARY(16),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (leaderId) REFERENCES user(id),
    FOREIGN KEY (createdBy) REFERENCES user(id)
);

-- Bảng group_user
CREATE TABLE group_user (
    id BINARY(16) PRIMARY KEY,
    groupId BINARY(16),
    userId BINARY(16),
    roleInGroup ENUM('leader','member') DEFAULT 'member',
    joinAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (groupId) REFERENCES `group`(id),
    FOREIGN KEY (userId) REFERENCES user(id)
);

-- Bảng task
CREATE TABLE task (
    id BINARY(16) PRIMARY KEY,
    taskName VARCHAR(255) NOT NULL,
    description TEXT,
    deadline DATETIME,
    createdBy BINARY(16),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('pending','in_progress','completed') DEFAULT 'pending',
    completedAt DATETIME NULL,
    groupId BINARY(16),
    FOREIGN KEY (createdBy) REFERENCES user(id),
    FOREIGN KEY (groupId) REFERENCES `group`(id)
);

-- Bảng task_assignee
CREATE TABLE task_assignee (
    id BINARY(16) PRIMARY KEY,
    taskId BINARY(16),
    userId BINARY(16),
    status ENUM('assigned','in_progress','done') DEFAULT 'assigned',
    assignAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (taskId) REFERENCES task(id),
    FOREIGN KEY (userId) REFERENCES user(id)
);

-- Bảng comment
CREATE TABLE comment (
    id BINARY(16) PRIMARY KEY,
    taskId BINARY(16),
    userId BINARY(16),
    content TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (taskId) REFERENCES task(id),
    FOREIGN KEY (userId) REFERENCES user(id)
);

-- Bảng file
CREATE TABLE file (
    id BINARY(16) PRIMARY KEY,
    taskId BINARY(16),
    userId BINARY(16),
    fileName VARCHAR(255) NOT NULL,
    fileType VARCHAR(50),
    fileSize BIGINT,
    filePath VARCHAR(255) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (taskId) REFERENCES task(id),
    FOREIGN KEY (userId) REFERENCES user(id)
);

-- Bảng notification
CREATE TABLE notification (
    id BINARY(16) PRIMARY KEY,
    userId BINARY(16),      -- Người nhận
    senderId BINARY(16),    -- Người gửi
    message TEXT NOT NULL,
    type ENUM('task','comment','file','general'),
    referenceId BINARY(16) NULL, -- Liên kết đến task/comment/file
    isRead BOOLEAN DEFAULT FALSE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES user(id),
    FOREIGN KEY (senderId) REFERENCES user(id)
);

-- Bảng chat (quản lý phòng chat)
CREATE TABLE chat (
    id BINARY(16) PRIMARY KEY,
    chatType ENUM('group','private') NOT NULL,
    groupId BINARY(16) NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (groupId) REFERENCES `group`(id)
);

-- Bảng chat_member
CREATE TABLE chat_member (
    chatId BINARY(16),
    userId BINARY(16),
    joinAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chatId, userId),
    FOREIGN KEY (chatId) REFERENCES chat(id),
    FOREIGN KEY (userId) REFERENCES user(id)
);

-- Bảng chat_mess
CREATE TABLE chat_mess (
    id BINARY(16) PRIMARY KEY,
    chatId BINARY(16),
    senderId BINARY(16),
    message TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatId) REFERENCES chat(id),
    FOREIGN KEY (senderId) REFERENCES user(id)
);

-- Bảng chatbot (tách riêng để quản lý chatbot)
CREATE TABLE chatbot (
    id BINARY(16) PRIMARY KEY,
    chatId BINARY(16),
    botName VARCHAR(100) DEFAULT 'TaskBot',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatId) REFERENCES chat(id)
);

-- Bảng chatbot_mess (tin nhắn từ bot)
CREATE TABLE chatbot_mess (
    id BINARY(16) PRIMARY KEY,
    chatbotId BINARY(16),
    message TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatbotId) REFERENCES chatbot(id)
);

