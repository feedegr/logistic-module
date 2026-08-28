import pool from '../db/pool.js'

export interface Contact {
  id: number
  tangoId: string
  tangoInternalId: number | null
  name: string
  phoneNormalized: string
  email: string | null
  cuit: string | null
  ivaCategory: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  provinceCode: string | null
  deliveryZone: string | null
  sellerCode: string | null
  priceListNumber: string | null
  deliversMonday: boolean
  deliversTuesday: boolean
  deliversWednesday: boolean
  deliversThursday: boolean
  deliversFriday: boolean
  deliversSaturday: boolean
  deliversSunday: boolean
  chatwootContactId: number | null
  optOut: boolean
  noResponseStreak: number
  syncedAt: string
}

export async function fetchAllContacts(): Promise<Contact[]> {
  const { rows } = await pool.query(`
    SELECT
      id,
      tango_id AS "tangoId",
      tango_internal_id AS "tangoInternalId",
      name,
      phone_normalized AS "phoneNormalized",
      email,
      cuit,
      iva_category AS "ivaCategory",
      address,
      city,
      postal_code AS "postalCode",
      province_code AS "provinceCode",
      delivery_zone AS "deliveryZone",
      seller_code AS "sellerCode",
      price_list_number AS "priceListNumber",
      delivers_monday AS "deliversMonday",
      delivers_tuesday AS "deliversTuesday",
      delivers_wednesday AS "deliversWednesday",
      delivers_thursday AS "deliversThursday",
      delivers_friday AS "deliversFriday",
      delivers_saturday AS "deliversSaturday",
      delivers_sunday AS "deliversSunday",
      chatwoot_contact_id AS "chatwootContactId",
      opt_out AS "optOut",
      no_response_streak AS "noResponseStreak",
      synced_at AS "syncedAt"
    FROM contacts
    ORDER BY name ASC
  `)

  return rows
}
