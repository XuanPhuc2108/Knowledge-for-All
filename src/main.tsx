import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// 1. Thêm dòng import này ở trên cùng:
import { Analytics } from '@vercel/analytics/react' 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {/* 2. Thêm thẻ này ngay dưới <App /> */}
    <Analytics /> 
  </React.StrictMode>,
)
