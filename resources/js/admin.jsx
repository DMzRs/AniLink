import '../css/app.css'
import { createRoot } from 'react-dom/client'
import App from './admin/App.jsx'

const el = document.getElementById('admin-root')
if (el) createRoot(el).render(<App />)
