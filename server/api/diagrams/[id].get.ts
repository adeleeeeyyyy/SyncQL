import { defineEventHandler, getRouterParam, createError } from 'h3';
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
  
  const diagramId = getRouterParam(event, 'id');
  if (!diagramId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Diagram ID parameter is missing.'
    });
  }
  
  // 1. Fetch Diagram
  const diagram = queryOne('SELECT * FROM diagrams WHERE id = ?', [diagramId]);
  
  if (!diagram) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Diagram not found.'
    });
  }

  // Security Check: Enforce workspace boundaries
  if (diagram.workspace_id) {
    const isMember = queryOne(
      `SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?`,
      [diagram.workspace_id, user.userId]
    );
    const isOwner = queryOne(
      `SELECT * FROM workspaces WHERE id = ? AND owner_id = ?`,
      [diagram.workspace_id, user.userId]
    );
    if (!isMember && !isOwner) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this diagram workspace.'
      });
    }
  } else {
    // Backwards compatibility: verify diagram ownership
    if (diagram.user_id !== user.userId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this diagram.'
      });
    }
  }
  
  // 2. Fetch all Tables
  const tables = query('SELECT * FROM tables WHERE diagram_id = ? ORDER BY name ASC', [diagramId]);
  
  // 3. Fetch all Columns associated with those Tables
  const tableIds = tables.map(t => t.id);
  let columns: any[] = [];
  
  if (tableIds.length > 0) {
    // SQLite doesn't easily support binding variable length arrays in standard prepared statements,
    // so we query for all columns in this diagram by joining with tables.
    columns = query(`
      SELECT c.* FROM columns c
      JOIN tables t ON c.table_id = t.id
      WHERE t.diagram_id = ?
      ORDER BY c.sort_order ASC
    `, [diagramId]);
  }
  
  // 4. Fetch all Relations
  const relations = query('SELECT * FROM relations WHERE diagram_id = ?', [diagramId]);
  
  // 5. Fetch all Notes
  const notes = query('SELECT * FROM notes WHERE diagram_id = ?', [diagramId]);
  
  return {
    diagram,
    tables,
    columns,
    relations,
    notes
  };
});
