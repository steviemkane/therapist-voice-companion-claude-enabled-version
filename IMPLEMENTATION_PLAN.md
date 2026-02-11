# Implementation Plan (MVP)

## Overview
This document outlines a **minimal viable implementation** for testing with 5-10 therapists. Built for non-technical founders working 1 hour/day with the simplest, lowest-cost tech stack possible.

**Core Principle**: Voice carries style. Text carries guardrails.

**Timeline**: 3-4 weeks (21-28 hours total)

---

## Architecture Overview (Simplified)

```
┌─────────────────────────────────────────────────┐
│            NEXT.JS APP (Single Codebase)        │
│                                                 │
│  /therapist-setup                               │
│    - Form with 6 voice recordings               │
│    - Basic guardrails (checkboxes)              │
│                                                 │
│  /client/[therapistId]                          │
│    - Voice input (browser mic)                  │
│    - Text conversation display                  │
│    - AI response (Claude API)                   │
│    - Browser TTS playback                       │
│                                                 │
│  /api/*                                         │
│    - API routes for DB + Claude                 │
└─────────────────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │      SUPABASE            │
         │  - PostgreSQL (database) │
         │  - Storage (audio files) │
         │  - Auth (simple login)   │
         └──────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │    ANTHROPIC CLAUDE API  │
         │  (AI response generation)│
         └──────────────────────────┘
```

**That's it. Three services total.**

---

## Technology Stack (Minimal)

### Single Full-Stack Framework
- **Next.js 14+ (App Router)**
  - Frontend + Backend in one codebase
  - Built-in API routes (no separate backend needed)
  - Built-in TypeScript support
  - Deployed to Vercel (free tier)

### All-In-One Backend
- **Supabase (Free Tier)**
  - PostgreSQL database (included)
  - File storage for audio (included, S3-like)
  - Simple auth (included)
  - No separate services to manage
  - Free tier: 500 MB database, 1 GB storage (enough for 5-10 therapists)

### Voice Processing
- **Browser Native APIs (FREE)**
  - Speech-to-Text: Web Speech API (Chrome/Edge) OR simple OpenAI Whisper API calls (very cheap: $0.006/min)
  - Text-to-Speech: Browser's `speechSynthesis` API (free, built-in voices)
  - No external voice services needed for MVP

### AI
- **Anthropic Claude API**
  - Claude 3.5 Haiku (cheapest: $0.80/million input tokens, $4/million output)
  - ~$0.01-0.02 per conversation (very affordable)

### UI
- **Tailwind CSS** (no component library needed)
- **shadcn/ui** (optional, copy-paste components if needed)

### Total Monthly Cost Estimate
- Supabase: $0 (free tier)
- Vercel: $0 (free tier)
- Claude API: ~$5-10/month for 5-10 therapists testing
- **Total: ~$5-10/month**

---

---

## Simplified Feature Set (MVP Only)

### What We're Building
1. **Therapist onboarding page** (`/therapist-setup`)
   - Simple form: name, role, credentials
   - 6 voice recordings (one at a time)
   - Basic guardrails (3-4 checkboxes max)

2. **Client conversation page** (`/client/[therapistId]`)
   - "Hold to Talk" button
   - Text conversation display
   - Auto-play AI response (browser TTS)

3. **AI response engine** (Next.js API route)
   - Load therapist profile + transcriptions
   - Send to Claude API with prompt template
   - Return response following cadence

### What We're NOT Building (Yet)
- ❌ Voice style analysis (just use raw transcriptions)
- ❌ Voice cloning or custom TTS
- ❌ Crisis detection algorithms (just put in prompt)
- ❌ Conversation history beyond current session
- ❌ Therapist dashboard
- ❌ Analytics or monitoring
- ❌ Advanced error handling

---

## Database Schema (Supabase)

**Single Table: `therapists`**
```sql
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
```

**That's it. One table. No joins, no complexity.**

---

## Component Design (Simplified)

### 1. Therapist Onboarding Page
**File**: `app/therapist-setup/page.tsx`

**One long form with 3 sections:**

**Section 1: Basic Info (2 minutes)**
- Display name (text input)
- Role (radio: Therapist / Coach)
- Credentials (text input, optional)

**Section 2: Voice Recordings (15-20 minutes)**

