'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TrashIcon } from 'lucide-react'
import { updateUserProfile } from './actions'
import axios from 'axios'
import { it } from 'node:test'
// import { UpdateUserProfileResponse } from './actions'


export function UserProfile({ initialInfo, user }: { initialInfo: string[], user: any }) {

  
  const [info, setInfo] = useState(initialInfo)
  const [newInfo, setNewInfo] = useState('')
//   const [state, action, isPending] = useActionState(updateUserProfile)
//   const [state, action, isPending] = useActionState({} as ReturnType<typeof updateUserProfile> , updateUserProfile);

  console.log("user: ", user)

  const handleAddInfo = async () => {

    try {
      const response = await axios.post(`http://localhost:3010/api/users/${user}/add_to_profile`, 
      {
        info: newInfo
      },
      {
        withCredentials: true,
      }
    );

      console.log("response: ", response)
      if (response.data) {
        setInfo(response.data['user']['profile'])
      } else {
        return null
      }
    } catch (err) {
      console.error("Error fetching current user:", err);
      return null
    }

    setNewInfo('')

    // if (newInfo && !info.includes(newInfo)) {
    //   setInfo(prev => [...prev, newInfo])
    //   setNewInfo('')
    // }
    //add a route to update the user profile in the database, and then update the state with the new info
    
  }

  const handleDeleteRule = async (id: string) => {
    try {
      const response = await axios.post(`http://localhost:3010/api/users/${user}/delete_from_profile`, 
      {
        info: id
      },
      {
        withCredentials: true,
      }
    );

      console.log("response: ", response)
      if (response.data) {
        setInfo(response.data['user']['profile'])
      } else {
        return null
      }
    } catch (err) {
      console.error("Error fetching current user:", err);
      return null
    }
    // setInfo(prev => prev.filter((_, index) => index !== id))
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
            <div className='flex items-center justify-between'>
            <p key={index} className="text-lg">{item}</p>
            <Button variant="ghost" onClick={() => handleDeleteRule(item)}>
              <TrashIcon className="h-4 w-4" />
            </Button>
            </div>
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

