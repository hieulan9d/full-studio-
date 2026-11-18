// Hang doi job nen: moi tac vu dai tra job_id, AI hoi trang thai, khong bao gio chan. Xem CHUC-NANG.md F-11.
export type JobState = 'running' | 'done' | 'error' | 'cancelled';

export interface Job {
  id: string;
  type: string;
  state: JobState;
  progress: number; // 0..1
  message?: string;
  result?: unknown;
  error?: string;
  startedAt: number;
  endedAt?: number;
  cancel?: () => void;
}

export class Jobs {
  private map = new Map<string, Job>();
  private n = 0;

  create(type: string, cancel?: () => void): Job {
    const job: Job = { id: `job${++this.n}`, type, state: 'running', progress: 0, startedAt: Date.now(), cancel };
    this.map.set(job.id, job);
    return job;
  }

  get(id: string): Job | undefined {
    return this.map.get(id);
  }

  list(): Job[] {
    return [...this.map.values()];
  }

  done(job: Job, result?: unknown) {
    job.state = 'done';
    job.progress = 1;
    job.result = result;
    job.endedAt = Date.now();
  }

  fail(job: Job, error: string) {
    job.state = job.state === 'cancelled' ? 'cancelled' : 'error';
    job.error = error;
    job.endedAt = Date.now();
  }

  cancel(id: string): boolean {
    const j = this.map.get(id);
    if (!j || j.state !== 'running') return false;
    j.state = 'cancelled';
    j.cancel?.();
    return true;
  }

  /** Ban sao co the gui qua JSON (khong co ham). */
  view(j: Job) {
    const { cancel, ...rest } = j;
    void cancel;
    return rest;
  }
}
