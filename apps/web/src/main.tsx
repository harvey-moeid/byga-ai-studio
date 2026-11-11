import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthGate from './AuthGate';
import CreationStudio from './CreationStudio';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AuthGate><><App /><CreationStudio /></></AuthGate></React.StrictMode>
);