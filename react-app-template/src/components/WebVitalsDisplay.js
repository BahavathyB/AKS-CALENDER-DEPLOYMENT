import React, { useState, useEffect } from 'react';

const WebVitalsDisplay = () => {
  const [vitals, setVitals] = useState({});
  const [isVisible, setIsVisible] = useState(false);

  // Manual rating calculation based on Web Vitals thresholds
  const calculateRating = (name, value) => {
    const thresholds = {
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 }
    };
    const threshold = thresholds[name];
    if (!threshold) return 'unknown';
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const collectVitals = (metric) => {
        if (!metric || !metric.name) return;
        
        const rating = metric.rating || calculateRating(metric.name, metric.value);
        
        setVitals(prev => ({
          ...prev,
          [metric.name]: {
            value: metric.name === 'CLS' ?
              Math.round(metric.value * 1000) / 1000 : // Keep 3 decimal places for CLS
              Math.round(metric.value),
            rating: rating,
            unit: metric.name === 'CLS' ? '' : 'ms',
            timestamp: Date.now()
          }
        }));
      };

      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(collectVitals);
        getFID(collectVitals);
        getFCP(collectVitals);
        getLCP(collectVitals);
        getTTFB(collectVitals);
      }).catch(error => {
        console.warn('Failed to load web-vitals:', error);
      });
    }
  }, []);

  if (process.env.NODE_ENV !== 'development' || Object.keys(vitals).length === 0) {
    return null;
  }

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'good': return '#0CCE6B';
      case 'needs-improvement': return '#FFA400';
      case 'poor': return '#FF4E42';
      default: return '#9CA3AF';
    }
  };

  const getRatingBadge = (rating) => {
    switch (rating) {
      case 'good': return '✓';
      case 'needs-improvement': return '!';
      case 'poor': return '✗';
      default: return '?';
    }
  };

  const getRatingEmoji = (rating) => {
    switch (rating) {
      case 'good': return '🟢';
      case 'needs-improvement': return '🟡';
      case 'poor': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <>
      {/* Toggle Button - moved to left */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px', // Changed from right to left
          zIndex: 1000,
          padding: '12px',
          backgroundColor: '#374151',
          color: '#F3F4F6',
          border: '1px solid #4B5563',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease',
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#4B5563';
          e.target.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#374151';
          e.target.style.transform = 'scale(1)';
        }}
      >
        📊
      </button>
      
      {/* Web Vitals Panel - moved to left */}
      {isVisible && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '20px', // Changed from right to left
          zIndex: 1000,
          backgroundColor: '#1F2937',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
          minWidth: '260px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          {/* Header with Close Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <h4 style={{
              margin: '0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#F3F4F6'
            }}>
              🚀 Web Vitals
            </h4>
            <button
              onClick={() => setIsVisible(false)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#374151';
                e.target.style.color = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#9CA3AF';
              }}
            >
              ×
            </button>
          </div>


          {/* Metrics */}
          {Object.entries(vitals)
            .sort(([a], [b]) => ['FCP', 'LCP', 'FID', 'CLS', 'TTFB'].indexOf(a) - ['FCP', 'LCP', 'FID', 'CLS', 'TTFB'].indexOf(b))
            .map(([name, data]) => (
            <div key={name} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              padding: '10px 12px',
              backgroundColor: '#374151',
              borderRadius: '8px',
              border: `2px solid ${getRatingColor(data.rating)}40`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>
                  {getRatingEmoji(data.rating)}
                </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#D1D5DB'
                }}>
                  {name}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  color: getRatingColor(data.rating),
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {data.value}{data.unit}
                </span>
                <span style={{
                  fontSize: '12px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  backgroundColor: getRatingColor(data.rating),
                  color: '#FFFFFF',
                  fontWeight: '600'
                }}>
                  {getRatingBadge(data.rating)}
                </span>
              </div>
            </div>
          ))}

          {/* Footer */}
          <div style={{
            marginTop: '15px',
            paddingTop: '12px',
            borderTop: '1px solid #374151',
            fontSize: '11px',
            color: '#6B7280',
            textAlign: 'center'
          }}>
            🔄 Live metrics • Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}
    </>
  );
};

export default WebVitalsDisplay;
