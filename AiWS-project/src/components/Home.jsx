import React, { useState, useEffect } from 'react';
import { useSpring, animated, config, useTransition } from 'react-spring';
import axios from 'axios';
import './Home.css';

function Home({ user, logout }) {
  const [prompt, setPrompt] = useState('');
  const [learningPath, setLearningPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Animations
  const containerAnimation = useSpring({
    from: { opacity: 0, y: 20 },
    to: { opacity: 1, y: 0 },
    config: config.stiff
  });

  const buttonAnimation = useSpring({
    from: { scale: 0.95 },
    to: { scale: 1 },
    config: config.wobbly
  });

  const loadingTransition = useTransition(loading, {
    from: { opacity: 0, scale: 0.9 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 0.9 },
    config: config.slow
  });

  const fetchLearningPath = async () => {
    if (!prompt.trim()) {
      setError('Please enter a topic to generate a learning path');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/generate-learning-path', { 
        prompt: prompt,
        userId: user?.id
      });
      
      setLearningPath(response.data);
    } catch (err) {
      console.error('Error fetching learning path:', err);
      setError('Failed to generate learning path. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <animated.div style={containerAnimation} className="genai-platform">
      {/* Header with user info */}
      <header className="platform-header">
        <div className="header-content">
          <h1 className="platform-title">LearnGenAI</h1>
          <div className="user-controls">
            <span className="welcome-text">Welcome, {user?.username}</span>
            <button onClick={logout} className="logout-btn">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="platform-main">
        <div className="prompt-container">
          <div className="prompt-header">
            <h2>Create your personalized learning path</h2>
            <p>Enter a topic you want to learn about and AI will generate a customized curriculum</p>
          </div>
          
          <div className="prompt-input-container">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: 'Machine learning fundamentals for beginners' or 'Complete web development roadmap'"
              className="prompt-textarea"
              rows={5}
            />
            
            <div className="prompt-controls">
              <animated.button
                onClick={fetchLearningPath}
                style={buttonAnimation}
                className="generate-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading-text">
                    <span className="spinner"></span> Generating...
                  </span>
                ) : (
                  'Generate Learning Path'
                )}
              </animated.button>
              
              <div className="prompt-hints">
                <span>Tip: Be specific about your current level and goals</span>
              </div>
            </div>
          </div>
        </div>

        {loadingTransition((style, item) => 
          item && (
            <animated.div style={style} className="generation-status">
              <div className="status-content">
                <div className="pulse-animation"></div>
                <p>AI is crafting your perfect learning journey...</p>
              </div>
            </animated.div>
          )
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {learningPath && !loading && (
          <div className="results-container">
            <h2 className="results-title">Your AI-Generated Learning Path</h2>
            <div className="path-details">
              <div className="detail-card">
                <h3>Duration</h3>
                <p>{learningPath.duration}</p>
              </div>
              
              <div className="detail-card">
                <h3>Topics</h3>
                <ul>
                  {learningPath.topics.map((topic, index) => (
                    <li key={`topic-${index}`}>{topic}</li>
                  ))}
                </ul>
              </div>
              
              <div className="detail-card">
                <h3>Resources</h3>
                <ul>
                  {learningPath.resources.map((resource, index) => (
                    <li key={`resource-${index}`}>
                      <a href={resource} target="_blank" rel="noopener noreferrer">
                        {resource}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="detail-card">
                <h3>Projects</h3>
                <ul>
                  {learningPath.projects.map((project, index) => (
                    <li key={`project-${index}`}>{project}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </animated.div>
  );
}

export default Home;