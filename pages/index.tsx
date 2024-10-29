import { useState, FormEvent } from 'react';
import styles from '@/pages/styles/Home.module.css';

export default function Home() {
  const [n, setN] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setImagePaths([]);

    if (!file) {
      setErrorMessage('Por favor, selecione uma imagem.');
      return;
    }

    if (n < 1) {
      setErrorMessage('O valor de n deve ser pelo menos 1.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('n', n.toString());

    try {
      const res = await fetch('/api/crop-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setImagePaths(data.imagePaths);
      } else {
        setErrorMessage(data.error || 'Ocorreu um erro no servidor.');
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('Falha na conexão com o servidor.');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Cortar Imagem para Carrossel do Instagram</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Número de Imagens (n):
            <input
              type="number"
              value={n}
              onChange={(e) => setN(parseInt(e.target.value))}
              min="1"
              required
              className={styles.input}
            />
          </label>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Selecione a Imagem:
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) {
                  setFile(e.target.files[0]);
                }
              }}
              required
              className={styles.input}
            />
          </label>
        </div>
        <button type="submit" className={styles.button}>
          Enviar
        </button>
      </form>

      {errorMessage && (
        <div className={styles.errorMessage}>{errorMessage}</div>
      )}

      {imagePaths.length > 0 && (
        <div className={styles.imagesContainer}>
          <h2 className={styles.subtitle}>Imagens Cortadas:</h2>
          <div className={styles.imagesGrid}>
            {imagePaths.map((path, index) => (
              <div key={index} className={styles.imageWrapper}>
                <img
                  src={path}
                  alt={`Imagem Cortada ${index + 1}`}
                  className={styles.image}
                />
                <a
                  href={path}
                  download={`imagem-cortada-${index + 1}.jpg`}
                  className={styles.downloadLink}
                >
                  Baixar Imagem {index + 1}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
