'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const VOICE_PROMPTS = [
  {
    id: 'decision_making',
    title: 'Decision Making Situation',
    prompt: 'Give me an example of how you speak directly to a client who is confused about making a decision. Walk me through how you guide them through it, speaking as if the client is in front of you.',
  },
  {
    id: 'advice_seeking',
    title: 'Advice Seeking Situation',
    prompt: 'Give me an example of how you speak directly to a client who is asking you what they should do and wants a clear answer. Walk me through how you respond, speaking as if the client is in front of you.',
  },
  {
    id: 'interpersonal',
    title: 'Interpersonal Situation',
    prompt: 'Give me an example of how you speak directly to a client who is feeling frustrated or annoyed with someone in their life. Walk me through how you help them think about the situation, speaking as if the client is in front of you.',
  },
  {
    id: 'emotional_activation',
    title: 'Emotional Activation Situation',
    prompt: 'Give me an example of how you speak directly to a client who is feeling emotionally activated and having trouble settling down. Walk me through how you help them regulate and ground themselves, speaking as if the client is in front of you.',
  },
  {
    id: 'self_critiquing',
    title: 'Self Critiquing Situation',
    prompt: 'Give me an example of how you speak directly to a client who is being very hard on themselves and stuck in self-critical thoughts. Walk me through how you guide them, speaking as if the client is in front of you.',
  },
  {
    id: 'meaning_making',
    title: 'Meaning Making/Perspective Situation',
    prompt: 'Give me an example of how you speak directly to a client who is trying to make sense of a situation and what it means for them or their life. Walk me through how you help them gain perspective, speaking as if the client is in front of you.',
  },
]

