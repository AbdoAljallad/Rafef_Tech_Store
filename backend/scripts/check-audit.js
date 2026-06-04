(async ()=>{
  await (await import('dotenv')).config();
  const mysql = await import('mysql2/promise');
  const host = process.env.MYSQL_HOST || 'localhost';
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'rafef_tech';
  const conn = await mysql.createPool({ host, port, user, password, database });
  try{
    const [rows] = await conn.execute('SELECT id, action_code, module, entity_type, entity_id, created_at FROM auth_audit_log WHERE module = ? ORDER BY id DESC LIMIT 20', ['creative']);
    console.log('auditRows', JSON.stringify(rows, null, 2));
  }finally{ await conn.end(); }
})();
