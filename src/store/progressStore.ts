import { create } from 'zustand';

interface ProgressState {
  activeOperation: string | null;
  progress: number;
  currentStep: string;
  setProgress: (operation: string, progress: number, step: string) => void;
  clearProgress: () => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
  activeOperation: null,
  progress: 0,
  currentStep: '',
  setProgress: (operation, progress, step) => set({ activeOperation: operation, progress, currentStep: step }),
  clearProgress: () => set({ activeOperation: null, progress: 0, currentStep: '' }),
}));
