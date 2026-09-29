"use client";

import { useState } from "react";

// Photo affichée sous la bannière d'accueil.
// Envoie ta photo dans public/images sous le nom home-feature.jpeg
const FEATURE_SRC = "/images/home-feature.jpeg";

const NewSelectionIntro = () => {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <section className="w-full px-6 sm:px-10 my-20 sm:my-28">
      {/* Image décalée : alignée à gauche, avec de l'espace à droite */}
      <div className="w-[80%] sm:w-[55%] max-w-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FEATURE_SRC}
          alt=""
          className="block w-full h-auto"
          onError={() => setFailed(true)}
        />
      </div>
    </section>
  );
};

export default NewSelectionIntro;
