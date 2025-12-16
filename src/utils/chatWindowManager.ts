// Chat Window Manager - manages single chat window per goalId

const CHAT_WINDOWS_KEY = 'chat_windows_registry';
const CHAT_DATA_KEY_PREFIX = 'chat_window_data_';

interface ChatWindowData {
  goalId: string;
  userInfo: any;
}

interface WindowRegistry {
  [goalId: string]: {
    windowName: string;
    timestamp: number;
  };
}

// Get window registry from localStorage
const getWindowRegistry = (): WindowRegistry => {
  try {
    const data = localStorage.getItem(CHAT_WINDOWS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// Save window registry to localStorage
const saveWindowRegistry = (registry: WindowRegistry) => {
  localStorage.setItem(CHAT_WINDOWS_KEY, JSON.stringify(registry));
};

// Generate unique window name for a goal
const getWindowName = (goalId: string) => `chat_window_${goalId}`;

// Store chat data for popup to retrieve
export const storeChatData = (goalId: string, userInfo: any) => {
  const data: ChatWindowData = { goalId, userInfo };
  sessionStorage.setItem(`${CHAT_DATA_KEY_PREFIX}${goalId}`, JSON.stringify(data));
};

// Get stored chat data in popup
export const getChatData = (goalId: string): ChatWindowData | null => {
  try {
    const data = sessionStorage.getItem(`${CHAT_DATA_KEY_PREFIX}${goalId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// Clear chat data after use
export const clearChatData = (goalId: string) => {
  sessionStorage.removeItem(`${CHAT_DATA_KEY_PREFIX}${goalId}`);
};

// Register a window as open
export const registerChatWindow = (goalId: string) => {
  const registry = getWindowRegistry();
  registry[goalId] = {
    windowName: getWindowName(goalId),
    timestamp: Date.now(),
  };
  saveWindowRegistry(registry);
};

// Unregister a window when closed
export const unregisterChatWindow = (goalId: string) => {
  const registry = getWindowRegistry();
  delete registry[goalId];
  saveWindowRegistry(registry);
};

// Check if a chat window is already open
export const isChatWindowOpen = (goalId: string): boolean => {
  const registry = getWindowRegistry();
  return !!registry[goalId];
};

// Open or focus chat window - returns true if successfully opened/focused
export const openOrFocusChatWindow = (
  goalId: string,
  userInfo: any,
  onOpenSuccess?: () => void,
  onNotExisted?: () => void,
  justCheck?: boolean
): Window | null => {
  const windowName = getWindowName(goalId);
  const registry = getWindowRegistry();
  
  // Store data for the popup to retrieve
  storeChatData(goalId, userInfo);
  
  // Try to focus existing window first
  if (registry[goalId]) {
    try {
      // Try to open with the same name - if window exists, it will focus it
      const existingWin = window.open('', windowName);
      
      if (existingWin && !existingWin.closed && existingWin.location.href !== 'about:blank') {
        existingWin.focus();
        return existingWin;
      }
    } catch (e) {
      // Window might be closed or inaccessible, continue to open new one
      console.log('Could not focus existing window, opening new one');
    }
  }

  if(justCheck){
    onNotExisted?.();
    return;
  }
  
  // Open new window with cleaner URL (only goalId)
  const newWindow = window.open(
    `/chat-popup?g=${goalId}`,
    windowName,
    'width=400,height=600,resizable=yes,scrollbars=yes'
  );
  
  if (newWindow) {
    // Register the window
    registerChatWindow(goalId);
    onOpenSuccess?.();
    
    // Listen for window close to unregister
    const checkClosed = setInterval(() => {
      if (newWindow.closed) {
        unregisterChatWindow(goalId);
        clearInterval(checkClosed);
      }
    }, 1000);
  }
  
  return newWindow;
};

// Broadcast channel for cross-tab communication
let broadcastChannel: BroadcastChannel | null = null;

export const initBroadcastChannel = (onMessage: (data: any) => void) => {
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel('chat_window_channel');
    broadcastChannel.onmessage = (event) => onMessage(event.data);
  }
  return broadcastChannel;
};

export const broadcastChatClosed = (goalId: string) => {
  broadcastChannel?.postMessage({ type: 'CHAT_WINDOW_CLOSED', goalId });
};

export const broadcastChatOpened = (goalId: string) => {
  broadcastChannel?.postMessage({ type: 'CHAT_WINDOW_OPENED', goalId });
};
