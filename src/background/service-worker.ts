interface ActivateTabMessage {
  type: 'PINPOINT_ACTIVATE_TAB';
  tabId: number;
  windowId?: number;
}

type RuntimeMessage = ActivateTabMessage;

const extApi: typeof chrome | undefined =
  globalThis.chrome ??
  (globalThis as unknown as { browser?: typeof chrome }).browser;

extApi?.runtime?.onInstalled?.addListener(() => {
  const sidePanelApi = (
    extApi as unknown as Record<
      string,
      { setPanelBehavior?: (opts: { openPanelOnActionClick: boolean }) => Promise<void> } | undefined
    >
  )?.['sidePanel'];
  if (sidePanelApi?.setPanelBehavior) {
    sidePanelApi.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
});

extApi?.runtime?.onMessage?.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message?.type === 'PINPOINT_ACTIVATE_TAB' && typeof message.tabId === 'number') {
    (async () => {
      try {
        await extApi.tabs.update(message.tabId, { active: true });
        if (typeof message.windowId === 'number' && extApi.windows?.update) {
          await extApi.windows.update(message.windowId, { focused: true });
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
