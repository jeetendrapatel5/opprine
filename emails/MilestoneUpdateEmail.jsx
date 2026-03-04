import * as React from 'react';

export const MilestoneUpdateEmail = ({ clientName, projectName, milestoneTitle, status, portalUrl }) => (
  <div style={{ fontFamily: 'sans-serif', color: '#333', maxWidth: '600px', margin: '0 auto' }}>
    <h2 style={{ color: '#2563eb' }}>Project Update: {projectName}</h2>
    <p>Hi {clientName},</p>
    <p>
      There has been progress on your project! The following milestone has been updated to 
      <strong> {status.replace('_', ' ')}</strong>:
    </p>
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f3f4f6', 
      borderRadius: '8px', 
      margin: '20px 0',
      borderLeft: '4px solid #2563eb' 
    }}>
      <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{milestoneTitle}</span>
    </div>
    <p>You can view the full project timeline and download any new files here:</p>
    <a href={portalUrl} style={{
      display: 'inline-block',
      padding: '12px 24px',
      backgroundColor: '#2563eb',
      color: '#fff',
      textDecoration: 'none',
      borderRadius: '6px',
      fontWeight: 'bold'
    }}>
      View Project Portal
    </a>
    <p style={{ marginTop: '30px', fontSize: '12px', color: '#6b7280' }}>
      Sent via ClientPortal. No account required to view.
    </p>
  </div>
);