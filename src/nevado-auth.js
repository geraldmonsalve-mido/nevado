import { Clerk } from '@clerk/clerk-js'
import { supabase } from './supabase-client.js'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export const clerk = new Clerk(clerkPubKey)

await clerk.load({
  standardBrowser: true
})

export async function initNevadoAuth() {
  const authContainer = document.getElementById('clerk-auth')

  if (!authContainer) return

  if (clerk.user) {
    const user = clerk.user
    await syncUser(user)

    authContainer.innerHTML = `
      <div style="padding:24px;border:1px solid rgba(255,255,255,.18);border-radius:18px;">
        <h2>Sesión activa</h2>
        <p>${user.primaryEmailAddress?.emailAddress || 'Usuario NEVADO'}</p>
        <button id="logout-btn">Cerrar sesión</button>
      </div>
    `

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await clerk.signOut()
      window.location.reload()
    })

    return
  }

  clerk.mountSignIn(authContainer, {
    routing: 'hash',
    signUpUrl: '/auth.html',
    afterSignInUrl: '/profile.html',
    afterSignUpUrl: '/profile.html'
  })
}

async function syncUser(user) {
  const email = user.primaryEmailAddress?.emailAddress || ''

  const payload = {
    p_clerk_id: user.id,
    p_email: email,
    p_username: user.username || email.split('@')[0],
    p_display_name: user.fullName || user.firstName || email,
    p_avatar_url: user.imageUrl || ''
  }

  const { data, error } = await supabase.rpc('upsert_profile_from_clerk', payload)

  if (error) {
    console.error('Error sincronizando usuario:', error)
    return null
  }

  console.log('Usuario sincronizado con Supabase:', data)
  return data
}
