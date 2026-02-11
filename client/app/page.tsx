import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Therapist Voice Companion
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Extend your therapeutic presence between sessions with AI-powered voice support
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              For Therapists & Coaches
            </h2>
            <p className="text-gray-600 mb-6">
              Create your personalized AI companion that reflects your therapeutic style,
              tone, and approach. Support your clients between sessions with voice-based
              interactions that feel authentically like you.
            </p>
            <Link
              href="/therapist-setup"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Set Up Your AI Companion
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              For Clients
            </h2>
            <p className="text-gray-600 mb-6">
              Access your therapist&apos;s AI companion for support between sessions.
              Get guidance, reflection, and perspective when you need it most.
            </p>
            <div className="text-gray-500 italic">
              Your therapist will provide you with a unique link to access your companion.
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            Important Notice
          </h3>
          <ul className="list-disc list-inside text-yellow-800 space-y-1">
            <li>This tool is NOT a replacement for therapy</li>
            <li>This tool is NOT for crisis support</li>
            <li>If you&apos;re in crisis, call 988 or go to your nearest emergency room</li>
            <li>This is an extension of the therapeutic relationship between you and your therapist</li>
          </ul>
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Built with voice-first AI to preserve therapeutic presence and authenticity</p>
        </div>
      </div>
    </div>
  );
}
