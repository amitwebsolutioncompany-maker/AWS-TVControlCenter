import { create } from 'zustand';
import { DeploymentJob } from '../types';

interface DeploymentState {
  jobs: DeploymentJob[];
  addJob: (job: DeploymentJob) => void;
  updateJob: (jobId: string, updates: Partial<DeploymentJob>) => void;
  removeJob: (jobId: string) => void;
  clearJobs: () => void;
  getJob: (jobId: string) => DeploymentJob | undefined;
}

export const useDeploymentStore = create<DeploymentState>((set, get) => ({
  jobs: [],
  addJob: (job) => set((state) => ({ jobs: [...state.jobs, job] })),
  updateJob: (jobId, updates) => set((state) => ({
    jobs: state.jobs.map(j => j.id === jobId ? { ...j, ...updates } : j)
  })),
  removeJob: (jobId) => set((state) => ({ jobs: state.jobs.filter(j => j.id !== jobId) })),
  clearJobs: () => set({ jobs: [] }),
  getJob: (jobId) => get().jobs.find(j => j.id === jobId),
}));
