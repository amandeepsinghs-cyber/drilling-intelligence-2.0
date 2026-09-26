// units — ppg <-> SG helpers (mirror backend/app/physics/units.py).
export const ppgToSg = (ppg: number) => ppg / 8.345;
export const sgToPpg = (sg: number) => sg * 8.345;
