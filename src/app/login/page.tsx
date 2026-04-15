import { redirect } from "next/navigation";

import { getSessionFromServerCookies } from "@/lib/auth";

import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";

export default async function LoginPage() {
  const session = await getSessionFromServerCookies();
  if (session) {
    redirect("/");
  }

  return (
    <main className={styles.page}>
      <div className={styles.gridOverlay} />
      <div className={styles.orbOne} />
      <div className={styles.orbTwo} />
      <div className={styles.card}>
        <LoginForm />
      </div>
    </main>
  );
}
