import { defineEventHandler, readBody, createError } from 'h3';
import { exec } from '../../utils/db';
import { getUserFromEvent } from '../../utils/jwt';
import crypto from 'crypto';

export default defineEventHandler(async (event) => {
  const user = getUserFromEvent(event);
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized. Please log in first.'
    });
  }
  
  const body = await readBody(event);
  const name = body?.name || 'Untitled Diagram';
  const description = body?.description || '';
  const dialect = body?.dialect || 'postgresql';
  const template = body?.template || 'blank';
  
  const diagramId = crypto.randomUUID();
  
  const workspaceId = body?.workspaceId || null;

  // Insert core diagram record
  exec(
    'INSERT INTO diagrams (id, name, description, user_id, dialect, workspace_id) VALUES (?, ?, ?, ?, ?, ?)',
    [diagramId, name, description, user.userId, dialect, workspaceId]
  );
  
  // Apply templates
  if (template === 'ecommerce') {
    seedEcommerceTemplate(diagramId);
  } else if (template === 'blog') {
    seedBlogTemplate(diagramId);
  }
  
  return {
    success: true,
    diagramId
  };
});

function seedEcommerceTemplate(diagramId: string) {
  // Define Table IDs
  const usersTableId = crypto.randomUUID();
  const ordersTableId = crypto.randomUUID();
  const itemsTableId = crypto.randomUUID();
  
  // Define Column IDs
  const userIdCol = crypto.randomUUID();
  const userEmailCol = crypto.randomUUID();
  const userPasswordCol = crypto.randomUUID();
  const userCreatedCol = crypto.randomUUID();
  
  const orderIdCol = crypto.randomUUID();
  const orderUserIdCol = crypto.randomUUID();
  const orderTotalCol = crypto.randomUUID();
  const orderStatusCol = crypto.randomUUID();
  const orderCreatedCol = crypto.randomUUID();
  
  const itemIdCol = crypto.randomUUID();
  const itemOrderIdCol = crypto.randomUUID();
  const itemNameCol = crypto.randomUUID();
  const itemQtyCol = crypto.randomUUID();
  const itemPriceCol = crypto.randomUUID();
  
  // Insert Tables
  exec('INSERT INTO tables (id, diagram_id, name, color, x, y) VALUES (?, ?, ?, ?, ?, ?)', [
    usersTableId, diagramId, 'users', 'table-theme-violet', 150, 150
  ]);
  exec('INSERT INTO tables (id, diagram_id, name, color, x, y) VALUES (?, ?, ?, ?, ?, ?)', [
    ordersTableId, diagramId, 'orders', 'table-theme-emerald', 480, 150
  ]);
  exec('INSERT INTO tables (id, diagram_id, name, color, x, y) VALUES (?, ?, ?, ?, ?, ?)', [
    itemsTableId, diagramId, 'order_items', 'table-theme-blue', 800, 150
  ]);
  
  // Insert Columns: users table
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', [
    userIdCol, usersTableId, 'id', 'INT', null, 1, 0, 0, 1
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [
    userEmailCol, usersTableId, 'email', 'VARCHAR', '255', 0, 0, 1, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2)', [
    userPasswordCol, usersTableId, 'password', 'VARCHAR', '255', 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 3)', [
    userCreatedCol, usersTableId, 'created_at', 'TIMESTAMP', null, 0, 1, 0, 0
  ]);
  
  // Insert Columns: orders table
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', [
    orderIdCol, ordersTableId, 'id', 'INT', null, 1, 0, 0, 1
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [
    orderUserIdCol, ordersTableId, 'user_id', 'INT', null, 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2)', [
    orderTotalCol, ordersTableId, 'total', 'DECIMAL', '10,2', 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 3)', [
    orderStatusCol, ordersTableId, 'status', 'VARCHAR', '50', 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 4)', [
    orderCreatedCol, ordersTableId, 'created_at', 'TIMESTAMP', null, 0, 1, 0, 0
  ]);
  
  // Insert Columns: order_items table
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', [
    itemIdCol, itemsTableId, 'id', 'INT', null, 1, 0, 0, 1
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [
    itemOrderIdCol, itemsTableId, 'order_id', 'INT', null, 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2)', [
    itemNameCol, itemsTableId, 'product_name', 'VARCHAR', '255', 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 3)', [
    itemQtyCol, itemsTableId, 'quantity', 'INT', null, 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 4)', [
    itemPriceCol, itemsTableId, 'price', 'DECIMAL', '10,2', 0, 0, 0, 0
  ]);
  
  // Insert Relations
  exec('INSERT INTO relations (id, diagram_id, source_table_id, source_column_id, target_table_id, target_column_id, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    crypto.randomUUID(), diagramId, ordersTableId, orderUserIdCol, usersTableId, userIdCol, '1:N'
  ]);
  exec('INSERT INTO relations (id, diagram_id, source_table_id, source_column_id, target_table_id, target_column_id, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    crypto.randomUUID(), diagramId, itemsTableId, itemOrderIdCol, ordersTableId, orderIdCol, '1:N'
  ]);
}

