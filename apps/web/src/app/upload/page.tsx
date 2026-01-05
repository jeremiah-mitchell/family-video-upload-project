import Link from 'next/link';
import styles from './page.module.css';

export default function UploadPage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.icon}>📤</div>
        <h1 className={styles.title}>Upload Videos</h1>
        <p className={styles.message}>Coming Soon</p>
        <p className={styles.description}>
          Video upload functionality will be available in a future update.
        </p>
        <Link href="/" className={styles.backLink}>
          ← Back to Tagging
        </Link>
      </div>
    </main>
  );
}
