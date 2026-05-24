import { defineEventHandler, createError, getQuery } from 'h3';
import { query } from '../../utils/db';
import { getUserFromEvent } from '../../utils/jwt';

export default defineEventHandler((event) => {
  const user = getUserFromEvent(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const { workspaceId } = getQuery(event) as { workspaceId?: string };

  if (!workspaceId) {
    throw createError({ statusCode: 400, statusMessage: 'Workspace ID is required' });
  }

  const members = query(
    `SELECT u.id, u.name, u.email, u.avatar_url, 
            CASE WHEN w.owner_id = u.id THEN 'owner' ELSE wm.role END as role
     FROM workspace_members wm
     JOIN users u ON wm.user_id = u.id
     JOIN workspaces w ON wm.workspace_id = w.id
     WHERE wm.workspace_id = ?`,
    [workspaceId]
  );

  return {
    members
  };
});
