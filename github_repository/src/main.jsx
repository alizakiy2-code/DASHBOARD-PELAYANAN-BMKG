import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.jsx' // Impor App dari app.jsx yang sudah di src
// import './index.css' // Buka ini jika kamu punya file CSS nanti

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)