export default function TherapistSetup() {
  const [currentStep, setCurrentStep] = useState<'basic' | 'voice' | 'guardrails'>('basic')
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    role: 'therapist' as 'therapist' | 'coach',
    credentials: '',
    adviceHandling: 'reflect_and_ask' as 'reflect_and_ask' | 'offer_perspective' | 'avoid_recommendations',
    approaches: [] as string[],
    wordsOftenUsed: '',
    wordsToAvoid: '',
  })

  // Voice recordings state
  const [recordings, setRecordings] = useState<{
    [key: string]: { blob: Blob | null; url: string | null }
  }>({
    decision_making: { blob: null, url: null },
    advice_seeking: { blob: null, url: null },
    interpersonal: { blob: null, url: null },
    emotional_activation: { blob: null, url: null },
    self_critiquing: { blob: null, url: null },
    meaning_making: { blob: null, url: null },
  })

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const currentPromptId = VOICE_PROMPTS[currentPromptIndex].id

        setRecordings((prev) => ({
          ...prev,
          [currentPromptId]: { blob, url },
        }))

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
      setTimerInterval(interval)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }
    }
  }

  const handleNextPrompt = () => {
    if (currentPromptIndex < VOICE_PROMPTS.length - 1) {
      setCurrentPromptIndex(currentPromptIndex + 1)
    } else {
      setCurrentStep('guardrails')
    }
  }

  const handlePreviousPrompt = () => {
    if (currentPromptIndex > 0) {
      setCurrentPromptIndex(currentPromptIndex - 1)
    }
  }

  const handleSubmit = async () => {
    setIsProcessing(true)
    try {
      // 1. Create therapist record
      const { data: therapist, error: therapistError } = await supabase
        .from('therapists')
        .insert({
          display_name: formData.displayName,
          role: formData.role,
          credentials: formData.credentials,
          advice_handling: formData.adviceHandling,
          approaches: formData.approaches,
          words_often_used: formData.wordsOftenUsed,
          words_to_avoid: formData.wordsToAvoid,
        })
        .select()
        .single()

      if (therapistError) throw therapistError

      // 2. Upload audio files and transcribe
      const transcriptions: { [key: string]: string } = {}
      const audioUrls: { [key: string]: string } = {}

      for (const prompt of VOICE_PROMPTS) {
        const recording = recordings[prompt.id]
        if (!recording.blob) continue

        // Upload audio to Supabase Storage
        const fileName = `${therapist.id}/${prompt.id}.webm`
        const { error: uploadError } = await supabase.storage
          .from('therapist-audio')
          .upload(fileName, recording.blob)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('therapist-audio')
          .getPublicUrl(fileName)

        audioUrls[`voice_${prompt.id}`] = urlData.publicUrl

        // Transcribe audio using API route (with fallback for quota issues)
        const formData = new FormData()
        formData.append('audio', recording.blob)

        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })

          if (response.ok) {
            const { transcription } = await response.json()
            transcriptions[`transcript_${prompt.id}`] = transcription
          } else {
            // Fallback: Use placeholder text if transcription fails
            console.warn(`Transcription failed for ${prompt.id}, using placeholder`)
            transcriptions[`transcript_${prompt.id}`] = `[Audio recorded for ${prompt.title}. Transcription unavailable - add OpenAI credits to enable automatic transcription.]`
          }
        } catch (transcribeError) {
          console.error('Transcription error:', transcribeError)
          // Use placeholder on error
          transcriptions[`transcript_${prompt.id}`] = `[Audio recorded for ${prompt.title}. Transcription unavailable - add OpenAI credits to enable automatic transcription.]`
        }
      }

      // 3. Update therapist record with audio URLs and transcriptions
      const { error: updateError } = await supabase
        .from('therapists')
        .update({
          ...audioUrls,
          ...transcriptions,
        })
        .eq('id', therapist.id)

      if (updateError) throw updateError

      // Success! Redirect to success page or show therapist URL
      const hasPlaceholders = Object.values(transcriptions).some(t => t.includes('Transcription unavailable'))

      if (hasPlaceholders) {
        alert(`Setup complete! Note: Some transcriptions failed due to OpenAI quota. Add credits at platform.openai.com/settings/organization/billing and re-record for better AI responses.\n\nYour therapist ID: ${therapist.id}`)
      } else {
        alert(`Setup complete! Your therapist ID is: ${therapist.id}`)
      }

      window.location.href = `/client/${therapist.id}`
    } catch (error) {
      console.error('Error submitting form:', error)
      alert(`Error submitting form: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentPrompt = VOICE_PROMPTS[currentPromptIndex]
  const currentRecording = recordings[currentPrompt.id]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Therapist Setup
          </h1>
          <p className="text-gray-600 mb-8">
            Create your AI voice companion to support clients between sessions
          </p>

          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-8">
            <div className={`flex items-center ${currentStep === 'basic' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'basic' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Basic Info</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200">
              <div className={`h-full ${currentStep !== 'basic' ? 'bg-blue-600' : ''}`} />
            </div>
            <div className={`flex items-center ${currentStep === 'voice' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'voice' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Voice Recordings</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200">
              <div className={`h-full ${currentStep === 'guardrails' ? 'bg-blue-600' : ''}`} />
            </div>
            <div className={`flex items-center ${currentStep === 'guardrails' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'guardrails' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="ml-2 font-medium">Guardrails</span>
            </div>
          </div>

          {/* Step 1: Basic Info */}
          {currentStep === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dr. Jane Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="therapist"
                      checked={formData.role === 'therapist'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'therapist' })}
                      className="mr-2"
                    />
                    Therapist
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="coach"
                      checked={formData.role === 'coach'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'coach' })}
                      className="mr-2"
                    />
                    Coach
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credentials (Optional)
                </label>
                <input
                  type="text"
                  value={formData.credentials}
                  onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="LCSW, LMFT, PCC, etc."
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setCurrentStep('voice')}
                  disabled={!formData.displayName}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Continue to Voice Recordings
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Voice Recordings */}
          {currentStep === 'voice' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> For each scenario, speak as if you&apos;re talking directly to a client.
                  Feel free to give hypothetical examples and made-up names. Take your time and speak naturally.
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  Question {currentPromptIndex + 1} of {VOICE_PROMPTS.length}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {currentPrompt.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {currentPrompt.prompt}
                </p>
              </div>

              <div className="flex flex-col items-center space-y-4 py-8">
                {!currentRecording.url && (
                  <>
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-semibold transition-all ${
                        isRecording
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isRecording ? 'Stop' : 'Record'}
                    </button>
                    {isRecording && (
                      <div className="text-2xl font-mono text-gray-700">
                        {formatTime(recordingTime)}
                      </div>
                    )}
                  </>
                )}

                {currentRecording.url && (
                  <div className="w-full max-w-md space-y-4">
                    <audio
                      src={currentRecording.url}
                      controls
                      className="w-full"
                    />
                    <button
                      onClick={() => {
                        setRecordings({
                          ...recordings,
                          [currentPrompt.id]: { blob: null, url: null },
                        })
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Re-record
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => {
                    if (currentPromptIndex === 0) {
                      setCurrentStep('basic')
                    } else {
                      handlePreviousPrompt()
                    }
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNextPrompt}
                  disabled={!currentRecording.url}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {currentPromptIndex === VOICE_PROMPTS.length - 1 ? 'Continue to Guardrails' : 'Next Question'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Guardrails */}
          {currentStep === 'guardrails' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advice Handling Preference
                </label>
                <div className="space-y-2">
                  <label className="flex items-start">
                    <input
                      type="radio"
                      value="reflect_and_ask"
                      checked={formData.adviceHandling === 'reflect_and_ask'}
                      onChange={(e) => setFormData({ ...formData, adviceHandling: e.target.value as any })}
                      className="mt-1 mr-2"
                    />
                    <span className="text-sm">Reflect and ask questions</span>
                  </label>
                  <label className="flex items-start">
                    <input
                      type="radio"
                      value="offer_perspective"
                      checked={formData.adviceHandling === 'offer_perspective'}
                      onChange={(e) => setFormData({ ...formData, adviceHandling: e.target.value as any })}
                      className="mt-1 mr-2"
                    />
                    <span className="text-sm">Offer perspective without telling clients what to do</span>
                  </label>
                  <label className="flex items-start">
                    <input
                      type="radio"
                      value="avoid_recommendations"
                      checked={formData.adviceHandling === 'avoid_recommendations'}
                      onChange={(e) => setFormData({ ...formData, adviceHandling: e.target.value as any })}
                      className="mt-1 mr-2"
                    />
                    <span className="text-sm">Avoid direct recommendations</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Therapeutic Approaches (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['CBT', 'ACT', 'Mindfulness-based', 'Psychodynamic', 'Somatic', 'Values-based', 'Solution-focused', 'Narrative'].map((approach) => (
                    <label key={approach} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.approaches.includes(approach)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, approaches: [...formData.approaches, approach] })
                          } else {
                            setFormData({ ...formData, approaches: formData.approaches.filter((a) => a !== approach) })
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{approach}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Words/Phrases You Often Use (Optional)
                </label>
                <textarea
                  value={formData.wordsOftenUsed}
                  onChange={(e) => setFormData({ ...formData, wordsOftenUsed: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="e.g., &quot;What comes up for you?&quot;, &quot;I'm wondering...&quot;"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Words/Phrases to Avoid (Optional)
                </label>
                <textarea
                  value={formData.wordsToAvoid}
                  onChange={(e) => setFormData({ ...formData, wordsToAvoid: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="e.g., clinical jargon, specific phrases"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setCurrentStep('voice')}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
