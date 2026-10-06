-- Migration: Add Checkin Comments Table
-- Membuat tabel untuk fitur komentar bersahutan (diskusi) di dalam Check-in.

CREATE TABLE IF NOT EXISTS public.checkin_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.checkin_comments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all comments
CREATE POLICY "Allow authenticated to read checkin_comments" 
  ON public.checkin_comments FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow authenticated users to insert their own comments
CREATE POLICY "Allow authenticated to insert checkin_comments" 
  ON public.checkin_comments FOR INSERT 
  TO authenticated 
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- Allow users to delete their own comments
CREATE POLICY "Allow users to delete own checkin_comments" 
  ON public.checkin_comments FOR DELETE 
  TO authenticated 
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );
