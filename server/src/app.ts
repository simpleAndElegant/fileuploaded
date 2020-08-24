import createError from 'http-errors';
import express, { Request, Response, NextFunction } from 'express';
import logger from 'morgan';
import { INTERNAL_SERVER_ERROR } from 'http-status-codes';
import cors from 'cors';
import path from 'path';
import { TEMP_DIR, PUBLIC_DIR, mergeChunks } from './utils';
import fs from 'fs-extra';
let app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static(path.resolve(__dirname, '../public')));

app.post('/merge', async (req: Request, res: Response) => {
  let { filename } = req.body;
  await mergeChunks(filename);
  res.json({
    success: true,
    url: `http://localhost:8000/${filename}`
  });
});
app.post('/upload/:filename/:chunk_name/:start', async (req: Request, res: Response, _next: NextFunction) => {
  let start = isNaN(Number(req.params.start)) ? 0 : Number(req.params.start);
  let file_dir = path.resolve(TEMP_DIR, req.params.filename);
  let exist = await fs.pathExists(file_dir);
  if (!exist) await fs.mkdirs(file_dir);
  const filePath = path.resolve(TEMP_DIR, req.params.filename, req.params.chunk_name);
  // flags:'a' append: 打开文件用于追加。 如果文件不存在，则创建该文件。 实现断点续传
  let writeStream = fs.createWriteStream(filePath, { start, flags: "a" });
  req.pipe(writeStream);
  req.on('error', () => {
    writeStream.close();
  });
  req.on('close', () => {
    writeStream.close();
  });
  req.on('end', () => {
    writeStream.close();
    res.json({
      success: true
    });
  });
});

app.post('/verify',async (req:Request, res:Response): Promise<any> =>{
  const { filename } = req.body;
  const filePath = path.resolve(PUBLIC_DIR, filename);
  let existFile = await fs.pathExists(filePath);
  console.log(existFile)
  // 根据文件名找到了完整文件
  if(existFile) {
    return res.json({success: true, needUpload: false})
  }
  let tempFilePath = path.resolve(TEMP_DIR, filename);
  let existTemporaryFile = await fs.pathExists(tempFilePath);
  let uploadedList:any[] = []
  if (existTemporaryFile){
    const temporaryFileList = await fs.readdir(tempFilePath);
    console.log(temporaryFileList)
    uploadedList = await Promise.all(temporaryFileList.map(async (filename: string) => {
      let stat = await fs.stat(path.resolve(tempFilePath, filename));
      return {
        filename,
        size: stat.size
      }
    }))
  }
  res.json({
    success: true,
    needUpload: true,
    uploadedList: uploadedList
  })
})

app.use(function (_req:Request, _res:Response, next:NextFunction) {
  next(createError(404));
});

app.use(function (error: any, _req: Request, res: Response, _next: NextFunction) {
  res.status(error.status || INTERNAL_SERVER_ERROR);
  res.json({
    success: false,
    error
  });
});

export default app;