function seedBlogTemplate(diagramId: string) {
  // Define Table IDs
  const usersTableId = crypto.randomUUID();
  const postsTableId = crypto.randomUUID();
  const commentsTableId = crypto.randomUUID();
  
  // Define Column IDs
  const userIdCol = crypto.randomUUID();
  const userNameCol = crypto.randomUUID();
  const userEmailCol = crypto.randomUUID();
  
  const postIdCol = crypto.randomUUID();
  const postAuthorIdCol = crypto.randomUUID();
  const postTitleCol = crypto.randomUUID();
  const postContentCol = crypto.randomUUID();
  const postStatusCol = crypto.randomUUID();
  
  const commentIdCol = crypto.randomUUID();
  const commentPostIdCol = crypto.randomUUID();
  const commentAuthorCol = crypto.randomUUID();
  const commentContentCol = crypto.randomUUID();
  
  // Insert Tables
  exec('INSERT INTO tables (id, diagram_id, name, color, x, y) VALUES (?, ?, ?, ?, ?, ?)', [
    usersTableId, diagramId, 'users', 'table-theme-rose', 150, 150
  ]);
  exec('INSERT INTO tables (id, diagram_id, name, color, x, y) VALUES (?, ?, ?, ?, ?, ?)', [
    postsTableId, diagramId, 'posts', 'table-theme-amber', 480, 150
  ]);
  exec('INSERT INTO tables (id, diagram_id, name, color, x, y) VALUES (?, ?, ?, ?, ?, ?)', [
    commentsTableId, diagramId, 'comments', 'table-theme-emerald', 800, 150
  ]);
  
  // Insert Columns: users
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', [
    userIdCol, usersTableId, 'id', 'INT', null, 1, 0, 0, 1
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [
    userNameCol, usersTableId, 'username', 'VARCHAR', '100', 0, 0, 1, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2)', [
    userEmailCol, usersTableId, 'email', 'VARCHAR', '255', 0, 0, 1, 0
  ]);
  
  // Insert Columns: posts
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', [
    postIdCol, postsTableId, 'id', 'INT', null, 1, 0, 0, 1
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [
    postAuthorIdCol, postsTableId, 'author_id', 'INT', null, 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2)', [
    postTitleCol, postsTableId, 'title', 'VARCHAR', '255', 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 3)', [
    postContentCol, postsTableId, 'content', 'TEXT', null, 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 4)', [
    postStatusCol, postsTableId, 'status', 'VARCHAR', '20', 0, 0, 0, 0
  ]);
  
  // Insert Columns: comments
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', [
    commentIdCol, commentsTableId, 'id', 'INT', null, 1, 0, 0, 1
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [
    commentPostIdCol, commentsTableId, 'post_id', 'INT', null, 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2)', [
    commentAuthorCol, commentsTableId, 'author_name', 'VARCHAR', '100', 0, 0, 0, 0
  ]);
  exec('INSERT INTO columns (id, table_id, name, type, length, is_primary, is_nullable, is_unique, is_auto_increment, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 3)', [
    commentContentCol, commentsTableId, 'content', 'TEXT', null, 0, 0, 0, 0
  ]);
  
  // Insert Relations
  exec('INSERT INTO relations (id, diagram_id, source_table_id, source_column_id, target_table_id, target_column_id, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    crypto.randomUUID(), diagramId, postsTableId, postAuthorIdCol, usersTableId, userIdCol, '1:N'
  ]);
  exec('INSERT INTO relations (id, diagram_id, source_table_id, source_column_id, target_table_id, target_column_id, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    crypto.randomUUID(), diagramId, commentsTableId, commentPostIdCol, postsTableId, postIdCol, '1:N'
  ]);
}
