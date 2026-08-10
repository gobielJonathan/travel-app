export default defineEventHandler(async (event) => {
  const payload = await readBody<{ workspaceCode?: string }>(event);
  if (payload?.workspaceCode !== "ROAM-LA24-7KQ") {
    throw createError({ statusCode: 403, statusMessage: "Workspace code not recognized" });
  }
  return { syncedAt: new Date().toISOString() };
});
