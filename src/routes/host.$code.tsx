import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import tugOfWarGround from "@/assets/tug-of-war-ground.png";
import tugOfWarPlayers from "@/assets/tug-of-war-players.png";
import { TugOfWarArena } from "@/components/game/TugOfWarArena";
import { useGameState } from "@/hooks/useGameState";
import { useStartCountdown } from "@/components/game/StartCountdown";
import { WinnerBanner } from "@/components/game/WinnerBanner";
import { controlRoom } from "@/lib/game.functions";

export const Route = createFileRoute("/host/$code")({
  head: () => ({
    meta: [
      { title: "Ana Ekran — Halat Yarışı" },
      {
        name: "description",
        content: "Büyük ekran için halat çekme yarışması: QR kod, sorular ve canlı halat konumu.",
      },
      { property: "og:title", content: "Ana Ekran — Halat Yarışı" },
      {
        property: "og:description",
        content: "Sınıf ekranından yarışmayı yönet: QR kod, sorular, canlı halat konumu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preload", href: tugOfWarGround, as: "image", fetchPriority: "high" },
      { rel: "preload", href: tugOfWarPlayers, as: "image", fetchPriority: "high" },
    ],
  }),
  component: HostScreen,
});

function HostScreen() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { data, isError, refetch } = useGameState(code);
  const control = useServerFn(controlRoom);
  const [pulse, setPulse] = useState<1 | 2 | null>(null);
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const arenaRef = useRef<HTMLDivElement>(null);
  const prevPos = useRef(0);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (arenaRef.current) {
      void arenaRef.current.requestFullscreen();
    }
  };

  const enterFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      const el = arenaRef.current ?? document.documentElement;
      void el.requestFullscreen?.().catch(() => {});
    }
  };

  const startWithFullscreen = (action: string) => {
    enterFullscreen();
    act(action);
  };

  const q = data?.question ?? null;
  const status = data?.status;
  const resolved = data?.resolved ?? false;
  const qIndex = q?.index ?? 0;
  const countdown = useStartCountdown(status, q?.index);

  // Doğru cevap verildiğinde sıradaki soruya geç
  useEffect(() => {
    if (status !== "PLAYING" || !resolved) return undefined;
    const id = setTimeout(() => {
      void control({ data: { code, action: "next" } }).then(() => refetch());
    }, 2200);
    return () => clearTimeout(id);
  }, [status, resolved, qIndex, code, control, refetch]);

  useEffect(() => {
    if (!data) return;
    if (data.ropePosition !== prevPos.current) {
      setPulse(data.ropePosition < prevPos.current ? 1 : 2);
      prevPos.current = data.ropePosition;
      const id = setTimeout(() => setPulse(null), 700);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [data?.ropePosition, data]);

  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/play/${code}` : `/play/${code}`;

  const act = (action: string) => void control({ data: { code, action } }).then(() => refetch());

  if (isError)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-lg font-bold text-foreground">Bağlantı yeniden kuruluyor...</p>
      </main>
    );
  if (!data)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-lg font-bold text-muted-foreground">Yükleniyor...</p>
      </main>
    );

  const team1 = data.players.find((p) => p.team === 1);
  const team2 = data.players.find((p) => p.team === 2);
  const waiting = data.status === "WAITING" || data.status === "READY";

  return (
    <main className="min-h-screen bg-background px-4 py-3 sm:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="rounded-[var(--radius)] bg-panel p-4 shadow-[var(--shadow-panel)] sm:p-6">
          <div
            ref={arenaRef}
            className={isFullscreen ? "relative flex h-full flex-col justify-center bg-panel" : ""}
          >
            {countdown}
            {waiting && !lobbyOpen ? (
            <section className="flex flex-col items-center py-12 text-center">
              <p className="text-xs font-semibold tracking-[0.35em] text-muted-foreground">
                2. ADIM — YARIŞMA
              </p>
              <h1 className="mt-3 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
                HALAT YARIŞI
              </h1>
              <p className="mt-4 max-w-xl text-sm font-semibold text-muted-foreground sm:text-base">
                Sorular hazır. "YARIŞMAYI BAŞLAT" dediğinizde QR kod ve oda kodu ekrana gelir,
                öğrenciler takımlara katılır.
              </p>
              <button
                onClick={() => setLobbyOpen(true)}
                className="mt-10 rounded-2xl bg-foreground px-10 py-5 text-lg font-bold tracking-wide text-background transition-transform hover:scale-[1.01]"
              >
                YARIŞMAYI BAŞLAT
              </button>
              <button
                onClick={() => void navigate({ to: "/sorular" })}
                className="mt-3 rounded-2xl border-2 border-border px-8 py-3 text-sm font-bold text-foreground hover:bg-muted"
              >
                SORULARA DÖN
              </button>
            </section>
          ) : waiting ? (
            <section className="flex flex-col items-center py-2 text-center">
              <p className="text-xs font-semibold tracking-[0.35em] text-muted-foreground">
                ODA KODU
              </p>
              <h1 className="mt-1 text-4xl font-extrabold tracking-[0.2em] text-foreground sm:text-5xl">
                {code}
              </h1>
              <div className="mt-3 rounded-2xl border-4 border-foreground p-2 text-foreground">
                <QRCode value={joinUrl} size={140} bgColor="transparent" fgColor="currentColor" />
              </div>
              <p className="mt-2 text-sm font-bold tracking-[0.2em] text-foreground sm:text-base">
                TELEFONUNUZLA QR KODU OKUTUN
              </p>
              <div className="mt-3 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                <TeamSlot team={1} name={team1?.name} connected={team1?.connected} />
                <TeamSlot team={2} name={team2?.name} connected={team2?.connected} />
              </div>
              {data.players.length === 2 && (
                <p className="mt-3 text-xl font-extrabold text-foreground">İKİ OYUNCU HAZIR!</p>
              )}
              <button
                onClick={() => startWithFullscreen("start")}
                className="mt-3 rounded-2xl bg-foreground px-10 py-4 text-lg font-bold tracking-wide text-background transition-transform hover:scale-[1.01]"
              >
                {data.players.length === 2 ? "OYUNU BAŞLAT" : "OYUNCU BEKLEMEDEN BAŞLAT"}
              </button>
            </section>
          ) : data.status === "FINISHED" ? (
            <section className="py-6 text-center">
              <WinnerBanner winner={data.winner} players={data.players} />
              <div className="mt-6">
                <TugOfWarArena ropePosition={data.ropePosition} />
              </div>
            </section>
          ) : (
            <section>
              <div
                className={isFullscreen ? "" : "-mx-4 sm:-mx-6"}
              >
                <TugOfWarArena ropePosition={data.ropePosition} pulse={pulse} />
                {isFullscreen && (
                  <div className="absolute right-4 top-4 flex gap-2">
                    <button
                      onClick={toggleFullscreen}
                      className="rounded-lg border-2 border-border bg-panel px-3.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      TAM EKRANDAN ÇIK
                    </button>
                    <button
                      onClick={() => {
                        void document.exitFullscreen();
                        void navigate({ to: "/" });
                      }}
                      className="rounded-lg bg-foreground px-3.5 py-1.5 text-xs font-bold text-background"
                    >
                      ÇIKIŞ
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-6 text-center">
                {data.status === "PAUSED" && (
                  <p className="mt-3 text-3xl font-extrabold text-foreground">DURAKLATILDI</p>
                )}
              </div>
            </section>
          )}
          </div>
        </div>

        {!waiting && (
          <div className="mt-3 grid gap-3 rounded-[var(--radius)] bg-panel px-4 py-3 shadow-[var(--shadow-panel)] sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-foreground" />
            <div className="flex flex-wrap gap-2">
              {data.status === "PLAYING" && <Ctrl onClick={() => act("pause")}>DURAKLAT</Ctrl>}
              {data.status === "PAUSED" && (
                <Ctrl onClick={() => act("resume")} primary>
                  DEVAM ET
                </Ctrl>
              )}
              {(data.status === "PLAYING" || data.status === "PAUSED") && (
                <>
                  {!isFullscreen && (
                    <Ctrl onClick={toggleFullscreen}>TAM EKRAN</Ctrl>
                  )}
                  <Ctrl onClick={() => void navigate({ to: "/" })}>ÇIKIŞ</Ctrl>
                </>
              )}
              {data.status === "FINISHED" && (
                <Ctrl
                  onClick={() => startWithFullscreen("restart")}
                  primary
                >
                  BAŞLAT
                </Ctrl>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function TeamSlot({
  team,
  name,
  connected,
}: {
  team: 1 | 2;
  name?: string | undefined;
  connected?: boolean | undefined;
}) {
  return (
    <div className="rounded-2xl border-2 border-border px-4 py-3 text-left">
      <p
        className={`text-xs font-bold tracking-[0.25em] ${team === 1 ? "text-team1" : "text-team2"}`}
      >
        TAKIM {team}
      </p>
      <p className="mt-1 text-lg font-bold text-foreground">
        {name ? `${connected ? "🟢" : "🔴"} ${name}` : "Oyuncu bekleniyor..."}
      </p>
    </div>
  );
}


function Ctrl({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-40 ${
        primary
          ? "bg-foreground text-background"
          : "border-2 border-border bg-panel text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
