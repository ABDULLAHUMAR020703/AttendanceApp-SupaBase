import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { getCompany } from '../../features/company/services/companyService';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reload only when authenticated account or company tenant changes — not on every user object refresh.
  const authUid = user?.uid ?? null;
  const companyId = user?.companyId ?? null;

  const loadCompany = useCallback(async (uid, cid) => {
    if (!uid) {
      setCompany(null);
      setLogoUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getCompany(cid);
      setCompany(data);
      setLogoUrl(data?.logo_url || null);
    } catch (e) {
      console.warn('[CompanyContext] getCompany failed:', e?.message);
      setCompany(null);
      setLogoUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authUid) {
        if (!cancelled) {
          setCompany(null);
          setLogoUrl(null);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setLoading(true);
      try {
        const data = await getCompany(companyId);
        if (!cancelled) {
          setCompany(data);
          setLogoUrl(data?.logo_url || null);
        }
      } catch (e) {
        console.warn('[CompanyContext] getCompany failed:', e?.message);
        if (!cancelled) {
          setCompany(null);
          setLogoUrl(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUid, companyId]);

  const refreshCompany = useCallback(async () => {
    await loadCompany(authUid, companyId);
  }, [loadCompany, authUid, companyId]);

  const value = useMemo(
    () => ({
      company,
      logoUrl,
      loading,
      refreshCompany,
    }),
    [company, logoUrl, loading, refreshCompany]
  );

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

export { CompanyContext };
