export async function downloadPdfAsync(fetchPdfFn) {
  return fetchPdfFn();
}

export function createPdfProgressHandlers(setProgress, setError) {
  return {
    onStart: () => {
      setProgress({ status: "generating", elapsed: 0, startTime: Date.now() });
    },
    onDone: () => {
      setProgress(null);
    },
    onError: (message) => {
      setProgress(null);
      setError(message || "បរាជ័យក្នុងការបង្កើត PDF");
    },
  };
}
