window.NEVADO_AUTH_READY = (async () => {
  if (!window.Clerk) return null;
  await window.Clerk.load();
  return window.Clerk.user || null;
})();
