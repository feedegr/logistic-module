import pool from '../db/pool.js'
import chatwootPool from '../db/chatwootPool.js'
import { config } from '../config.js'

// Rango en UTC: fromUtc inclusivo, toUtc exclusivo (ISO strings).
export interface DateRange {
  fromUtc: string
  toUtc: string
}

// Chatwoot guarda created_at como timestamp sin zona, en UTC.
const CW_DAY_ART = `(c.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`

// Chatwoot: status 0=open 1=resolved 2=pending 3=snoozed; message_type 0=incoming 1=outgoing.
export async function getConversationMetrics(range: DateRange, byDay: boolean) {
  const params = [config.chatwoot.accountId, config.chatwoot.inboxId, range.fromUtc, range.toUtc]

  const { rows } = await chatwootPool.query(
    `WITH conv AS (
       SELECT c.id, c.status,
         (SELECT m.message_type FROM messages m
           WHERE m.conversation_id = c.id AND m.message_type IN (0, 1) AND m.private = false
           ORDER BY m.created_at, m.id LIMIT 1) AS first_type,
         fi.first_in,
         (SELECT MIN(r.created_at) FROM messages r
           WHERE r.conversation_id = c.id AND r.message_type = 1 AND r.private = false
             AND r.created_at >= fi.first_in) AS first_reply,
         (SELECT MIN(r.created_at) FROM messages r
           WHERE r.conversation_id = c.id AND r.message_type = 1 AND r.sender_type = 'AgentBot'
             AND r.created_at >= fi.first_in) AS first_bot_reply
       FROM conversations c
       LEFT JOIN LATERAL (
         SELECT MIN(m.created_at) AS first_in FROM messages m
         WHERE m.conversation_id = c.id AND m.message_type = 0
       ) fi ON true
       WHERE c.account_id = $1 AND c.inbox_id = $2
         AND c.created_at >= $3 AND c.created_at < $4
     )
     SELECT
       COUNT(*)::int                                                     AS total,
       COUNT(*) FILTER (WHERE status = 0)::int                           AS abiertas,
       COUNT(*) FILTER (WHERE status = 1)::int                           AS resueltas,
       COUNT(*) FILTER (WHERE status = 2)::int                           AS pendientes,
       COUNT(*) FILTER (WHERE status = 3)::int                           AS pospuestas,
       COUNT(*) FILTER (WHERE first_type = 0)::int                       AS iniciadas_cliente,
       COUNT(*) FILTER (WHERE first_type = 1)::int                       AS iniciadas_empresa,
       COUNT(*) FILTER (WHERE first_type = 1 AND first_in IS NOT NULL)::int AS empresa_respondidas,
       COUNT(*) FILTER (WHERE first_in IS NOT NULL AND first_reply IS NULL)::int AS sin_respuesta,
       AVG(EXTRACT(EPOCH FROM first_bot_reply - first_in))::float        AS bot_resp_avg,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM first_bot_reply - first_in)) AS bot_resp_median
     FROM conv`,
    params,
  )
  const r = rows[0]

  const { rows: msgRows } = await chatwootPool.query(
    `SELECT
       COUNT(*) FILTER (WHERE message_type = 0)::int AS entrantes,
       COUNT(*) FILTER (WHERE message_type = 1 AND sender_type = 'AgentBot')::int AS bot,
       COUNT(*) FILTER (WHERE message_type = 1 AND sender_type = 'User' AND NOT is_template)::int AS asesores,
       COUNT(*) FILTER (WHERE message_type = 1 AND is_template)::int AS plantillas
     FROM (
       SELECT message_type, sender_type,
              COALESCE(additional_attributes::jsonb, '{}'::jsonb) ? 'template_params' AS is_template
       FROM messages
       WHERE account_id = $1 AND inbox_id = $2 AND private = false
         AND created_at >= $3 AND created_at < $4
     ) m`,
    params,
  )
  const m = msgRows[0]

  const result: Record<string, unknown> = {
    conversaciones: {
      total: r.total,
      abiertas: r.abiertas,
      resueltas: r.resueltas,
      pendientes: r.pendientes,
      pospuestas: r.pospuestas,
      sinRespuesta: r.sin_respuesta,
    },
    origen: {
      cliente: r.iniciadas_cliente,
      empresa: r.iniciadas_empresa,
      empresaRespondidas: r.empresa_respondidas,
      tasaRespuesta: ratio(r.empresa_respondidas, r.iniciadas_empresa),
    },
    mensajes: {
      entrantes: m.entrantes,
      bot: m.bot,
      asesores: m.asesores,
      plantillas: m.plantillas,
    },
    tiempoPrimeraRespuestaBotSeg: {
      promedio: roundOrNull(r.bot_resp_avg),
      mediana: roundOrNull(r.bot_resp_median),
    },
  }

  if (byDay) {
    const { rows: dayRows } = await chatwootPool.query(
      `SELECT ${CW_DAY_ART}::text AS fecha,
              COUNT(*)::int                           AS total,
              COUNT(*) FILTER (WHERE status = 0)::int AS abiertas,
              COUNT(*) FILTER (WHERE status = 1)::int AS resueltas,
              COUNT(*) FILTER (WHERE status = 2)::int AS pendientes,
              COUNT(*) FILTER (WHERE status = 3)::int AS pospuestas
       FROM conversations c
       WHERE c.account_id = $1 AND c.inbox_id = $2
         AND c.created_at >= $3 AND c.created_at < $4
       GROUP BY 1 ORDER BY 1`,
      params,
    )
    result.porDia = dayRows
  }

  return result
}

