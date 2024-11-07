'use client'

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Inbox, Mail, Tag, Archive, MessageSquare, Zap, LogIn } from "lucide-react"
import useCurrentUser from '@/hooks/useCurrentUser';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useRouter } from 'next/navigation';
import { useState } from 'react'

  

export default function Component() {
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
  }
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden scrollbar-hide">
      <header className="px-4 lg:px-6 h-14 flex items-center justify-between">
        <a className="flex items-center justify-center" href="#">
          <Inbox className="h-6 w-6" />
          <span className="ml-2 text-2xl font-bold">InboxPilot</span>
        </a>
        <nav className="flex items-center gap-4 sm:gap-6">
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#features">
            Features
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#how-it-works">
            How It Works
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#benefits">
            Benefits
          </a>
          <Button variant="outline" onClick={!user ? () => setIsLoginOpen(true) : () => router.push("/rules")}>{!user ? "Log In" : "Rules"}</Button>
          {/* <Button variant="outline" size="sm">
            <LogIn className="h-4 w-4 mr-2" />
            
            Log In
          </Button> */}
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    Automate Your Inbox with InboxPilot
                  </h1>
                  <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                    Manage your emails effortlessly with AI-powered automation. Group, label, draft responses, and more with
                    natural language instructions.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button size="lg" onClick={!user ? () => setIsLoginOpen(true) : () => router.push("/rules")} className="bg-gray-900 hover:bg-gray-800 text-white">Take Flight</Button>
                  {/* <Button>Take Flight</Button> */}
                  <Button variant="outline">Learn More</Button>
                </div>
              </div>
              <div className="flex justify-center lg:justify-end[50px]">
                <div className="relative w-[300px] h-[300px] lg:w-[400px] lg:h-[400px]">
                  <div className="absolute inset-0 bg-black transform -skew-y-6 rounded-3xl"></div>
                  <div className="absolute inset-4 bg-white dark:bg-gray-800 transform -skew-y-6 rounded-2xl flex items-center justify-center">
                    <Mail className="w-24 h-24 text-black-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              <div className="flex flex-col items-center text-center bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <Mail className="h-12 w-12 mb-4 text-black-500" />
                <h3 className="text-xl font-bold mb-2">Smart Email Grouping</h3>
                <p className="text-gray-500 dark:text-gray-400">Automatically organize your emails into logical groups.</p>
              </div>
              <div className="flex flex-col items-center text-center bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <Tag className="h-12 w-12 mb-4 text-black-500" />
                <h3 className="text-xl font-bold mb-2">Intelligent Labeling</h3>
                <p className="text-gray-500 dark:text-gray-400">Apply labels to your emails based on content and context.</p>
              </div>
              <div className="flex flex-col items-center text-center bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <MessageSquare className="h-12 w-12 mb-4 text-black-500" />
                <h3 className="text-xl font-bold mb-2">Auto-Draft Responses</h3>
                <p className="text-gray-500 dark:text-gray-400">Generate draft responses for common email types.</p>
              </div>
              <div className="flex flex-col items-center text-center bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <Archive className="h-12 w-12 mb-4 text-black-500" />
                <h3 className="text-xl font-bold mb-2">Smart Archiving</h3>
                <p className="text-gray-500 dark:text-gray-400">Automatically archive emails based on your rules.</p>
              </div>
              <div className="flex flex-col items-center text-center bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <Zap className="h-12 w-12 mb-4 text-black-500" />
                <h3 className="text-xl font-bold mb-2">Natural Language Rules</h3>
                <p className="text-gray-500 dark:text-gray-400">Create automation rules using simple, natural language.</p>
              </div>
              <div className="flex flex-col items-center text-center bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <Inbox className="h-12 w-12 mb-4 text-black-500" />
                <h3 className="text-xl font-bold mb-2">Gmail Integration</h3>
                <p className="text-gray-500 dark:text-gray-400">Seamlessly integrates with your Gmail account.</p>
              </div>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12">How It Works</h2>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-items-center">
              <li className="flex flex-col items-center text-center bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <div className="w-12 h-12 rounded-full bg-gray-800 text-white flex items-center justify-center mb-4 text-xl font-bold">1</div>
                <h3 className="text-xl font-bold mb-2">Create Rules</h3>
                <p className="text-gray-500 dark:text-gray-400">Set up natural language rules for email management.</p>
              </li>
              <li className="flex flex-col items-center text-center bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <div className="w-12 h-12 rounded-full bg-gray-800 text-white flex items-center justify-center mb-4 text-xl font-bold">2</div>
                <h3 className="text-xl font-bold mb-2">AI Processing</h3>
                <p className="text-gray-500 dark:text-gray-400">Our AI analyzes your emails based on your rules.</p>
              </li>
              <li className="flex flex-col items-center text-center bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <div className="w-12 h-12 rounded-full bg-gray-800 text-white flex items-center justify-center mb-4 text-xl font-bold">3</div>
                <h3 className="text-xl font-bold mb-2">Automated Actions</h3>
                <p className="text-gray-500 dark:text-gray-400">InboxPilot performs actions to organize your inbox.</p>
              </li>
            </ol>
          </div>
        </section>
        <section id="benefits" className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12">Benefits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              <div className="bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <h3 className="text-xl font-bold mb-2">Save Time</h3>
                <p className="text-gray-500 dark:text-gray-400">Reduce hours spent on email management each week.</p>
              </div>
              <div className="bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <h3 className="text-xl font-bold mb-2">Increase Productivity</h3>
                <p className="text-gray-500 dark:text-gray-400">Focus on important tasks while InboxPilot handles the rest.</p>
              </div>
              <div className="bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <h3 className="text-xl font-bold mb-2">Reduce Stress</h3>
                <p className="text-gray-500 dark:text-gray-400">Say goodbye to email overload and inbox anxiety.</p>
              </div>
              <div className="bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <h3 className="text-xl font-bold mb-2">Customizable</h3>
                <p className="text-gray-500 dark:text-gray-400">Tailor InboxPilot to your specific email management needs.</p>
              </div>
              <div className="bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <h3 className="text-xl font-bold mb-2">Always Learning</h3>
                <p className="text-gray-500 dark:text-gray-400">Our AI improves over time, adapting to your email patterns.</p>
              </div>
              <div className="bg-white dark:bg-gray-950 p-6 rounded-lg shadow-md w-full max-w-sm">
                <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
                <p className="text-gray-500 dark:text-gray-400">Your data is encrypted and protected at all times.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Ready to take Flight?</h2>
                <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                  Join InboxPilot today and experience the future of email management.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <form className="flex space-x-2">
                  <Input className="max-w-lg flex-1" placeholder="Enter your email" type="email" />
                  <Button type="submit">Join the Waitlist</Button>
                </form>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  By signing up, you agree to our{" "}
                  <a className="underline underline-offset-2" href="#">
                    Terms & Conditions
                  </a>
                </p>
              </div>
            </div>
          </div>
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

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">© 2024 InboxPilot. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <a className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </a>
          <a className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </a>
        </nav>
      </footer>
    </div>
  )
}