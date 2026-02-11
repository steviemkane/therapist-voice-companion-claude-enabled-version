'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Therapist {
  id: string
  display_name: string
  role: string
  credentials: string | null
}

export default function ClientConversation() {
  const params = useParams()
  const therapistId = params.therapistId as string

  const [therapist, setTherapist] = useState<Therapist | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load therapist data
  useEffect(() => {
    async function loadTherapist() {
      try {
        const { data, error } = await supabase
          .from('therapists')
          .select('id, display_name, role, credentials')
          .eq('id', therapistId)
          .single()

        if (error) throw error
        if (!data) throw new Error('Therapist not found')

        setTherapist(data)
      } catch (err) {
        console.error('Error loading therapist:', err)
        setError('Could not load therapist profile. Please check the URL.')
      }
    }

    if (therapistId) {
      loadTherapist()
    }
  }, [therapistId])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingDuration(0)
      recordingStartTimeRef.current = Date.now()

      // Update recording duration every 100ms
      recordingTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000
        setRecordingDuration(elapsed)
      }, 100)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      const duration = (Date.now() - recordingStartTimeRef.current) / 1000

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }

      // Check minimum duration
      if (duration < 0.5) {
        setError('Recording too short! Hold the button for at least 1 second while speaking.')
        setIsRecording(false)
        // Stop the recorder and clear audio
        mediaRecorderRef.current.stop()
        const stream = mediaRecorderRef.current.stream
        stream.getTracks().forEach(track => track.stop())
        return
      }

      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setRecordingDuration(0)
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    setError(null)

    try {
      // 1. Transcribe audio
      let transcription = ''

      const formData = new FormData()
      formData.append('audio', audioBlob)

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!transcribeResponse.ok) {
        // Fallback: Ask user to type their message
        const userInput = prompt('⚠️ Voice transcription unavailable (OpenAI quota exceeded).\n\nPlease TYPE what you said:')
        if (!userInput) {
          setIsProcessing(false)
          setError('Transcription failed. Add OpenAI credits at platform.openai.com/settings/organization/billing to enable voice input.')
          return
        }
        transcription = userInput
      } else {
        const data = await transcribeResponse.json()
        transcription = data.transcription
      }

      // Add user message to conversation
      const userMessage: Message = {
        role: 'user',
        content: transcription,
      }
      setMessages(prev => [...prev, userMessage])

      // 2. Get AI response
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          therapistId,
          message: transcription,
          conversationHistory: messages,
        }),
      })

      if (!chatResponse.ok) {
        throw new Error('AI response failed')
      }

      const { response } = await chatResponse.json()

      // Add assistant message to conversation
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
      }
      setMessages(prev => [...prev, assistantMessage])

      // 3. Speak the response using browser TTS
      speakText(response)
    } catch (err) {
      console.error('Error processing audio:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9 // Slightly slower for therapeutic tone
      utterance.pitch = 1.0

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
    }
  }

  const replayLastResponse = () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(m => m.role === 'assistant')

    if (lastAssistantMessage) {
      speakText(lastAssistantMessage.content)
    }
  }

  if (error && !therapist) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="text-red-600 text-center">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!therapist) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            {therapist.display_name}
            {therapist.credentials && (
              <span className="text-lg text-gray-500 ml-2">{therapist.credentials}</span>
            )}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {therapist.role === 'therapist' ? 'Therapist' : 'Coach'} Voice Companion
          </p>
        </div>
      </div>

      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg mb-2">Welcome!</p>
              <p>Press and hold the button below to start talking.</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                }`}
              >
                <div className="text-sm font-semibold mb-1">
                  {message.role === 'user' ? 'You' : therapist.display_name}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-t border-gray-200 px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center space-y-4">
            {/* Hold to Talk Button */}
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={isProcessing || isSpeaking}
              className={`w-32 h-32 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-lg transition-all ${
                isRecording
                  ? 'bg-red-500 scale-110 animate-pulse'
                  : isProcessing || isSpeaking
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {isRecording ? (
                <div className="text-center">
                  <div className="text-2xl mb-1">🎤</div>
                  <div className="text-sm">Recording...</div>
                  <div className="text-xs mt-1 font-mono">{recordingDuration.toFixed(1)}s</div>
                </div>
              ) : isProcessing ? (
                <div className="text-center">
                  <div className="text-sm">Processing...</div>
                </div>
              ) : isSpeaking ? (
                <div className="text-center">
                  <div className="text-2xl mb-1">🔊</div>
                  <div className="text-sm">Speaking...</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-2xl mb-1">🎤</div>
                  <div className="text-sm">Hold to Talk</div>
                </div>
              )}
            </button>

            {/* Helpful hint */}
            {!isRecording && !isProcessing && messages.length === 0 && (
              <p className="text-sm text-gray-500 text-center">
                Hold the button for at least 1 second while speaking
              </p>
            )}

            {/* Replay Button */}
            {messages.some(m => m.role === 'assistant') && (
              <button
                onClick={replayLastResponse}
                disabled={isSpeaking}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
              >
                🔁 Replay Last Response
              </button>
            )}
          </div>

          {/* Crisis Disclaimer */}
          <div className="mt-6 text-center">
            <div className="inline-block bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
              <strong>Important:</strong> This is not for emergencies. If you&apos;re in crisis, call 988 or go to your nearest ER.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
