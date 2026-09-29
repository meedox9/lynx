"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { ProductNav } from "@/components/ProductNav";
import type { ProviderName } from "@/lib/types";

import product from "../product.module.css";
import styles from "./integrations.module.css";

type ProviderConfiguration = Record<
  ProviderName,
  {
    configured: boolean;
    connected?: boolean;
    uploadReady?: boolean;
    runtimeBudget?: {
      used: number;
      limit: number;
      cachedTranscripts: number;
    };
  }
>;

const providerCopy = {
  plaud: {
    name: "PLAUD",
    role: "Field capture",
    description:
      "Transcribes completed field recordings and preserves the source evidence.",
    requirement: "Client ID + API key",
    href: "https://dev.plaud.ai/",
    logo: "/brands/plaud.png",
    logoWidth: 76,
    logoHeight: 30,
  },
  crusoe: {
    name: "Crusoe",
    role: "Structured extraction",
    description:
      "Converts transcript segments into canonical asset and relationship events.",
    requirement: "Intelligence API key",
    href: "https://console.crusoecloud.com/",
    logo: "/brands/crusoe.png",
    logoWidth: 76,
    logoHeight: 24,
  },
  neo4j: {
    name: "Neo4j Aura",
    role: "Graph reasoning",
    description:
      "Stages topology changes, checks dependencies, and records operator approval.",
    requirement: "Aura connection",
    href: "https://console.neo4j.io/",
    logo: "/brands/neo4j.png",
    logoWidth: 34,
    logoHeight: 34,
  },
} satisfies Record<
  ProviderName,
  {
    name: string;
    role: string;
    description: string;
    requirement: string;
    href: string;
    logo: string;
    logoWidth: number;
    logoHeight: number;
  }
>;

export default function IntegrationsPage() {
  const [configuration, setConfiguration] =
    useState<ProviderConfiguration | null>(null);

  useEffect(() => {
    void fetch("/api/status")
      .then((response) => response.json())
      .then((body: { providers?: ProviderConfiguration }) => {
        if (body.providers) setConfiguration(body.providers);
      });
  }, []);

  const isConnected = (provider: ProviderName) => {
    const status = configuration?.[provider];
    return provider === "neo4j" ? status?.connected : status?.configured;
  };

  const connectedCount = (["plaud", "crusoe", "neo4j"] as ProviderName[]).filter(
    isConnected,
  ).length;

  return (
    <>
      <ProductNav
        context="Integrations"
        detail={`${connectedCount} of 3 connected`}
      />
      <main className={product.page}>
        <header className={product.pageHeader}>
          <div>
            <span className={product.eyebrow}>ONBOARDING</span>
            <h1>Connect the pipeline</h1>
            <p>
              Credentials stay server-side. Lynx checks configuration without
              exposing keys to the browser.
            </p>
          </div>
        </header>

        <section className={styles.layout}>
          <div className={styles.providerList}>
            {(["plaud", "crusoe", "neo4j"] as ProviderName[]).map(
              (provider, index) => {
                const copy = providerCopy[provider];
                const connected = isConnected(provider);
                return (
                  <article className={styles.providerRow} key={provider}>
                    <span className={styles.order}>0{index + 1}</span>
                    <span className={styles.providerMark}>
                      <Image
                        src={copy.logo}
                        alt={`${copy.name} logo`}
                        width={copy.logoWidth}
                        height={copy.logoHeight}
                      />
                    </span>
                    <div className={styles.providerIdentity}>
                      <span>{copy.role}</span>
                      <h2>{copy.name}</h2>
                      <p>{copy.description}</p>
                    </div>
                    <div className={styles.requirement}>
                      <span>{copy.requirement}</span>
                      <strong className={connected ? styles.connected : ""}>
                        <i />
                        {configuration
                          ? connected
                            ? "Connected"
                            : "Setup required"
                          : "Checking"}
                      </strong>
                    </div>
                    <a href={copy.href} target="_blank" rel="noreferrer">
                      {connected ? "Open console" : "Configure"}
                    </a>
                  </article>
                );
              },
            )}
          </div>

          <aside className={styles.onboarding}>
            <span className={styles.onboardingLabel}>READINESS</span>
            <div className={styles.progress}>
              <strong>{connectedCount}/3</strong>
              <span>providers connected</span>
            </div>
            <div className={styles.progressTrack}>
              <i style={{ width: `${(connectedCount / 3) * 100}%` }} />
            </div>
            {configuration?.crusoe.runtimeBudget && (
              <div className={styles.budget}>
                <span>Crusoe session guard</span>
                <strong>
                  {configuration.crusoe.runtimeBudget.used}/
                  {configuration.crusoe.runtimeBudget.limit} uncached calls
                </strong>
              </div>
            )}
            <ol>
              <li className={isConnected("plaud") ? styles.done : ""}>
                <i>{isConnected("plaud") ? "✓" : "1"}</i>
                Add PLAUD application credentials
              </li>
              <li className={isConnected("crusoe") ? styles.done : ""}>
                <i>{isConnected("crusoe") ? "✓" : "2"}</i>
                Add Crusoe Intelligence API key
              </li>
              <li className={isConnected("neo4j") ? styles.done : ""}>
                <i>{isConnected("neo4j") ? "✓" : "3"}</i>
                Verify Neo4j Aura connectivity
              </li>
            </ol>
            <p>
              Add credentials to <code>.env.local</code>, then restart the
              development server.
            </p>
          </aside>
        </section>

        <section className={styles.deviceFlow}>
          <div>
            <span>PLAUD DEVICE PATH</span>
            <h2>From technician to transcript</h2>
            <p>
              Hardware pairing belongs in the mobile companion. The web workspace
              receives the completed recording and transcription result.
            </p>
          </div>
          <ol>
            <li>
              <i>1</i>
              <span>
                <strong>Pair</strong>
                PLAUD Embedded mobile SDK
              </span>
            </li>
            <li>
              <i>2</i>
              <span>
                <strong>Record</strong>
                Hands-free on-device capture
              </span>
            </li>
            <li>
              <i>3</i>
              <span>
                <strong>Sync</strong>
                BLE or WiFi Fast Transfer
              </span>
            </li>
            <li>
              <i>4</i>
              <span>
                <strong>Transcribe</strong>
                PLAUD asynchronous API
              </span>
            </li>
          </ol>
        </section>
      </main>
    </>
  );
}

