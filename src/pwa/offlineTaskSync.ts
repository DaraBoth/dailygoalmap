// Utility for sending offline task operations to the service worker

export function saveTaskForOfflineSync(taskData, operation = 'create') {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SAVE_FOR_SYNC',
      task: {
        operation,
        taskData,
      },
    });
  } else {
    console.warn('No active service worker controller for offline sync');
  }
}

export function attemptSyncNow() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'ATTEMPT_SYNC_NOW' });
  }
}

// Listen for sync completion
export function onSyncCompleted(callback) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_COMPLETED') {
      callback(event.data);
    }
  });
}
