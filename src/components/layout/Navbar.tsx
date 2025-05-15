
import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  const scrollToSection = (sectionId: string) => {
    // If we're not on the home page, navigate there first
    if (window.location.pathname !== '/') {
      navigate('/', { state: { scrollTo: sectionId } });
      return;
    }

    // If we're already on the home page, scroll to the section
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="py-4 px-6 md:px-10 bg-white/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold text-kitloop-text flex items-center">
            <span className="text-kitloop-accent mr-1">Kit</span>loop
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-kitloop-text hover:text-kitloop-accent transition-colors">
            Home
          </Link>
          <button 
            onClick={() => scrollToSection('how-it-works')} 
            className="text-kitloop-text hover:text-kitloop-accent transition-colors"
          >
            How It Works
          </button>
          <Link to="/browse" className="text-kitloop-text hover:text-kitloop-accent transition-colors">
            Browse Gear
          </Link>
          <Link to="/about" className="text-kitloop-text hover:text-kitloop-accent transition-colors">
            About Us
          </Link>
          <button 
            onClick={() => scrollToSection('faq')} 
            className="text-kitloop-text hover:text-kitloop-accent transition-colors"
          >
            FAQ
          </button>
        </nav>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="hidden md:flex" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button className="bg-kitloop-accent hover:bg-kitloop-accent-hover text-kitloop-text" asChild>
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
