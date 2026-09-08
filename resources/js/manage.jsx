import '../css/app.css'
import { createRoot } from 'react-dom/client'
import App from './manage/App.jsx'

const el = document.getElementById('manage-root')
if (el) createRoot(el).render(<App />)
