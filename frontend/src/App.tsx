import { useEffect } from 'react';
import { NotificationProvider } from './components/common/Notification';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppRouter } from './router/AppRouter';
import './App.css';

export function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('scis_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppRouter />
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
