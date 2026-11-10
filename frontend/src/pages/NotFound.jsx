import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 text-center">
      <h1 className="text-8xl font-black text-indigo-500 tracking-tight">404</h1>
      <h2 className="mt-4 text-2xl font-bold text-white">Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-400 max-w-sm">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <div className="mt-6">
        <Link to="/dashboard">
          <Button variant="primary" icon={Home}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

