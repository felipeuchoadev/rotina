// Cálculo de XP e patente no servidor (mesma regra do front v3).
// XP "antihumano": meses de constância pra chegar a 3º Sargento.

export const RANKS = [
  { id: 'recruta', name: 'Recruta',     min: 0,      divisas: 0, estrela: false },
  { id: 'soldado', name: 'Soldado',     min: 8000,   divisas: 1, estrela: false },
  { id: 'cabo',    name: 'Cabo',        min: 40000,  divisas: 2, estrela: false },
  { id: '3sgt',    name: '3º Sargento', min: 150000, divisas: 3, estrela: true  },
];
export function rankOf(xp) {
  let r = RANKS[0];
  for (const k of RANKS) if (xp >= k.min) r = k;
  return r;
}
