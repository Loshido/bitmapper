import { existsSync } from "@std/fs/exists";
import { decodePNG } from "@img/png";

export function endian(valeur: number, octets: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < octets; i++) {
        result.push((valeur >> (8 * i)) & 0xFF);
    }
    return result;
}

export function tailles(largeur: number, hauteur: number) {
    const taille_ligne = Math.ceil((largeur * 3) / 4) * 4;
    const taille_image = taille_ligne * hauteur;
    const taille_fichier = 14 + 40 + taille_image;
    const padding = taille_ligne - largeur * 3;

    return {
        taille_ligne,
        taille_image,
        taille_fichier,
        padding
    }
}

export function fichierIncorrecte(chemin: string): false | string {
    if(!chemin.endsWith(`.png`)) {
        return `Ce fichier n'est pas une image PNG.`
    }

    if(!existsSync(chemin)) {
        return `Ce fichier n'existe pas.`
    }
    return false
}

export async function decoder(chemin: string) {
    const file = Deno.readFileSync(chemin)
    return await decodePNG(file)
}