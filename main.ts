import { endian, tailles, fichierIncorrecte, decoder } from "./utils.ts";

if(Deno.args.length == 0) {
    throw new Error(`Vous n'avez pas mentionner d'image`)
}

const fichier = Deno.args[0];
const transparant = Deno.args.length >= 2 && Deno.args[1] === 'transparent'
const taille_pixel = transparant ? 4 : 3;
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
    padding 
} = tailles(width, height, taille_pixel)

const bmp_path = `${fichier.slice(0, -4)}.bmp`
const bmp = new Uint8Array(taille_fichier)

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
        ...endian(taille_pixel * 8, 2), // bits per pixel
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
        const rvba = png.body.slice(offset, offset + taille_pixel)

        if(rvba.some(channel => channel === undefined)) {
            console.warn(`Un pixel a été passé (${x}:${y})`)
            continue
        }

        if(transparant) {
            bmp.set([rvba[2], rvba[1], rvba[0], rvba[3]], i)
            console.log(`alpha ${x}:${y} -> ${rvba[3]}`)
        } else {
            rvba.reverse()
            bmp.set(rvba, i)
        }
        
        i += taille_pixel
    }
    // "Chaque ligne doit toujours occuper un nombre d'octets multiple de 4"
    for (let j = 0; j < padding; j++) {
        bmp[i++] = 0;
    }
}

console.log(`Ecriture de l'image BMP.`)
Deno.writeFileSync(bmp_path, bmp, {
    create: true
})