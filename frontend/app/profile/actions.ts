'use server'

// type UpdateUserProfileResponse = {

//     success: boolean,
//     message: string
// }

export async function updateUserProfile(prevState: any, formData: FormData) {
  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // In a real application, you would update the user profile in your database here
  const info = JSON.parse(formData.get('info') as string)

  console.log('Updating user profile:', { info })

  // Return a success message
  return {
    success: true,
    message: 'Profile updated successfully!'
  }
}

