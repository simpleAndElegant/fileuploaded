import path from 'path'
import fs, { WriteStream } from 'fs-extra';

export const TEMP_DIR = path.resolve(__dirname, '../temp');
export const SIZE = 1024 * 1024 * 100;
export const PUBLIC_DIR = path.resolve(__dirname, '../public');

const pipeStream = (filePath: string, writeStream: WriteStream) => new Promise(resolve => {
  const readStream = fs.createReadStream(filePath);
  readStream.on('end', async () => {
    // 读完删除文件夹
    await fs.unlink(filePath);
    resolve();
  });
  readStream.pipe(writeStream);
});


export const mergeChunks = async (filename: string, size: number = SIZE) => {
  const filePath = path.resolve(PUBLIC_DIR, filename);
  const chunksDir = path.resolve(TEMP_DIR, filename);
  const chunkFiles = await fs.readdir(chunksDir);
  chunkFiles.sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
  await Promise.all(
    chunkFiles.map((chunkFile, index) => pipeStream(
      path.resolve(chunksDir, chunkFile),
      fs.createWriteStream(filePath, {
        start: index * size
      })
    ))
  );
  await fs.rmdir(chunksDir);
}
