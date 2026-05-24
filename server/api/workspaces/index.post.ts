import { defineEventHandler, createError, readBody } from 'h3';
import { exec } from '../../utils/db';
import { getUserFromEvent } from '../../utils/jwt';

export default defineEventHandler(async (event) => {
  const user = getUserFromEvent(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const body = await readBody(event);
  const name = body.name?.trim();

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Workspace name is required' });
  }

  const workspaceId = crypto.randomUUID();

  exec(
    `INSERT INTO workspaces (id, name, owner_id) VALUES (?, ?, ?)`,
    [workspaceId, name, user.userId]
  );

  exec(
    `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)`,
    [workspaceId, user.userId, 'owner']
  );

  return {
    success: true,
    workspace: {
      id: workspaceId,
      name,
      owner_id: user.userId
    }
  };
});
