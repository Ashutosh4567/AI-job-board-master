import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'candidate'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await axios.post('http://127.0.0.1:5000/register', formData)

      setSuccess('Registration successful! Redirecting to login...')
      setTimeout(() => navigate('/'), 2000)

    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] to-[#8B5CF6] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md border border-[#F3F4F6]">
        <h1 className="text-3xl font-bold mb-6 text-center text-[#111827]">
          Create Account
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-[#22C55E] bg-opacity-10 border border-[#22C55E] text-[#166534] px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <label className="block text-[#111827] text-sm font-medium mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              className="w-full px-4 py-2 border border-[#F3F4F6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent bg-white text-[#111827]"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-[#111827] text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              className="w-full px-4 py-2 border border-[#F3F4F6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent bg-white text-[#111827]"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-[#111827] text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              className="w-full px-4 py-2 border border-[#F3F4F6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent bg-white text-[#111827]"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-[#111827] text-sm font-medium mb-2">
              I am a:
            </label>
            <select
              name="role"
              className="w-full px-4 py-2 border border-[#F3F4F6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent bg-white text-[#111827]"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="candidate">Job Seeker</option>
              <option value="recruiter">Recruiter</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E3A8A] text-white py-3 rounded-lg hover:bg-[#8B5CF6] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#C4B5FD] focus:ring-offset-2"
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="text-center mt-6 text-[#111827]">
          Already have an account?{' '}
          <Link to="/" className="text-[#1E3A8A] hover:text-[#8B5CF6] font-medium transition-colors">
            Login here
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register