import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import sharp from "sharp";

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

    // Read the image into a buffer once
    const imageBuffer = fs.readFileSync(tempPath);

    // Obtain the real dimensions of the image
    const metadata = await sharp(imageBuffer).metadata();
    let { width, height } = metadata;
    console.log("Dimensões reais:", width, height);

    // Expected dimensions
    const expectedHeight = 1080;
    const expectedWidth = 1080 * n;
    console.log("Dimensões esperadas:", expectedWidth, expectedHeight);

    // Resize the image to ensure exact dimensions
    let resizedBuffer = imageBuffer;
    if (height !== expectedHeight || width !== expectedWidth) {
      resizedBuffer = await sharp(imageBuffer)
        .resize(expectedWidth, expectedHeight, {
          fit: "fill",
        })
        .toBuffer();
      console.log("Imagem redimensionada.");

      // Get dimensions after resizing
      const resizedMetadata = await sharp(resizedBuffer).metadata();
      width = resizedMetadata.width || expectedWidth;
      height = resizedMetadata.height || expectedHeight;
    }
    console.log("Dimensões após redimensionamento:", width, height);

    // Verify dimensions after resizing
    if (width !== expectedWidth || height !== expectedHeight) {
      return res.status(500).json({
        error: "Falha ao redimensionar a imagem para as dimensões esperadas.",
      });
    }
    console.log("Imagem pronta para ser processada.");

    const dir = path.join(process.cwd(), "public", "imagens", "cropped");
    if (!fs.existsSync(dir)) {
      console.log("Criando diretório:", dir);
      fs.mkdirSync(dir, { recursive: true });
    }
    console.log("Diretório de imagens:", dir);
    const timestamp = Date.now();
    const imagePaths: string[] = [];
    console.log("Processando a imagem...");

    for (let i = 0; i < n; i++) {
      const left = i * 1080;
      console.log(`Cortando a imagem ${i + 1}, posição: ${left}`);

      // Ensure extraction area is within image bounds
      if (left + 1080 > width) {
        console.warn(
          `Área de extração fora dos limites para a imagem ${i + 1}`
        );
        break;
      }

      const outputPath = path.join(dir, `cropped-${timestamp}-${i}.jpg`);

      // Create a new Sharp instance for each extraction
      await sharp(resizedBuffer)
        .extract({
          left,
          top: 0,
          width: 1080,
          height: 1080,
        })
        .toFile(outputPath);

      imagePaths.push(`/imagens/cropped/cropped-${timestamp}-${i}.jpg`);
      console.log(`Imagem ${i + 1} cortada com sucesso.`);
    }

    console.log("Imagem processada com sucesso.");

    // Delete the temporary file after processing
    fs.unlinkSync(tempPath);
    console.log("Arquivo temporário excluído.");

    res.status(200).json({ imagePaths });
  } catch (error) {
    console.error("Erro no processamento da imagem:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
}
