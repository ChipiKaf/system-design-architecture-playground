import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "rto"
  | "rpo"
  | "backup-vs-async"
  | "cold-standby"
  | "warm-standby"
  | "hot-standby"
  | "active-active"
  | "replication"
  | "split-brain";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  rto: {
    title: "Recovery Time Objective (RTO)",
    subtitle: "How long until service is restored?",
    accentColor: "#ef4444",
    sections: [
      {
        title: "What it means",
        accent: "#ef4444",
        content: (
          <p>
            RTO is the maximum acceptable time between a failure and full
            service restoration. It includes failure detection, promotion of a
            standby, and re-routing traffic. Lower RTO = higher cost and
            complexity.
          </p>
        ),
      },
      {
        title: "RTO by strategy",
        accent: "#ef4444",
        content: (
          <ul>
            <li>
              <strong>Cold:</strong> ~3–4 minutes (boot from snapshot)
            </li>
            <li>
              <strong>Warm:</strong> ~55 seconds (promote running instance)
            </li>
            <li>
              <strong>Hot:</strong> ~12 seconds (near-instant switch)
            </li>
            <li>
              <strong>Active-Active:</strong> ~3 seconds (already serving)
            </li>
          </ul>
        ),
      },
    ],
  },

  rpo: {
    title: "Recovery Point Objective (RPO)",
    subtitle: "How much data can you afford to lose?",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What it means",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              RPO is the maximum acceptable amount of data loss measured in
              time. If RPO = 5 seconds, you can lose up to 5 seconds of writes.
              RPO depends entirely on the replication mode — synchronous
              replication gives RPO = 0.
            </p>
            <p>
              In practice, RPO answers:{" "}
              <em>
                "How long ago was the last successful sync between the primary
                and secondary database?"
              </em>{" "}
              Any writes committed after that sync point are gone if the primary
              crashes before the next sync completes.
            </p>
          </>
        ),
      },
      {
        title: "RPO by replication",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>
              <strong>Backup/Snapshot:</strong> RPO = hours (last snapshot age)
            </li>
            <li>
              <strong>Async replication:</strong> RPO = seconds (replication
              lag)
            </li>
            <li>
              <strong>Sync replication:</strong> RPO = 0 (zero data loss)
            </li>
          </ul>
        ),
      },
    ],
  },

  "backup-vs-async": {
    title: "Backup vs Async Replication",
    subtitle: "The key cold-vs-warm standby data-loss difference",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "Short answer",
        accent: "#38bdf8",
        content: (
          <ul>
            <li>
              <strong>Async replication (warm standby):</strong> data is copied
              continuously, but slightly behind.
            </li>
            <li>
              <strong>Backup snapshots (cold standby):</strong> data is copied
              occasionally at snapshot times.
            </li>
          </ul>
        ),
      },
      {
        title: "What happens to each write",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              With <strong>async replication</strong>, the primary can
              acknowledge a write before the secondary receives it. If the
              primary crashes in that lag window, only the last few writes are
              at risk.
            </p>
            <p>
              With <strong>backup snapshots</strong>, recovery restores the last
              snapshot, so all writes after that snapshot point are lost.
            </p>
          </>
        ),
      },
      {
        title: "Failure timeline intuition",
        accent: "#38bdf8",
        content: (
          <pre>
            {`Time ->
12:00     12:05     12:10 (crash)

Backup:
[snapshot] .... writes .... crash
restore from snapshot => lose everything after 12:00

Async:
write -> replicate -> replicate -> crash
lose only writes still in replication lag`}
          </pre>
        ),
      },
      {
        title: "Why warm standby improves RPO",
        accent: "#38bdf8",
        content: (
          <ul>
            <li>
              <strong>Cold + backup:</strong> high RPO (minutes to hours)
            </li>
            <li>
              <strong>Warm + async:</strong> medium/low RPO (seconds)
            </li>
            <li>
              <strong>Hot + sync:</strong> near-zero RPO
            </li>
          </ul>
        ),
      },
    ],
  },

  "cold-standby": {
    title: "Cold Standby",
    subtitle: "Cheapest but slowest recovery",
    accentColor: "#94a3b8",
    sections: [
      {
        title: "How it works",
        accent: "#94a3b8",
        content: (
          <p>
            The standby server is powered off. Data is backed up via periodic
            snapshots (e.g. nightly). On failure, you boot the standby, restore
            the latest snapshot, and re-route traffic. Recovery takes minutes.
          </p>
        ),
      },
      {
        title: "Tradeoffs",
        accent: "#94a3b8",
        content: (
          <ul>
            <li>Lowest cost — standby is off, minimal resources</li>
            <li>Highest RTO — must boot + restore</li>
            <li>Highest RPO — data since last snapshot is lost</li>
          </ul>
        ),
      },
    ],
  },

  "warm-standby": {
    title: "Warm Standby",
    subtitle: "Balanced cost and recovery speed",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "How it works",
        accent: "#fbbf24",
        content: (
          <p>
            The standby server is running and receiving asynchronous replication
            from the primary database. On failure, promote the standby and
            update routing. Takes seconds to a minute.
          </p>
        ),
      },
      {
        title: "Tradeoffs",
        accent: "#fbbf24",
        content: (
          <ul>
            <li>Moderate cost — standby is running but not serving traffic</li>
            <li>Good RTO — promotion is fast</li>
            <li>Some RPO — async replication means a few seconds of lag</li>
          </ul>
        ),
      },
    ],
  },

  "hot-standby": {
    title: "Hot Standby",
    subtitle: "Fast recovery, near-zero data loss",
    accentColor: "#ef4444",
    sections: [
      {
        title: "How it works",
        accent: "#ef4444",
        content: (
          <p>
            The standby server is running with synchronous replication — every
            write is confirmed on both databases before acknowledging. On
            failure, promotion is near-instant with zero data loss.
          </p>
        ),
      },
      {
        title: "Tradeoffs",
        accent: "#ef4444",
        content: (
          <ul>
            <li>Higher cost — full-size standby + sync replication overhead</li>
            <li>Very low RTO — just a routing switch</li>
            <li>Zero RPO — no data loss</li>
            <li>Higher write latency due to synchronous commits</li>
          </ul>
        ),
      },
    ],
  },

  "active-active": {
    title: "Active-Active (Multi-Primary)",
    subtitle: "Both servers handle traffic simultaneously",
    accentColor: "#a855f7",
    sections: [
      {
        title: "How it works",
        accent: "#a855f7",
        content: (
          <p>
            Both servers are fully active, handling reads and writes. Data is
            synchronously replicated between them. If one fails, the other
            continues without interruption — no promotion needed.
          </p>
        ),
      },
      {
        title: "Tradeoffs",
        accent: "#a855f7",
        content: (
          <ul>
            <li>Highest cost — two full servers + bidirectional replication</li>
            <li>Near-zero RTO — the other server is already serving</li>
            <li>Zero RPO with sync replication</li>
            <li>Highest complexity — risk of split-brain conflicts</li>
          </ul>
        ),
      },
    ],
  },

  replication: {
    title: "Database Replication",
    subtitle: "Keeping data in sync across servers",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "Modes",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>
              <strong>Backup:</strong> Periodic snapshots. Cheap but high data
              loss risk.
            </li>
            <li>
              <strong>Async:</strong> Writes replicate in background. Low
              latency but some lag.
            </li>
            <li>
              <strong>Sync:</strong> Every write confirmed on both DBs before
              acknowledging. Zero loss but higher latency.
            </li>
          </ul>
        ),
      },
    ],
  },

  "split-brain": {
    title: "Split Brain",
    subtitle: "When both nodes think they're the primary",
    accentColor: "#ec4899",
    sections: [
      {
        title: "The danger",
        accent: "#ec4899",
        content: (
          <p>
            In a network partition, both servers may accept writes independently
            — causing conflicting data. This is the biggest risk in
            active-active setups. Mitigation includes quorum-based fencing,
            STONITH, and consensus protocols.
          </p>
        ),
      },
    ],
  },
};
