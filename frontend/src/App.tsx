import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { MainPage } from './pages/MainPage';
import { JobPage } from './pages/JobPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/job/:jobId" element={<JobPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;