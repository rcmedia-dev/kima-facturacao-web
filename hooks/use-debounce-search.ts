"use client";

import { useState, useEffect, useRef } from "react";

interface UseDebounceSearchResult<T> {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filteredItems: T[];
  isSearching: boolean;
  hasQuery: boolean;
}

/**
 * Hook de pesquisa com debounce e estado de "a pesquisar".
 * Útil para dar feedback visual antes de mostrar os resultados filtrados.
 *
 * @param items - Array de itens a filtrar
 * @param filterFn - Função que recebe um item e o termo de busca e retorna true/false
 * @param delay - Atraso do debounce em ms (default: 300ms)
 */
export function useDebounceSearch<T>(
  items: T[],
  filterFn: (item: T, term: string) => boolean,
  delay = 300
): UseDebounceSearchResult<T> {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTerm === debouncedTerm) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      setIsSearching(false);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchTerm, debouncedTerm, delay]);

  const updateSearchTerm = (value: string) => {
    setSearchTerm(value);
    if (value !== debouncedTerm) setIsSearching(true);
  };

  const filteredItems =
    debouncedTerm.trim() === ""
      ? items
      : items.filter((item) => filterFn(item, debouncedTerm));

  return {
    searchTerm,
    setSearchTerm: updateSearchTerm,
    filteredItems,
    isSearching,
    hasQuery: debouncedTerm.trim().length > 0,
  };
}
