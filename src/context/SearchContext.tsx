import React, { createContext, useContext, useMemo, useState } from 'react';

type Ctx = {
  query: string;
  setQuery: (q: string) => void;
};

const SearchContext = createContext<Ctx | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useHubSearch(): Ctx {
  const c = useContext(SearchContext);
  if (!c) throw new Error('useHubSearch must be used inside SearchProvider');
  return c;
}
