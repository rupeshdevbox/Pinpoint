interface ActivateTabMessage {
  type: 'PINPOINT_ACTIVATE_TAB';
  tabId: number;
  windowId?: number;
}

type RuntimeMessage = ActivateTabMessage;

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message?.type === 'PINPOINT_ACTIVATE_TAB' && typeof message.tabId === 'number') {
    (async () => {
      try {
        await chrome.tabs.update(message.tabId, { active: true });
        if (typeof message.windowId === 'number' && chrome.windows?.update) {
          await chrome.windows.update(message.windowId, { focused: true });
        }
        sendResponse({ ok: true });
      } catch {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }
  return false;
});
