import { defineEventHandler, createError, getQuery } from 'h3';
import { query, queryOne } from '../../utils/db';
import { getUserFromEvent } from '../../utils/jwt';

export default defineEventHandler((event) => {
  const user = getUserFromEvent(event);
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized. Please log in first.'
    });
  }

  const { workspaceId } = getQuery(event) as { workspaceId?: string };
  
  if (!workspaceId) {
    // Backwards compatibility fallback: get all diagrams owned by user
    const diagrams = query(
      'SELECT * FROM diagrams WHERE user_id = ? ORDER BY updated_at DESC',
      [user.userId]
    );
    return {
      diagrams
    };
  }

  // Security guard: verify user is a member/owner of the workspace
  const isMember = queryOne(
    `SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?`,
    [workspaceId, user.userId]
  );
  const isOwner = queryOne(
    `SELECT * FROM workspaces WHERE id = ? AND owner_id = ?`,
    [workspaceId, user.userId]
  );

  if (!isMember && !isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have access to this workspace.'
    });
  }

  const diagrams = query(
    'SELECT * FROM diagrams WHERE workspace_id = ? ORDER BY updated_at DESC',
    [workspaceId]
  );
  
  return {
    diagrams
  };
});
