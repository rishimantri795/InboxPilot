'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { InboxIcon, TagIcon, ArchiveIcon, SendIcon, PlaneLandingIcon } from 'lucide-react'
import useCurrentUser from '@/hooks/useCurrentUser';
import { useRouter } from 'next/navigation';



export default function LandingPage() {
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const { user, loading, error } = useCurrentUser();

  const passPortAuth = async () => {
    try {
      // Redirect to the Passport.js authentication route
      window.location.href = "http://localhost:3010/api/users/google/auth"; // Change this URL based on your server configuration
    } catch (e) {
      console.error("Error during Passport authentication:", e);
    }
  };


  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <PlaneLandingIcon className="h-8 w-8 text-gray-900" />
          <h1 className="text-2xl font-bold text-gray-900">Inbox Pilot</h1>
        </div>
        <Button variant="outline" onClick={!user ? () => setIsLoginOpen(true) : () => router.push("/rules")}>{!user ? "Log In" : "Rules"}</Button>
      </header>

      <main className="container mx-auto px-4 py-12">
        <section className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Navigate Your Inbox with AI Precision</h2>
          <p className="text-xl text-gray-600 mb-8">Let Inbox Pilot automate your email management and soar above the clutter</p>
          <Button size="lg" onClick={!user ? () => setIsLoginOpen(true) : () => router.push("/rules")} className="bg-gray-900 hover:bg-gray-800 text-white">Take Flight</Button>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<InboxIcon className="h-10 w-10 text-gray-900" />}
            title="Smart Inbox Organization"
            description="Automatically label, group, and organize your emails based on custom rules"
          />
          <FeatureCard
            icon={<TagIcon className="h-10 w-10 text-gray-900" />}
            title="Intelligent Labeling"
            description="AI-powered labeling for receipts, action items, and more"
          />
          <FeatureCard
            icon={<ArchiveIcon className="h-10 w-10 text-gray-900" />}
            title="Auto-Archiving"
            description="Automatically archive one-time passwords and verification links after use"
          />
          <FeatureCard
            icon={<SendIcon className="h-10 w-10 text-gray-900" />}
            title="Smart Responses"
            description="Draft common responses and forward emails based on custom rules"
          />
        </section>
      </main>

      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log in to Inbox Pilot</DialogTitle>
            <DialogDescription>
              Connect your Google account to start piloting your inbox with AI-powered email management.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={passPortAuth} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}