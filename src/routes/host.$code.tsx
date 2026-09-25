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
import { Button } from "@/components/ui/button";
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
    <main className={waiting ? "min-h-dvh bg-background" : "min-h-screen bg-background px-4 py-3 sm:px-8"}>
      <div className={waiting ? "w-full" : "mx-auto w-full max-w-[1400px]"}>
        <div className={waiting ? "min-h-dvh bg-panel" : "rounded-[var(--radius)] bg-panel p-4 shadow-[var(--shadow-panel)] sm:p-6"}>
          <div
            ref={arenaRef}
            className={isFullscreen ? "relative flex min-h-dvh flex-col justify-center bg-panel" : ""}
          >
            {countdown}
            {waiting && !lobbyOpen ? (
            <section className="flex min-h-dvh w-full flex-col items-center justify-evenly gap-4 px-5 py-8 text-center sm:px-10">
              <div className="flex flex-col items-center">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground">
                2. ADIM — YARIŞMA
              </p>
              <h1 className="mt-4 text-4xl font-extrabold text-foreground sm:text-6xl lg:text-8xl">
                HALAT YARIŞI
              </h1>
              <p className="mt-5 max-w-2xl text-sm font-semibold text-muted-foreground sm:text-lg">
                Sorular hazır. "YARIŞMAYI BAŞLAT" dediğinizde QR kod ve oda kodu ekrana gelir,
                öğrenciler takımlara katılır.
              </p>
              </div>
              <div className="flex w-full flex-col items-center">
              <Button
                onClick={() => setLobbyOpen(true)}
                className="min-h-14 w-full max-w-sm bg-foreground px-6 text-base font-bold text-background hover:bg-foreground/90 sm:min-h-16 sm:text-lg"
              >
                YARIŞMAYI BAŞLAT
              </Button>
              <Button
                variant="outline"
                onClick={() => void navigate({ to: "/sorular" })}
                className="mt-3 min-h-11 w-full max-w-sm border-2 border-border bg-panel text-sm font-bold text-foreground hover:bg-muted"
              >
                SORULARA DÖN
              </Button>
              </div>
            </section>
          ) : waiting ? (
            <section className="flex min-h-dvh w-full flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:px-10 sm:py-10">
              <div className="flex w-full flex-col items-center">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground">
                ODA KODU
              </p>
              <h1 className="mt-1 text-5xl font-extrabold tracking-widest text-foreground sm:text-7xl lg:text-8xl">
                {code}
              </h1>
              <div className="mt-4 w-[clamp(112px,22vh,240px)] border-4 border-foreground p-2 text-foreground sm:mt-6">
                <QRCode value={joinUrl} size={240} bgColor="transparent" fgColor="currentColor" className="h-auto w-full" />
              </div>
              <p className="mt-3 text-xs font-bold tracking-wider text-foreground sm:text-base">
                TELEFONUNUZLA QR KODU OKUTUN
              </p>
              </div>
              <div className="flex w-full flex-col items-center">
              <div className="grid w-full max-w-5xl grid-cols-2 gap-2 sm:gap-5">
                <TeamSlot team={1} name={team1?.name} connected={team1?.connected} />
                <TeamSlot team={2} name={team2?.name} connected={team2?.connected} />
              </div>
              {data.players.length === 2 && (
                <p className="mt-3 text-xl font-extrabold text-foreground">İKİ OYUNCU HAZIR!</p>
              )}
              <Button
                onClick={() => startWithFullscreen("start")}
                className="mt-5 min-h-12 w-full max-w-md bg-foreground px-3 text-sm font-bold text-background hover:bg-foreground/90 sm:mt-8 sm:min-h-16 sm:text-lg"
              >
                {data.players.length === 2 ? "OYUNU BAŞLAT" : "OYUNCU BEKLEMEDEN BAŞLAT"}
              </Button>
              </div>
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
                      className="rounded-full border-2 border-border bg-panel px-3.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      TAM EKRANDAN ÇIK
                    </button>
                    <button
                      onClick={() => {
                        void document.exitFullscreen();
                        void navigate({ to: "/" });
                      }}
                      className="rounded-full bg-foreground px-3.5 py-1.5 text-xs font-bold text-background"
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
    <div className="min-w-0 border-2 border-border px-3 py-3 text-left sm:px-6 sm:py-6">
      <p
        className={`text-xs font-bold tracking-wider ${team === 1 ? "text-team1" : "text-team2"}`}
      >
        TAKIM {team}
      </p>
      <p className="mt-1 truncate text-xs font-bold text-foreground sm:text-xl">
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
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-40 ${
        primary
          ? "bg-foreground text-background"
          : "border-2 border-border bg-panel text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
