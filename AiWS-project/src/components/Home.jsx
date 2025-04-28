import React, { useState, useEffect } from 'react';
import { useSpring, animated } from 'react-spring';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import mermaid from 'mermaid'; // You'll need to install this with: npm install mermaid
import './Home.css';

function Home({ user, logout }) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [learningPath, setLearningPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTopic, setActiveTopic] = useState(0);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [errorResponse, setErrorResponse] = useState(null);
  const [roadmapFlowchart, setRoadmapFlowchart] = useState('');
  
  const containerAnimation = useSpring({
    from: { opacity: 0, y: 20 },
    to: { opacity: 1, y: 0 },
    config: { tension: 300, friction: 20 }
  });

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      securityLevel: 'loose',
      flowchart: { 
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }, []);

  // Re-render mermaid diagrams when they change
  useEffect(() => {
    if (roadmapFlowchart) {
      mermaid.contentLoaded();
    }
  }, [roadmapFlowchart]);


  

  const fetchLearningPath = async () => {
    if (!prompt.trim()) {
      setError('Please enter a learning topic');
      return;
    }

    setLoading(true);
    setError('');
    setLearningPath(null);
    setErrorResponse(null);
    setRoadmapFlowchart('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/generate-learning-path', { 
        prompt,
        userId: user?.id
      });
      
      if (response.data.status === "success") {
        setLearningPath(response.data.learning_path);
        setActiveTopic(0);
        
        // Set flowchart data if available
        if (response.data.roadmap_flowchart) {
          setRoadmapFlowchart(response.data.roadmap_flowchart);
        }
      } else {
        // Handle different error cases
        if (response.data.raw_response) {
          console.error('AI Response:', response.data.raw_response);
          setError('The AI returned an unexpected format. Please try rephrasing your request.');
          setErrorResponse(response.data);
        } else {
          setError(response.data.message || 'Failed to generate learning path');
        }
      }
    } catch (err) {
      let errorMsg = 'Network error. Please try again.';
      if (err.response) {
        if (err.response.data?.raw_response) {
          errorMsg = 'The AI response format was invalid.';
          console.error('Raw AI Response:', err.response.data.raw_response);
          setErrorResponse(err.response.data);
        } else {
          errorMsg = err.response.data?.message || err.response.statusText;
        }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  // Navigation back to home page
  const handleProfileClick = () => {
    navigate('/profile'); // Navigate back to home page
  };

  // Function to render the YouTube player if URL is from YouTube
  const renderResourceContent = (resource) => {
    if (resource.url && resource.url.includes('youtube.com/embed')) {
      return (
        <div className="video-container">
          <iframe 
            src={resource.url} 
            title={resource.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      );
    }
    return null;
  };


  const handleSave = async () => {
    // Prevent multiple clicks
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      
      const response = await fetch('http://localhost:5000/api/save-learning-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          learning_path: learningPath,
          userId: user.id || 'anonymous'  // Use 'anonymous' if no userId is provided
        }),
      });
      
      const data = await response.json();
      if (response.ok) { 
        // Success!
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000); // Reset status after 3 seconds
        
        // You can store the path_id from data.path_details.path_id for future reference
        console.log('Saved learning path ID:', data.path_details.path_id);
      }
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000); // Reset status after 3 seconds
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <animated.div style={containerAnimation} className="learning-platform">
      <header className="platform-header">
        <h1>AI Learning Path Generator</h1>
        <div className="user-info">
          <span>Welcome, {user?.username}</span>
          <button onClick={logout} className="logout-btn">Sign Out</button>
        </div>
        <button className="profile-button-icon" onClick={handleProfileClick}>
        <span className="profile-icon">👨🏻‍💼 </span> 
      </button>
      </header>

      <main className="platform-content">
        <div className="prompt-section">
          <h2>What do you want to learn?</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'Complete web development roadmap with React'"
            rows={4}
            disabled={loading}
          />
          <button 
            onClick={fetchLearningPath} 
            disabled={loading}
            className="generate-btn"
          >
            {loading ? 'Generating...' : 'Create Learning Path'}
          </button>

          {/* Error handling */}
          {error && (
            <div className="error-message">
              <p>{error}</p>
              {error.includes('unexpected format') && (
                <button 
                  onClick={() => setShowRawResponse(!showRawResponse)}
                  className="debug-toggle"
                >
                  {showRawResponse ? 'Hide' : 'Show'} Technical Details
                </button>
              )}
              {showRawResponse && error.includes('unexpected format') && errorResponse?.raw_response && (
                <pre className="raw-response">
                  {JSON.stringify(errorResponse.raw_response, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {learningPath && (
          <div className="results-section">
            <div className="path-header">
              <h2>{learningPath.title || 'Your Learning Path'}</h2>
              <p className="overview">{learningPath.overview}</p>
              <div className="duration-badge">
                Total Duration: {learningPath.total_duration}
              </div>
            </div>

            

            {/* Roadmap Flowchart */}
            {roadmapFlowchart && (
              <div className="roadmap-section">
                <h3>Learning Path Roadmap</h3>
                <div className="roadmap-container">
                  <div className="mermaid">
                    {roadmapFlowchart}
                  </div>
                </div>
              </div>
            )}

            <div className="path-container">
              <div className="topics-sidebar">
                <h3>Topics</h3>
                <ul>
                  {learningPath.topics.map((topic, index) => (
                    <li 
                      key={index}
                      className={activeTopic === index ? 'active' : ''}
                      onClick={() => setActiveTopic(index)}
                    >
                      <span className="topic-name">{topic.name}</span>
                      <span className="topic-duration">{topic.duration}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="topic-details">
                {learningPath.topics[activeTopic] && (
                  <>
                    <h3>{learningPath.topics[activeTopic].name}</h3>
                    <p className="topic-description">
                      {learningPath.topics[activeTopic].description}
                    </p>

                    <div className="study-plan-section">
                      <h4>Study Plan</h4>
                      <div className="study-plan-list">
                        {learningPath.topics[activeTopic].study_plan && 
                         learningPath.topics[activeTopic].study_plan.map((day, idx) => (
                          <div key={idx} className="day-card">
                            <h5>{day.day}</h5>
                            <ul className="tasks-list">
                              {day.tasks && day.tasks.map((task, taskIdx) => (
                                <li key={taskIdx}>{task}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="resources-section">
                      <h4>Learning Resources</h4>
                      <div className="resources-grid">
                        {learningPath.topics[activeTopic].resources && 
                         learningPath.topics[activeTopic].resources.map((resource, idx) => (
                          <div key={idx} className="resource-card">
                            <div className="resource-type">{resource.type}</div>
                            <h5>{resource.title}</h5>
                            <p>{resource.estimated_time} • <a href={resource.url} target="_blank" rel="noopener noreferrer">Open resource</a></p>
                            {renderResourceContent(resource)}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="projects-section">
                      <h4>Practical Projects</h4>
                      <div className="projects-list">
                        {learningPath.topics[activeTopic].projects && 
                         learningPath.topics[activeTopic].projects.map((project, idx) => (
                          <div key={idx} className="project-card">
                            <div className="project-complexity">{project.complexity}</div>
                            <h5>{project.name}</h5>
                            <p>{project.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      
      <div className="save-button-container">
      <button 
        className={`save-button ${isSaving ? 'saving' : ''} ${saveStatus ? saveStatus : ''}`}
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 
         saveStatus === 'success' ? 'Saved!' : 
         saveStatus === 'sucess' ? 'Saved!' : 
         'Save Learning Path'}
      </button>
      
    </div>
    </animated.div>
  );
}

export default Home;
