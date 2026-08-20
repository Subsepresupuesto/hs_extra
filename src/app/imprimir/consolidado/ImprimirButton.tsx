"use client";

export default function ImprimirButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-red-700 text-white text-sm font-medium px-4 py-2 hover:bg-red-800"
    >
      Imprimir / Guardar como PDF
    </button>
  );
}
