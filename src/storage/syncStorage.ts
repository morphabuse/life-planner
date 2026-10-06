// Служебные данные синхронизации с облаком (это про устройство, а не данные — в бэкап не идут):
//   userId   — с чьим аккаунтом это устройство уже синхронизировалось
//              (другой или null — значит, это первый вход: спросим, какие данные оставить);
//   synced   — по каждому разделу: отпечаток содержимого и updated_at последней версии,
//              которая совпадала с облаком. Отпечаток другой — раздел меняли на устройстве;
//   touched  — последнее изменение раздела на устройстве: отпечаток и время (это updated_at
//              раздела при отправке). Сохранение без изменений (вкладка открылась и записала
//              то же самое) время не сдвигает — отпечаток тот же.
import { readJson, writeJson } from './localStore'
import { isObject } from './validators'

export const SECTION_IDS = ['money', 'shifts', 'week', 'habits', 'settings'] as const
export type SectionId = (typeof SECTION_IDS)[number]

export interface SyncedSection {
  hash: string
  updatedAt: string // ISO-время
}

export interface SyncMeta {
  userId: string | null
  synced: Partial<Record<SectionId, SyncedSection>>
  touched: Partial<Record<SectionId, { hash: string; at: string }>>
}

const KEY = 'planner.sync'

export function emptySyncMeta(): SyncMeta {
  return { userId: null, synced: {}, touched: {} }
}

export function loadSyncMeta(): SyncMeta {
  const stored = readJson<unknown>(KEY, null)
  if (!isObject(stored)) return emptySyncMeta()
  const meta = emptySyncMeta()
  if (typeof stored.userId === 'string') meta.userId = stored.userId
  for (const id of SECTION_IDS) {
    const synced = isObject(stored.synced) ? stored.synced[id] : undefined
    if (isObject(synced) && typeof synced.hash === 'string' && typeof synced.updatedAt === 'string') {
      meta.synced[id] = { hash: synced.hash, updatedAt: synced.updatedAt }
    }
    const touched = isObject(stored.touched) ? stored.touched[id] : undefined
    if (isObject(touched) && typeof touched.hash === 'string' && typeof touched.at === 'string') {
      meta.touched[id] = { hash: touched.hash, at: touched.at }
    }
  }
  return meta
}

export function saveSyncMeta(meta: SyncMeta): void {
  writeJson(KEY, meta)
}
