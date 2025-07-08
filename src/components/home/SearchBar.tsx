
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SearchBar = () => {
  const [gearQuery, setGearQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build the query parameters
    const params = new URLSearchParams();
    if (gearQuery) params.append("query", gearQuery);
    if (locationQuery) params.append("location", locationQuery);
    
    // Navigate to browse page with search parameters
    navigate(`/browse?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row w-full max-w-3xl mx-auto gap-2">
      <div className="relative flex-grow">
        <Input 
          placeholder={t('hero.search_placeholder')} 
          className="pl-10 py-6 bg-white/90 backdrop-blur-sm border-kitloop-medium-gray focus:border-green-600"
          value={gearQuery}
          onChange={(e) => setGearQuery(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
      </div>
      <div className="relative flex-grow">
        <Input 
          placeholder={t('hero.location_placeholder')} 
          className="pl-10 py-6 bg-white/90 backdrop-blur-sm border-kitloop-medium-gray focus:border-green-600"
          value={locationQuery}
          onChange={(e) => setLocationQuery(e.target.value)}
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
      <Button
        type="submit"
        variant="primary"
        aria-label={t('hero.cta')}
        className="py-6 px-10 text-lg md:text-xl shadow-lg whitespace-nowrap"
      >
        {t('hero.cta')}
      </Button>
    </form>
  );
};

export default SearchBar;
