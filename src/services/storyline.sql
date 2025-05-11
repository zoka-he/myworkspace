-- StoryLine table
CREATE TABLE storyline (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36) NOT NULL,
    updated_by VARCHAR(36) NOT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1
);

-- StoryLineNode table
CREATE TABLE storyline_node (
    id VARCHAR(36) PRIMARY KEY,
    storyline_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    position_x INT NOT NULL,
    position_y INT NOT NULL,
    data JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36) NOT NULL,
    updated_by VARCHAR(36) NOT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1
);

-- StoryLineEdge table
CREATE TABLE storyline_edge (
    id VARCHAR(36) PRIMARY KEY,
    storyline_id VARCHAR(36) NOT NULL,
    source_node_id VARCHAR(36) NOT NULL,
    target_node_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    data JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36) NOT NULL,
    updated_by VARCHAR(36) NOT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1
);

-- Add indexes for better query performance
CREATE INDEX idx_storyline_node_storyline_id ON storyline_node(storyline_id);
CREATE INDEX idx_storyline_edge_storyline_id ON storyline_edge(storyline_id);
CREATE INDEX idx_storyline_edge_source_node_id ON storyline_edge(source_node_id);
CREATE INDEX idx_storyline_edge_target_node_id ON storyline_edge(target_node_id); 