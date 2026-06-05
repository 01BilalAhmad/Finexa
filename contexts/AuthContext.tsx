import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { StorageService } from '@/services/storage';
import { setAuthToken } from '@/services/api';
import { User, Company } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  selectedCompany: Company | null;
  distributorPhone: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setSelectedCompany: (company: Company) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [distributorPhone, setDistributorPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const [cachedUser, cachedToken, cachedCompanyId] = await Promise.all([
        StorageService.getUser(),
        StorageService.getToken(),
        StorageService.getSelectedCompany(),
      ]);
      if (cachedUser && cachedToken) {
        setUser(cachedUser);
        setToken(cachedToken);
        setAuthToken(cachedToken);
        const companyId = cachedCompanyId || cachedUser.companies[0]?.id;
        const company = cachedUser.companies.find(c => c.id === companyId) || cachedUser.companies[0];
        if (company) {
          setSelectedCompanyState(company);
          setDistributorPhone(company.distributorPhone || '');
        }
      }
    } catch (e) {
      console.warn('Session restore error', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(newUser: User, newToken: string) {
    setUser(newUser);
    setToken(newToken);
    setAuthToken(newToken);
    const company = newUser.companies[0] || null;
    setSelectedCompanyState(company);
    if (company) setDistributorPhone(company.distributorPhone || '');
    await Promise.all([
      StorageService.saveUser(newUser),
      StorageService.saveToken(newToken),
      company ? StorageService.saveSelectedCompany(company.id) : Promise.resolve(),
    ]);
  }

  async function logout() {
    setUser(null);
    setToken(null);
    setSelectedCompanyState(null);
    setDistributorPhone('');
    setAuthToken(null);
    await StorageService.clearSession();
  }

  async function setSelectedCompany(company: Company) {
    setSelectedCompanyState(company);
    setDistributorPhone(company.distributorPhone || '');
    await StorageService.saveSelectedCompany(company.id);
  }

  function updateUser(updates: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    StorageService.saveUser(updated);
  }

  return (
    <AuthContext.Provider value={{
      user, token, selectedCompany, distributorPhone,
      isAuthenticated: !!(user && token),
      isLoading,
      login, logout, setSelectedCompany, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
