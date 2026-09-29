"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LynxMark } from "./LynxMark";
import styles from "./ProductNav.module.css";

const navigation = [
  { href: "/sessions", label: "Sessions" },
  { href: "/inventory", label: "Inventory" },
  { href: "/topology", label: "Topology" },
  { href: "/integrations", label: "Integrations" },
];

export function ProductNav({
  context,
  detail,
}: {
  context?: string;
  detail?: string;
}) {
  const pathname = usePathname();

  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = nextTheme;
    window.localStorage.setItem("lynx-theme", nextTheme);
  }

  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="Lynx home">
        <span className={styles.brandMark}>
          <LynxMark size={31} />
        </span>
        <strong>LYNX</strong>
      </Link>

      <nav className={styles.navigation} aria-label="Product navigation">
        {navigation.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              className={active ? styles.active : ""}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.actions}>
        {context && (
          <span className={styles.context}>
            <i />
            <span>
              <strong>{context}</strong>
              {detail && <small>{detail}</small>}
            </span>
          </span>
        )}
        {pathname !== "/workspace" && (
          <Link className={styles.sessionLink} href="/workspace">
            New field session
          </Link>
        )}
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label="Toggle light and dark mode"
        >
          <i className={styles.sunIcon} />
          <i className={styles.moonIcon} />
        </button>
      </div>
    </header>
  );
}

