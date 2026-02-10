CREATE TABLE timeline (
    id BIGINT NOT NULL AUTO_INCREMENT,
    worldview_id BIGINT NOT NULL,
    epoch VARCHAR(255) NOT NULL,
    start_seconds BIGINT NOT NULL,
    hour_length_in_seconds BIGINT NOT NULL,
    day_length_in_hours INT NOT NULL,
    month_length_in_days INT NOT NULL,
    year_length_in_months INT NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timeline_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date BIGINT NOT NULL COMMENT 'seconds',
    location VARCHAR(255),
    faction_ids JSON COMMENT 'Array of faction IDs stored as JSON string',
    role_ids JSON COMMENT 'Array of role IDs stored as JSON string',
    story_line_id INT NOT NULL,
    state VARCHAR(32) DEFAULT 'enabled' COMMENT 'enabled|questionable|not_yet|blocked|closed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_story_line (story_line_id),
    INDEX idx_date (date),
    INDEX idx_state (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 已有表时追加 state 字段（迁移用）
-- ALTER TABLE timeline_events ADD COLUMN state VARCHAR(32) DEFAULT 'enabled' COMMENT 'enabled|questionable|not_yet|blocked|closed' AFTER story_line_id;
-- ALTER TABLE timeline_events ADD INDEX idx_state (state); 