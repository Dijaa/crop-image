import { useState, FormEvent } from 'react';

export default function Home() {
  const [n, setN] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [croppedImages, setCroppedImages] = useState<string[]>([]);
  const [imagePaths, setImagePaths] = useState<string[]>([]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || n < 1) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('n', n.toString());

    const res = await fetch('/api/crop-image', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.images) {
      setCroppedImages(data.images);
    } else if (data.imagePaths) {
      setImagePaths(data.imagePaths);
    } else if (data.error) {
      alert(data.error);
    }
  };

  return (
    <div>
      <h1>Cortar Imagem para Carrossel do Instagram</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          value={n}
          onChange={(e) => setN(parseInt(e.target.value))}
          min="1"
          required
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files) {
              setFile(e.target.files[0]);
            }
          }}
          required
        />
        <button type="submit">Enviar</button>
      </form>

      {croppedImages.length > 0 && (
        <div>
          <h2>Imagens Cortadas:</h2>
          {croppedImages.map((img, index) => (
            <img
              key={index}
              src={`data:image/jpeg;base64,${img}`}
              alt={`Imagem Cortada ${index + 1}`}
            />
          ))}
        </div>
      )}

      {imagePaths.length > 0 && (
        <div>
          <h2>Imagens Cortadas:</h2>
          {imagePaths.map((path, index) => (
            <div key={index}>
              <img src={path} alt={`Imagem Cortada ${index + 1}`} />
              <a href={path} download>
                Baixar Imagem {index + 1}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
