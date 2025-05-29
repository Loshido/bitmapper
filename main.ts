import { endian, tailles, fichierIncorrecte, decoder } from "./utils.ts";

const fichier = Deno.args[0];
const incorrecte = fichierIncorrecte(fichier)
if(incorrecte) {
    throw new Error(incorrecte)
}

console.log(`Lecture du fichier '${fichier}'.`)
const png = await decoder(fichier)

const { width, height } = png.header

const { 
    taille_fichier,
    taille_image,
    taille_ligne,
    padding 
} = tailles(width, height)

const bmp_path = `${fichier.slice(0, -4)}.bmp`
const bmp = new Uint8Array(taille_ligne * height * 3 + 54)

console.log(`Conversion de '${fichier}' en '${bmp_path}'`)

// https://en.wikipedia.org/wiki/BMP_file_format

// offset d'écriture dans le fichier
let i = 54;
bmp.set(
    // format
    [ 
        ...endian(0x4D42, 2), // 'BM'
        ...endian(taille_fichier, 4), // taille
        ...endian(0, 4), // reserve
        ...endian(i, 4) // offset des données
    ],
    0 // au début
)

bmp.set(
    [
        // BITMAPINFOHEADER
        ...endian(40, 4), // taille header
        ...endian(width, 4), // largeur image,
        ...endian(height, 4), // hauteur image,
        ...endian(1, 2), // color planes
        ...endian(24, 2), // bits per pixel
        ...endian(0, 4), // no compression
        ...endian(taille_image, 4), // taille_image
        ...endian(2835, 4), // hResolution (72 DPI)
        ...endian(2835, 4), // vResolution (72 DPI)
        ...endian(0, 4), // colors in palette
        ...endian(0, 4), // important colors
    ], 
    14 // après le premier header
)

for(let y = height - 1; y >= 0; y--) {
    for(let x = 0; x < width; x++) {
        const offset = 4 * (y * width + x)
        const rvb = png.body.slice(offset, offset + 3)

        if(rvb.some(channel => channel === undefined)) {
            console.warn(`Un pixel a été passé (${x}:${y})`)
            continue
        }

        rvb.reverse()
        bmp.set(rvb, i)
        i += 3
    }
    // "Chaque ligne doit toujours occuper un nombre d'octets multiple de 4"
    for (let i = 0; i < padding; i++) {
        bmp[i++] = 0;
    }
}

console.log(`Ecriture de l'image BMP.`)
Deno.writeFileSync(bmp_path, bmp, {
    create: true
})