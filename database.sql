-- Buat tabel Sprints
CREATE TABLE sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'Aktif'
);

-- Buat tabel Users (Anggota Tim)
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(100) NOT NULL,
  pin VARCHAR(10) NOT NULL
);

-- Insert data awal Users (Berdasarkan dokumen Sprint Planning)
INSERT INTO users (name, role, pin) VALUES 
('Gema', 'Co-Founder & Business Lead', '1234'),
('Nashwa', 'Co-Founder & Project/Sprint Lead', '1234'),
('Haura', 'Co-Founder & Marketing Lead', '1234'),
('Zira', 'Co-Founder & Design Lead', '1234'),
('Arhab', 'Co-Founder & Lead Developer', '1234'),
('Jack', 'Co-Founder & Lead Developer', '1234');

-- Buat tabel Tasks
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id VARCHAR(50) NOT NULL,
  sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  division VARCHAR(100) NOT NULL,
  pic_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Belum Mulai',
  priority VARCHAR(50) DEFAULT 'Normal',
  start_date DATE,
  end_date DATE,
  report_link TEXT,
  blocker TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengaktifkan RLS (Row Level Security) agar aman (opsional untuk MVP tapi disarankan)
-- Untuk MVP ini kita buat public read/write sementara agar mudah diakses
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all actions on sprints" ON sprints FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
