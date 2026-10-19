import { NotificationProvider } from './components/common/Notification';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppRouter } from './router/AppRouter';
import './App.css';

export function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppRouter />
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
