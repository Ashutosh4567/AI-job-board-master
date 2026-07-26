import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function RecruiterDashboard() {
  const [showJobForm, setShowJobForm] = useState(false)
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(false)
  const [updatingApp, setUpdatingApp] = useState(null) 

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    skills: ''
  })
  const [message, setMessage] = useState('')

  const userName = localStorage.getItem('user_name')
  const userId = localStorage.getItem('user_id')
  const navigate = useNavigate()

  useEffect(() => {
    if (userId) {
      loadJobs()
    }
  }, [userId])

  const loadJobs = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`http://127.0.0.1:5000/my-jobs/${userId}`)
      setJobs(response.data)
    } catch (err) {
      console.log('Error loading jobs:', err.response?.data || err.message)
      setMessage('Failed to load your jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleCreateJob = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      await axios.post('http://127.0.0.1:5000/create-job', {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        skills: formData.skills,
        recruiter_id: parseInt(userId)
      })

      setMessage('Job posted successfully!')

      setFormData({
        title: '',
        description: '',
        location: '',
        skills: ''
      })

      loadJobs()

      setTimeout(() => {
        setShowJobForm(false)
        setMessage('')
      }, 2000)

    } catch (err) {
      setMessage('Failed to post job: ' + (err.response?.data?.error || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const viewApplications = async (jobId, jobTitle) => {
    setLoading(true)
    try {
      const response = await axios.get(`http://127.0.0.1:5000/job-applications/${jobId}`)
      setApplications(response.data)
      setSelectedJob({ id: jobId, title: jobTitle })
    } catch (err) {
      setMessage('Error loading applications: ' + (err.response?.data?.error || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (applicationId, newStatus) => {
    setUpdatingApp(applicationId) 
    
    try {
      const response = await axios.put(`http://127.0.0.1:5000/update-application/${applicationId}`, {
        status: newStatus
      })
      
      setMessage(`${response.data.message}`)
      
      if (selectedJob) {
        await viewApplications(selectedJob.id, selectedJob.title)
      }
      
      setTimeout(() => setMessage(''), 3000)
      
    } catch (err) {
      setMessage('Failed to update application: ' + (err.response?.data?.error || 'Unknown error'))
    } finally {
      setUpdatingApp(null) 
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    navigate('/')
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-[#22C55E]'
    if (score >= 60) return 'text-[#F97316]'
    return 'text-[#EF4444]'
  }

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-[#22C55E] bg-opacity-10 border-[#22C55E]'
    if (score >= 60) return 'bg-[#F97316] bg-opacity-10 border-[#F97316]'
    return 'bg-[#EF4444] bg-opacity-10 border-[#EF4444]'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-[#F97316] bg-opacity-10 text-[#C2410C] border border-[#F97316]'
      case 'shortlisted': return 'bg-[#22C55E] bg-opacity-10 text-[#166534] border border-[#22C55E]'
      case 'rejected': return 'bg-[#EF4444] bg-opacity-10 text-[#991B1B] border border-[#EF4444]'
      default: return 'bg-[#F3F4F6] text-[#111827] border border-[#F3F4F6]'
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-[#F3F4F6]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">
              Recruiter Dashboard
            </h1>
            <p className="text-sm text-[#6B7280]">Find the perfect candidates with AI matching</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#6B7280]">Welcome, <strong>{userName}</strong>!</span>
            <button
              onClick={handleLogout}
              className="bg-[#EF4444] text-white px-4 py-2 rounded-lg hover:bg-[#DC2626] transition font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Global Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.includes('successfully') ? 'bg-[#22C55E] bg-opacity-10 border-[#22C55E] text-[#166534]' : 
            'bg-[#EF4444] bg-opacity-10 border-[#EF4444] text-[#991B1B]'
          }`}>
            {message}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center border border-[#F3F4F6]">
            <div className="text-3xl font-bold text-[#1E3A8A] mb-2">{jobs.length}</div>
            <div className="text-[#6B7280]">Jobs Posted</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center border border-[#F3F4F6]">
            <div className="text-3xl font-bold text-[#22C55E] mb-2">
              {jobs.reduce((total, job) => total + job.applications_count, 0)}
            </div>
            <div className="text-[#6B7280]">Total Applications</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center border border-[#F3F4F6]">
            <div className="text-3xl font-bold text-[#8B5CF6] mb-2">
              {applications.filter(app => app.match_score >= 80).length}
            </div>
            <div className="text-[#6B7280]">High Match Candidates</div>
          </div>
        </div>

        {/* Post Job Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowJobForm(!showJobForm)}
            className="bg-[#1E3A8A] text-white px-6 py-3 rounded-lg hover:bg-[#C4B5FD] font-semibold transition"
          >
            {showJobForm ? 'Cancel' : 'Post New Job'}
          </button>
        </div>

        {/* Job Posting Form */}
        {showJobForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-[#F3F4F6]">
            <h2 className="text-2xl font-bold mb-4 text-[#111827]">Create Job Posting</h2>

            <form onSubmit={handleCreateJob}>
              <div className="mb-4">
                <label className="block text-[#111827] text-sm font-medium mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="title"
                  className="w-full px-4 py-2 border border-[#F3F4F6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#111827]"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Senior Python Developer"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-[#111827] text-sm font-medium mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  className="w-full px-4 py-2 border border-[#F3F4F6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#111827]"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Job description, responsibilities, requirements..."
                  rows="4"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-[#111827] text-sm font-medium mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  className="w-full px-4 py-2 border border-[#F3F4F6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#111827]"
                  value={formData.location}
                  onChange={handleFormChange}
                  placeholder="e.g. Remote, New York, London"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-[#111827] text-sm font-medium mb-2">
                  Required Skills (comma-separated) *
                </label>
                <input
                  type="text"
                  name="skills"
                  className="w-full px-4 py-2 border border-[#F3F4F6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#111827]"
                  value={formData.skills}
                  onChange={handleFormChange}
                  placeholder="Python, Flask, SQL, React, JavaScript"
                  required
                />
                <p className="text-sm text-[#6B7280] mt-1">
                  These skills will be used for AI matching with candidates
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-[#1E3A8A] text-white px-6 py-3 rounded-lg hover:bg-[#C4B5FD] font-medium disabled:bg-[#9CA3AF] transition"
              >
                {loading ? 'Posting...' : 'Post Job'}
              </button>
            </form>
          </div>
        )}

        {/* My Jobs List */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-[#F3F4F6]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#111827]">My Job Postings</h2>
            <button 
              onClick={loadJobs}
              className="bg-[#F3F4F6] text-[#111827] px-4 py-2 rounded-lg hover:bg-[#E5E7EB] transition font-medium"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A] mx-auto"></div>
              <p className="text-[#6B7280] mt-4">Loading your jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4 text-[#6B7280]">💼</div>
              <p className="text-[#6B7280] text-lg mb-2">
                You haven't posted any jobs yet.
              </p>
              <p className="text-[#9CA3AF]">
                Click "Post New Job" above to create your first job posting!
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="border-2 border-[#F3F4F6] rounded-lg p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-[#111827] mb-2">
                        {job.title}
                      </h3>
                      <p className="text-[#6B7280] mb-1">{job.location}</p>
                      <p className="text-[#9CA3AF] text-sm">
                        Posted on {job.created_at}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-[#1E3A8A]">
                        {job.applications_count}
                      </div>
                      <div className="text-sm text-[#6B7280]">
                        Application{job.applications_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      {job.applications_count > 0 ? (
                        <p className="text-[#22C55E] text-sm font-medium">
                          {job.applications_count} candidate{job.applications_count !== 1 ? 's' : ''} applied!
                        </p>
                      ) : (
                        <p className="text-[#6B7280] text-sm">
                          No applications yet
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => viewApplications(job.id, job.title)}
                      disabled={job.applications_count === 0}
                      className="bg-[#1E3A8A] text-white px-6 py-2 rounded-lg hover:bg-[#C4B5FD] disabled:bg-[#9CA3AF] transition font-medium"
                    >
                      {job.applications_count > 0 ? 'View Applications' : 'No Applications'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applications View */}
        {selectedJob && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-[#F3F4F6]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#111827]">
                  Applications for: {selectedJob.title}
                </h2>
                <p className="text-[#6B7280] mt-1">
                  AI-ranked by match score (highest to lowest)
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedJob(null)
                  setApplications([])
                  setMessage('')
                }}
                className="text-[#6B7280] hover:text-[#111827] text-lg font-bold transition-colors"
              >
                Close
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A] mx-auto"></div>
                <p className="text-[#6B7280] mt-4">Loading applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4 text-[#6B7280]">📭</div>
                <p className="text-[#6B7280] text-lg mb-2">
                  No applications yet for this job
                </p>
                <p className="text-[#9CA3AF]">
                  Candidates will appear here once they apply
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-[#C4B5FD] bg-opacity-10 border border-[#C4B5FD] rounded-lg p-4">
                  <p className="text-[#1E3A8A] text-sm font-medium">
                    <strong>Pro Tip:</strong> Focus on candidates with 80%+ match scores first. 
                    They have the strongest skill alignment with your job requirements.
                  </p>
                </div>

                {applications.map((app, index) => (
                  <div
                    key={app.application_id}
                    className={`border-2 rounded-lg p-6 transition-all duration-300 hover:shadow-lg ${
                      app.match_score >= 80 ? 'border-[#22C55E] bg-[#22C55E] bg-opacity-5' :
                      app.match_score >= 60 ? 'border-[#F97316] bg-[#F97316] bg-opacity-5' :
                      'border-[#F3F4F6] bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`
                          font-bold text-lg w-12 h-12 rounded-full flex items-center justify-center
                          ${app.match_score >= 80 ? 'bg-[#22C55E] bg-opacity-20 text-[#166534]' :
                            app.match_score >= 60 ? 'bg-[#F97316] bg-opacity-20 text-[#C2410C]' :
                            'bg-[#EF4444] bg-opacity-20 text-[#991B1B]'}
                        `}>
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-[#111827]">
                            {app.candidate_name}
                          </h3>
                          <p className="text-[#6B7280] text-sm">{app.candidate_email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                              {app.status}
                            </span>
                            <span className="text-[#9CA3AF] text-xs">
                              Applied on {app.applied_at}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className={`px-6 py-4 rounded-lg text-center border-2 ${getScoreBg(app.match_score)}`}>
                          <p className={`text-3xl font-bold ${getScoreColor(app.match_score)}`}>
                            {app.match_score}%
                          </p>
                          <p className="text-xs text-[#6B7280] font-medium">AI Match</p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => updateApplicationStatus(app.application_id, 'shortlisted')}
                            disabled={updatingApp === app.application_id || app.status === 'shortlisted'}
                            className="bg-[#22C55E] text-white px-4 py-2 rounded text-sm hover:bg-[#16A34A] disabled:bg-[#9CA3AF] transition font-medium"
                          >
                            {updatingApp === app.application_id ? 'Updating...' : 'Shortlist'}
                          </button>
                          <button 
                            onClick={() => updateApplicationStatus(app.application_id, 'rejected')}
                            disabled={updatingApp === app.application_id || app.status === 'rejected'}
                            className="bg-[#EF4444] text-white px-4 py-2 rounded text-sm hover:bg-[#DC2626] disabled:bg-[#9CA3AF] transition font-medium"
                          >
                            {updatingApp === app.application_id ? 'Updating...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default RecruiterDashboard