export async function getBotMetrics(range: DateRange, byDay: boolean) {
  const params = [range.fromUtc, range.toUtc]

  const { rows } = await pool.query(
    `SELECT
       COUNT(DISTINCT conversation_id) FILTER (WHERE event_type IN ('derivacion_bot', 'derivacion_asesor'))::int AS derivadas,
       COUNT(*) FILTER (WHERE event_type = 'derivacion_bot')::int        AS derivacion_bot,
       COUNT(*) FILTER (WHERE event_type = 'derivacion_asesor')::int     AS derivacion_asesor,
       COUNT(DISTINCT conversation_id) FILTER (WHERE event_type = 'derivacion_bot')::int AS conv_derivadas_bot,
       COUNT(*) FILTER (WHERE event_type = 'no_registrado')::int         AS no_reg_mensajes,
       COUNT(DISTINCT chatwoot_contact_id) FILTER (WHERE event_type = 'no_registrado')::int AS no_reg_contactos,
       COUNT(*) FILTER (WHERE event_type = 'no_registrado' AND detail = 'template_enviado')::int AS no_reg_templates,
       COUNT(*) FILTER (WHERE event_type = 'error')::int                 AS errores
     FROM bot_events
     WHERE created_at >= $1 AND created_at < $2`,
    params,
  )
  const r = rows[0]

  const { rows: motivos } = await pool.query(
    `SELECT COALESCE(detail, 'sin motivo') AS motivo, COUNT(*)::int AS cantidad
     FROM bot_events
     WHERE event_type = 'derivacion_bot' AND created_at >= $1 AND created_at < $2
     GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
    params,
  )

  const { rows: ultimosErrores } = await pool.query(
    `SELECT created_at AS fecha, conversation_id AS "conversationId", detail AS detalle
     FROM bot_events
     WHERE event_type = 'error' AND created_at >= $1 AND created_at < $2
     ORDER BY created_at DESC LIMIT 20`,
    params,
  )

  // Conversaciones en las que el bot respondió al menos una vez (base para la tasa de derivación).
  const { rows: cwRows } = await chatwootPool.query(
    `SELECT COUNT(DISTINCT conversation_id)::int AS atendidas
     FROM messages
     WHERE account_id = $1 AND inbox_id = $2 AND message_type = 1 AND sender_type = 'AgentBot'
       AND created_at >= $3 AND created_at < $4`,
    [config.chatwoot.accountId, config.chatwoot.inboxId, range.fromUtc, range.toUtc],
  )
  const atendidas: number = cwRows[0].atendidas

  const result: Record<string, unknown> = {
    conversacionesAtendidasPorBot: atendidas,
    derivaciones: {
      conversacionesDerivadas: r.derivadas,
      porBot: r.derivacion_bot,
      porAsesor: r.derivacion_asesor,
      tasaDerivacionBot: ratio(r.conv_derivadas_bot, atendidas),
      motivos,
    },
    noRegistrados: {
      mensajes: r.no_reg_mensajes,
      contactos: r.no_reg_contactos,
      templatesEnviados: r.no_reg_templates,
    },
    errores: {
      total: r.errores,
      ultimos: ultimosErrores,
    },
  }

  if (byDay) {
    const { rows: dayRows } = await pool.query(
      `SELECT (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date::text AS fecha,
              COUNT(*) FILTER (WHERE event_type = 'derivacion_bot')::int    AS "derivacionesBot",
              COUNT(*) FILTER (WHERE event_type = 'derivacion_asesor')::int AS "derivacionesAsesor",
              COUNT(*) FILTER (WHERE event_type = 'no_registrado')::int     AS "noRegistrados",
              COUNT(*) FILTER (WHERE event_type = 'error')::int             AS errores
       FROM bot_events
       WHERE created_at >= $1 AND created_at < $2
       GROUP BY 1 ORDER BY 1`,
      params,
    )
    result.porDia = dayRows
  }

  return result
}

function ratio(part: number, total: number): number | null {
  if (!total) return null
  return Math.round((part / total) * 1000) / 1000
}

function roundOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null
  return Math.round(Number(v))
}
