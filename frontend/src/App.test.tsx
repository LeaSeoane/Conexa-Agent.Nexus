import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Mock the components to avoid testing implementation details
jest.mock('./components/Header', () => ({
  Header: () => <div data-testid="header">Header</div>
}));

jest.mock('./pages/MainPage', () => ({
  MainPage: () => <div data-testid="main-page">Main Page</div>
}));

jest.mock('./pages/JobPage', () => ({
  JobPage: () => <div data-testid="job-page">Job Page</div>
}));

const renderApp = (initialPath = '/') => {
  window.history.pushState({}, 'Test page', initialPath);
  
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

describe('App', () => {
  it('renders header and main page by default', () => {
    renderApp();
    
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('main-page')).toBeInTheDocument();
  });

  it('renders job page for job route', () => {
    renderApp('/job/test-job-id');
    
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('job-page')).toBeInTheDocument();
  });
});