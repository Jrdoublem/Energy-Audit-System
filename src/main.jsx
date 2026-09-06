import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { flushPendingImages } from './context/offlineImageQueue.js'

// Equipment photos queued while offline (see offlineImageQueue.js) upload as
// soon as a connection is available — on the 'online' transition, and once
// at startup in case the app was reopened after connectivity was already
// back (no transition to catch). Best-effort: failures just stay queued.
flushPendingImages();
window.addEventListener('online', flushPendingImages);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