Show one prompt at a time with:
- Prompt text (large, readable)
- "Record" button (browser `MediaRecorder` API)
- Simple timer showing recording length
- "Listen" button to review
- "Re-record" or "Next" buttons
- Progress: "Question 1 of 6"

**The 6 Prompts** (exact text from DESIGN_PRINCIPLES.md):
1. Decision Making Situation
2. Advice Seeking Situation
3. Interpersonal Situation
4. Emotional Activation Situation
5. Self Critiquing Situation
6. Meaning Making/Perspective Situation

**Implementation**:
- Record audio in browser (WebM or MP3)
- Upload to Supabase Storage (`therapist-audio/[id]/[prompt-name].webm`)
- Auto-transcribe using OpenAI Whisper API (cheap: $0.006/min)
- Save URLs and transcriptions to database

**Section 3: Guardrails (2 minutes)**
- Advice handling: Radio buttons
  - "Reflect and ask questions" (default)
  - "Offer perspective without telling what to do"
  - "Avoid direct recommendations"
- Approaches: Checkboxes (CBT, ACT, mindfulness, psychodynamic, somatic, other)
- Optional: Words/phrases you use often (textarea)
- Optional: Words/phrases to avoid (textarea)

**Submit button**: "Complete Setup"

**Total time**: 20-25 minutes

---

### 2. Client Conversation Page
**File**: `app/client/[therapistId]/page.tsx`

**Layout**:
```
┌────────────────────────────────────┐
│  [Therapist Name], LCSW            │
│  ────────────────────────────────  │
│                                    │
│  Conversation:                     │
│  ┌──────────────────────────────┐ │
│  │ You: [transcribed text]      │ │
│  │ AI: [response text]          │ │
│  │ You: [transcribed text]      │ │
│  │ AI: [response text]          │ │
│  └──────────────────────────────┘ │
│                                    │
│      ┌────────────────┐            │
│      │  HOLD TO TALK  │            │
│      └────────────────┘            │
│                                    │
│  [Crisis disclaimer at bottom]     │
└────────────────────────────────────┘
```

**Interaction Flow**:
1. User holds button → mic activates → records audio
2. User releases button → recording stops → sends to API
3. Loading state shows "Thinking..."
4. AI response appears as text
5. Browser TTS auto-plays response
6. Conversation history updates
7. Repeat

**Crisis Disclaimer** (always visible):
> "This is not for emergencies. If you're in crisis, call 988 or go to your nearest ER."

**Implementation**:
- Use browser `MediaRecorder` API for voice input
- Use browser `Web Speech API` (free) OR send to Whisper API for transcription
- Send transcription to `/api/chat` endpoint
- Display response text
- Use browser `speechSynthesis.speak()` for TTS (free, good enough for MVP)
- Store conversation in component state (no database for MVP)

---

### 2. Client-Facing Voice Interface

#### 2.1 Client Landing Page
**File**: `client/ClientHome.tsx`

**Features**:
- Display therapist's photo, name, and credentials
- Brief explainer text (from PROJECT_SCOPE.md)
- Crisis disclaimer: "This is not for emergencies. If you're in crisis, call 988 or go to your nearest ER."
- "Start Conversation" button

---

#### 2.2 Voice Conversation Interface
**File**: `client/VoiceChat.tsx`

**UI Components**:
- Large "Hold to Talk" button (like voice memo)
- Visual feedback: waveform or pulsing animation while recording
- Conversation history (text bubbles for context)
- Auto-play AI response (text-to-speech)
- "Replay" button for last response
- "End Conversation" button

**Conversation Flow**:
1. Client presses/holds button and speaks
2. Audio recorded and sent to backend
3. Backend converts speech-to-text
4. Backend sends to AI Response Engine
5. AI generates response (following cadence)
6. Backend converts text-to-speech
7. Audio plays automatically
8. Text also displayed for accessibility
9. Conversation context maintained in memory (Redis cache)

**Data Flow**:
```typescript
interface ClientMessage {
  sessionId: string;
  therapistId: string;
  clientAudioUrl: string;
  transcription: string;
  timestamp: Date;
}

interface AIResponse {
  sessionId: string;
  responseText: string;
  responseAudioUrl: string;
  cadenceStructure: {
    reflection: string;
    insight: string;
    question: string;
  };
  timestamp: Date;
}
```

---

### 3. AI Response Engine (Simple)

**File**: `app/api/chat/route.ts` (Next.js API route)

