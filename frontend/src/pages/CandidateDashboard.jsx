import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function CandidateDashboard() {
  const [cvFile, setCvFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [cvAnalysis, setCvAnalysis] = useState(null)
  const [recommendedJobs, setRecommendedJobs] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [message, setMessage] = useState('')
  const [applying, setApplying] = useState({})
  const [activeTab, setActiveTab] = useState('recommended')
  const [loadingApplications, setLoadingApplications] = useState(false)

  const userName = localStorage.getItem('user_name')
  const userId = localStorage.getItem('user_id')
  const navigate = useNavigate()

  useEffect(() => {
    if (userId) {
      loadRecommendedJobs()
      loadMyApplications()
    }
  }, [userId])

  const loadRecommendedJobs = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:5000/recommended-jobs/${userId}`)
      
      let jobsData = response.data;
      
      if (jobsData && jobsData.recommended_jobs) {
        jobsData = jobsData.recommended_jobs;
      }
      
      if (Array.isArray(jobsData)) {
        const filteredJobs = jobsData.filter(job => job.match_score > 20);
        setRecommendedJobs(filteredJobs);
      } else {
        console.log('Unexpected jobs data format:', jobsData);
        setRecommendedJobs([]);
      }
    } catch (err) {
      console.log('Error loading jobs:', err.response?.data || err.message);
      setRecommendedJobs([]);
      if (err.response?.status === 404) {
        setMessage('No jobs available yet. Try creating some test jobs first.')
      }
    }
  }

  const loadMyApplications = async () => {
    setLoadingApplications(true)
    try {
      const response = await axios.get(`http://127.0.0.1:5000/my-applications/${userId}`)
      setMyApplications(response.data)
    } catch (err) {
      console.log('Error loading applications:', err.response?.data || err.message);
      setMyApplications([])
      if (err.response?.status === 404) {
        console.log('No applications found - this is normal for new users')
      } else {
        setMessage('Failed to load your applications')
      }
    } finally {
      setLoadingApplications(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      setCvFile(file)
      setMessage('')
    } else {
      setMessage('Please select a PDF file')
      setCvFile(null)
    }
  }

  const handleUpload = async () => {
    if (!cvFile) {
      setMessage('Please select a PDF file first')
      return
    }

    setUploading(true)
    setMessage('')

    const formData = new FormData()
    formData.append('file', cvFile)
    formData.append('user_id', userId)

    try {
      const response = await axios.post('http://127.0.0.1:5000/upload-cv', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      })

      setMessage('CV uploaded successfully! Analyzing with AI...')
      
      setTimeout(() => {
        analyzeCV()
      }, 1000)

    } catch (err) {
      setMessage('Upload failed: ' + (err.response?.data?.error || 'Check if backend is running'))
      setUploading(false)
    }
  }

  const analyzeCV = async () => {
    setAnalyzing(true)
    setMessage('AI is analyzing your skills and experience...')

    try {
      const response = await axios.get(`http://127.0.0.1:5000/analyze-cv/${userId}`)
      
      if (response.data.success) {
        setCvAnalysis(response.data.analysis)
        setMessage('AI analysis complete! Check your job matches below.')
      } else {
        setMessage('Analysis failed, but you can still see job matches')
      }
      
      loadRecommendedJobs()

    } catch (err) {
      setMessage('Analysis failed, but you can still browse jobs')
    } finally {
      setAnalyzing(false)
      setUploading(false)
    }
  }

  const handleApply = async (jobId) => {
    setApplying(prev => ({ ...prev, [jobId]: true }))
    
    try {
      const response = await axios.post('http://127.0.0.1:5000/apply-job', {
        candidate_id: userId,
        job_id: jobId
      })
      
      setMessage(`${response.data.message} Match score: ${response.data.match_score}`)
      
      loadRecommendedJobs()
      loadMyApplications()
      
    } catch (err) {
      setMessage(err.response?.data?.error || 'Application failed')
    } finally {
      setApplying(prev => ({ ...prev, [jobId]: false }))
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

  const getStatusMessage = (status, jobTitle) => {
    switch (status) {
      case 'pending': return `Your application for "${jobTitle}" is under review`
      case 'shortlisted': return `Congratulations! You've been shortlisted for "${jobTitle}"`
      case 'rejected': return `Unfortunately, you were not selected for "${jobTitle}"`
      default: return `Application status: ${status}`
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-[#F3F4F6]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">
              AI Job Board
            </h1>
            <p className="text-sm text-[#6B7280]">Powered by Smart Matching</p>
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
            message.includes('failed') ? 'bg-[#EF4444] bg-opacity-10 border-[#EF4444] text-[#991B1B]' :
            'bg-[#3B82F6] bg-opacity-10 border-[#3B82F6] text-[#1E40AF]'
          }`}>
            {message}
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-[#F3F4F6]">
          <h2 className="text-2xl font-bold mb-4 text-[#111827]">Upload Your CV</h2>
          <p className="text-[#6B7280] mb-4">
            Upload your CV to get AI-powered job recommendations based on your skills
          </p>

          <div className="flex gap-4 items-center mb-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="flex-1 border border-[#F3F4F6] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#111827]"
            />
            <button
              onClick={handleUpload}
              disabled={uploading || !cvFile}
              className="bg-[#1E3A8A] text-white px-6 py-2 rounded-lg hover:bg-[#C4B5FD] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed transition font-medium"
            >
              {uploading ? 'Uploading...' : 'Upload CV'}
            </button>
          </div>

          <div className="text-sm text-[#6B7280]">
            <p className="font-medium text-[#111827]">Our AI will:</p>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Extract your skills and experience</li>
              <li>Match you with suitable jobs</li>
              <li>Calculate compatibility scores</li>
            </ul>
          </div>
        </div>

        {/* AI Analysis Results */}
        {cvAnalysis && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-[#F3F4F6]">
            <h2 className="text-2xl font-bold mb-4 text-[#111827]">AI Analysis Results</h2>
            <div className="bg-[#C4B5FD] bg-opacity-10 p-4 rounded-lg border border-[#C4B5FD]">
              <pre className="whitespace-pre-wrap text-[#111827] font-medium">
                {cvAnalysis}
              </pre>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[#F3F4F6] mb-6">
          <button
            onClick={() => setActiveTab('recommended')}
            className={`px-6 py-3 font-medium text-lg border-b-2 transition ${
              activeTab === 'recommended' 
                ? 'border-[#1E3A8A] text-[#1E3A8A]' 
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Recommended Jobs ({recommendedJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('myApplications')}
            className={`px-6 py-3 font-medium text-lg border-b-2 transition ${
              activeTab === 'myApplications' 
                ? 'border-[#1E3A8A] text-[#1E3A8A]' 
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            My Applications ({myApplications.length})
          </button>
        </div>

        {/* Recommended Jobs Tab */}
        {activeTab === 'recommended' && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-[#F3F4F6]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#111827]">
                Recommended Jobs {recommendedJobs.length > 0 && `(${recommendedJobs.length})`}
              </h2>
              <button 
                onClick={loadRecommendedJobs}
                className="bg-[#F3F4F6] text-[#111827] px-4 py-2 rounded-lg hover:bg-[#E5E7EB] transition font-medium"
              >
                Refresh
              </button>
            </div>

            {recommendedJobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4 text-[#6B7280]">📄</div>
                <p className="text-[#6B7280] text-lg mb-2">
                  {userId ? "Upload your CV to see AI-powered job recommendations!" : "Please log in first"}
                </p>
                <p className="text-[#9CA3AF]">
                  Our AI will match your skills with the best opportunities
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {recommendedJobs.map((job) => (
                  <div
                    key={job.job_id}
                    className={`border-2 rounded-lg p-6 transition-all duration-300 hover:shadow-lg ${getScoreBg(job.match_score)}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-[#111827] mb-2">
                          {job.title}
                        </h3>
                        <p className="text-[#6B7280] mb-1">{job.location}</p>
                        <p className="text-[#9CA3AF] text-sm">{job.description}</p>
                      </div>
                      <div className={`px-4 py-3 rounded-lg text-center border-2 ${getScoreBg(job.match_score)}`}>
                        <p className={`text-2xl font-bold ${getScoreColor(job.match_score)}`}>
                          {job.match_score}%
                        </p>
                        <p className="text-xs text-[#6B7280] font-medium">AI Match</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-[#111827] mb-2">Required Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.split(',').map((skill, index) => (
                          <span
                            key={index}
                            className="bg-[#C4B5FD] bg-opacity-20 text-[#1E3A8A] px-3 py-1 rounded-full text-sm font-medium"
                          >
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-sm text-[#6B7280]">
                        <strong>AI Insight:</strong> {job.match_explanation}
                      </p>
                      <button 
                        onClick={() => handleApply(job.job_id)}
                        disabled={applying[job.job_id]}
                        className="bg-[#1E3A8A] text-white px-6 py-2 rounded-lg hover:bg-[#C4B5FD] disabled:bg-[#9CA3AF] transition font-medium"
                      >
                        {applying[job.job_id] ? 'Applying...' : 'Apply Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Applications Tab */}
        {activeTab === 'myApplications' && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-[#F3F4F6]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#111827]">
                My Applications ({myApplications.length})
              </h2>
              <button 
                onClick={loadMyApplications}
                className="bg-[#F3F4F6] text-[#111827] px-4 py-2 rounded-lg hover:bg-[#E5E7EB] transition font-medium"
              >
                Refresh
              </button>
            </div>

            {loadingApplications ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A] mx-auto"></div>
                <p className="text-[#6B7280] mt-4">Loading your applications...</p>
              </div>
            ) : myApplications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4 text-[#6B7280]">📭</div>
                <p className="text-[#6B7280] text-lg mb-2">
                  You haven't applied to any jobs yet
                </p>
                <p className="text-[#9CA3AF]">
                  Check the "Recommended Jobs" tab to find opportunities that match your skills
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-[#C4B5FD] bg-opacity-10 border border-[#C4B5FD] rounded-lg p-4">
                  <p className="text-[#1E3A8A] text-sm font-medium">
                    <strong>Application Status Guide:</strong><br/>
                    <strong>Pending:</strong> Under review | <strong>Shortlisted:</strong> Moving forward | <strong>Rejected:</strong> Not selected
                  </p>
                </div>

                {myApplications.map((app, index) => (
                  <div
                    key={app.application_id}
                    className={`border-2 rounded-lg p-6 transition-all duration-300 hover:shadow-lg ${
                      app.status === 'shortlisted' ? 'border-[#22C55E] bg-[#22C55E] bg-opacity-5' :
                      app.status === 'rejected' ? 'border-[#EF4444] bg-[#EF4444] bg-opacity-5' :
                      'border-[#F97316] bg-[#F97316] bg-opacity-5'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(app.status)}`}>
                            {app.status.toUpperCase()}
                          </span>
                          <span className="text-[#6B7280] text-sm">
                            Applied on {app.applied_at}
                          </span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-[#111827] mb-2">
                          {app.job_title}
                        </h3>
                        <p className="text-[#6B7280] mb-1">{app.job_location}</p>
                        
                        <div className="mt-4 p-3 bg-white rounded-lg border border-[#F3F4F6]">
                          <p className={`text-sm font-medium ${
                            app.status === 'shortlisted' ? 'text-[#166534]' :
                            app.status === 'rejected' ? 'text-[#991B1B]' :
                            'text-[#C2410C]'
                          }`}>
                            {getStatusMessage(app.status, app.job_title)}
                          </p>
                          {app.status === 'shortlisted' && (
                            <p className="text-[#166534] text-xs mt-1">
                              The recruiter is interested! They may contact you soon.
                            </p>
                          )}
                          {app.status === 'rejected' && (
                            <p className="text-[#991B1B] text-xs mt-1">
                              Don't give up! Keep applying to other opportunities.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`px-6 py-4 rounded-lg text-center border-2 ${getScoreBg(app.match_score)}`}>
                        <p className={`text-3xl font-bold ${getScoreColor(app.match_score)}`}>
                          {app.match_score}%
                        </p>
                        <p className="text-xs text-[#6B7280] font-medium">AI Match</p>
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

export default CandidateDashboard