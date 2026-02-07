import { useState, useEffect } from "react"

interface Session {
  authenticated: boolean
  did?: string
  handle?: string
  displayName?: string
  avatar?: string
}

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [handle, setHandle] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/oauth/session")
      .then((res) => res.json())
      .then((data) => {
        setSession(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (handle) {
      window.location.href = `/oauth/login?handle=${encodeURIComponent(handle)}`
    }
  }

  const handleLogout = async () => {
    await fetch("/oauth/logout", { method: "POST" })
    setSession({ authenticated: false })
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>keytrace.dev</h1>

      {session?.authenticated ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            {session.avatar && (
              <img
                src={session.avatar}
                alt=""
                style={{ width: 48, height: 48, borderRadius: "50%" }}
              />
            )}
            <div>
              <div style={{ fontWeight: "bold" }}>{session.displayName || session.handle}</div>
              <div style={{ color: "#666" }}>@{session.handle}</div>
              <div style={{ fontSize: "0.8rem", color: "#999" }}>{session.did}</div>
            </div>
          </div>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <form onSubmit={handleLogin}>
          <p>Sign in with your Bluesky handle:</p>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="you.bsky.social"
            style={{ padding: "0.5rem", marginRight: "0.5rem" }}
          />
          <button type="submit">Login with Bluesky</button>
        </form>
      )}
    </div>
  )
}
