# Therapist Voice Companion - Setup Guide

## Overview
This Next.js app provides a voice-based AI companion for therapists and coaches to support their clients between sessions.

## Prerequisites
- Node.js 18+ installed
- Supabase account (free tier)
- OpenAI API key (for Whisper transcription)
- Anthropic API key (for Claude AI responses)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your credentials
3. Run the SQL schema in the Supabase SQL Editor:
   - Copy the contents of `supabase-schema.sql`
   - Paste and run in the SQL Editor
4. This will create:
   - `therapists` table
   - `therapist-audio` storage bucket
   - Required policies

### 3. Configure Environment Variables

1. Copy the example file:
```bash
cp .env.local.example .env.local
```

2. Fill in your credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Application Flow

### For Therapists
1. Visit `/therapist-setup`
2. Complete 3-step onboarding:
   - Basic info (name, role, credentials)
   - 6 voice recordings (therapeutic scenarios)
   - Guardrails (advice handling, approaches)
3. Receive unique therapist ID
4. Share client URL with clients

### For Clients
1. Visit `/client/[therapistId]` (provided by therapist)
2. See therapist's profile
3. Use "Hold to Talk" button to speak
4. Receive AI responses in therapist's style

## Technology Stack
- **Next.js 14+** - Full-stack framework
- **Supabase** - Database & file storage
- **OpenAI Whisper** - Speech-to-text ($0.006/min)
- **Anthropic Claude** - AI responses (~$0.01/conversation)
- **Browser APIs** - MediaRecorder, SpeechSynthesis

## Key Files
- `/app/therapist-setup/page.tsx` - Therapist onboarding
- `/app/client/[therapistId]/page.tsx` - Client voice interface (to be built)
- `/app/api/transcribe/route.ts` - Audio transcription
- `/app/api/chat/route.ts` - AI response generation (to be built)
- `/lib/supabase.ts` - Supabase client
- `supabase-schema.sql` - Database schema

## Cost Estimates (5-10 therapists)
- Supabase: $0 (free tier)
- Vercel: $0 (free tier)
- Whisper API: ~$1-2/month
- Claude API: ~$5-10/month
- **Total: ~$6-12/month**

## Next Steps
After testing:
1. Build client conversation page
2. Build AI response API
3. Add authentication (Supabase Auth)
4. Conversation history
5. Voice cloning (ElevenLabs)
6. Mobile app
7. HIPAA compliance for production use