**What It Does**:
1. Receives: therapist ID + client message (text)
2. Fetches therapist profile from Supabase
3. Builds prompt with transcriptions + guardrails
4. Sends to Claude API
5. Returns response text

**Prompt Template (Simple Version)**:

```typescript
const systemPrompt = `You are a voice-based AI companion representing ${therapist.display_name}, a ${therapist.role}.

IDENTITY & CONTEXT:
- You speak AS ${therapist.display_name}, using "I" and "me"
- Credentials: ${therapist.credentials}
- This is supportive reflection between therapy sessions, NOT therapy itself

STRICT BOUNDARIES:
- NOT for crisis support. If client expresses crisis, say:
  "I hear this is really hard. This tool isn't for crisis support. Please reach out to me directly, call 988, or go to your nearest ER."
- Do NOT diagnose
- Do NOT assess risk
- Do NOT give emergency guidance
- Advice approach: ${therapist.advice_handling}

YOUR SPEAKING STYLE (from voice examples):
Here are 6 examples of how you speak to clients in different situations:

1. Decision-making: "${therapist.transcript_decision_making}"
2. Advice-seeking: "${therapist.transcript_advice_seeking}"
3. Interpersonal conflict: "${therapist.transcript_interpersonal}"
4. Emotional activation: "${therapist.transcript_emotional_activation}"
5. Self-criticism: "${therapist.transcript_self_critiquing}"
6. Meaning-making: "${therapist.transcript_meaning_making}"

Speak naturally in YOUR voice as shown above.

${therapist.words_often_used ? `Phrases you often use: ${therapist.words_often_used}` : ''}
${therapist.words_to_avoid ? `Avoid these phrases: ${therapist.words_to_avoid}` : ''}

RESPONSE STRUCTURE (ALWAYS follow this):
1. Reflect/validate their feeling (1-2 sentences)
2. Offer an insight or perspective (1-2 sentences)
3. Ask a question to help them explore (1 sentence)

Keep responses conversational and under 100 words.`;

const userMessage = `Client says: "${clientMessage}"`;

// Send to Claude API
const response = await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022', // Cheapest model
  max_tokens: 300,
  system: systemPrompt,
  messages: [{ role: 'user', content: userMessage }]
});
```

**That's it. No complex validation, no caching, no style extraction. Just a simple prompt.**

---

---

### 4. Database Schema

**Therapists Table**:
```sql
CREATE TABLE therapists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL CHECK (role IN ('therapist', 'coach')),
  display_name VARCHAR(255) NOT NULL,
  credentials VARCHAR(255),
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Voice Elicitations Table**:
```sql
CREATE TABLE voice_elicitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  decision_making_audio_url TEXT NOT NULL,
  decision_making_transcription TEXT NOT NULL,
  advice_seeking_audio_url TEXT NOT NULL,
  advice_seeking_transcription TEXT NOT NULL,
  interpersonal_audio_url TEXT NOT NULL,
  interpersonal_transcription TEXT NOT NULL,
  emotional_activation_audio_url TEXT NOT NULL,
  emotional_activation_transcription TEXT NOT NULL,
  self_critiquing_audio_url TEXT NOT NULL,
  self_critiquing_transcription TEXT NOT NULL,
  meaning_making_audio_url TEXT NOT NULL,
  meaning_making_transcription TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Guardrails Table**:
```sql
CREATE TABLE guardrails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  enforce_crisis_boundary BOOLEAN DEFAULT TRUE,
  do_not_diagnose BOOLEAN DEFAULT TRUE,
  do_not_assess_risk BOOLEAN DEFAULT TRUE,
  do_not_provide_emergency_guidance BOOLEAN DEFAULT TRUE,
  advice_handling VARCHAR(50) NOT NULL,
  approaches JSONB, -- Array of selected modalities
  philosophical_lenses JSONB, -- Array of selected lenses
  words_phrases_used JSONB, -- Array of strings
  words_phrases_avoided JSONB, -- Array of strings
  pronoun_preferences TEXT,
  cultural_considerations TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Voice Style Profiles Table** (extracted patterns):
```sql
CREATE TABLE voice_style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  tone_descriptors JSONB, -- ["warm", "curious", "direct"]
  common_phrases JSONB, -- ["I'm wondering", "What comes up for you"]
  question_style TEXT,
  validation_patterns TEXT,
  insight_patterns TEXT,
  pacing_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Session Context Cache** (Redis):
