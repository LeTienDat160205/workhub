CREATE DATABASE team_task_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE team_task_management;

select * from user
<<<<<<< HEAD
select * from task
=======
>>>>>>> 92550f35a6f978f13bbeeb1fd63ce1eb766de1e2
select * from task_assignee
drop database team_task_management
SELECT * FROM notification ;
SELECT BIN_TO_UUID(id) AS id, username, email 
FROM user;
SELECT BIN_TO_UUID(id) AS userId, username FROM user;
SELECT BIN_TO_UUID(id), * FROM `group`;
SELECT BIN_TO_UUID(id) AS gid, groupName FROM `group`;
SELECT BIN_TO_UUID(id) AS id, username 
FROM user;





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

-- Bảng chat (quản lý phòng chat)
CREATE TABLE chat (
    id BINARY(16) PRIMARY KEY,
    chatType ENUM('private', 'group') NOT NULL,
    name VARCHAR(100) NULL,                -- tên nhóm (nếu là group)
    avatarPath VARCHAR(255) NULL,          -- ảnh nhóm
    groupId BINARY(16) NULL,               -- nếu liên kết với bảng group
    lastMessage VARCHAR(255) NULL,
    lastMessageTime DATETIME NULL,
    createdBy BINARY(16) NOT NULL,         -- người tạo phòng
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES user(id),
    FOREIGN KEY (groupId) REFERENCES `group`(id) ON DELETE CASCADE
);

-- Bảng chat_member
CREATE TABLE chat_member (
    chatId BINARY(16),
    userId BINARY(16),
    role ENUM('member','admin','owner') DEFAULT 'member',
    lastSeen DATETIME NULL,                -- thời điểm đọc tin cuối
    isMuted BOOLEAN DEFAULT FALSE,         -- tắt thông báo?
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chatId, userId),
    FOREIGN KEY (chatId) REFERENCES chat(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

-- Bảng message
CREATE TABLE message (
    id BINARY(16) PRIMARY KEY,
    chatId BINARY(16) NOT NULL,
    senderId BINARY(16) NOT NULL,
    content TEXT,
    messageType ENUM('text','image','file','audio','video','emoji') DEFAULT 'text',
    fileUrl VARCHAR(255),
    replyTo BINARY(16) NULL,               -- trả lời tin khác
    isEdited BOOLEAN DEFAULT FALSE,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatId) REFERENCES chat(id) ON DELETE CASCADE,
    FOREIGN KEY (senderId) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (replyTo) REFERENCES message(id) ON DELETE SET NULL
);

-- Thả cảm xúc
CREATE TABLE message_reaction (
    messageId BINARY(16),
    userId BINARY(16),
    emoji VARCHAR(20),
    reactedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (messageId, userId),
    FOREIGN KEY (messageId) REFERENCES message(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

-- Trạng thái đã đọc
CREATE TABLE message_read (
    messageId BINARY(16),
    userId BINARY(16),
    readAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (messageId, userId),
    FOREIGN KEY (messageId) REFERENCES message(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
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

select * from notification
ALTER TABLE file ADD COLUMN fileCategory ENUM('attachment', 'submission') DEFAULT 'attachment';

ALTER TABLE chat 
MODIFY COLUMN chatType ENUM('private', 'group', 'task') NOT NULL;

ALTER TABLE chat 
ADD COLUMN taskId BINARY(16) NULL;

ALTER TABLE chat
ADD CONSTRAINT fk_chat_task
FOREIGN KEY (taskId) REFERENCES task(id)
ON DELETE CASCADE;


