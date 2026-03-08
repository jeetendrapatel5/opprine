"use client"
import { useState } from 'react'
import { Star, Copy, Check, ExternalLink, Share2, Quote } from 'lucide-react'

export default function ClientReviewCard({ project }) {
  const [copied, setCopied] = useState(false)

  const hasReview = project.clientRating || project.testimonial
  // Use relative path for rendering to avoid SSR/client origin mismatch
  const showcasePath = project.publicSlug ? `/showcase/${project.publicSlug}` : null
  // Build full URL only inside event handlers where window is guaranteed available
  const getFullUrl = () => `${window.location.origin}${showcasePath}`

  const handleCopy = () => {
    if (!showcasePath) return
    navigator.clipboard.writeText(getFullUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (!showcasePath) return
    if (navigator.share) {
      await navigator.share({ title: project.name, url: getFullUrl() })
    } else {
      handleCopy()
    }
  }

  // Empty state — project not completed yet
  if (!hasReview) {
    return (
      <div className="review-card review-card--empty">
        <style>{styles}</style>
        <div className="empty-inner">
          <div className="empty-stars">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="empty-star" />
            ))}
          </div>
          <p className="empty-label">Awaiting client sign-off</p>
          <p className="empty-sub">Once your client approves & leaves a review, it will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="review-card">
      <style>{styles}</style>

      {/* Header */}
      <div className="card-header">
        <span className="badge">
          <span className="badge-dot" />
          Client Review
        </span>
        {showcasePath && (
          <div className="action-row">
            <button onClick={handleCopy} className="btn-ghost" title="Copy link">
              {copied ? <Check className="icon-sm check" /> : <Copy className="icon-sm" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button onClick={handleShare} className="btn-ghost" title="Share">
              <Share2 className="icon-sm" />
              Share
            </button>
            <a href={showcasePath} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <ExternalLink className="icon-sm" />
              View Showcase
            </a>
          </div>
        )}
      </div>

      {/* Review Body */}
      <div className="review-body">
        <Quote className="quote-icon" />

        {/* Stars */}
        <div className="stars-row">
          {[1,2,3,4,5].map(star => (
            <Star
              key={star}
              className="star"
              fill={star <= (project.clientRating ?? 0) ? '#F59E0B' : 'transparent'}
              color={star <= (project.clientRating ?? 0) ? '#F59E0B' : '#D1D5DB'}
            />
          ))}
          <span className="rating-label">{project.clientRating}.0 / 5</span>
        </div>

        {/* Testimonial */}
        {project.testimonial && (
          <p className="testimonial">"{project.testimonial}"</p>
        )}

        {/* Client attribution */}
        <div className="attribution">
          <div className="attribution-avatar">
            {project.client?.name?.[0]?.toUpperCase() ?? 'C'}
          </div>
          <div>
            <p className="attribution-name">{project.client?.name ?? 'Verified Client'}</p>
            <p className="attribution-sub">Client · {project.name}</p>
          </div>
        </div>
      </div>

      {/* Showcase URL Strip */}
      {showcasePath && (
        <div className="url-strip">
          <span className="url-text">{showcasePath}</span>
          <button onClick={handleCopy} className="url-copy-btn">
            {copied ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
          </button>
        </div>
      )}
    </div>
  )
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap');

  .review-card {
    font-family: 'DM Sans', sans-serif;
    background: #0F0F0F;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    overflow: hidden;
    position: relative;
  }

  .review-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent);
  }

  /* Empty state */
  .review-card--empty {
    background: #FAFAFA;
    border: 1.5px dashed #E5E7EB;
  }

  .review-card--empty::before { display: none; }

  .empty-inner {
    padding: 40px 24px;
    text-align: center;
  }

  .empty-stars {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 16px;
  }

  .empty-star {
    width: 24px; height: 24px;
    color: #D1D5DB;
    stroke-dasharray: 4;
  }

  .empty-label {
    font-size: 14px;
    font-weight: 600;
    color: #6B7280;
    margin: 0 0 6px;
  }

  .empty-sub {
    font-size: 13px;
    color: #9CA3AF;
    margin: 0;
    max-width: 280px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* Header */
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-wrap: wrap;
    gap: 10px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #A3A3A3;
  }

  .badge-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #22C55E;
    box-shadow: 0 0 6px #22C55E;
  }

  .action-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: #A3A3A3;
    font-size: 12px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-ghost:hover {
    background: rgba(255,255,255,0.1);
    color: #E5E5E5;
  }

  .btn-ghost .check { color: #22C55E; }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #F59E0B;
    color: #0F0F0F;
    font-size: 12px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    padding: 6px 14px;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .btn-primary:hover {
    background: #FBBF24;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245,158,11,0.35);
  }

  /* Review body */
  .review-body {
    padding: 28px 24px 20px;
    position: relative;
  }

  .quote-icon {
    width: 36px; height: 36px;
    color: rgba(245,158,11,0.15);
    position: absolute;
    top: 20px; right: 20px;
  }

  .stars-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 16px;
  }

  .star { width: 20px; height: 20px; }

  .rating-label {
    font-size: 13px;
    font-weight: 600;
    color: #F59E0B;
    margin-left: 8px;
  }

  .testimonial {
    font-family: 'Lora', serif;
    font-style: italic;
    font-size: 16px;
    line-height: 1.75;
    color: #E5E5E5;
    margin: 0 0 24px;
    max-width: 560px;
  }

  .attribution {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .attribution-avatar {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #F59E0B, #EF4444);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: white;
    flex-shrink: 0;
  }

  .attribution-name {
    font-size: 13px;
    font-weight: 600;
    color: #E5E5E5;
    margin: 0 0 2px;
  }

  .attribution-sub {
    font-size: 11px;
    color: #6B7280;
    margin: 0;
  }

  /* URL strip */
  .url-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: rgba(255,255,255,0.03);
    border-top: 1px solid rgba(255,255,255,0.06);
    gap: 12px;
  }

  .url-text {
    font-size: 11px;
    color: #525252;
    font-family: 'DM Mono', 'Courier New', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .url-copy-btn {
    background: none;
    border: none;
    color: #525252;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    transition: color 0.15s;
  }

  .url-copy-btn:hover { color: #F59E0B; }

  .icon-sm { width: 14px; height: 14px; }
  .icon-xs { width: 12px; height: 12px; }
`