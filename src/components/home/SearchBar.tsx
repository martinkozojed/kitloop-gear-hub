
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const SearchBar = () => {
  return (
    <div className="flex flex-col sm:flex-row w-full max-w-3xl mx-auto gap-2">
      <div className="relative flex-grow">
        <Input 
          placeholder="What gear do you need?" 
          className="pl-10 py-6 bg-white/90 backdrop-blur-sm border-kitloop-medium-gray focus:border-kitloop-accent"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
      </div>
      <div className="relative flex-grow">
        <Input 
          placeholder="Where? (City or postal code)" 
          className="pl-10 py-6 bg-white/90 backdrop-blur-sm border-kitloop-medium-gray focus:border-kitloop-accent"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
      <Button className="bg-kitloop-accent hover:bg-kitloop-accent-hover text-kitloop-text py-6 px-8 whitespace-nowrap">
        Search
      </Button>
    </div>
  );
};

export default SearchBar;
