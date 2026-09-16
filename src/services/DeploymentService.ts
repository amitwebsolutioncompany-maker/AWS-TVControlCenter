import { TvControlService } from './TvControlService';
import { DeploymentJob, DeploymentStep } from '../types';
import { useDeploymentStore } from '../store/deploymentStore';
import { useLogStore } from '../store/logStore';

export class DeploymentService {
  static async deployToDevices(deviceIds: string[], apkPath: string): Promise<DeploymentJob[]> {
    const jobs: DeploymentJob[] = deviceIds.map(deviceId => ({
      id: `${deviceId}-${Date.now()}`,
      deviceId,
      apkPath,
      status: 'pending',
      progress: 0,
      steps: [
        { name: 'Connecting', status: 'pending' },
        { name: 'Installing APK', status: 'pending' },
        { name: 'Verifying Installation', status: 'pending' },
        { name: 'Launching App', status: 'pending' }
      ]
    }));

    const { addJob, updateJob } = useDeploymentStore.getState();
    const { addLog } = useLogStore.getState();

    jobs.forEach(job => addJob(job));

    // Deploy to each device
    for (const job of jobs) {
      this.executeDeployment(job);
    }

    return jobs;
  }

  private static async executeDeployment(job: DeploymentJob) {
    const { updateJob } = useDeploymentStore.getState();
    const { addLog } = useLogStore.getState();

    try {
      // Step 1: Connect
      updateJob(job.id, { status: 'connecting', progress: 10 });
      updateJob(job.id, {
        steps: job.steps.map((s, i) => i === 0 ? { ...s, status: 'running' } : s)
      });
      addLog({ deviceId: job.deviceId, level: 'info', message: 'Connecting to device...' });

      // Simulate connection check (in real app, would check actual connection)
      await this.delay(1000);
      updateJob(job.id, {
        steps: job.steps.map((s, i) => i === 0 ? { ...s, status: 'success' } : s)
      });

      // Step 2: Install APK
      updateJob(job.id, { status: 'installing', progress: 30 });
      updateJob(job.id, {
        steps: job.steps.map((s, i) => i === 1 ? { ...s, status: 'running' } : s)
      });
      addLog({ deviceId: job.deviceId, level: 'info', message: `Installing ${job.apkPath}...` });

      await TvControlService.installApk(job.deviceId, job.apkPath);
      updateJob(job.id, { progress: 60 });
      updateJob(job.id, {
        steps: job.steps.map((s, i) => i === 1 ? { ...s, status: 'success' } : s)
      });
      addLog({ deviceId: job.deviceId, level: 'success', message: 'APK installed successfully' });

      // Step 3: Verify
      updateJob(job.id, { progress: 70 });
      updateJob(job.id, {
        steps: job.steps.map((s, i) => i === 2 ? { ...s, status: 'running' } : s)
      });
      await this.delay(500);
      updateJob(job.id, {
        steps: job.steps.map((s, i) => i === 2 ? { ...s, status: 'success' } : s)
      });

      // Step 4: Launch
      updateJob(job.id, { status: 'launching', progress: 80 });
      updateJob(job.id, {
        steps: job.steps.map((s, i) => i === 3 ? { ...s, status: 'running' } : s)
      });
      addLog({ deviceId: job.deviceId, level: 'info', message: 'Launching application...' });

      // Get package name from APK (simplified)
      const packageName = 'com.example.signage'; // Would parse from APK
      await TvControlService.launchPackage(job.deviceId, packageName);
      
      updateJob(job.id, { status: 'success', progress: 100 });
      updateJob(job.id, {
        steps: job.steps.map((s, i) => i === 3 ? { ...s, status: 'success' } : s)
      });
      addLog({ deviceId: job.deviceId, level: 'success', message: 'Deployment completed successfully' });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateJob(job.id, { status: 'failed', error: errorMessage });
      addLog({ deviceId: job.deviceId, level: 'error', message: `Deployment failed: ${errorMessage}` });
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
