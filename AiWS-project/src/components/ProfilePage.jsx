import React, { useState, useEffect } from 'react';
import { useSpring, animated, config } from 'react-spring';
import { useNavigate } from 'react-router-dom';
import { useGesture } from 'react-use-gesture';
import './Profile.css';

const ProfilePage = ({ user }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/profile/${user.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile data:", error);
        // Handle error state here
      }
    };
  
    if (user && user.id) {
      fetchProfile();
    }
  }, [user?.id]);

  // Animation for the whole page
  const pageAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    config: config.gentle
  });

  // Animation for the avatar card
  const [avatarStyle, setAvatarStyle] = useSpring(() => ({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
    config: { mass: 1, tension: 200, friction: 20 }
  }));

   // Navigation back to home page
  const handleBackClick = () => {
    navigate('/'); // Navigate back to home page
  };

  // 3D tilt effect for avatar card
  const bindAvatar = useGesture({
    onMove: ({ xy: [x, y] }) => {
      const rect = document.querySelector('.avatar-card').getBoundingClientRect();
      const xVal = (x - rect.left - rect.width / 2) / 20;
      const yVal = (y - rect.top - rect.height / 2) / 20;
      setAvatarStyle({
        transform: `perspective(1000px) rotateX(${-yVal}deg) rotateY(${xVal}deg)`
      });
    },
    onHover: ({ hovering }) => {
      setAvatarStyle({
        scale: hovering ? 1.03 : 1,
        boxShadow: hovering 
          ? '0 15px 30px -5px rgba(79, 70, 229, 0.3)' 
          : '0 10px 20px -5px rgba(79, 70, 229, 0.2)'
      });
    }
  });

  // XP bar animation
  const xpPercentage = profile ? (profile.profile.xp / (profile.profile.level * 1000)) * 100 : 0;
  const xpBarAnimation = useSpring({
    width: `${xpPercentage}%`,
    from: { width: '0%' },
    config: config.slow
  });

  // Tab content animation
  const tabAnimation = useSpring({
    from: { opacity: 0, transform: 'translateX(20px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
    config: config.stiff
  });

  if (!profile) return <div className="loading-spinner">Loading...</div>;

  return (
    <animated.div style={pageAnimation} className="profile-page">
      
      <button className="back-button" onClick={handleBackClick}>
        <span className="back-icon">⬅️</span> 
      </button>

      {/* Header Section */}
      <div className="profile-header">
        <animated.div 
          {...bindAvatar()}
          style={avatarStyle}
          className="avatar-card"
        >
          <div className="avatar" style={{ backgroundImage: `url(${profile.profile.avatar_url || ''})` }}>
            {!profile.profile.avatar_url && profile.username.charAt(0).toUpperCase()}
          </div>
          <h1>{profile.username}</h1>
          <p className="user-level">Level {profile.profile.level} • {profile.profile.bio || 'Learning enthusiast'}</p>
        </animated.div>

        <div className="stats-overview">
          <StatCard 
            value={profile.profile.streak} 
            label="Day Streak" 
            icon="🔥" 
            color="linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)"
          />
          <StatCard 
            value={profile.stats.paths_completed} 
            label="Paths Completed" 
            icon="📚" 
            color="linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)"
          />
          <StatCard 
            value={Math.floor(profile.stats.hours_learned)} 
            label="Hours Learned" 
            icon="⏳" 
            color="linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)"
          />
        </div>
      </div>

      {/* Progress Section */}
      <div className="progress-section">
        <h2>Your Progress</h2>
        <div className="xp-container">
          <div className="xp-bar-bg">
            <animated.div className="xp-bar-fill" style={xpBarAnimation} />
          </div>
          <div className="xp-text">
            {profile.profile.xp} / {profile.profile.level * 1000} XP
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'achievements' ? 'active' : ''}
          onClick={() => setActiveTab('achievements')}
        >
          Achievements
        </button>
        <button 
          className={activeTab === 'activity' ? 'active' : ''}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
      </div>

      {/* Tab Content */}
      <animated.div style={tabAnimation} className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="learning-stats">
              <h3>Learning Stats</h3>
              <div className="stat-item">
                <span>Resources Used</span>
                <span>{profile.stats.resources_used}</span>
              </div>
              <div className="stat-item">
                <span>Last Active</span>
                <span>{new Date(profile.stats.last_active).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="recent-activity-preview">
              <h3>Recent Activity</h3>
              {profile.recent_activity.slice(0, 3).map((activity, i) => (
                <ActivityItem key={i} activity={activity} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="achievements-grid">
            {profile.achievements.map((achievement, i) => (
              <AchievementCard key={i} achievement={achievement} index={i} />
            ))}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="activity-feed">
            {profile.recent_activity.map((activity, i) => (
              <ActivityItem key={i} activity={activity} detailed />
            ))}
          </div>
        )}
      </animated.div>
    </animated.div>
  );
};

// Component for statistic cards
const StatCard = ({ value, label, icon, color }) => {
  const [hovered, setHovered] = useState(false);
  
  const cardAnimation = useSpring({
    transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
    boxShadow: hovered 
      ? '0 15px 30px -5px rgba(0, 0, 0, 0.2)' 
      : '0 5px 15px -5px rgba(0, 0, 0, 0.1)',
    config: config.wobbly
  });

  return (
    <animated.div 
      style={{ ...cardAnimation, background: color }}
      className="stat-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </animated.div>
  );
};

// Component for achievement cards
const AchievementCard = ({ achievement, index }) => {
  const [flipped, setFlipped] = useState(false);
  
  const { transform, opacity } = useSpring({
    opacity: flipped ? 1 : 0,
    transform: `perspective(600px) rotateX(${flipped ? 180 : 0}deg)`,
    config: config.gentle
  });

  return (
    <div 
      className="achievement-card" 
      onClick={() => setFlipped(!flipped)}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <animated.div
        className="achievement-front"
        style={{ opacity: opacity.to(o => 1 - o), transform }}
      >
        <div className="achievement-icon">{achievement.icon}</div>
        <h4>{achievement.title}</h4>
      </animated.div>
      <animated.div
        className="achievement-back"
        style={{
          opacity,
          transform,
          rotateX: '180deg'
        }}
      >
        <p>{achievement.description}</p>
        <small>Earned on {new Date(achievement.earned_at).toLocaleDateString()}</small>
      </animated.div>
    </div>
  );
};

// Component for activity items
const ActivityItem = ({ activity, detailed = false }) => {
  const [hovered, setHovered] = useState(false);
  
  const itemAnimation = useSpring({
    backgroundColor: hovered ? 'rgba(79, 70, 229, 0.05)' : 'rgba(0, 0, 0, 0)',
    borderLeft: hovered ? '3px solid #4f46e5' : '3px solid transparent',
    config: config.stiff
  });

  return (
    <animated.div 
      style={itemAnimation}
      className={`activity-item ${detailed ? 'detailed' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="activity-icon">
        {activity.type === 'completed_path' ? '✅' : 
         activity.type === 'started_course' ? '🚀' : '📝'}
      </div>
      <div className="activity-content">
        <p>{activity.details}</p>
        <small>{new Date(activity.created_at).toLocaleString()}</small>
      </div>
    </animated.div>
  );
};

export default ProfilePage;