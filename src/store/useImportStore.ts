import { create } from 'zustand';

interface ImportState {
  processing: boolean;
  setProcessing: (value: boolean) => void;
}

export const useImportStore = create<ImportState>(set => ({
  processing: false,
  setProcessing: value => set({ processing: value }),
}));
