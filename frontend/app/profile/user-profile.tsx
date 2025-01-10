'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateUserProfile } from './actions'
// import { UpdateUserProfileResponse } from './actions'


export function UserProfile({ initialInfo }: { initialInfo: string[] }) {
  
  const [info, setInfo] = useState(initialInfo)
  const [newInfo, setNewInfo] = useState('')
//   const [state, action, isPending] = useActionState(updateUserProfile)
//   const [state, action, isPending] = useActionState({} as ReturnType<typeof updateUserProfile> , updateUserProfile);

  const handleAddInfo = () => {
    if (newInfo && !info.includes(newInfo)) {
      setInfo(prev => [...prev, newInfo])
      setNewInfo('')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>About Me</CardTitle>
        <CardDescription>Tell us more about yourself to improve your experience!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          {info.map((item, index) => (
            <p key={index} className="text-lg">{item}</p>
          ))}
        </div>
        <form className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={newInfo}
              onChange={(e) => setNewInfo(e.target.value)}
              placeholder="ex. I am a college student studying computer engineering."
              className="flex-grow"
            />
            <Button type="button" onClick={handleAddInfo}>Add</Button>
          </div>
          <input type="hidden" name="info" value={JSON.stringify(info)} />
          {/* <Button type="submit" disabled={isPending}>
            {isPending ? 'Updating...' : 'Save Profile'}
          </Button> */}
        </form>
        {/* {state && (
          <p className={`mt-4 ${state.success ? 'text-green-600' : 'text-red-600'}`}>
            {state.message}
          </p>
        )} */}
      </CardContent>
    </Card>
  )
}

