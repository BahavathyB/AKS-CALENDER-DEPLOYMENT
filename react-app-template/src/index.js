import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals, { 
  sendToGoogleAnalytics, 
  sendToAnalytics, 
  logWebVitals 
} from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Choose your reporting strategy
if (process.env.NODE_ENV === 'development') {
  // Enhanced logging in development
  reportWebVitals(logWebVitals);
} else {
  // Send to analytics in production
  reportWebVitals(sendToAnalytics);
  
  // Also send to Google Analytics if available
  // reportWebVitals(sendToGoogleAnalytics);
}
