import pool from './pool.js'

export async function runMigrations(): Promise<void> {
  try {
    const { rows } = await pool.query('SELECT current_database() AS db, current_user AS usr')
    console.log(`[db] conexión OK -> base "${rows[0].db}" como "${rows[0].usr}"`)

    console.log('[db] iniciando migraciones...')

    // Crear tabla de entregas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id SERIAL PRIMARY KEY,
        vendor_code VARCHAR(50),
        client_code VARCHAR(50),
        company_name VARCHAR(255),
        delivery_address VARCHAR(255),
        locality VARCHAR(100),
        voucher_type VARCHAR(50),
        voucher_number VARCHAR(50),
        total_amount DECIMAL(15, 2),
        packages_qty INTEGER,
        delivery_time VARCHAR(50),
        date_generated DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Crear tabla de cache para clientes de Tango
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tango_clients_cache (
        id SERIAL PRIMARY KEY,
        data JSONB,
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `)

    await pool.query(`
      ALTER TABLE IF EXISTS contacts
        ADD COLUMN IF NOT EXISTS billing_condition TEXT;
    `)

    console.log('[db] migraciones completadas')
  } catch (err) {
    console.error('[db] error en migraciones:', err)
    throw err
  }
}
