-- Drop existing table if it exists
DROP TABLE IF EXISTS document_submissions CASCADE;

-- Create document_submissions table
CREATE TABLE document_submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  document_type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_document_submissions_user_id ON document_submissions(user_id);
CREATE INDEX idx_document_submissions_status ON document_submissions(status);

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_document_submissions_updated_at ON document_submissions;
CREATE TRIGGER update_document_submissions_updated_at
    BEFORE UPDATE ON document_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 