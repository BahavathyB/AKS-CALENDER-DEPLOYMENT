const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    }).catch(error => {
      console.error('Failed to load web-vitals library:', error);
    });
  }
};

// Enhanced logging for development with color coding
export const logWebVitals = (metric) => {
  const { name, value, rating, delta, id } = metric;
  
  // Color coding based on rating
  const colors = {
    good: '#0CCE6B',
    'needs-improvement': '#FFA400',
    poor: '#FF4E42'
  };
  
  // Format value based on metric type
  const formatValue = (name, value) => {
    if (name === 'CLS') {
      return value.toFixed(3);
    }
    return Math.round(value) + 'ms';
  };
  
  console.groupCollapsed(
    `%c${name}: ${formatValue(name, value)} (${rating})`,
    `color: ${colors[rating]}; font-weight: bold; font-size: 14px;`
  );
  
  console.log('Value:', formatValue(name, value));
  console.log('Rating:', rating);
  console.log('Delta:', delta);
  console.log('ID:', id);
  console.log('Timestamp:', new Date().toISOString());
  
  // Provide improvement suggestions for poor ratings
  if (rating === 'poor') {
    const suggestions = {
      CLS: 'Consider fixing layout shifts by reserving space for images and ads',
      FID: 'Reduce JavaScript execution time and break up long tasks',
      FCP: 'Optimize server response time and eliminate render-blocking resources',
      LCP: 'Optimize images, preload key resources, and improve server response time',
      TTFB: 'Optimize server response time and use a CDN'
    };
    
    console.warn(`💡 Suggestion: ${suggestions[name]}`);
  }
  
  console.groupEnd();
};

// Send to Google Analytics
export const sendToGoogleAnalytics = (metric) => {
  // Check if gtag is available (Google Analytics 4)
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      custom_parameter_rating: metric.rating,
      non_interaction: true,
    });
  }
  // Check if ga is available (Universal Analytics - legacy)
  else if (typeof window.ga !== 'undefined') {
    window.ga('send', 'event', {
      eventCategory: 'Web Vitals',
      eventAction: metric.name,
      eventValue: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      eventLabel: metric.id,
      nonInteraction: true,
    });
  } else {
    console.warn('Google Analytics not available - Web Vitals not sent');
  }
};

// Send to custom analytics endpoint
export const sendToAnalytics = async (metric) => {
  // Only send in production unless explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.REACT_APP_SEND_VITALS) {
    logWebVitals(metric);
    return;
  }

  try {
    const payload = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      // Additional context
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: {
        effectiveType: navigator.connection?.effectiveType || 'unknown',
        downlink: navigator.connection?.downlink || null,
        rtt: navigator.connection?.rtt || null
      },
      deviceMemory: navigator.deviceMemory || null,
      hardwareConcurrency: navigator.hardwareConcurrency || null
    };

    const response = await fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      // Don't retry on failure to avoid impacting user experience
      keepalive: true
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Optional: log success in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Web Vital ${metric.name} sent successfully`);
    }
  } catch (error) {
    // Fail silently in production to not impact user experience
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to send web vitals:', error);
    }
  }
};

// Send to multiple analytics services
export const sendToMultipleServices = (metric) => {
  // Send to Google Analytics
  sendToGoogleAnalytics(metric);
  
  // Send to custom endpoint
  sendToAnalytics(metric);
  
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    logWebVitals(metric);
  }
};

// Create a custom reporter that can handle multiple destinations
export const createMultiReporter = (...reporters) => {
  return (metric) => {
    reporters.forEach(reporter => {
      try {
        if (typeof reporter === 'function') {
          reporter(metric);
        }
      } catch (error) {
        console.error('Web Vitals reporter failed:', error);
      }
    });
  };
};

// Batch reporter for sending multiple metrics at once
export const createBatchReporter = (batchSize = 5, flushInterval = 10000) => {
  let batch = [];
  let timeoutId = null;

  const flush = async () => {
    if (batch.length === 0) return;
    
    const metricsToSend = [...batch];
    batch = [];
    
    try {
      await fetch('/api/analytics/web-vitals-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: metricsToSend,
          timestamp: Date.now(),
          url: window.location.href
        }),
        keepalive: true
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send batched web vitals:', error);
      }
    }
  };

  const scheduleFlush = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(flush, flushInterval);
  };

  return (metric) => {
    batch.push({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now()
    });

    // Flush immediately if batch is full
    if (batch.length >= batchSize) {
      flush();
    } else {
      scheduleFlush();
    }

    // Also flush on page unload
    window.addEventListener('beforeunload', flush, { once: true });
  };
};

// Performance budget checker
export const createBudgetChecker = (budgets = {}) => {
  const defaultBudgets = {
    CLS: 0.1,
    FID: 100,
    FCP: 1800,
    LCP: 2500,
    TTFB: 800
  };

  const activeBudgets = { ...defaultBudgets, ...budgets };

  return (metric) => {
    const budget = activeBudgets[metric.name];
    if (budget && metric.value > budget) {
      console.warn(
        `🚨 Performance Budget Exceeded: ${metric.name} is ${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'}, budget is ${budget}${metric.name === 'CLS' ? '' : 'ms'}`
      );
      
      // Send budget violation to analytics
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'performance_budget_exceeded', {
          event_category: 'Performance',
          event_label: metric.name,
          value: Math.round(metric.value),
          custom_parameter_budget: budget
        });
      }
    }
  };
};

export default reportWebVitals;
