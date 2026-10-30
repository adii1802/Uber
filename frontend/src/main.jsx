import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom';
import UserContext from './context/UserContext.jsx';
import CaptainContext from './context/CaptainContext.jsx';
import axios from 'axios';

// Enable credentialed HTTP-only cookies and CSRF double-submit token handling globally
axios.defaults.withCredentials = true;
axios.defaults.withXSRFToken = true;

createRoot(document.getElementById('root')).render(
  <StrictMode>
   <CaptainContext>
      <UserContext>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </UserContext>
   </CaptainContext>
  </StrictMode>,
)
