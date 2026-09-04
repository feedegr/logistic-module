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
  billingCondition: string | null
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

export interface ContactUpdate {
  name?: string
  address?: string | null
  city?: string | null
  billingCondition?: string | null
  priceListNumber?: string | null
  deliversMonday?: boolean
  deliversTuesday?: boolean
  deliversWednesday?: boolean
  deliversThursday?: boolean
  deliversFriday?: boolean
  deliversSaturday?: boolean
  deliversSunday?: boolean
}

export interface ContactCreate {
  tangoId: string
  name: string
  phoneNormalized: string
  address?: string | null
  city?: string | null
  billingCondition?: string | null
  priceListNumber?: string | null
  deliversMonday?: boolean
  deliversTuesday?: boolean
  deliversWednesday?: boolean
  deliversThursday?: boolean
  deliversFriday?: boolean
  deliversSaturday?: boolean
  deliversSunday?: boolean
}

export async function updateContact(id: number, data: ContactUpdate): Promise<Contact | null> {
  const { rows } = await pool.query<Contact>(
    `UPDATE contacts SET
      name               = COALESCE($2, name),
      address            = $3,
      city               = $4,
      billing_condition  = $5,
      price_list_number  = $6,
      delivers_monday    = COALESCE($7, delivers_monday),
      delivers_tuesday   = COALESCE($8, delivers_tuesday),
      delivers_wednesday = COALESCE($9, delivers_wednesday),
      delivers_thursday  = COALESCE($10, delivers_thursday),
      delivers_friday    = COALESCE($11, delivers_friday),
      delivers_saturday  = COALESCE($12, delivers_saturday),
      delivers_sunday    = COALESCE($13, delivers_sunday)
     WHERE id = $1
     RETURNING
      id,
      tango_id AS "tangoId",
      tango_internal_id AS "tangoInternalId",
      name,
      phone_normalized AS "phoneNormalized",
      email, cuit, iva_category AS "ivaCategory",
      billing_condition AS "billingCondition",
      address, city,
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
      synced_at AS "syncedAt"`,
    [
      id,
      data.name ?? null,
      data.address ?? null,
      data.city ?? null,
      data.billingCondition ?? null,
      data.priceListNumber ?? null,
      data.deliversMonday ?? null,
      data.deliversTuesday ?? null,
      data.deliversWednesday ?? null,
      data.deliversThursday ?? null,
      data.deliversFriday ?? null,
      data.deliversSaturday ?? null,
      data.deliversSunday ?? null,
    ],
  )
  return rows[0] ?? null
}

export async function createContact(data: ContactCreate): Promise<Contact> {
  const { rows } = await pool.query<Contact>(
    `INSERT INTO contacts
      (tango_id, name, phone_normalized, address, city, billing_condition, price_list_number,
       delivers_monday, delivers_tuesday, delivers_wednesday, delivers_thursday,
       delivers_friday, delivers_saturday, delivers_sunday, synced_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, NOW())
     RETURNING
      id,
      tango_id AS "tangoId",
      tango_internal_id AS "tangoInternalId",
      name,
      phone_normalized AS "phoneNormalized",
      email, cuit, iva_category AS "ivaCategory",
      billing_condition AS "billingCondition",
      address, city,
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
      synced_at AS "syncedAt"`,
    [
      data.tangoId,
      data.name,
      data.phoneNormalized,
      data.address ?? null,
      data.city ?? null,
      data.billingCondition ?? null,
      data.priceListNumber ?? null,
      data.deliversMonday ?? false,
      data.deliversTuesday ?? false,
      data.deliversWednesday ?? false,
      data.deliversThursday ?? false,
      data.deliversFriday ?? false,
      data.deliversSaturday ?? false,
      data.deliversSunday ?? false,
    ],
  )
  return rows[0]
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
      billing_condition AS "billingCondition",
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
