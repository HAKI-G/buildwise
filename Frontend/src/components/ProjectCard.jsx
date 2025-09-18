import React from 'react';

function ProjectCard({ project }) {
  const cardStyle = {
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  return (
    <div style={cardStyle}>
      <h3>{project.projectName}</h3>
      <p><strong>Location:</strong> {project.location}</p>
      <p><strong>Status:</strong> <span style={{ color: 'green' }}>{project.status}</span></p>
    </div>
  );
}

export default ProjectCard;