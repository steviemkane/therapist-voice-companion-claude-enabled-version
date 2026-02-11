# Setup Guide - Therapist Voice Companion

This guide will walk you through setting up your development environment with all necessary API keys and services.

## Prerequisites
- Node.js 18+ installed
- Git installed
- A modern web browser (Chrome, Edge, or Firefox)

## Step-by-Step Setup

### 1. Clone and Install

```bash
cd client
npm install
```

### 2. Set Up Supabase (Free Tier)

#### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub (recommended) or email
4. Click "New project"
5. Choose an organization (or create one)
6. Fill in project details:
   - Name: `therapist-voice-companion` (or any name)
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to you
7. Click "Create new project" (takes ~2 minutes)

#### Get Your Supabase Credentials
1. Once the project is created, go to **Project Settings** (gear icon in sidebar)
2. Click on **API** in the left menu
3. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (under "Project API keys")

#### Set Up the Database
1. In your Supabase dashboard, click on **SQL Editor** (in sidebar)
2. Click "New query"
3. Open the file `client/supabase-schema.sql` from this project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run" (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

This creates:
- The `therapists` table
- The `therapist-audio` storage bucket for voice recordings
- Security policies for file access

### 3. Get OpenAI API Key (for Whisper)

#### Create OpenAI Account
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to **API keys** section
4. Click "Create new secret key"
5. Name it "therapist-voice-companion"
6. Copy the key (starts with `sk-...`)
7. **Save it immediately** - you won't see it again!

#### Add Credits (if needed)
- New accounts get $5 free credits
- Whisper is very cheap: $0.006 per minute of audio
- If you need more, add $10-20 in **Billing** settings

### 4. Get Anthropic API Key (for Claude)

#### Create Anthropic Account
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up with email
3. Verify your email
4. Go to **API Keys** section
5. Click "Create Key"
6. Name it "therapist-voice-companion"
7. Copy the key (starts with `sk-ant-...`)
8. **Save it immediately** - you won't see it again!

#### Add Credits
- Anthropic requires you to add credits before using the API
- Add at least $5-10 in **Billing** settings
- Claude 3.5 Haiku (what we're using) costs:
  - ~$0.80 per 1M input tokens
  - ~$4 per 1M output tokens
  - Translation: ~$0.01-0.02 per conversation

### 5. Configure Environment Variables

1. In the `client` directory, copy the example file:
```bash
cd client
cp .env.local.example .env.local
```

2. Open `.env.local` in your text editor

3. Fill in your actual values:
```env
# Supabase (from Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anthropic Claude API (from Step 4)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...

# OpenAI (from Step 3)
OPENAI_API_KEY=sk-proj-xxxxx...
```

4. Save the file

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the landing page!

## Testing the App

### Test Therapist Setup
1. Go to [http://localhost:3000/therapist-setup](http://localhost:3000/therapist-setup)
2. Fill in basic info:
   - Display Name: "Dr. Test Therapist"
   - Role: Therapist
   - Credentials: "LCSW"
3. For each of the 6 voice prompts:
   - Click "Record"
   - Speak for 30-60 seconds (give a genuine example response)
   - Click "Stop"
   - Review the recording
   - Click "Next Question"
4. Set guardrails:
   - Choose advice handling preference
   - Select therapeutic approaches
5. Click "Complete Setup"

This will:
- Upload your voice recordings to Supabase
- Transcribe them using OpenAI Whisper
- Save everything to the database
- Give you a therapist ID

### Test Client Interface
1. After setup completes, you'll be redirected to `/client/[therapistId]`
2. Or manually go to: `http://localhost:3000/client/YOUR_THERAPIST_ID`
3. You should see the therapist's name and credentials
4. Click and hold the "Hold to Talk" button
5. Speak a test message: "I'm feeling anxious about an upcoming presentation"
6. Release the button
7. Wait for the AI response (should take 2-5 seconds)
8. The response should play automatically via text-to-speech

## Troubleshooting

### "Could not access microphone"
- Browser permissions: Allow microphone access
- HTTPS required for production (works on localhost)

### "Transcription failed"
- Check OpenAI API key is correct
- Check you have credits in your OpenAI account
- Check browser console for errors

### "AI response failed"
- Check Anthropic API key is correct
- Check you have credits in your Anthropic account
- Check browser console for errors

### "Therapist not found"
- Make sure the Supabase database schema was run
- Check Supabase URL and key are correct
- Check browser console for errors

### Storage upload fails
- Make sure you ran the full SQL schema (including storage bucket creation)
- Check Supabase dashboard > Storage to see if `therapist-audio` bucket exists

## Cost Breakdown (Testing Phase)

For 5-10 therapists testing the app:

- **Supabase**: $0 (free tier includes 500 MB database, 1 GB storage)
- **Vercel**: $0 (free tier for hosting, if deployed)
- **OpenAI Whisper**: ~$1-2/month
  - 6 prompts × 2 minutes each = 12 minutes per therapist
  - 10 therapists = 120 minutes = $0.72
  - Client conversations: ~30 minutes/month = $0.18
  - **Total: ~$1-2/month**
- **Anthropic Claude**: ~$5-10/month
  - ~500 test conversations
  - ~100 words per response
  - **Total: ~$5-10/month**

**Grand Total: ~$6-12/month for testing**

## Next Steps

Once you have the basic app working:

1. **Test with real therapists** - Get feedback on the voice style matching
2. **Improve the prompt** - Refine the system prompt based on responses
3. **Add authentication** - Use Supabase Auth for therapist login
4. **Conversation history** - Store and retrieve past conversations
5. **Better TTS** - Integrate ElevenLabs for voice cloning
6. **Mobile support** - Test on mobile browsers
7. **Production deployment** - Deploy to Vercel
8. **HIPAA compliance** - Add necessary safeguards for production

## Support

If you run into issues:
1. Check the browser console for errors
2. Check the terminal/dev server output
3. Verify all API keys are correct
4. Make sure you have credits in OpenAI and Anthropic accounts

Happy building! 🚀
