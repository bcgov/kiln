import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import "@fontsource/noto-sans"

const match = window.location.pathname.match(/^\/(formfoundry-[^/]+|form)(?:\/|$)/)
const basename = match ? `/${match[1]}` : ''

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
