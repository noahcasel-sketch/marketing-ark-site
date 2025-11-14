'use client';

import { CheckCircle, XCircle, RotateCw } from 'lucide-react';

export function ApproveButton({ repId }: { repId: string }) {
  return (
    <form action={`/portal/api/reps/approve?id=${repId}`} method="post">
      <button type="submit" className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm">
        <CheckCircle className="h-4 w-4" /> Approve
      </button>
    </form>
  );
}

export function DeactivateButton({ repId }: { repId: string }) {
  return (
    <form action={`/portal/api/reps/deactivate?id=${repId}`} method="post">
      <button type="submit" className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm">
        <XCircle className="h-4 w-4" /> Deactivate
      </button>
    </form>
  );
}

export function ResendResetButton({ email }: { email: string }) {
  return (
    <form action={`/portal/api/reps/resend?email=${encodeURIComponent(email)}`} method="post">
      <button type="submit" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
        <RotateCw className="h-4 w-4" /> Resend Reset
      </button>
    </form>
  );
}
