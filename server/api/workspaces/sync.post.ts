export default defineEventHandler(async (event) => {
  const payload = await readBody<{ workspaceCode?: string }>(event);
  if (!/^ROAM-[A-Z2-9]{6}$/.test(payload?.workspaceCode ?? "")) {
    throw createError({ statusCode: 403, statusMessage: "Workspace code not recognized" });
  }
  return { syncedAt: new Date().toISOString() };
});
