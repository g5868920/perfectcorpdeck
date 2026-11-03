import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme } from './theme';
import './styles.css';

applyTheme();
// Not wrapped in StrictMode: the New Reel screen creates a project on mount, and a double mount would create two.
createRoot(document.getElementById('root')!).render(<App />);
