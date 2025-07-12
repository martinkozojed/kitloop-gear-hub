
import React, { createContext, useState, useContext, useEffect } from 'react';

interface User {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  approved?: boolean;
  isLoggedIn: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Check if user is logged in on component mount
    const storedUser = localStorage.getItem('kitloop_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('kitloop_user');
      }
    }
  }, []);
  
  const login = async (email: string, password: string): Promise<void> => {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const userData = {
          email,
          isLoggedIn: true,
        };
        localStorage.setItem('kitloop_user', JSON.stringify(userData));
        setUser(userData);
        resolve();
      }, 1000);
    });
  };
  
  const logout = () => {
    localStorage.removeItem('kitloop_user');
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout,
      isAuthenticated: !!user?.isLoggedIn
    }}>
      {children}
    </AuthContext.Provider>
  );
};
