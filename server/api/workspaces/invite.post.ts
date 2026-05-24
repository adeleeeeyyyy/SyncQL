import { defineEventHandler, createError, readBody } from 'h3';
import { queryOne, exec } from '../../utils/db';
import { getUserFromEvent } from '../../utils/jwt';

export default defineEventHandler(async (event) => {
  const user = getUserFromEvent(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const body = await readBody(event);
  const workspaceId = body.workspaceId;
  const inviteeUsername = body.username?.trim();

  if (!workspaceId || !inviteeUsername) {
    throw createError({ statusCode: 400, statusMessage: 'Workspace ID and Username are required' });
  }

  // 1. Verify that current user is member of the workspace (and has permission, e.g. role is owner or member)
  const checkMember = queryOne(
    `SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?`,
    [workspaceId, user.userId]
  );
  const checkOwner = queryOne(
    `SELECT * FROM workspaces WHERE id = ? AND owner_id = ?`,
    [workspaceId, user.userId]
  );

  if (!checkMember && !checkOwner) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have permission to invite users to this workspace' });
  }

  // 2. Find invitee user by name (username) case-insensitively
  const invitee = queryOne(
    `SELECT * FROM users WHERE LOWER(name) = LOWER(?)`,
    [inviteeUsername]
  );

  if (!invitee) {
    throw createError({ statusCode: 404, statusMessage: `User "${inviteeUsername}" not found. Ask them to sign in first.` });
  }

  // 3. Check if already a member
  const alreadyMember = queryOne(
    `SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?`,
    [workspaceId, invitee.id]
  );

  if (alreadyMember) {
    throw createError({ statusCode: 400, statusMessage: `User "${invitee.name}" is already a member of this workspace.` });
  }

  // 4. Add member
  exec(
    `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)`,
    [workspaceId, invitee.id, 'member']
  );

  return {
    success: true,
    message: `Successfully invited "${invitee.name}" to the workspace!`
  };
});
