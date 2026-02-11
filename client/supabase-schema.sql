-- Therapists table
CREATE TABLE therapists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Identity
  display_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('therapist', 'coach')),
  credentials TEXT,

  -- Voice recordings (Supabase Storage URLs)
  voice_decision_making TEXT,
  voice_advice_seeking TEXT,
  voice_interpersonal TEXT,
  voice_emotional_activation TEXT,
  voice_self_critiquing TEXT,
  voice_meaning_making TEXT,

  -- Transcriptions (from Whisper API)
  transcript_decision_making TEXT,
  transcript_advice_seeking TEXT,
  transcript_interpersonal TEXT,
  transcript_emotional_activation TEXT,
  transcript_self_critiquing TEXT,
  transcript_meaning_making TEXT,

  -- Guardrails (simple fields)
  advice_handling TEXT DEFAULT 'reflect_and_ask',
  approaches TEXT[], -- Array like ['CBT', 'mindfulness']
  words_often_used TEXT,
  words_to_avoid TEXT
);

-- Create storage bucket for therapist audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('therapist-audio', 'therapist-audio', true);

-- Allow public access to read audio files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'therapist-audio');

-- Allow authenticated users to upload audio
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'therapist-audio');
