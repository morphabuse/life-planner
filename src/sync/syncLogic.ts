// Логика синхронизации без сети и React: что взять из облака, что отправить.
// Решаем по каждому разделу отдельно (деньги, смены, неделя, привычки, настройки).
import { SECTION_IDS } from '../storage/syncStorage'
import type { SectionId, SyncMeta } from '../storage/syncStorage'

// Строка таблицы planner_data: раздел и время его изменения (null — раздела в облаке ещё нет).
export type RemoteRow = Partial<Record<SectionId | `${SectionId}_updated_at`, unknown>>

export function remoteAt(row: RemoteRow | null, id: SectionId): string | null {
  const at = row?.[`${id}_updated_at`]
  return typeof at === 'string' && row?.[id] != null ? at : null
}

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : 0)

// Запоминает изменения на устройстве: отпечаток раздела не такой, как при прошлой
// проверке, — значит, его поменяли (writeAt — когда; не знаем — «сейчас»).
export function noteLocalChanges(
  meta: SyncMeta,
  hashes: Record<SectionId, string>,
  writeAt: Partial<Record<SectionId, string>>,
  now: string,
): void {
  for (const id of SECTION_IDS) {
    const known = meta.touched[id]?.hash ?? meta.synced[id]?.hash
    if (hashes[id] === meta.synced[id]?.hash) delete meta.touched[id] // вернули как было — менять нечего
    else if (hashes[id] !== known) meta.touched[id] = { hash: hashes[id], at: writeAt[id] ?? now }
  }
}

// Время изменения раздела на устройстве (для сравнения с облаком и для отправки).
export function localAt(meta: SyncMeta, id: SectionId, hash: string, now: string): string {
  const touched = meta.touched[id]
  return touched && touched.hash === hash ? touched.at : now
}

export interface Decision {
  apply: SectionId[] // взять из облака
  push: SectionId[] // отправить в облако
}

// Обычная синхронизация (устройство уже синхронизировалось с этим аккаунтом):
//   менял только здесь          → отправить;
//   менялось только в облаке    → взять из облака;
//   менялось и там, и там       → побеждает более новый updated_at;
//   в облаке раздела нет        → отправить.
export function decide(meta: SyncMeta, hashes: Record<SectionId, string>, row: RemoteRow | null, now: string): Decision {
  const result: Decision = { apply: [], push: [] }
  for (const id of SECTION_IDS) {
    const synced = meta.synced[id]
    const remote = remoteAt(row, id)
    const changedHere = !synced || synced.hash !== hashes[id]
    // Сравниваем как время, а не как текст: база пишет «+00:00», а мы — «Z».
    const changedThere = remote !== null && (!synced || time(remote) !== time(synced.updatedAt))
    if (remote === null) result.push.push(id)
    else if (changedHere && changedThere) {
      if (time(remote) > time(localAt(meta, id, hashes[id], now))) result.apply.push(id)
      else result.push.push(id)
    } else if (changedThere) result.apply.push(id)
    else if (changedHere) result.push.push(id)
  }
  return result
}

// updated_at для отправки: время изменения, но строго новее облачной версии —
// чтобы другие устройства точно увидели «в облаке новое», даже если часы немного врут.
export function pushAt(local: string, remote: string | null): string {
  return time(remote) >= time(local) ? new Date(time(remote) + 1).toISOString() : new Date(time(local)).toISOString()
}

// В облаке ещё ничего нет (первый вход с первого устройства).
export function isRemoteEmpty(row: RemoteRow | null): boolean {
  return SECTION_IDS.every((id) => remoteAt(row, id) === null)
}
