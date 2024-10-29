import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import sharp from "sharp";
import { put } from "@vercel/blob";

export const config = {
  api: {
    bodyParser: false,
  },
};

type ResponseData = {
  imagePaths?: string[];
  error?: string;
};

const parseForm = (
  req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  const form = formidable({ multiples: false });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Método não permitido." });
    }

    const { fields, files } = await parseForm(req);

    const n = parseInt(
      Array.isArray(fields.n) ? fields.n[0] : fields.n || "",
      10
    );
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: "Arquivo não encontrado." });
    }

    if (isNaN(n) || n < 1) {
      return res.status(400).json({ error: "Valor de n inválido." });
    }

    const tempPath = file.filepath;

    // Lê a imagem em um buffer
    const imageBuffer = fs.readFileSync(tempPath);


    // Dimensões esperadas
    const expectedHeight = 1080;
    const expectedWidth = 1080 * n;
    console.log("Dimensões esperadas:", expectedWidth, expectedHeight);
    // Obtém as dimensões reais da imagem
    const metadata = await sharp(imageBuffer).metadata();
    let width = metadata.width || expectedWidth;
    let height = metadata.height || expectedHeight;

    console.log("Dimensões reais:", width, height);

    // Redimensiona a imagem, se necessário
    let resizedBuffer = imageBuffer;
    if (height !== expectedHeight || width !== expectedWidth) {
      resizedBuffer = await sharp(imageBuffer)
        .resize(expectedWidth, expectedHeight, {
          fit: "fill",
        })
        .toBuffer();
      console.log("Imagem redimensionada.");
    }

    const imagePaths: string[] = [];
    console.log("Processando a imagem...");

    for (let i = 0; i < n; i++) {
      const left = i * 1080;
      console.log(`Cortando a imagem ${i + 1}, posição: ${left}`);

      if (left + 1080 > width) {
        console.warn(`Área de extração fora dos limites para a imagem ${i + 1}`);
        break;
      }

      const croppedBuffer = await sharp(resizedBuffer)
        .extract({
          left,
          top: 0,
          width: 1080,
          height: 1080,
        })
        .toBuffer();

      const { url } = await put(`cropped-${Date.now()}-${i}.jpg`, croppedBuffer, {
        contentType: "image/jpeg",
        access: "public",
      });

      imagePaths.push(url);
      console.log(`Imagem ${i + 1} cortada e carregada com sucesso.`);
    }

    console.log("Imagem processada com sucesso.");

    // Deleta o arquivo temporário após o processamento
    fs.unlinkSync(tempPath);
    console.log("Arquivo temporário excluído.");

    res.status(200).json({ imagePaths });
  } catch (error) {
    console.error("Erro no processamento da imagem:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
}
