import { useState, useCallback } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(initialState: T, maxHistory: number = 50) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory((prev) => {
      const nextState = typeof newState === "function" 
        ? (newState as (prev: T) => T)(prev.present)
        : newState;

      // Ne pas ajouter si c'est le même état
      if (JSON.stringify(nextState) === JSON.stringify(prev.present)) {
        return prev;
      }

      return {
        past: [...prev.past, prev.present].slice(-maxHistory),
        present: nextState,
        future: [],
      };
    });
  }, [maxHistory]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      
      const newPast = [...prev.past];
      const newPresent = newPast.pop()!;
      
      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      
      const newFuture = [...prev.future];
      const newPresent = newFuture.shift()!;
      
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    state: history.present,
    setState,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    historyLength: history.past.length,
  };
}
