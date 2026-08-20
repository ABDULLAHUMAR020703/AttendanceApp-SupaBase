import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

const PageChromeContext = createContext(null);

export function PageChromeProvider({ children }) {
  const location = useLocation();
  const [actionsNode, setActionsNode] = useState(null);
  const [lead, setLeadState] = useState(null);

  useLayoutEffect(() => {
    setLeadState(null);
  }, [location.pathname]);

  const setLead = useCallback((next) => {
    setLeadState(next || null);
  }, []);

  const value = useMemo(
    () => ({ actionsNode, setActionsNode, lead, setLead }),
    [actionsNode, lead, setLead]
  );

  return <PageChromeContext.Provider value={value}>{children}</PageChromeContext.Provider>;
}

export function usePageChrome() {
  return useContext(PageChromeContext);
}

export function usePageLead(lead) {
  const ctx = useContext(PageChromeContext);
  useLayoutEffect(() => {
    if (!ctx) return undefined;
    ctx.setLead(lead || null);
    return () => ctx.setLead(null);
  }, [ctx, lead]);
}

export function PageActions({ children }) {
  const ctx = useContext(PageChromeContext);
  if (!ctx?.actionsNode || children == null) return null;
  return createPortal(children, ctx.actionsNode);
}
