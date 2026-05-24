import { defineEventHandler, getRouterParam, createError } from 'h3';
import { exec, queryOne } from '../../utils/db';
import { getUserFromEvent } from '../../utils/jwt';

export default defineEventHandler((event) => {
  const user = getUserFromEvent(event);
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized. Please log in first.'
    });
  }
  
  const diagramId = getRouterParam(event, 'id');
  if (!diagramId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Diagram ID parameter is missing.'
    });
  }
  
  // Fetch and verify permissions
  const diagram = queryOne('SELECT * FROM diagrams WHERE id = ?', [diagramId]);
  
  if (!diagram) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Diagram not found.'
    });
  }

  let canDelete = diagram.user_id === user.userId;

  if (!canDelete && diagram.workspace_id) {
    const isWorkspaceOwner = queryOne(
      `SELECT * FROM workspaces WHERE id = ? AND owner_id = ?`,
      [diagram.workspace_id, user.userId]
    );
    if (isWorkspaceOwner) {
      canDelete = true;
    }
  }

  if (!canDelete) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden. You do not have permission to delete this diagram.'
    });
  }
  
  exec('DELETE FROM diagrams WHERE id = ?', [diagramId]);
  
  return {
    success: true,
    message: 'Diagram deleted successfully.'
  };
});
