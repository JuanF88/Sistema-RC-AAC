import { redirect } from "next/navigation";

import { getSessionFromServerCookies } from "@/lib/auth";

import { LoginForm } from "./LoginForm";
import { LoginModelBackground } from "./LoginModelBackground";
import styles from "./login.module.css";

export default async function LoginPage() {
  const session = await getSessionFromServerCookies();
  if (session) {
    redirect("/");
  }

  return (
    <main className={styles.page}>
      <div className={styles.modelLayer} aria-hidden="true">
        <LoginModelBackground />
      </div>
      <div className={styles.gridOverlay} />
      <div className={styles.orbOne} />
      <div className={styles.orbTwo} />
      <div className={styles.loginStack}>
      <LoginForm />
      <div className={styles.copy}>
      <p className={styles.copyright}>© 2026 Sistema Órbita. Todos los derechos reservados.</p>
      </div>
      </div>
    </main>
  );
}
