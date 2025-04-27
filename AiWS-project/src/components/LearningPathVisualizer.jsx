import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

export default function LearningPathVisualizer({ mermaidCode, learningPath }) {
  const mermaidRef = useRef(null);
  const [currentFocus, setCurrentFocus] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'forest',
      securityLevel: 'loose',
      fontFamily: 'Nunito, sans-serif',
      flowchart: {
        curve: 'basis',
        htmlLabels: true,
        useMaxWidth: true,
      },
    });
  }, []);

  // Render mermaid chart when code changes
  useEffect(() => {
    if (mermaidCode && mermaidRef.current) {
      try {
        mermaidRef.current.innerHTML = ''; // Clear previous diagram
        
        // Unique ID to avoid conflicts with multiple renders
        const id = `mermaid-diagram-${Date.now()}`;
        
        mermaid.render(id, mermaidCode).then(({ svg }) => {
          mermaidRef.current.innerHTML = svg;
          
          // Add click event listeners to nodes after rendering
          setTimeout(() => {
            const nodes = mermaidRef.current.querySelectorAll('g.node');
            nodes.forEach((node) => {
              node.style.cursor = 'pointer';
              node.addEventListener('click', () => handleNodeClick(node.textContent.trim()));
              node.addEventListener('mouseenter', () => node.classList.add('node-hover'));
              node.addEventListener('mouseleave', () => node.classList.remove('node-hover'));
            });
          }, 100);
        });
      } catch (err) {
        console.error('Mermaid rendering error:', err);
      }
    }
  }, [mermaidCode]);

  const handleNodeClick = (text) => {
    setCurrentFocus(text);
    setIsZoomed(true);
  };

  const closeDetail = () => {
    setIsZoomed(false);
    setTimeout(() => setCurrentFocus(null), 300); // Wait for animation to complete
  };

  return (
    <div className="learning-path-visualizer">
      <div className="flowchart-container">
        <h3 className="flowchart-title">
          <span className="primary-text">Your Learning Journey</span>
          <span className="subtitle-text">Interactive Roadmap</span>
        </h3>
        
        <div className="controls">
          <button className="control-btn" onClick={() => window.print()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print
          </button>
          <div className="tip">Tip: Click on any step to see details</div>
        </div>
        
        <div className="mermaid-container">
          <div ref={mermaidRef} className="mermaid-diagram"></div>
          
          {/* Path Info - Duration, Difficulty */}
          {learningPath && (
            <div className="path-info">
              <div className="info-pill duration">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>{learningPath.duration}</span>
              </div>
              
              {learningPath.difficulty && (
                <div className="info-pill difficulty">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
                  </svg>
                  <span>{learningPath.difficulty}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Focus detail panel */}
      {currentFocus && (
        <div className={`topic-detail-panel ${isZoomed ? 'active' : ''}`}>
          <div className="panel-header">
            <h4>{currentFocus}</h4>
            <button className="close-btn" onClick={closeDetail}>×</button>
          </div>
          <div className="panel-content">
            {/* Find matching content from learning path */}
            {learningPath && learningPath.topics.includes(currentFocus) && (
              <>
                <p className="topic-description">
                  This topic is part of your learning journey. 
                  {learningPath.topics.indexOf(currentFocus) === 0 
                    ? " It's your starting point." 
                    : learningPath.topics.indexOf(currentFocus) === learningPath.topics.length - 1 
                      ? " This is the final topic in your path."
                      : " Build upon previous knowledge to master this."}
                </p>
                
                {/* Suggested resources for this topic */}
                <div className="topic-resources">
                  <h5>Suggested Resources:</h5>
                  <ul>
                    {learningPath.resources && learningPath.resources.length > 0 
                      ? learningPath.resources.slice(0, 2).map((resource, i) => (
                          <li key={i}>
                            <a href={resource.startsWith('http') ? resource : '#'} target="_blank" rel="noopener noreferrer">
                              {resource.startsWith('http') 
                                ? new URL(resource).hostname.replace('www.', '') 
                                : resource}
                            </a>
                          </li>
                        ))
                      : <li>No specific resources available for this topic.</li>
                    }
                  </ul>
                </div>
                
                {/* Next steps */}
                <div className="next-steps">
                  <h5>Next Steps:</h5>
                  {learningPath.topics.indexOf(currentFocus) < learningPath.topics.length - 1 ? (
                    <p>Continue to <strong>{learningPath.topics[learningPath.topics.indexOf(currentFocus) + 1]}</strong></p>
                  ) : (
                    <p>Complete the practical projects to solidify your knowledge.</p>
                  )}
                </div>
              </>
            )}
            
            {currentFocus === "Start Learning Journey" && (
              <div className="getting-started">
                <p>Before you begin, make sure you have these prerequisites:</p>
                <ul>
                  {learningPath.prerequisites ? (
                    <li>{learningPath.prerequisites}</li>
                  ) : (
                    <li>Basic understanding of the subject</li>
                  )}
                </ul>
                <p>Click on <strong>{learningPath.topics[0]}</strong> to start your learning journey.</p>
              </div>
            )}
            
            {currentFocus === "Complete Learning Path" && (
              <div className="completion">
                <p>Congratulations on completing the learning path! Here are projects to solidify your knowledge:</p>
                <ul className="project-list">
                  {learningPath.projects && learningPath.projects.length > 0 
                    ? learningPath.projects.map((project, i) => (
                        <li key={i}>{project}</li>
                      ))
                    : <li>Create a portfolio project showcasing your new skills</li>
                  }
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .learning-path-visualizer {
          position: relative;
          margin-bottom: 2rem;
        }
        
        .flowchart-container {
          background: linear-gradient(to bottom right, #f0f7ff, #e9f3ff);
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(79, 70, 229, 0.1);
          overflow: hidden;
        }
        
        .flowchart-title {
          text-align: center;
          margin-top: 0;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .primary-text {
          font-size: 1.25rem;
          font-weight: 600;
          color: #4f46e5;
        }
        
        .subtitle-text {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }
        
        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .control-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .control-btn:hover {
          background-color: #f9fafb;
          border-color: #d1d5db;
        }
        
        .tip {
          font-size: 0.75rem;
          color: #6b7280;
          font-style: italic;
        }
        
        .mermaid-container {
          position: relative;
          background-color: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
          overflow-x: auto;
        }
        
        .mermaid-diagram {
          display: flex;
          justify-content: center;
        }
        
        .path-info {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          justify-content: center;
        }
        
        .info-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background-color: white;
          border-radius: 9999px;
          font-size: 0.875rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .duration {
          color: #4f46e5;
          border: 1px solid rgba(79, 70, 229, 0.2);
        }
        
        .difficulty {
          color: #06b6d4;
          border: 1px solid rgba(6, 182, 212, 0.2);
        }
        
        .topic-detail-panel {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.9);
          background-color: white;
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          width: 90%;
          max-width: 500px;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          z-index: 100;
          overflow: hidden;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }
        
        .topic-detail-panel.active {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
          visibility: visible;
        }
        
        .panel-header {
          background: linear-gradient(to right, #4f46e5, #06b6d4);
          color: white;
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .panel-header h4 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
        }
        
        .close-btn {
          background: transparent;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
        }
        
        .close-btn:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        
        .panel-content {
          padding: 1.5rem;
          overflow-y: auto;
        }
        
        .topic-description {
          margin-top: 0;
          color: #4b5563;
          line-height: 1.6;
        }
        
        .topic-resources h5, .next-steps h5 {
          color: #4f46e5;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }
        
        .topic-resources ul {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }
        
        .topic-resources li {
          padding: 0.5rem 0;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .topic-resources a {
          color: #06b6d4;
          text-decoration: none;
        }
        
        .topic-resources a:hover {
          text-decoration: underline;
        }
        
        .next-steps {
          margin-top: 1.5rem;
        }
        
        .next-steps p {
          color: #4b5563;
        }
        
        .getting-started ul, .completion ul {
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .project-list li {
          margin-bottom: 0.75rem;
          position: relative;
          padding-left: 1.5rem;
        }
        
        .project-list li:before {
          content: '•';
          position: absolute;
          left: 0;
          color: #06b6d4;
          font-size: 1.5rem;
          line-height: 1;
        }
        
        /* Additional styles for node hover state */
        :global(.node-hover) {
          filter: drop-shadow(0px 4px 6px rgba(79, 70, 229, 0.3)) !important;
        }
        
        @media (max-width: 768px) {
          .topic-detail-panel {
            width: 95%;
            max-height: 85vh;
          }
        }
      `}</style>
    </div>
  );
}