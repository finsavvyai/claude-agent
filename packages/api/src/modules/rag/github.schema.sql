-- GitHub Connections Table
CREATE TABLE github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_user_id VARCHAR(50) NOT NULL,
  github_username VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  user_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_github_user_per_user UNIQUE (user_id, github_user_id)
);

-- GitHub Indexed Repositories Table
CREATE TABLE github_indexed_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repository_id INTEGER NOT NULL,
  repository_full_name VARCHAR(500) NOT NULL,
  repository_owner VARCHAR(255) NOT NULL,
  repository_name VARCHAR(255) NOT NULL,
  default_branch VARCHAR(255) NOT NULL,
  indexed_ref VARCHAR(255) NOT NULL,
  indexed_files INTEGER DEFAULT 0,
  indexed_chunks INTEGER DEFAULT 0,
  file_patterns TEXT[],
  exclude_patterns TEXT[],
  optimization_strategies TEXT[],
  indexing_status VARCHAR(50) DEFAULT 'completed',
  indexing_error TEXT,
  indexing_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_repo UNIQUE (user_id, repository_full_name)
);

-- GitHub Indexed Files Table
CREATE TABLE github_indexed_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES github_indexed_repositories(id) ON DELETE CASCADE,
  file_path VARCHAR(1000) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_extension VARCHAR(50),
  file_size BIGINT NOT NULL,
  file_sha VARCHAR(100),
  language VARCHAR(100),
  original_tokens INTEGER NOT NULL,
  optimized_tokens INTEGER NOT NULL,
  optimization_savings JSONB,
  optimization_strategies TEXT[],
  rag_context_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_repo_file UNIQUE (repository_id, file_path)
);

-- GitHub Repository Access Cache Table
CREATE TABLE github_repository_access_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repository_id INTEGER NOT NULL,
  repository_full_name VARCHAR(500) NOT NULL,
  permissions JSONB NOT NULL,
  access_granted BOOLEAN DEFAULT true,
  cache_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_repo_access UNIQUE (user_id, github_repository_id)
);

-- GitHub OAuth States Table (for CSRF protection)
CREATE TABLE github_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  redirect_url TEXT,
  scopes_requested TEXT[],
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_state CHECK (expires_at > created_at)
);

-- Row Level Security Policies
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_indexed_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_indexed_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repository_access_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for github_connections
CREATE POLICY user_github_connections_policy ON github_connections
  FOR ALL TO authenticated_users
  USING (user_id = current_user_id());

-- RLS Policies for github_indexed_repositories
CREATE POLICY user_github_repositories_policy ON github_indexed_repositories
  FOR ALL TO authenticated_users
  USING (user_id = current_user_id());

-- RLS Policies for github_indexed_files
CREATE POLICY user_github_files_policy ON github_indexed_files
  FOR ALL TO authenticated_users
  USING (
    repository_id IN (
      SELECT id FROM github_indexed_repositories
      WHERE user_id = current_user_id()
    )
  );

-- RLS Policies for github_repository_access_cache
CREATE POLICY user_github_access_cache_policy ON github_repository_access_cache
  FOR ALL TO authenticated_users
  USING (user_id = current_user_id());

-- Indexes for better performance
CREATE INDEX idx_github_connections_user_id ON github_connections(user_id);
CREATE INDEX idx_github_connections_github_user_id ON github_connections(github_user_id);
CREATE INDEX idx_github_connections_last_used ON github_connections(last_used_at DESC);

CREATE INDEX idx_github_repositories_user_id ON github_indexed_repositories(user_id);
CREATE INDEX idx_github_repositories_full_name ON github_indexed_repositories(repository_full_name);
CREATE INDEX idx_github_repositories_last_indexed ON github_indexed_repositories(last_indexed_at DESC);

CREATE INDEX idx_github_files_repository_id ON github_indexed_files(repository_id);
CREATE INDEX idx_github_files_language ON github_indexed_files(language);
CREATE INDEX idx_github_files_path ON github_indexed_files(file_path);

CREATE INDEX idx_github_access_cache_user_id ON github_repository_access_cache(user_id);
CREATE INDEX idx_github_access_cache_expires ON github_repository_access_cache(cache_expires_at);

CREATE INDEX idx_github_oauth_states_state ON github_oauth_states(state);
CREATE INDEX idx_github_oauth_states_expires ON github_oauth_states(expires_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_github_connections_updated_at
  BEFORE UPDATE ON github_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_repositories_updated_at
  BEFORE UPDATE ON github_indexed_repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_files_updated_at
  BEFORE UPDATE ON github_indexed_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_access_cache_updated_at
  BEFORE UPDATE ON github_repository_access_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM github_oauth_states WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Function to clean up expired access cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_access_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM github_repository_access_cache WHERE cache_expires_at < NOW();
END;
$$ language 'plpgsql';

-- Comment on tables
COMMENT ON TABLE github_connections IS 'Stores GitHub OAuth connections for users';
COMMENT ON TABLE github_indexed_repositories IS 'Tracks repositories that have been indexed for RAG optimization';
COMMENT ON TABLE github_indexed_files IS 'Stores information about individual files that have been optimized';
COMMENT ON TABLE github_repository_access_cache IS 'Caches repository access permissions to reduce GitHub API calls';
COMMENT ON TABLE github_oauth_states IS 'Stores OAuth state parameters for CSRF protection';
