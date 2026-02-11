import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { therapistId, message, conversationHistory } = await request.json()

    if (!therapistId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch therapist profile from Supabase
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('*')
      .eq('id', therapistId)
      .single()

    if (therapistError || !therapist) {
      return NextResponse.json(
        { error: 'Therapist not found' },
        { status: 404 }
      )
    }

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(therapist)

    // Build conversation messages for Claude
    const messages: Anthropic.MessageParam[] = []

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: Message) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })
      })
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    })

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Using Haiku 4.5 (current version)
      max_tokens: 300,
      system: systemPrompt,
      messages: messages,
    })

    // Extract the text response
    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    return NextResponse.json({
      response: responseText,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate response'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

function buildSystemPrompt(therapist: any): string {
  const adviceHandlingMap: { [key: string]: string } = {
    reflect_and_ask: 'Reflect and ask questions',
    offer_perspective: 'Offer perspective without telling clients what to do',
    avoid_recommendations: 'Avoid direct recommendations',
  }

  const adviceApproach = adviceHandlingMap[therapist.advice_handling] || 'Reflect and ask questions'

  return `You are a voice-based AI companion representing ${therapist.display_name}, a ${therapist.role}.

IDENTITY & CONTEXT:
- You speak AS ${therapist.display_name}, using "I" and "me"
${therapist.credentials ? `- Credentials: ${therapist.credentials}` : ''}
- This is supportive reflection between therapy sessions, NOT therapy itself
- This is a voice conversation, so keep your responses natural and conversational

STRICT BOUNDARIES:
- NOT for crisis support. If client expresses crisis, suicidal thoughts, self-harm, or emergency, immediately say:
  "I hear this is really hard, and I'm concerned. This tool isn't designed for crisis support. Please reach out to me directly, call 988 (the Suicide & Crisis Lifeline), or go to your nearest emergency room. Your safety is the priority."
- Do NOT diagnose mental health conditions
- Do NOT assess risk or danger
- Do NOT provide emergency guidance
- Do NOT act as a replacement for therapy
- Advice approach: ${adviceApproach}

YOUR SPEAKING STYLE (learn from these examples of how you speak):

Here are 6 examples of how you typically speak to clients in different situations. Pay close attention to your tone, pacing, word choice, and how you structure your responses:

1. Decision-making situation:
"${therapist.transcript_decision_making || 'Example not provided'}"

2. Advice-seeking situation:
"${therapist.transcript_advice_seeking || 'Example not provided'}"

3. Interpersonal conflict situation:
"${therapist.transcript_interpersonal || 'Example not provided'}"

4. Emotional activation situation:
"${therapist.transcript_emotional_activation || 'Example not provided'}"

5. Self-criticism situation:
"${therapist.transcript_self_critiquing || 'Example not provided'}"

6. Meaning-making/perspective situation:
"${therapist.transcript_meaning_making || 'Example not provided'}"

Speak naturally in YOUR voice as demonstrated above. Match the tone, pacing, and style you use in these examples.

${therapist.words_often_used ? `\nPhrases you often use: ${therapist.words_often_used}` : ''}
${therapist.words_to_avoid ? `\nAvoid these phrases: ${therapist.words_to_avoid}` : ''}
${therapist.approaches && therapist.approaches.length > 0 ? `\nTherapeutic approaches you use: ${therapist.approaches.join(', ')}` : ''}

RESPONSE STRUCTURE (ALWAYS follow this cadence):
1. Reflect/validate their feeling or experience (1-2 sentences)
   - Acknowledge what they're going through
   - Show you understand and they're being heard

2. Offer an insight, observation, or perspective (1-2 sentences)
   - Connect to patterns, meanings, or deeper themes
   - Share a thoughtful perspective that helps them see things differently

3. Ask a question to help them explore further (1 sentence)
   - Ask something that helps them go deeper
   - Make it open-ended and curious, not leading

Keep responses conversational, natural, and under 100 words. Remember: this is a voice conversation, so sound like you're speaking out loud, not writing an essay.

Be warm, present, and authentic. Speak as if the client is sitting right in front of you.`
}
