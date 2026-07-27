import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const response = await api.post('/login', {
        email,
        password
      })

      console.log('Login response:', response.data)

      // Save user information
      localStorage.setItem(
        'user_id',
        response.data.user_id
      )

      localStorage.setItem(
        'user_name',
        response.data.name
      )

      localStorage.setItem(
        'user_role',
        response.data.role
      )

      // Redirect according to role
      if (response.data.role === 'candidate') {
        navigate('/candidate')
      } else if (response.data.role === 'recruiter') {
        navigate('/recruiter')
      } else {
        setError('Invalid user role.')
      }

    } catch (err) {
      console.error('Login error:', err)

      if (err.response) {
        setError(
          err.response.data?.error ||
          `Login failed. Server returned ${err.response.status}.`
        )
      } else if (err.request) {
        setError(
          'Cannot connect to the backend server. Please check the API URL.'
        )
      } else {
        setError(
          err.message ||
          'Login failed. Please try again.'
        )
      }

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] to-[#8B5CF6] flex items-center justify-center p-4">

      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md border border-[#F3F4F6]">

        <h1 className="text-3xl font-bold mb-6 text-center text-[#111827]">
          AI Job Board Login
        </h1>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>

          {/* Email */}
          <div className="mb-4">

            <label className="block text-[#111827] text-sm font-medium mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full px-4 py-2 border border-[#F3F4F6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent bg-white text-[#111827]"
            />

          </div>

          {/* Password */}
          <div className="mb-6">

            <label className="block text-[#111827] text-sm font-medium mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full px-4 py-2 border border-[#F3F4F6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent bg-white text-[#111827]"
            />

          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E3A8A] text-white py-3 rounded-lg hover:bg-[#8B5CF6] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#C4B5FD] focus:ring-offset-2"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

        </form>

        {/* Register Link */}
        <p className="text-center mt-6 text-[#111827]">

          Don't have an account?{' '}

          <Link
            to="/register"
            className="text-[#1E3A8A] hover:text-[#8B5CF6] font-medium transition-colors"
          >
            Register here
          </Link>

        </p>

      </div>

    </div>
  )
}

export default Login