```
Key: session:{sessionId}
Value: JSON array of last 5 exchanges
TTL: 24 hours
```

---

## Development Plan (1 Hour/Day, 3-4 Weeks)

### Week 1: Setup + Therapist Onboarding (7 hours)
**Days 1-2 (2 hours)**: Project setup
- [ ] Create Next.js app: `npx create-next-app@latest`
- [ ] Set up Supabase project (free tier)
- [ ] Install dependencies: `@supabase/supabase-js`, `@anthropic-ai/sdk`
- [ ] Create `.env.local` with API keys
- [ ] Deploy to Vercel (optional, for testing)

**Days 3-5 (3 hours)**: Therapist form
- [ ] Create `/therapist-setup` page
- [ ] Build basic info form (name, role, credentials)
- [ ] Create Supabase table (see schema above)
- [ ] Form submission saves to Supabase

**Days 6-7 (2 hours)**: Voice recording UI
- [ ] Implement `MediaRecorder` API for audio recording
- [ ] Test recording and playback in browser
- [ ] Upload audio to Supabase Storage

---

### Week 2: Voice Recordings + Transcription (7 hours)
**Days 1-3 (3 hours)**: 6-prompt recording flow
- [ ] Display prompts one at a time
- [ ] Record → Review → Next workflow
- [ ] Store 6 audio files in Supabase Storage
- [ ] Save file URLs to database

**Days 4-7 (4 hours)**: Transcription
- [ ] Sign up for OpenAI API (for Whisper)
- [ ] Create API route: `/api/transcribe`
- [ ] Send audio to Whisper API
- [ ] Save transcriptions to database
- [ ] Test with real voice recordings

---

### Week 3: Client Interface + AI (7 hours)
**Days 1-3 (3 hours)**: Client page
- [ ] Create `/client/[therapistId]` page
- [ ] Fetch therapist data from Supabase
- [ ] Display therapist name and disclaimer
- [ ] Build "Hold to Talk" button
- [ ] Record client audio

**Days 4-7 (4 hours)**: AI response
- [ ] Create API route: `/api/chat`
- [ ] Load therapist transcriptions
- [ ] Build Claude prompt (see template above)
- [ ] Call Claude API
- [ ] Return and display response
- [ ] Test conversation flow

---

### Week 4: Voice Playback + Polish (7 hours)
**Days 1-3 (3 hours)**: Text-to-speech
- [ ] Implement browser `speechSynthesis` for TTS
- [ ] Auto-play AI responses
- [ ] Add conversation history display

**Days 4-7 (4 hours)**: Final touches
- [ ] Add loading states ("Thinking...")
- [ ] Style with Tailwind CSS
- [ ] Test end-to-end with 2-3 people
- [ ] Fix bugs
- [ ] Create simple landing page with instructions

**DONE! Ready to demo with therapists.**

---

---

## Key Technical Decisions (Simplified)

### 1. Voice Input: Browser Native or Whisper API?
- **Browser Web Speech API** (Chrome/Edge): Free, but less accurate
- **OpenAI Whisper API**: $0.006/minute, very accurate
- **Decision**: Start with Whisper (cheap enough), fallback to browser API if needed

### 2. Voice Output: Browser TTS
- Use browser's `speechSynthesis` API
- Free, built-in, good enough for demo
- Can upgrade to ElevenLabs later if needed

### 3. Response Cadence
- Just ask Claude nicely in the prompt
- Don't validate/parse, trust Claude to follow instructions
- If it doesn't work, strengthen prompt wording

### 4. Crisis Handling
- Put in prompt: "If crisis detected, give safety message"
- No separate detection algorithm needed for demo

---

## What's Next After MVP Demo?

If therapists like it, consider:
1. Voice cloning (ElevenLabs) for more realistic TTS
2. Proper authentication (Supabase Auth)
3. Conversation history storage
4. Mobile app
5. HIPAA compliance for real client use

---

## Estimated Costs (5-10 Therapists Testing)
- **Supabase**: $0 (free tier)
- **Vercel**: $0 (free tier)
- **Whisper API**: ~$1-2/month (15-30 min of transcription)
- **Claude API**: ~$5-10/month (~500 conversations)
- **Total**: ~$6-12/month for demo phase
