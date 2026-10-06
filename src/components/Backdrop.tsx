// Фон сайта — «туманность»: три размытых цветных пятна и редкие мелкие звёзды.
// Лежит неподвижно (position: fixed) под всем сайтом, контент прокручивается поверх.
// Чисто декоративный — скрыт от программ чтения с экрана.
import styles from './Backdrop.module.css'

export function Backdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <span className={`${styles.blob} ${styles.teal}`} />
      <span className={`${styles.blob} ${styles.violet}`} />
      <span className={`${styles.blob} ${styles.blue}`} />
      <span className={styles.stars} />
    </div>
  )
}
