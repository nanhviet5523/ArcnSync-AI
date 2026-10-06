import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Logo } from '@/components/common/Logo';

interface HeaderProps {
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLoginClick, onSignUpClick }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-12 py-4 bg-white border-b border-slate-100">
      <div className="cursor-pointer" onClick={() => navigate('/')}>
        <Logo size={32} />
      </div>

      <nav className="flex gap-8 text-sm font-medium text-slate-700">
        <a href="#home" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="font-semibold text-blue-600">Home</a>
        <a href="#service" className="text-slate-600 hover:text-slate-900 transition">Service</a>
        <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition">How It Works</a>
        <a href="#our-team" className="text-slate-600 hover:text-slate-900 transition">Our Team</a>
        <a href="#our-work" className="text-slate-600 hover:text-slate-900 transition">Our Work</a>
        <a href="#partners" className="text-slate-600 hover:text-slate-900 transition">Partners</a>
      </nav>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onLoginClick}>
          Login
        </Button>
        <Button variant="primary" onClick={onSignUpClick}>
          Sign Up
        </Button>
      </div>
    </header>
  );
};

export default Header;