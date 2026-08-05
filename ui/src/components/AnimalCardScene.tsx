import { useEffect, useState } from "react";
import { Animal } from "aquario-models";
import { DateTime } from "luxon";
import { getSpeciesInfo, SpeciesInfo } from "../dal/Species.dal";
import { animalImageSrc } from "./AnimalCard";

// Slow drift keeps text off any one set of pixels (burn-in) without
// being noticeable card-to-card.
const DRIFT = ["translate(0, 0)", "translate(2%, 2%)", "translate(-2%, 1%)", "translate(1%, -2%)"];

function lastFedLabel(animal: Animal): string | null {
  const ts = animal.last_feeding_log?.timestamp;
  if (!ts) return null;
  const rel = DateTime.fromISO(ts).toRelative();
  return rel ? `Last fed ${rel}` : null;
}

export default function AnimalCardScene({
  animals,
  cardMs = 25_000,
}: {
  animals: Animal[];
  cardMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [info, setInfo] = useState<SpeciesInfo | null>(null);
  const animal = animals.length ? animals[index % animals.length] : undefined;

  useEffect(() => {
    if (animals.length < 2) return;
    const t = setInterval(() => setIndex((i) => i + 1), cardMs);
    return () => clearInterval(t);
  }, [cardMs, animals.length]);

  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    const query = animal?.species_latin || animal?.species;
    const promise = getSpeciesInfo(query);
    if (promise) {
      promise.then((r) => {
        if (!cancelled) setInfo(r);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [animal?.id]);

  if (!animal) return null;

  const backdrop = animalImageSrc(animal.image_url) ?? info?.image;
  const fed = lastFedLabel(animal);

  return (
    <div
      key={animal.id + ":" + index}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#fff",
        animation: "screensaver-fade-in 1.2s ease both",
      }}
    >
      {backdrop && (
        <img
          src={backdrop}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.35)",
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          maxWidth: "70%",
          transform: DRIFT[index % DRIFT.length],
          transition: "transform 2s ease",
        }}
      >
        <div style={{ fontSize: "4.5rem", fontWeight: 700 }}>{animal.name}</div>
        <div style={{ fontSize: "1.8rem", opacity: 0.85 }}>
          {animal.species}
          {animal.species_latin ? (
            <span style={{ fontStyle: "italic" }}> — {animal.species_latin}</span>
          ) : null}
        </div>
        {fed && (
          <div style={{ fontSize: "1.4rem", marginTop: 12, opacity: 0.8 }}>
            {fed}
          </div>
        )}
        {animal.notes && (
          <div style={{ fontSize: "1.3rem", marginTop: 12, opacity: 0.8 }}>
            {animal.notes}
          </div>
        )}
        {info?.extract && (
          <div
            style={{
              fontSize: "1.25rem",
              marginTop: 20,
              opacity: 0.7,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {info.extract}
          </div>
        )}
      </div>
    </div>
  );
}
