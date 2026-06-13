import { toast } from 'sonner';

export interface ReportBugContext {
  prefillTitle: string;
  prefillDescription: string;
}

// Set by the root layout — called when a 5xx or unexpected error is caught
let _openReportModal: ((ctx: ReportBugContext) => void) | null = null;

export function registerReportModalOpener(fn: (ctx: ReportBugContext) => void) {
  _openReportModal = fn;
}

export function showErrorWithReport(message: string, featureContext: string) {
  const snippet = message.length > 80 ? message.slice(0, 77) + '…' : message;
  toast.error(`Something went wrong: ${snippet}`, {
    action: _openReportModal
      ? {
          label: 'Report this',
          onClick: () =>
            _openReportModal!({
              prefillTitle: `[Auto] ${featureContext}`,
              prefillDescription: message,
            }),
        }
      : undefined,
    duration: 8000,
  });
}

export async function wrapSupabaseCall<T>(
  promise: Promise<{ data: T; error: any }>,
  featureContext: string
): Promise<{ data: T; error: any }> {
  const result = await promise;
  if (result.error) {
    const status = result.error?.status;
    // Only surface 5xx and errors without a status (unexpected)
    if (!status || status >= 500) {
      showErrorWithReport(result.error.message || 'Unknown server error', featureContext);
    }
  }
  return result;
}
